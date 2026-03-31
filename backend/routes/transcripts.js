const express = require('express');
const router = express.Router();
const { extractDecisions, extractActionItems } = require('../ai-service');
const multer = require('multer');

const ALLOWED_EXTENSIONS = ['.txt', '.vtt'];

const isAllowedFile = (filename) =>
  ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext));

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (isAllowedFile(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .vtt files allowed'));
    }
  },
});

// Get transcripts by project
router.get('/project/:projectId', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM transcripts WHERE project_id = $1 ORDER BY uploaded_at DESC',
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single transcript with all data
router.get('/:id', async (req, res) => {
  try {
    const transcriptResult = await global.db.query(
      'SELECT * FROM transcripts WHERE id = $1',
      [req.params.id]
    );

    if (transcriptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    const decisionsResult = await global.db.query(
      'SELECT * FROM decisions WHERE transcript_id = $1',
      [req.params.id]
    );

    const actionItemsResult = await global.db.query(
      'SELECT * FROM action_items WHERE transcript_id = $1',
      [req.params.id]
    );

    const sentimentResult = await global.db.query(
      'SELECT * FROM sentiment_analysis WHERE transcript_id = $1 ORDER BY segment_index',
      [req.params.id]
    );

    const topicsResult = await global.db.query(
      'SELECT * FROM topics WHERE transcript_id = $1 ORDER BY frequency DESC',
      [req.params.id]
    );

    res.json({
      transcript: transcriptResult.rows[0],
      decisions: decisionsResult.rows,
      action_items: actionItemsResult.rows,
      sentiment: sentimentResult.rows,
      topics: topicsResult.rows,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple transcripts
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadedTranscripts = [];

    for (const file of req.files) {
      const content = file.buffer.toString('utf-8');
      const wordCount = content.split(/\s+/).filter((w) => w).length;
      const fileType = file.originalname.endsWith('.vtt') ? 'vtt' : 'txt';

      const result = await global.db.query(
        `INSERT INTO transcripts (project_id, title, content, file_type, word_count, uploaded_at)
         VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING id, title`,
        [projectId, file.originalname, content, fileType, wordCount]
      );

      const transcriptId = result.rows[0].id;

      // Extract decisions and action items
      try {
        const decisions = await extractDecisions(content);
        for (const decision of decisions) {
          await global.db.query(
            'INSERT INTO decisions (transcript_id, decision, confidence_score) VALUES ($1, $2, $3)',
            [transcriptId, decision.text, decision.confidence || 0.8]
          );
        }

        const actionItems = await extractActionItems(content);
        for (const item of actionItems) {
          await global.db.query(
            'INSERT INTO action_items (transcript_id, action, assigned_to, due_date, confidence_score) VALUES ($1, $2, $3, $4, $5)',
            [transcriptId, item.action, item.assignedTo || null, item.dueDate || null, item.confidence || 0.8]
          );
        }
      } catch (extractError) {
        console.error('Extraction error for', file.originalname, extractError.message);
      }

      // Run sentiment analysis inline
      try {
        const Sentiment = require('sentiment');
        const sentimentAnalyzer = new Sentiment();
        const lines = content.split('\n').filter((l) => l.trim());
        const segmentSize = 5;
        let segmentIndex = 0;
        for (let i = 0; i < lines.length; i += segmentSize) {
          const segment = lines.slice(i, i + segmentSize).join(' ');
          const analysis = sentimentAnalyzer.analyze(segment);
          const normalizedScore = Math.max(-1, Math.min(1, analysis.score / 5));
          const sentimentLabel =
            normalizedScore > 0.1 ? 'positive' : normalizedScore < -0.1 ? 'negative' : 'neutral';
          await global.db.query(
            `INSERT INTO sentiment_analysis (transcript_id, segment_index, segment_text, sentiment_score, sentiment_label)
             VALUES ($1, $2, $3, $4, $5)`,
            [transcriptId, segmentIndex, segment.slice(0, 500), normalizedScore, sentimentLabel]
          );
          segmentIndex++;
        }
      } catch (sentErr) {
        console.error('Sentiment analysis error:', sentErr.message);
      }

      uploadedTranscripts.push({ id: transcriptId, title: result.rows[0].title });
    }

    res.json({ success: true, transcripts: uploadedTranscripts });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete transcript
router.delete('/:id', async (req, res) => {
  try {
    await global.db.query('DELETE FROM transcripts WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
