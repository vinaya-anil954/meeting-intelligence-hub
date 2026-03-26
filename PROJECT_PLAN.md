cat > PROJECT_PLAN.md << 'EOF'
# Meeting Intelligence Hub - 9 Day Sprint Plan

## Vision
Extract key decisions, action items, and sentiment from meeting transcripts.

## 9-Day Timeline

### Day 1: Setup & Planning ✓
- GitHub repo created
- Project structure initialized
- Tech stack decided
- Initial documentation

### Day 2: Database & Upload Backend
- Database schema
- Upload API endpoint
- File validation

### Day 3: Upload UI & Dashboard
- Drag-and-drop upload
- Dashboard home page
- Basic stats display

### Day 4: Basic Extraction Engine
- Keyword-based extraction
- Decision & action item parsing
- Storage in database

### Day 5: Results Display UI
- Meeting detail view
- Decisions table
- Action items table
- CSV export

### Day 6: Sentiment Analysis
- Basic sentiment analysis
- Visualization
- Timeline display

### Day 7: Chatbot Basics
- Chat UI component
- Transcript search
- Source citations

### Day 8: AI Integration & Polish
- OpenAI API integration
- Smart extraction
- Bug fixes

### Day 9: Testing & Deployment
- Full testing
- Deploy to production

## Tech Stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- LLM: OpenAI API
- Deployment: Vercel (frontend) + Railway (backend)

## How to Run (Will be updated as we build)
```bash
# Frontend
cd frontend
npm install
npm run dev

# Backend (in another terminal)
cd backend
npm install
npm run dev