# 🧠 Meeting Intelligence Hub

## 🚀 Live Demo

🌐 https://meeting-intelligence-hub-khaki.vercel.app

---

🧩 The Problem

Organizations conduct frequent meetings, but important information like decisions, action items, and insights often gets buried in long transcripts. This leads to missed tasks, repeated discussions, and reduced productivity.

💡 The Solution

Meeting Intelligence Hub is an AI-powered platform that transforms unstructured meeting transcripts into structured, actionable insights.

It automatically extracts key decisions and action items, performs sentiment analysis and provides a chatbot interface (RAG-based) for quick and contextual information retrieval. This helps users efficiently understand and act on meeting outcomes.

## ✨ Features

* 🎯 **Decision & Action Extraction**
  Upload `.txt` or `.vtt` files → get decisions + action items

* 💬 **AI Chatbot (RAG-based)**
  Ask questions across transcripts with source references

* 📊 **Sentiment Analysis**
  Per-line and per-speaker sentiment insights

* 📁 **Project Dashboard**
  Manage multiple projects and transcripts

* 📥 **Export Options**
  Download results as CSV / PDF

---

## 🏗️ Architecture

```
Frontend (Vercel - React)
        ↓
Backend (Render - Node.js/Express)
        ↓
Database (Neon - PostgreSQL)
        ↓
AI (Groq API)
```

---

## 🛠️ Tech Stack

**Programming Languages:
JavaScript

**Frontend:
React, Vite, Tailwind CSS

**Backend:
Node.js, Express.js

**Database:
PostgreSQL (NeonDB)

**APIs & Tools:
Groq API, RAG

**Deployment:
Vercel, Render
---

## ⚙️ Setup (Local)

### 1. Clone repo

```
git clone https://github.com/vinaya-anil954/meeting-intelligence-hub.git
cd meeting-intelligence-hub
```

---

### 2. Backend

```
cd backend
npm install
node init-db.js
npm start
```

---

### 3. Frontend

```
cd frontend
npm install
npm run dev
```

---

## 🔐 Environment Variables

### Backend (`.env`)

```
PORT=5000
DATABASE_URL=your_neon_connection
GROQ_API_KEY=your_key
```

### Frontend (`.env`)

```
VITE_API_URL=https://meeting-hub-backend-nnoc.onrender.com
```

##

---

🎥 Video Demo

(Add your Loom/video link here)

🔗 GitHub Repository

https://github.com/vinaya-anil954/meeting-intelligence-hub

🧠 Approach Document

[View Approach Document](./Meeting_Intelligence_Hub_Approach_Document.docx)

## 🧠 Key Learnings

* Difference between local proxy vs production API calls
* Full-stack deployment (Vercel + Render + Neon)
* Handling async AI pipelines
* Debugging production issues (CORS, routes, env vars)

---

## 🚀 Future Improvements

* Real-time meeting integration (Zoom/Meet)
* Speaker identification (ML-based)
* Multi-language support
* Authentication & user accounts

---

## 👩‍💻 Author

Vinaya A
