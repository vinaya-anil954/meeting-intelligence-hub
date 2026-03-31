const express = require('express');
const router = express.Router();

// Get all projects
router.get('/', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM projects ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project with stats
router.get('/:id', async (req, res) => {
  try {
    const projectResult = await global.db.query(
      'SELECT * FROM projects WHERE id = $1',
      [req.params.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const transcriptResult = await global.db.query(
      'SELECT COUNT(*) as count FROM transcripts WHERE project_id = $1',
      [req.params.id]
    );

    const actionItemResult = await global.db.query(
      'SELECT COUNT(*) as count FROM action_items WHERE transcript_id IN (SELECT id FROM transcripts WHERE project_id = $1)',
      [req.params.id]
    );

    const decisionResult = await global.db.query(
      'SELECT COUNT(*) as count FROM decisions WHERE transcript_id IN (SELECT id FROM transcripts WHERE project_id = $1)',
      [req.params.id]
    );

    res.json({
      project: projectResult.rows[0],
      transcripts: parseInt(transcriptResult.rows[0].count),
      actionItems: parseInt(actionItemResult.rows[0].count),
      decisions: parseInt(decisionResult.rows[0].count),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    const result = await global.db.query(
      'INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project
router.delete('/:id', async (req, res) => {
  try {
    await global.db.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
