import 'dotenv/config'
import crypto from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import mammoth from 'mammoth'
import mongoose from 'mongoose'
import multer from 'multer'
import OpenAI from 'openai'

const app = express()
const port = Number(process.env.PORT || 8787)
const mongoUri = process.env.MONGODB_URI || ''
const sessionCookieName = 'prism_session'
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7
const isProduction = process.env.NODE_ENV === 'production'
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 },
})

let mongoConnectionPromise

app.set('trust proxy', 1)
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(cookieParser())
app.use(express.json({ limit: '2mb' }))

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true },
)

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
  createdAt: { type: Date, default: Date.now },
  lastUsedAt: { type: Date, default: Date.now },
})

const savedReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  source: { type: String, enum: ['openai', 'demo'], required: true },
  model: { type: String, default: null },
  candidateName: { type: String, required: true },
  nextRole: { type: String, default: '' },
  overallScore: { type: Number, required: true },
  jobMatch: { type: Number, default: null },
  targetRole: { type: String, default: '' },
  review: { type: mongoose.Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
})

const User = mongoose.models.User || mongoose.model('User', userSchema)
const Session = mongoose.models.Session || mongoose.model('Session', sessionSchema)
const SavedReview = mongoose.models.SavedReview || mongoose.model('SavedReview', savedReviewSchema)

const reviewResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    candidateName: { type: 'string' },
    headline: { type: 'string' },
    overallScore: { type: 'number' },
    summary: { type: 'string' },
    scores: {
      type: 'object',
      additionalProperties: false,
      properties: {
        impact: { type: 'number' },
        clarity: { type: 'number' },
        ats: { type: 'number' },
        story: { type: 'number' },
      },
      required: ['impact', 'clarity', 'ats', 'story'],
    },
    highlights: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          type: { type: 'string', enum: ['strength', 'fix'] },
          title: { type: 'string' },
          detail: { type: 'string' },
          impact: { type: 'string' },
        },
        required: ['type', 'title', 'detail', 'impact'],
      },
    },
    actionPlan: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          detail: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'detail', 'priority'],
      },
    },
    skills: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: { type: 'string' },
          level: { type: 'number' },
          category: { type: 'string' },
        },
        required: ['name', 'level', 'category'],
      },
    },
    keywords: { type: 'array', items: { type: 'string' } },
    missingKeywords: { type: 'array', items: { type: 'string' } },
    jobMatch: { type: 'number' },
    nextRole: { type: 'string' },
  },
  required: [
    'candidateName',
    'headline',
    'overallScore',
    'summary',
    'scores',
    'highlights',
    'actionPlan',
    'skills',
    'keywords',
    'missingKeywords',
    'jobMatch',
    'nextRole',
  ],
}

const demoReview = {
  candidateName: 'Alex Morgan',
  headline: 'Product designer with a sharp systems mindset',
  overallScore: 82,
  summary: 'You have a strong foundation: the work is specific, the story is easy to follow, and your product thinking comes through. The fastest lift is to make outcomes more measurable and mirror the language of the roles you want next.',
  scores: { impact: 68, clarity: 84, ats: 91, story: 86 },
  highlights: [
    { type: 'strength', title: 'Specific, credible ownership', detail: 'Your bullets make it clear what you owned across discovery, prototyping, and launch.', impact: 'Builds trust quickly' },
    { type: 'fix', title: 'Make the outcomes louder', detail: 'Several bullets stop at the activity. Add a metric, before/after, or user result wherever possible.', impact: 'Could add 8–12 points' },
    { type: 'fix', title: 'Surface your leadership signal', detail: 'Move mentoring, cross-functional facilitation, and decision-making closer to the top third of the page.', impact: 'Clarifies your level' },
  ],
  actionPlan: [
    { title: 'Rewrite 3 experience bullets', detail: 'Lead with the change you created, then anchor it with a measurable result.', priority: 'high' },
    { title: 'Add 2 role-specific keywords', detail: 'Bring “design systems” and “experimentation” into your most relevant project.', priority: 'medium' },
    { title: 'Tighten the opening profile', detail: 'Make your next-role direction explicit in one confident sentence.', priority: 'low' },
  ],
  skills: [
    { name: 'Product strategy', level: 88, category: 'Strength' },
    { name: 'Design systems', level: 74, category: 'Core' },
    { name: 'Prototyping', level: 91, category: 'Core' },
    { name: 'Experimentation', level: 58, category: 'Opportunity' },
  ],
  keywords: ['product strategy', 'Figma', 'design systems', 'research', 'roadmaps', 'experimentation'],
  missingKeywords: ['stakeholder management', 'activation', 'SQL'],
  jobMatch: 76,
  nextRole: 'Senior product designer',
}

