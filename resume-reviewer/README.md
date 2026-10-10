# Prism — AI Resume Reviewer

Prism is a full-stack resume review workspace with a calm, dashboard-style UI and a structured OpenAI review pipeline.

## Stack

- React 19 + TypeScript + Vite
- Express 5 API server
- OpenAI JavaScript SDK using the Responses API
- Structured JSON output for stable review data
- Multer, Mammoth, and pdf-parse for resume uploads
- Lucide icons and responsive CSS UI

## Run locally

```bash
npm install
copy .env.example .env
npm run db:up
npm run dev
```

The client runs at `http://localhost:5173` and the API runs at `http://localhost:8787`.

Add an API key to `.env` for live reviews:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4.1-mini
MONGODB_URI=mongodb://127.0.0.1:27017/prism
```

Without a key, Prism uses a clearly labeled demo review so the full UX remains usable. Resume text is sent only to the local API, and live OpenAI calls use `store: false`.

## Authentication and MongoDB

Prism uses secure, opaque session cookies instead of putting tokens in local storage. Passwords are hashed with bcrypt before they reach MongoDB. The backend includes:

- Sign up, sign in, sign out, and session restore via `/api/auth/me`
- Protected password change endpoint
- Protected saved review history at `GET /api/reviews`
- Saved review metadata and structured review JSON per authenticated user
- HTTP-only, `SameSite=Lax` session cookies with seven-day expiry

The included `docker-compose.yml` runs MongoDB locally. If Docker is not available, use a MongoDB Atlas connection string in `MONGODB_URI` instead.

## API

`POST /api/review` accepts multipart form data:

- `resumeText` — pasted resume text
- `jobDescription` — optional target role description
- `file` — optional PDF, DOCX, TXT, or Markdown resume upload

`GET /api/health` reports server status and whether an OpenAI key is configured.

`POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, and `POST /api/auth/change-password` provide the authentication surface.

## Verify

```bash
npm run build
npm run lint
```

