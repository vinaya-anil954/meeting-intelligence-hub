const express = require('express');
const router = express.Router();
const { askChatbot } = require('../ai-service');

// Get chat history for a project
router.get('/history/:projectId', async (req, res) => {
  try {
    const result = await global.db.query(
      'SELECT * FROM chat_history WHERE project_id = $1 ORDER BY created_at ASC LIMIT 100',
      [req.params.projectId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Post question to chatbot
router.post('/ask', async (req, res) => {
  try {
    const { projectId, question } = req.body;

    if (!question || !projectId) {
      return res.status(400).json({ error: 'projectId and question are required' });
    }

    // Get all transcripts for the project
    const transcriptsResult = await global.db.query(
      'SELECT id, title, content FROM transcripts WHERE project_id = $1',
      [projectId]
    );

    const transcripts = transcriptsResult.rows;
    if (transcripts.length === 0) {
      return res.json({
        user_question: question,
        ai_response: 'No transcripts found for this project. Please upload some transcripts first.',
        source_transcripts: '',
        created_at: new Date(),
      });
    }

    const context = transcripts
      .map((t) => `[${t.title}]:\n${t.content}`)
      .join('\n\n---\n\n');

    const aiResponse = await askChatbot(question, context);

    const sourceTranscripts = transcripts.map((t) => t.title).join(', ');
    const result = await global.db.query(
      'INSERT INTO chat_history (project_id, user_question, ai_response, source_transcripts) VALUES ($1, $2, $3, $4) RETURNING *',
      [projectId, question, aiResponse, sourceTranscripts]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear chat history for a project
router.delete('/history/:projectId', async (req, res) => {
  try {
    await global.db.query('DELETE FROM chat_history WHERE project_id = $1', [req.params.projectId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
