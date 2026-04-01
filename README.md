# 🎤 Meeting Intelligence Hub

Transform raw meeting transcripts into structured intelligence — automatically surfacing decisions, action items, and answers to questions, so teams can stop re-reading and start executing.

## Features

### Feature 1 — Decision & Action Item Extractor
- Upload `.txt` and `.vtt` meeting transcript files via a drag-and-drop portal
- AI-powered extraction of **Decisions** (things the team agreed on) and **Action Items** (tasks with who, what, and by when)
- Clean table view of extracted data
- Export all decisions and action items as **CSV** or **PDF**

### Feature 2 — Contextual Query Chatbot
- Ask natural language questions across all uploaded transcripts
- AI answers with **source citations** — which meeting and which part of the transcript
- Handles cross-meeting and speaker-specific questions
- Persistent chat history per project

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Backend | Node.js + Express 5 |
| Database | PostgreSQL |
| AI | OpenAI API (`gpt-4o-mini`) with keyword-regex fallback |
| File Parsing | Custom VTT/TXT parser |
| Export | CSV (built-in) + PDF (PDFKit) |

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 1. Clone & Install

```bash
git clone https://github.com/vinaya-anil954/meeting-intelligence-hub.git
cd meeting-intelligence-hub

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment

```bash
cd backend
cp .env.example .env
# Edit .env and set your DATABASE_URL and optionally OPENAI_API_KEY
```

**.env variables:**

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Optional (fallback mode used if not set) |
| `PORT` | Backend port (default: `5000`) | No |

### 3. Initialize the Database

```bash
cd backend
node init-db.js
```

### 4. Run the Application

**Backend** (in `backend/`):
```bash
npm run dev    # development with nodemon
# or
npm start      # production
```

**Frontend** (in `frontend/`):
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` and will proxy API calls to `http://localhost:5000`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `GET` | `/api/projects/:id` | Get a project |
| `POST` | `/api/transcripts/upload` | Upload transcript files (multipart) |
| `GET` | `/api/transcripts/project/:projectId` | List transcripts for a project |
| `GET` | `/api/transcripts/:id` | Get transcript with decisions & action items |
| `DELETE` | `/api/transcripts/:id` | Delete a transcript |
| `PATCH` | `/api/action-items/:id` | Update an action item |
| `DELETE` | `/api/action-items/:id` | Delete an action item |
| `GET` | `/api/chat/history/:projectId` | Get chat history for a project |
| `POST` | `/api/chat/ask` | Ask a question about a project's transcripts |
| `GET` | `/api/export/csv/:projectId` | Download CSV export |
| `GET` | `/api/export/pdf/:projectId` | Download PDF export |

## Supported File Formats

| Format | Description |
|---|---|
| `.txt` | Plain text transcript |
| `.vtt` | WebVTT subtitle/caption file — timestamps and headers are stripped automatically |
