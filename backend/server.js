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
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/", apiLimiter);

const heavyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".txt" || ext === ".vtt") {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type: " + ext + ". Only .txt and .vtt are allowed."));
    }
  },
});

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

client.connect().catch((err) => console.error("Database connection error:", err));

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is running!" });
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

app.get("/api/projects", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM projects ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Project name is required" });
    }
    const result = await client.query(
      "INSERT INTO projects (name, description) VALUES ($1, $2) RETURNING *",
      [name.trim(), description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query("SELECT * FROM projects WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await client.query("DELETE FROM chat_messages WHERE project_id = $1", [id]);
    await client.query(
      "DELETE FROM action_items WHERE transcript_id IN (SELECT id FROM transcripts WHERE project_id = $1)",
      [id]
    );
    await client.query(
      "DELETE FROM decisions WHERE transcript_id IN (SELECT id FROM transcripts WHERE project_id = $1)",
      [id]
    );
    await client.query("DELETE FROM transcripts WHERE project_id = $1", [id]);
    const result = await client.query("DELETE FROM projects WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json({ message: "Project deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// ---------------------------------------------------------------------------
// Transcripts
// ---------------------------------------------------------------------------

app.post("/api/transcripts/upload", heavyLimiter, upload.array("files"), async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const projectCheck = await client.query("SELECT id FROM projects WHERE id = $1", [projectId]);
    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results = [];

    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      const rawContent = file.buffer.toString("utf8");

      let parsed;
      if (ext === "vtt") {
        parsed = parseVTT(rawContent);
      } else {
        parsed = parseTXT(rawContent);
      }

      const { text, speakers, wordCount } = parsed;
      const title = path.basename(file.originalname, path.extname(file.originalname));

      const transcriptResult = await client.query(
        "INSERT INTO transcripts (project_id, title, content, file_type, word_count, speaker_count) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
        [projectId, title, text, ext, wordCount, speakers.length]
      );
      const transcript = transcriptResult.rows[0];

      try {
        const decisions = await extractDecisions(text);
        for (const decision of decisions) {
          await client.query(
            "INSERT INTO decisions (transcript_id, decision) VALUES ($1, $2)",
            [transcript.id, decision]
          );
        }

        const actionItems = await extractActionItems(text);
        for (const item of actionItems) {
          await client.query(
            "INSERT INTO action_items (transcript_id, action, assigned_to, due_date) VALUES ($1, $2, $3, $4)",
            [transcript.id, item.action, item.assigned_to || null, item.due_date || null]
          );
        }
      } catch (aiErr) {
        console.error("AI extraction failed for", file.originalname, aiErr.message);
      }

      results.push({
        id: transcript.id,
        title: transcript.title,
        file_type: ext,
        word_count: wordCount,
        speaker_count: speakers.length,
        speakers,
      });
    }

    res.status(201).json({ message: "Transcripts uploaded successfully", results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to upload transcripts" });
  }
});

app.get("/api/transcripts/project/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await client.query(
      "SELECT id, project_id, title, file_type, word_count, speaker_count, meeting_date, created_at FROM transcripts WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch transcripts" });
  }
});

app.get("/api/transcripts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transcriptResult = await client.query("SELECT * FROM transcripts WHERE id = $1", [id]);
    if (transcriptResult.rows.length === 0) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    const decisionsResult = await client.query(
      "SELECT * FROM decisions WHERE transcript_id = $1 ORDER BY created_at ASC",
      [id]
    );
    const actionItemsResult = await client.query(
      "SELECT * FROM action_items WHERE transcript_id = $1 ORDER BY created_at ASC",
      [id]
    );
    res.json({
      transcript: transcriptResult.rows[0],
      decisions: decisionsResult.rows,
      action_items: actionItemsResult.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch transcript" });
  }
});

app.delete("/api/transcripts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query("DELETE FROM transcripts WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Transcript not found" });
    }
    res.json({ message: "Transcript deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete transcript" });
  }
});

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

