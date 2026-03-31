const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { Pool } = require('pg');
const multer = require('multer');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests, please try again later.' },
});

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

app.use('/api/projects', apiLimiter, projectRoutes);
app.use('/api/transcripts/upload', uploadLimiter);
app.use('/api/transcripts', apiLimiter, transcriptRoutes);
app.use('/api/decisions', apiLimiter, decisionRoutes);
app.use('/api/action-items', apiLimiter, actionItemRoutes);
app.use('/api/sentiment', apiLimiter, sentimentRoutes);
app.use('/api/chat', apiLimiter, chatRoutes);
app.use('/api/export', apiLimiter, exportRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