const cleanText = (value = '') => String(value).replace(/\u0000/g, '').trim().slice(0, 32000)
const normalizeEmail = (value = '') => String(value).trim().toLowerCase()
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex')
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/', maxAge: sessionTtlMs }

async function connectMongo() {
  if (!mongoUri) return false
  if (mongoose.connection.readyState === 1) return true
  if (!mongoConnectionPromise) {
    mongoConnectionPromise = mongoose
      .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
      .then(() => true)
      .catch((error) => {
        console.error('MongoDB connection failed:', error.message)
        mongoConnectionPromise = undefined
        return false
      })
  }
  return mongoConnectionPromise
}

async function requireDatabase(res) {
  const connected = await connectMongo()
  if (!connected) {
    res.status(503).json({ error: 'MongoDB is not connected. Add MONGODB_URI or start the local database.' })
    return false
  }
  return true
}

function sanitizeUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, createdAt: user.createdAt }
}

async function getUserFromRequest(req) {
  const rawToken = req.cookies?.[sessionCookieName]
  if (!rawToken || !(await connectMongo())) return null
  const session = await Session.findOne({ tokenHash: hashToken(rawToken), expiresAt: { $gt: new Date() } }).populate({ path: 'userId', select: 'name email createdAt' })
  if (!session?.userId) return null
  req.sessionId = session._id
  return session.userId
}

async function optionalAuth(req, _res, next) {
  try {
    req.user = await getUserFromRequest(req)
  } catch (error) {
    console.error('auth_lookup_error', error.message)
    req.user = null
  }
  next()
}

async function requireAuth(req, res, next) {
  try {
    req.user = await getUserFromRequest(req)
    if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' })
    next()
  } catch (error) {
    console.error('auth_lookup_error', error.message)
    return res.status(503).json({ error: 'Authentication is temporarily unavailable.' })
  }
}

async function createSession(res, userId) {
  const rawToken = crypto.randomBytes(32).toString('hex')
  await Session.create({ userId, tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + sessionTtlMs) })
  res.cookie(sessionCookieName, rawToken, cookieOptions)
}

async function extractResumeText(file) {
  if (!file) return ''
  const extension = file.originalname.toLowerCase().split('.').pop()
  if (extension === 'docx') {
    const result = await mammoth.extractRawText({ buffer: file.buffer })
    return result.value
  }
  if (extension === 'pdf') {
    try {
      const pdfModule = await import('pdf-parse')
      const parser = new pdfModule.PDFParse({ data: file.buffer })
      const result = await parser.getText()
      await parser.destroy()
      return result.text
    } catch {
      throw new Error('We could not read this PDF. Try pasting the text or exporting it as .txt.')
    }
  }
  return file.buffer.toString('utf8')
}

function promptFor(resumeText, jobDescription) {
  return `Review this resume like a thoughtful hiring manager and ATS specialist. Return concrete, kind, specific feedback. Scores are 0-100, where 70 is solid and 90+ is exceptional. Do not invent experience, metrics, or skills that are not present.\n\nRESUME:\n${resumeText}\n\nTARGET JOB DESCRIPTION (optional):\n${jobDescription || 'No job description provided. Assess the resume for a strong product/design role.'}`
}

async function saveReviewForUser(user, review, source, model, targetRole) {
  if (!user) return null
  try {
    const saved = await SavedReview.create({
      userId: user._id,
      source,
      model: model || null,
      candidateName: review.candidateName,
      nextRole: review.nextRole,
      overallScore: review.overallScore,
      jobMatch: review.jobMatch,
      targetRole: cleanText(targetRole),
      review,
    })
    return saved._id.toString()
  } catch (error) {
    console.error('review_save_error', error.message)
    return null
  }
}

app.get('/api/health', async (_req, res) => {
  const databaseConnected = mongoUri ? await connectMongo() : false
  res.json({ ok: true, aiConfigured: Boolean(process.env.OPENAI_API_KEY), mongoConfigured: Boolean(mongoUri), databaseConnected })
})

