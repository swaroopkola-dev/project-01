import { useEffect, useMemo, useState } from 'react'
import {
  ArrowUpRight,
  Bell,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  FileText,
  Flame,
  Gauge,
  History,
  LayoutDashboard,
  LogIn,
  LogOut,
  Lock,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Upload,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type ScoreSet = { impact: number; clarity: number; ats: number; story: number }
type Highlight = { type: 'strength' | 'fix'; title: string; detail: string; impact: string }
type ActionItem = { title: string; detail: string; priority: 'high' | 'medium' | 'low' }
type Skill = { name: string; level: number; category: string }
type Review = {
  candidateName: string
  headline: string
  overallScore: number
  summary: string
  scores: ScoreSet
  highlights: Highlight[]
  actionPlan: ActionItem[]
  skills: Skill[]
  keywords: string[]
  missingKeywords: string[]
  jobMatch: number
  nextRole: string
}
type User = { id: string; name: string; email: string; createdAt?: string }
type AuthMode = 'login' | 'signup'
type AuthFormPayload = { name?: string; email: string; password: string }

const SAMPLE_RESUME = `Alex Morgan
Product Designer · San Francisco, CA

Product designer with 6 years of experience turning complex workflows into calm, intuitive products. Partner with product and engineering teams from discovery through launch.

EXPERIENCE
Northstar Labs — Product Designer · 2022–Present
• Led end-to-end design for an onboarding redesign across web and mobile.
• Built a reusable component library with engineering, improving consistency across 4 product squads.
• Partnered with research to run customer interviews, prototype concepts, and shape quarterly roadmaps.
• Mentored two designers and facilitated weekly critique sessions.

Orbit Finance — UX Designer · 2019–2022
• Simplified the account setup flow and worked with PMs to define a clearer first-time experience.
• Created prototypes and usability tests that helped the team prioritize the highest-impact improvements.

SKILLS
Figma, prototyping, design systems, user research, product strategy, roadmapping, facilitation`

const SAMPLE_JOB = `We are looking for a Senior Product Designer to own end-to-end experiences, partner closely with product and engineering, and raise the bar for our design system. You will use research and experimentation to improve activation and retention. Strong communication, stakeholder management, and systems thinking are essential.`

const DEMO_REVIEW: Review = {
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

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Review resume', icon: Sparkles },
  { label: 'Job matcher', icon: Target },
  { label: 'Review history', icon: History },
]

const scoreLabels: Array<{ key: keyof ScoreSet; label: string; note: string }> = [
  { key: 'impact', label: 'Impact', note: 'Show the change you created' },
  { key: 'clarity', label: 'Clarity', note: 'Easy to scan in 6 seconds' },
  { key: 'ats', label: 'ATS readiness', note: 'Readable by hiring systems' },
  { key: 'story', label: 'Career story', note: 'Feels intentional and focused' },
]

function App() {
  const [activeNav, setActiveNav] = useState('Overview')
  const [review, setReview] = useState<Review>(DEMO_REVIEW)
  const [isReviewOpen, setIsReviewOpen] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [resumeText, setResumeText] = useState(SAMPLE_RESUME)
  const [jobDescription, setJobDescription] = useState(SAMPLE_JOB)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [source, setSource] = useState<'demo' | 'openai'>('demo')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { credentials: 'include' })
      .then((response) => response.json())
      .then((payload) => { if (!cancelled) setUser(payload.user || null) })
      .catch(() => { if (!cancelled) setUser(null) })
    return () => { cancelled = true }
  }, [])

  const initials = useMemo(() => (user?.name || review.candidateName).split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(), [review.candidateName, user?.name])

  const openAuth = (mode: AuthMode = 'login', notice = '') => {
    setAuthMode(mode)
    setAuthError(notice)
    setIsAuthOpen(true)
  }

  const handleAuth = async (payload: AuthFormPayload) => {
    setAuthBusy(true)
    setAuthError('')
    try {
      const endpoint = authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login'
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Authentication failed.')
      setUser(result.user)
      setIsAuthOpen(false)
    } catch (requestError) {
      setAuthError(requestError instanceof Error ? requestError.message : 'Authentication failed.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  const openReview = (nav = 'Review resume') => {
    setActiveNav(nav)
    setMobileNavOpen(false)
    setError('')
    setIsReviewOpen(true)
  }

  const handleNav = (label: string) => {
    if (label === 'Review resume' || label === 'Job matcher') {
      openReview(label)
      return
    }
    setActiveNav(label)
    setMobileNavOpen(false)
  }

  const handleAnalyze = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsAnalyzing(true)
    setError('')

    try {
      const body = new FormData()
      body.append('resumeText', resumeText)
      body.append('jobDescription', jobDescription)
      if (selectedFile) body.append('file', selectedFile)

      const response = await fetch('/api/review', { method: 'POST', credentials: 'include', body })
      const payload = await response.json()
      if (response.status === 401) {
        setIsReviewOpen(false)
        openAuth('login', payload.error || 'Sign in before running a live review.')
        return
      }
      if (!response.ok) throw new Error(payload.error || 'The review could not be completed.')

      setReview(payload.review)
      setSource(payload.source === 'openai' ? 'openai' : 'demo')
      setIsReviewOpen(false)
      setActiveNav('Overview')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Something went wrong. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row"><div className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></div><span>prism</span><button className="mobile-close icon-button" onClick={() => setMobileNavOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <button className="workspace-switcher"><span className="workspace-avatar">A</span><span className="workspace-copy"><strong>Alex’s workspace</strong><small>Personal</small></span><ChevronDown size={15} /></button>

        <div className="sidebar-label">Workspace</div>
        <nav className="primary-nav" aria-label="Primary navigation">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${activeNav === label ? 'nav-active' : ''}`} onClick={() => handleNav(label)}><Icon size={17} strokeWidth={activeNav === label ? 2.4 : 1.9} /><span>{label}</span>{label === 'Review resume' && <span className="nav-new">New</span>}</button>)}</nav>
        <div className="sidebar-label sidebar-label-spaced">Manage</div>
        <nav className="primary-nav"><button className="nav-item" onClick={() => setActiveNav('Settings')}><Settings size={17} /><span>Settings</span></button><button className="nav-item" onClick={() => setActiveNav('Help center')}><CircleHelp size={17} /><span>Help center</span></button></nav>

        <div className="sidebar-spacer" />
        <div className="upgrade-card"><div className="upgrade-icon"><Zap size={16} fill="currentColor" /></div><strong>Make your next move</strong><p>Get unlimited reviews and tailored job matches.</p><button onClick={() => openReview()}>See plans <ArrowUpRight size={13} /></button></div>
        <div className="profile-row"><div className="profile-avatar">{initials}</div><div className="profile-copy"><strong>{user?.name || review.candidateName}</strong><span>{user?.email || 'Demo mode'}</span></div>{user ? <button className="icon-button" onClick={handleLogout} aria-label="Sign out"><LogOut size={15} /></button> : <button className="icon-button" onClick={() => openAuth('login')} aria-label="Sign in"><LogIn size={15} /></button>}</div>
      </aside>

      <div className="workspace-main">
        <header className="topbar"><button className="mobile-menu icon-button" onClick={() => setMobileNavOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav === 'Overview' ? 'Overview' : activeNav}</strong></div><div className="topbar-actions"><button className="topbar-link search-button"><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button><button className="topbar-link"><CircleHelp size={16} /><span>Help</span></button><button className="notification-button" aria-label="Notifications"><Bell size={17} /><i /></button><button className="top-avatar top-avatar-button" onClick={() => user ? handleLogout() : openAuth('login')} aria-label={user ? 'Sign out' : 'Sign in'}>{initials}</button></div></header>

        <main className="content">
          <section className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> Resume intelligence <span className="eyebrow-divider" /> Updated just now</div><h1>Your resume, at a glance.</h1><p>Small edits. Clearer signal. Better conversations.</p></div><div className="heading-actions"><button className="button button-secondary" onClick={() => openReview()}><Upload size={16} /> New review</button><button className="button button-primary" onClick={() => openReview('Job matcher')}><Target size={16} /> Match a job</button></div></section>

          <section className="overview-grid"><article className="score-card card-surface"><div className="card-kicker"><span>OVERALL RESUME SCORE</span><button className="icon-button subtle" aria-label="Score information"><CircleHelp size={15} /></button></div><div className="score-content"><div className="score-ring" style={{ '--score': `${review.overallScore * 3.6}deg` } as React.CSSProperties}><div className="score-ring-inner"><strong>{review.overallScore}</strong><span>/ 100</span></div></div><div className="score-copy"><div className="score-status"><span className="status-dot" /> Strong foundation</div><h2>Above average</h2><p>{review.summary.split('. ')[0]}.</p><button className="text-button" onClick={() => openReview()}>View full review <ArrowUpRight size={14} /></button></div></div><div className="score-footer"><span><TrendingUp size={14} /> +12 since your first review</span><span className="footer-muted">Last reviewed 2 min ago</span></div></article>
            <article className="mini-metric card-surface metric-ats"><div className="metric-top"><span className="metric-icon"><Gauge size={17} /></span><span className="metric-trend">+5.2%</span></div><strong>{review.scores.ats}%</strong><span>ATS readiness</span><div className="metric-bar"><i style={{ width: `${review.scores.ats}%` }} /></div></article><article className="mini-metric card-surface metric-impact"><div className="metric-top"><span className="metric-icon"><Flame size={17} /></span><span className="metric-trend warm">Focus area</span></div><strong>{review.scores.impact}%</strong><span>Impact signal</span><div className="metric-bar"><i style={{ width: `${review.scores.impact}%` }} /></div></article><article className="mini-metric card-surface metric-match"><div className="metric-top"><span className="metric-icon"><BriefcaseBusiness size={17} /></span><span className="metric-trend">Good fit</span></div><strong>{review.jobMatch}%</strong><span>Match to target role</span><div className="metric-bar"><i style={{ width: `${review.jobMatch}%` }} /></div></article></section>

          <section className="section-heading"><div><span className="section-eyebrow">LATEST REVIEW</span><h2>What’s working — and what to tune</h2></div><button className="text-button" onClick={() => openReview()}>Open review <ChevronRight size={15} /></button></section>

          <section className="analysis-grid"><article className="card-surface breakdown-card"><div className="card-heading"><div><h3>Signal breakdown</h3><p>How your resume reads to a busy hiring team</p></div><button className="icon-button subtle"><MoreDots /></button></div><div className="breakdown-body"><div className="radar-wrap"><RadarChart scores={review.scores} /><div className="radar-center"><strong>{review.overallScore}</strong><span>overall</span></div></div><div className="score-list">{scoreLabels.map(({ key, label, note }) => <div className="score-row" key={key}><div className="score-row-label"><span>{label}</span><strong>{review.scores[key]}<small>/100</small></strong></div><div className="progress-line"><i className={`progress-${key}`} style={{ width: `${review.scores[key]}%` }} /></div><p>{note}</p></div>)}</div></div><div className="card-note"><Sparkles size={15} /><span><strong>Biggest opportunity:</strong> quantify the change behind your strongest work.</span></div></article>
            <article className="card-surface action-card"><div className="card-heading"><div><h3>Start here</h3><p>Three changes with the highest upside</p></div><span className="priority-badge">{review.actionPlan.length} actions</span></div><div className="action-list">{review.actionPlan.map((item, index) => <div className="action-item" key={item.title}><span className={`action-number action-${item.priority}`}>{String(index + 1).padStart(2, '0')}</span><div className="action-copy"><div><strong>{item.title}</strong><span className={`priority-text priority-${item.priority}`}>{item.priority}</span></div><p>{item.detail}</p></div><ChevronRight size={16} className="action-chevron" /></div>)}</div><button className="full-width-button" onClick={() => openReview()}>Work through actions <ArrowUpRight size={14} /></button></article></section>

          <section className="highlight-grid">{review.highlights.map((highlight) => <article className={`highlight-card card-surface highlight-${highlight.type}`} key={highlight.title}><div className="highlight-top"><span className="highlight-icon">{highlight.type === 'strength' ? <Check size={15} /> : <Flame size={15} />}</span><span>{highlight.type === 'strength' ? 'Strength' : 'Worth tuning'}</span></div><h3>{highlight.title}</h3><p>{highlight.detail}</p><strong className="highlight-impact">{highlight.impact}</strong></article>)}</section>

          <section className="insight-grid"><article className="card-surface keyword-card"><div className="card-heading"><div><h3>Keyword coverage</h3><p>Language your next role may be looking for</p></div><div className="keyword-score"><strong>84%</strong><span>covered</span></div></div><div className="keyword-group"><span className="keyword-label keyword-label-good"><Check size={13} /> Already in your resume</span><div className="tag-list">{review.keywords.map((tag) => <span className="tag tag-good" key={tag}>{tag}</span>)}</div></div><div className="keyword-group"><span className="keyword-label keyword-label-missing"><Plus size={13} /> Worth adding</span><div className="tag-list">{review.missingKeywords.map((tag) => <span className="tag tag-missing" key={tag}>{tag}</span>)}</div></div></article><article className="card-surface match-card"><div className="match-orb"><Target size={19} /></div><div className="match-copy"><span className="section-eyebrow">ROLE FIT</span><h3>{review.nextRole}</h3><p>Your profile is resonating with the roles you’re targeting.</p><div className="match-progress"><span><i style={{ width: `${review.jobMatch}%` }} /></span><strong>{review.jobMatch}% match</strong></div><button className="text-button" onClick={() => openReview('Job matcher')}>Compare another role <ArrowUpRight size={14} /></button></div></article></section>

          <section className="bottom-strip card-surface"><div className="strip-icon"><MessageCircle size={18} /></div><div><strong>Want a second opinion?</strong><p>Ask Prism about a specific bullet, career pivot, or job description.</p></div><button className="button button-secondary" onClick={() => openReview()}>Ask Prism <Send size={14} /></button><div className="privacy-note"><Lock size={12} /> Your resume stays private</div></section><footer className="footer"><span>Prism is an AI career companion, not a recruiter.</span><span><a href="https://platform.openai.com/docs" target="_blank" rel="noreferrer">Powered by OpenAI</a><span className="footer-separator">·</span> v1.0</span></footer>
        </main>
      </div>

      {isReviewOpen && <ReviewModal resumeText={resumeText} setResumeText={setResumeText} jobDescription={jobDescription} setJobDescription={setJobDescription} selectedFile={selectedFile} setSelectedFile={setSelectedFile} isAnalyzing={isAnalyzing} error={error} onClose={() => setIsReviewOpen(false)} onSubmit={handleAnalyze} />}
      {isAuthOpen && <AuthModal mode={authMode} setMode={setAuthMode} isBusy={authBusy} error={authError} onClose={() => setIsAuthOpen(false)} onSubmit={handleAuth} />}
      {source === 'demo' && <div className="demo-toast"><span className="demo-toast-dot" /><span>{user ? 'Demo review · Add an API key for live AI' : 'Demo mode · Sign in to save reviews'}</span><button onClick={() => user ? openReview() : openAuth('signup')}><Settings size={13} /> {user ? 'Setup' : 'Sign in'}</button></div>}
    </div>
  )
}

function MoreDots() { return <span className="more-dots" aria-hidden="true"><i /><i /><i /></span> }

function RadarChart({ scores }: { scores: ScoreSet }) {
  const points = [scores.impact, scores.clarity, scores.ats, scores.story].map((score, index) => { const angle = (-90 + index * 90) * (Math.PI / 180); const radius = 50 * (score / 100); return `${60 + Math.cos(angle) * radius},${60 + Math.sin(angle) * radius}` }).join(' ')
  return <svg className="radar" viewBox="0 0 120 120" role="img" aria-label="Resume score radar chart"><polygon points="60,10 110,60 60,110 10,60" className="radar-grid radar-grid-outer" /><polygon points="60,23 97,60 60,97 23,60" className="radar-grid" /><polygon points="60,36 84,60 60,84 36,60" className="radar-grid" /><line x1="60" y1="10" x2="60" y2="110" className="radar-axis" /><line x1="10" y1="60" x2="110" y2="60" className="radar-axis" /><polygon points={points} className="radar-area" /><polyline points={points} className="radar-line" /><circle cx="60" cy="10" r="2.7" className="radar-point" /><circle cx="110" cy="60" r="2.7" className="radar-point" /><circle cx="60" cy="110" r="2.7" className="radar-point" /><circle cx="10" cy="60" r="2.7" className="radar-point" /></svg>
}

type ReviewModalProps = { resumeText: string; setResumeText: (value: string) => void; jobDescription: string; setJobDescription: (value: string) => void; selectedFile: File | null; setSelectedFile: (file: File | null) => void; isAnalyzing: boolean; error: string; onClose: () => void; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }

function ReviewModal({ resumeText, setResumeText, jobDescription, setJobDescription, selectedFile, setSelectedFile, isAnalyzing, error, onClose, onSubmit }: ReviewModalProps) {
  return <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="modal-aside"><div className="modal-brand"><div className="brand-mark"><Sparkles size={16} /></div><span>prism</span></div><div className="modal-aside-content"><span className="eyebrow"><span className="eyebrow-dot" /> AI resume review</span><h2 id="review-title">See your resume more clearly.</h2><p>Upload your resume and we’ll surface the signal, the soft spots, and the next edit worth making.</p><div className="modal-steps"><div className="modal-step step-active"><span>01</span><div><strong>Add your resume</strong><small>PDF, DOCX, or paste text</small></div></div><div className="modal-step"><span>02</span><div><strong>Tell us where you’re going</strong><small>Optional job description</small></div></div><div className="modal-step"><span>03</span><div><strong>Get your edit plan</strong><small>Specific, prioritized feedback</small></div></div></div></div><div className="modal-privacy"><Lock size={14} /><span><strong>Private by default</strong><br />Your resume is only used to create this review.</span></div></div><div className="modal-main"><div className="modal-header"><div><span className="section-eyebrow">NEW REVIEW</span><h3>Let’s make it sharper.</h3></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close review form"><X size={20} /></button></div><form onSubmit={onSubmit} className="review-form"><label className="field-label">Resume <span>Required</span></label><label className={`drop-zone ${selectedFile ? 'drop-zone-selected' : ''}`}><input type="file" accept=".pdf,.docx,.txt,.md" onChange={(event) => setSelectedFile(event.target.files?.[0] || null)} /><div className="drop-icon">{selectedFile ? <FileText size={20} /> : <Upload size={20} />}</div><div><strong>{selectedFile ? selectedFile.name : 'Drop your resume here'}</strong><p>{selectedFile ? 'Ready to analyze · click to replace' : 'or click to browse · PDF, DOCX, TXT up to 6MB'}</p></div>{selectedFile && <button type="button" className="remove-file" onClick={(event) => { event.preventDefault(); setSelectedFile(null) }} aria-label="Remove file"><X size={14} /></button>}</label><div className="or-divider"><span>or paste your text</span></div><textarea className="resume-input" value={resumeText} onChange={(event) => setResumeText(event.target.value)} placeholder="Paste your resume text here…" rows={7} /><div className="field-meta"><span>{resumeText.length.toLocaleString()} characters</span><span>Tip: Include your most recent experience</span></div><label className="field-label job-field-label">Target role <span>Optional</span></label><textarea className="job-input" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste a job description for a tailored match…" rows={4} /><div className="form-footer"><div className="form-status">{error ? <><span className="error-dot" />{error}</> : <><Sparkles size={14} /> Usually takes less than 20 seconds</>}</div><button type="submit" className="button button-primary analyze-button" disabled={isAnalyzing}>{isAnalyzing ? <><span className="spinner" /> Reviewing…</> : <>Review my resume <ArrowUpRight size={15} /></>}</button></div></form></div></section></div>
}

type AuthModalProps = { mode: AuthMode; setMode: (mode: AuthMode) => void; isBusy: boolean; error: string; onClose: () => void; onSubmit: (payload: AuthFormPayload) => void }

function AuthModal({ mode, setMode, isBusy, error, onClose, onSubmit }: AuthModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const isSignup = mode === 'signup'

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSubmit({ name: isSignup ? name : undefined, email, password })
  }

  return <div className="modal-backdrop auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title"><div className="auth-visual"><div className="auth-visual-brand"><div className="brand-mark"><Sparkles size={16} /></div><span>prism</span></div><div className="auth-visual-copy"><span className="eyebrow"><span className="eyebrow-dot" /> Your career companion</span><h2>Keep your progress<br />in one place.</h2><p>Save reviews, revisit your action plan, and keep every next move close.</p></div><div className="auth-proof"><div className="auth-proof-icon"><ShieldCheck size={16} /></div><span><strong>Private by default</strong><small>Secure sessions. No resume data in cookies.</small></span></div></div><div className="auth-main"><div className="modal-header"><div><span className="section-eyebrow">{isSignup ? 'CREATE ACCOUNT' : 'WELCOME BACK'}</span><h3 id="auth-title">{isSignup ? 'Start with clarity.' : 'Good to see you.'}</h3></div><button className="icon-button modal-close" onClick={onClose} aria-label="Close authentication"><X size={20} /></button></div><form className="auth-form" onSubmit={handleSubmit}>{isSignup && <label className="auth-field"><span>Your name</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Alex Morgan" autoComplete="name" required /></label>}<label className="auth-field"><span>Email address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required /></label><label className="auth-field"><span>Password <small>{isSignup ? '8+ characters' : ''}</small></span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} required /></label>{error && <div className="auth-error"><span className="error-dot" />{error}</div>}<button className="button button-primary auth-submit" type="submit" disabled={isBusy}>{isBusy ? <><span className="spinner" /> Working…</> : <>{isSignup ? 'Create my account' : 'Sign in'} <ArrowUpRight size={15} /></>}</button></form><div className="auth-switch">{isSignup ? 'Already have an account?' : 'New to Prism?'} <button onClick={() => { setMode(isSignup ? 'login' : 'signup'); }} type="button">{isSignup ? 'Sign in' : 'Create an account'}</button></div><p className="auth-terms">By continuing, you agree to keep your account details accurate and your password private.</p></div></section></div>
}

export default App

