const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { Client } = require("pg");
const PDFDocument = require("pdfkit");
const rateLimit = require("express-rate-limit");
const { extractDecisions, extractActionItems, chatQuery } = require("./ai-service");
const { parseVTT, parseTXT } = require("./vtt-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
});
app.use("/api/", apiLimiter);

const heavyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect();

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running!" });
});

// ---------------------------------------------------------------------------
// PROJECTS
// ---------------------------------------------------------------------------

app.get("/api/projects", async (req, res) => {
  const result = await client.query("SELECT * FROM projects ORDER BY created_at DESC");
  res.json(result.rows);
});

app.post("/api/projects", async (req, res) => {
  const { name, description } = req.body;

  const result = await client.query(
    "INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *",
    [name, description]
  );

  res.json(result.rows[0]);
});

// ---------------------------------------------------------------------------
// TRANSCRIPTS UPLOAD (FIXED EXTRACTION)
// ---------------------------------------------------------------------------

app.post("/api/transcripts/upload", heavyLimiter, upload.array("files"), async (req, res) => {
  try {
    const { projectId } = req.body;

    const results = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const rawContent = file.buffer.toString("utf8");

      let parsed;
      if (ext === ".vtt") parsed = parseVTT(rawContent);
      else parsed = parseTXT(rawContent);

      const text = parsed.text;
      const title = file.originalname;

      const transcriptResult = await client.query(
        "INSERT INTO transcripts (project_id, title, content) VALUES ($1, $2, $3) RETURNING *",
        [projectId, title, text]
      );

      const transcript = transcriptResult.rows[0];

      // ✅ CLEAN EXTRACTION
      const decisions = await extractDecisions(text);
      const actions = await extractActionItems(text);

      for (const d of decisions) {
        await client.query(
          "INSERT INTO decisions (transcript_id, decision) VALUES ($1, $2)",
          [transcript.id, d]
        );
      }

      for (const a of actions) {
        await client.query(
          "INSERT INTO action_items (transcript_id, action, assigned_to, due_date) VALUES ($1, $2, $3, $4)",
          [
            transcript.id,
            a.action,
            a.assigned_to || null,
            a.due_date || null
          ]
        );
      }

      results.push(transcript);
    }

    res.json({ success: true, results });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ---------------------------------------------------------------------------
// TRANSCRIPT DETAILS
// ---------------------------------------------------------------------------

app.get("/api/transcripts/:id", async (req, res) => {
  const { id } = req.params;

  const transcript = await client.query(
    "SELECT * FROM transcripts WHERE id = $1",
    [id]
  );

  const decisions = await client.query(
    "SELECT * FROM decisions WHERE transcript_id = $1",
    [id]
  );

  const actions = await client.query(
    "SELECT * FROM action_items WHERE transcript_id = $1",
    [id]
  );

  res.json({
    transcript: transcript.rows[0],
    decisions: decisions.rows,
    action_items: actions.rows
  });
});

// ---------------------------------------------------------------------------
// CHAT
// ---------------------------------------------------------------------------

app.post("/api/chat", async (req, res) => {
  const { projectId, question } = req.body;

  const transcripts = await client.query(
    "SELECT title, content FROM transcripts WHERE project_id = $1",
    [projectId]
  );

  const result = await chatQuery(question, transcripts.rows);

  res.json(result);
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});