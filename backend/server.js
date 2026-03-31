const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const multer = require('multer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => console.error('Unexpected error on idle client', err));
global.db = pool;

// Multer setup for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.originalname.endsWith('.txt') || file.originalname.endsWith('.vtt')) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .vtt files allowed'));
    }
  },
});
global.upload = upload;

// Routes
const projectRoutes = require('./routes/projects');
const transcriptRoutes = require('./routes/transcripts');
const decisionRoutes = require('./routes/decisions');
const actionItemRoutes = require('./routes/action-items');
const sentimentRoutes = require('./routes/sentiment');
const chatRoutes = require('./routes/chat');
const exportRoutes = require('./routes/export');

app.use('/api/projects', projectRoutes);
app.use('/api/transcripts', transcriptRoutes);
app.use('/api/decisions', decisionRoutes);
app.use('/api/action-items', actionItemRoutes);
app.use('/api/sentiment', sentimentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/export', exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