app.patch("/api/action-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { completed } = req.body;
    const result = await client.query(
      "UPDATE action_items SET completed = $1 WHERE id = $2 RETURNING *",
      [completed, id]
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

app.delete("/api/action-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await client.query("DELETE FROM action_items WHERE id = $1 RETURNING id", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Action item not found" });
    }
    res.json({ message: "Action item deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete action item" });
  }
});

// ---------------------------------------------------------------------------
// Sentiment Analysis
// ---------------------------------------------------------------------------

app.get("/api/sentiment/transcript/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const transcriptResult = await client.query("SELECT content FROM transcripts WHERE id = $1", [id]);
    if (transcriptResult.rows.length === 0) {
      return res.status(404).json({ error: "Transcript not found" });
    }

    const content = transcriptResult.rows[0].content;
    const lines = content.split("\n").filter((l) => l.trim());

    const positiveWords = [
      "agree", "great", "good", "excellent", "happy", "love", "perfect",
      "amazing", "wonderful", "fantastic", "yes", "definitely", "absolutely",
      "exciting", "awesome", "thank", "thanks", "pleased", "glad", "success",
      "well done", "brilliant",
    ];
    const negativeWords = [
      "disagree", "bad", "poor", "terrible", "hate", "wrong", "issue",
      "problem", "concern", "worried", "unfortunately", "fail", "failure",
      "disappointed", "angry", "frustrat", "difficult", "never", "worst",
      "awful", "no way", "confused", "delay",
    ];

    const results = lines.map((line, index) => {
      const lower = line.toLowerCase();
      const speakerMatch = line.match(/^([A-Za-z\s]+?):/);
      const speaker = speakerMatch ? speakerMatch[1].trim() : "Unknown";

      let posCount = 0;
      let negCount = 0;
      positiveWords.forEach((w) => { if (lower.includes(w)) posCount++; });
      negativeWords.forEach((w) => { if (lower.includes(w)) negCount++; });

      let sentiment_label = "neutral";
      let sentiment_score = 0;

      if (posCount > negCount) {
        sentiment_label = "positive";
        sentiment_score = Math.min(posCount * 0.3, 1);
      } else if (negCount > posCount) {
        sentiment_label = "negative";
        sentiment_score = -Math.min(negCount * 0.3, 1);
      }

      return {
        id: index + 1,
        transcript_id: parseInt(id, 10),
        speaker,
        text: line,
        sentiment_label,
        sentiment_score,
      };
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to analyze sentiment" });
  }
});

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

