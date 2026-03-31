const express = require('express');
const router = express.Router();

// Get decisions by transcript
router.get('/transcript/:transcriptId', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM decisions WHERE transcript_id = $1',
      [req.params.transcriptId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all decisions for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const result = await global.db.query(
      `SELECT d.*, t.title as transcript_title
       FROM decisions d
       JOIN transcripts t ON d.transcript_id = t.id
       WHERE t.project_id = $1
       ORDER BY d.created_at DESC`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create decision
router.post('/', async (req, res) => {
  try {
    const { transcriptId, decision, confidenceScore } = req.body;
    const result = await global.db.query(
      'INSERT INTO decisions (transcript_id, decision, confidence_score) VALUES ($1, $2, $3) RETURNING *',
      [transcriptId, decision, confidenceScore || 0.8]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete decision
router.delete('/:id', async (req, res) => {
  try {
    await global.db.query('DELETE FROM decisions WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
