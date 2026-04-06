# 🎤 Meeting Intelligence Hub

Transform raw meeting transcripts into structured intelligence — automatically surfacing decisions, action items, and answers to questions.

## Features

- **Feature 1 — Decision & Action Item Extractor**: Upload .txt or .vtt transcripts; AI extracts decisions and action items with assignee and due date
- **Feature 2 — Contextual Query Chatbot**: Ask natural language questions across all transcripts; answers are cited with source
- **Feature 3 — Sentiment Analysis**: Per-speaker and per-line sentiment dashboard with visual indicators
- **Dashboard**: Overview of all projects, transcripts, decisions, and action items

## Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key (optional — keyword fallback works without it)

## Setup

### 1. Database

```sql
-- Create a database
CREATE DATABASE meeting_hub;
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL and OPENAI_API_KEY
npm install
node init-db.js        # creates all tables
npm start              # runs on http://localhost:5000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev            # runs on http://localhost:3000
```

Open **http://localhost:3000** in your browser.

## Project Structure

```
meeting-intelligence-hub/
├── backend/
│   ├── server.js        # Express API (all routes)
│   ├── ai-service.js    # OpenAI + fallback extraction
│   ├── vtt-parser.js    # .vtt and .txt transcript parsers
│   ├── init-db.js       # Database schema creation
│   ├── .env.example     # Environment variable template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx                      # Root layout + routing
│   │   └── components/
│   │       ├── Dashboard.jsx            # Home page
│   │       ├── ProjectView.jsx          # Transcript viewer + extractor
│   │       ├── TranscriptUpload.jsx     # Drag-and-drop uploader
│   │       ├── Chatbot.jsx              # AI chat interface
│   │       └── SentimentDashboard.jsx   # Sentiment analysis
│   └── package.json
└── README.md
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAI_API_KEY` | OpenAI key (optional — fallback is used if absent) |
| `PORT` | Backend port (default: 5000) |

## Bug Fixes Applied

1. `processTranscript` → replaced with correct `extractDecisions` + `extractActionItems` calls (both `await`ed)
2. `chatQuery` added to import — was missing, causing `ReferenceError` crash on every chat message
3. `pg.Client` → `pg.Pool` for connection resilience
4. Frontend `API_URL` hardcode removed — uses Vite proxy (`/api`) in dev, `VITE_API_URL` env var in prod
5. `Chatbot.jsx` no longer ignores `API_URL` prop — fixed to use passed value
6. VTT parser now preserves `Speaker: dialogue` format so speaker queries work in chatbot
7. React `key={idx}` → `key={msg.id}` in chat history
8. Dead root `server.js` removed
9. `init-db.js` updated to use `Pool`
10. `.env.example` added for easy setup