app.get("/api/chat/history/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const result = await client.query(
      "SELECT * FROM chat_messages WHERE project_id = $1 ORDER BY created_at ASC",
      [projectId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

async function handleChatAsk(req, res) {
  try {
    const { projectId, question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }
    if (!projectId) {
      return res.status(400).json({ error: "projectId is required" });
    }

    const transcriptsResult = await client.query(
      "SELECT id, title, content FROM transcripts WHERE project_id = $1",
      [projectId]
    );
    const transcripts = transcriptsResult.rows;

    const { answer, sources } = await chatQuery(question, transcripts);
    const sourceSummary = sources.map((s) => s.transcript_title).join(", ") || "N/A";

    const msgResult = await client.query(
      "INSERT INTO chat_messages (project_id, user_question, ai_response, source_transcripts) VALUES ($1, $2, $3, $4) RETURNING *",
      [projectId, question.trim(), answer, sourceSummary]
    );

    res.json({
      ...msgResult.rows[0],
      sources,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process chat query" });
  }
}

app.post("/api/chat/ask", heavyLimiter, handleChatAsk);
app.post("/api/chat", heavyLimiter, handleChatAsk);

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function getProjectExportData(projectId) {
  const rows = await client.query(
    "SELECT t.title AS transcript_title, 'Decision' AS type, d.decision AS content, NULL AS assigned_to, NULL AS due_date, NULL AS completed FROM decisions d JOIN transcripts t ON t.id = d.transcript_id WHERE t.project_id = $1 UNION ALL SELECT t.title AS transcript_title, 'Action Item' AS type, ai.action AS content, ai.assigned_to, ai.due_date, ai.completed::text FROM action_items ai JOIN transcripts t ON t.id = ai.transcript_id WHERE t.project_id = $1 ORDER BY transcript_title, type",
    [projectId]
  );
  return rows.rows;
}

function sanitizeFilename(value) {
  return String(value).replace(/[^a-zA-Z0-9_\-]/g, "_");
}

app.get("/api/export/csv/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const safeId = sanitizeFilename(projectId);
    const data = await getProjectExportData(projectId);

    const header = "Transcript,Type,Content,Assigned To,Due Date,Completed\n";
    const csvRows = data.map((row) => {
      const escape = (v) => '"' + String(v || "").replace(/"/g, '""') + '"';
      return [
        escape(row.transcript_title),
        escape(row.type),
        escape(row.content),
        escape(row.assigned_to || ""),
        escape(row.due_date || ""),
        escape(row.completed || ""),
      ].join(",");
    });

    const csv = header + csvRows.join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="meeting-export-' + safeId + '.csv"');
    res.send(csv);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate CSV export" });
  }
});

app.get("/api/export/pdf/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    const safeId = sanitizeFilename(projectId);
    const projectRes = await client.query("SELECT * FROM projects WHERE id = $1", [projectId]);
    const projectName = projectRes.rows.length > 0 ? projectRes.rows[0].name : "Project " + projectId;
    const data = await getProjectExportData(projectId);

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="meeting-export-' + safeId + '.pdf"');
    doc.pipe(res);

    // Title
    doc.fontSize(20).font("Helvetica-Bold").text("Meeting Intelligence Report", { align: "center" });
    doc.fontSize(14).font("Helvetica").text("Project: " + projectName, { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text("Generated: " + new Date().toLocaleString(), { align: "center" });
    doc.moveDown(2);

    if (data.length === 0) {
      doc.fontSize(12).text("No decisions or action items found for this project.");
    } else {
      let currentTranscript = null;
      for (const row of data) {
        if (row.transcript_title !== currentTranscript) {
          currentTranscript = row.transcript_title;
          doc.moveDown();
          doc.fontSize(14).font("Helvetica-Bold").text("[Transcript] " + currentTranscript);
          doc.moveDown(0.5);
        }
        const isDecision = row.type === "Decision";
        doc.fontSize(11).font("Helvetica-Bold").text(
          isDecision ? "[DECISION]" : "[ACTION ITEM]",
          { continued: false }
        );
        doc.fontSize(11).font("Helvetica").text("   " + row.content);
        if (!isDecision) {
          if (row.assigned_to) {
            doc.fontSize(10).fillColor("gray").text("   Assigned to: " + row.assigned_to);
          }
          if (row.due_date) {
            doc.fontSize(10).text("   Due: " + row.due_date);
          }
          if (row.completed === "true") {
            doc.fontSize(10).text("   [Completed]");
          }
          doc.fillColor("black");
        }
        doc.moveDown(0.5);
      }
    }

    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate PDF export" });
  }
});

// ---------------------------------------------------------------------------
// Legacy meetings routes
// ---------------------------------------------------------------------------

app.get("/api/meetings", async (req, res) => {
  try {
    const result = await client.query("SELECT * FROM meetings ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

app.get("/api/meetings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const meetingResult = await client.query("SELECT * FROM meetings WHERE id = $1", [id]);
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ error: "Meeting not found" });
    }
    res.json({ meeting: meetingResult.rows[0], decisions: [], action_items: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch meeting" });
  }
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server running on http://localhost:" + PORT);
});