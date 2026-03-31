const express = require("express");
const cors = require("cors");
const { Client } = require("pg");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database client
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect().catch(err => console.error("Database connection error:", err));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running!" });
});

// Get all meetings
app.get("/api/meetings", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM meetings ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

// Get meeting by ID with decisions and action items
app.get("/api/meetings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const meetingResult = await client.query("SELECT * FROM meetings WHERE id = $1", [id]);
    const decisionsResult = await client.query("SELECT * FROM decisions WHERE meeting_id = $1", [id]);
    const actionItemsResult = await client.query("SELECT * FROM action_items WHERE meeting_id = $1", [id]);

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    res.json({
      meeting: meetingResult.rows[0],
      decisions: decisionsResult.rows,
      action_items: actionItemsResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

// Create a new meeting
app.post("/api/meetings", async (req, res) => {
  try {
    const { title, transcript } = req.body;

    if (!title || !transcript) {
      return res.status(400).json({ error: "Title and transcript are required" });
    }

    const result = await client.query(
      "INSERT INTO meetings (title, transcript) VALUES ($1, $2) RETURNING *",
      [title, transcript]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

// Add a decision to a meeting
app.post("/api/meetings/:id/decisions", async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!decision) {
      return res.status(400).json({ error: "Decision text is required" });
    }

    const result = await client.query(
      "INSERT INTO decisions (meeting_id, decision) VALUES ($1, $2) RETURNING *",
      [id, decision]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add decision" });
  }
});

// Add an action item to a meeting
app.post("/api/meetings/:id/action-items", async (req, res) => {
  try {
    const { id } = req.params;
    const { action, assigned_to, due_date } = req.body;

    if (!action) {
      return res.status(400).json({ error: "Action text is required" });
    }

    const result = await client.query(
      "INSERT INTO action_items (meeting_id, action, assigned_to, due_date) VALUES ($1, $2, $3, $4) RETURNING *",
      [id, action, assigned_to, due_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to add action item" });
  }
});

// Mark action item as completed
app.patch("/api/action-items/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await client.query(
      "UPDATE action_items SET completed = TRUE WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Action item not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update action item" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
