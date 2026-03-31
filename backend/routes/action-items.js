const express = require('express');
const router = express.Router();

// Get all action items for a project
router.get('/project/:projectId', async (req, res) => {
  try {
    const result = await global.db.query(
      `SELECT a.*, t.title as transcript_title
       FROM action_items a
       JOIN transcripts t ON a.transcript_id = t.id
       WHERE t.project_id = $1
       ORDER BY a.due_date ASC NULLS LAST`,
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get action items by transcript
router.get('/transcript/:transcriptId', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM action_items WHERE transcript_id = $1 ORDER BY due_date ASC NULLS LAST',
      [req.params.transcriptId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update action item status
router.patch('/:id', async (req, res) => {
  try {
    const { completed } = req.body;
    const result = await global.db.query(
      'UPDATE action_items SET completed = $1 WHERE id = $2 RETURNING *',
      [completed, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Action item not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create action item
router.post('/', async (req, res) => {
  try {
    const { transcriptId, action, assignedTo, dueDate } = req.body;
    const result = await global.db.query(
      'INSERT INTO action_items (transcript_id, action, assigned_to, due_date) VALUES ($1, $2, $3, $4) RETURNING *',
      [transcriptId, action, assignedTo || null, dueDate || null]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete action item
router.delete('/:id', async (req, res) => {
  try {
    await global.db.query('DELETE FROM action_items WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