app.post('/api/auth/signup', async (req, res) => {
  if (!(await requireDatabase(res))) return
  const name = cleanText(req.body?.name).slice(0, 80)
  const email = normalizeEmail(req.body?.email)
  const password = String(req.body?.password || '')
  if (name.length < 2) return res.status(400).json({ error: 'Enter your name.' })
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (password.length < 8) return res.status(400).json({ error: 'Use a password with at least 8 characters.' })
  if (password.length > 128) return res.status(400).json({ error: 'Keep your password under 128 characters.' })

  try {
    const existingUser = await User.findOne({ email })
    if (existingUser) return res.status(409).json({ error: 'An account with this email already exists.' })
    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash })
    await createSession(res, user._id)
    return res.status(201).json({ user: sanitizeUser(user) })
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with this email already exists.' })
    console.error('signup_error', error.message)
    return res.status(500).json({ error: 'We could not create your account. Please try again.' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  if (!(await requireDatabase(res))) return
  const email = normalizeEmail(req.body?.email)
  const password = String(req.body?.password || '')
  if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' })

  try {
    const user = await User.findOne({ email }).select('+passwordHash')
    const passwordMatches = user ? await bcrypt.compare(password, user.passwordHash) : false
    if (!user || !passwordMatches) return res.status(401).json({ error: 'That email and password do not match.' })
    await createSession(res, user._id)
    return res.json({ user: sanitizeUser(user) })
  } catch (error) {
    console.error('login_error', error.message)
    return res.status(500).json({ error: 'We could not sign you in. Please try again.' })
  }
})

app.post('/api/auth/logout', async (req, res) => {
  try {
    if (await connectMongo()) {
      const rawToken = req.cookies?.[sessionCookieName]
      if (rawToken) await Session.deleteOne({ tokenHash: hashToken(rawToken) })
    }
  } finally {
    res.clearCookie(sessionCookieName, { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' })
    res.json({ ok: true })
  }
})

app.get('/api/auth/me', optionalAuth, (req, res) => {
  res.json({ user: req.user ? sanitizeUser(req.user) : null })
})

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  if (!(await requireDatabase(res))) return
  const currentPassword = String(req.body?.currentPassword || '')
  const nextPassword = String(req.body?.nextPassword || '')
  if (nextPassword.length < 8) return res.status(400).json({ error: 'Use a new password with at least 8 characters.' })
  const user = await User.findById(req.user._id).select('+passwordHash')
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ error: 'Your current password is not correct.' })
  user.passwordHash = await bcrypt.hash(nextPassword, 12)
  await user.save()
  await Session.deleteMany({ userId: user._id })
  await createSession(res, user._id)
  return res.json({ user: sanitizeUser(user) })
})

app.get('/api/reviews', requireAuth, async (req, res) => {
  if (!(await requireDatabase(res))) return
  const reviews = await SavedReview.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(30).select('-review')
  return res.json({ reviews })
})

app.post('/api/review', upload.single('file'), optionalAuth, async (req, res) => {
  try {
    const uploadedText = await extractResumeText(req.file)
    const resumeText = cleanText(uploadedText || req.body.resumeText)
    const jobDescription = cleanText(req.body.jobDescription)

    if (!resumeText || resumeText.length < 80) return res.status(400).json({ error: 'Add a little more resume content so the reviewer can find useful patterns.' })
    if (process.env.OPENAI_API_KEY && !req.user) return res.status(401).json({ error: 'Sign in to run a live AI review.' })

    if (!process.env.OPENAI_API_KEY) {
      const savedReviewId = await saveReviewForUser(req.user, demoReview, 'demo', null, jobDescription)
      return res.json({ review: demoReview, source: 'demo', savedReviewId, message: 'Demo review shown. Add OPENAI_API_KEY to run a live review.' })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      store: false,
      instructions: 'You are Prism, an expert resume reviewer. Be rigorous, encouraging, and concise. Every recommendation should be actionable for the candidate.',
      input: promptFor(resumeText, jobDescription),
      text: { format: { type: 'json_schema', name: 'resume_review', strict: true, schema: reviewResponseSchema } },
    })
    const review = JSON.parse(response.output_text)
    const savedReviewId = await saveReviewForUser(req.user, review, 'openai', response.model, jobDescription)
    return res.json({ review, source: 'openai', model: response.model, savedReviewId })
  } catch (error) {
    console.error('review_error', error)
    return res.status(500).json({ error: error.message || 'The review could not be completed. Please try again.' })
  }
})

export default app

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (isDirectRun) {
  app.listen(port, async () => {
    console.log(`Prism API listening on http://localhost:${port}`)
    if (mongoUri) await connectMongo()
    else console.log('MongoDB is not configured; auth routes will return setup guidance.')
  })
}

