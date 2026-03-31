const express = require('express');
const router = express.Router();
const Sentiment = require('sentiment');

const sentimentAnalyzer = new Sentiment();

// Get sentiment by transcript
router.get('/transcript/:transcriptId', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM sentiment_analysis WHERE transcript_id = $1 ORDER BY segment_index',
      [req.params.transcriptId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get sentiment summary for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const result = await global.db.query(
      `SELECT sa.*, t.title as transcript_title
       FROM sentiment_analysis sa
       JOIN transcripts t ON sa.transcript_id = t.id
       WHERE t.project_id = $1
       ORDER BY t.id, sa.segment_index`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analyze sentiment for transcript
router.post('/analyze/:transcriptId', async (req, res) => {
  try {
    const { transcriptId } = req.params;

    const transcriptResult = await global.db.query(
      'SELECT content FROM transcripts WHERE id = $1',
      [transcriptId]
    );

    if (transcriptResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Delete existing analysis
    await global.db.query(
      'DELETE FROM sentiment_analysis WHERE transcript_id = $1',
      [transcriptId]
    );

    const content = transcriptResult.rows[0].content;
    const lines = content.split('\n').filter((l) => l.trim());

    const segmentSize = 5;
    let segmentIndex = 0;

    for (let i = 0; i < lines.length; i += segmentSize) {
      const segment = lines.slice(i, i + segmentSize).join(' ');
      const analysis = sentimentAnalyzer.analyze(segment);
      const normalizedScore = Math.max(-1, Math.min(1, analysis.score / 5));

      let sentimentLabel = 'neutral';
      if (normalizedScore > 0.1) sentimentLabel = 'positive';
      else if (normalizedScore < -0.1) sentimentLabel = 'negative';

      await global.db.query(
        `INSERT INTO sentiment_analysis (transcript_id, segment_index, segment_text, sentiment_score, sentiment_label)
         VALUES ($1, $2, $3, $4, $5)`,
        [transcriptId, segmentIndex, segment.slice(0, 500), normalizedScore, sentimentLabel]
      );
      segmentIndex++;
    }

    res.json({ success: true, segments: segmentIndex });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
