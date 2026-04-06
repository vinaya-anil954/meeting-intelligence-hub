const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const { Pool } = require("pg");
const PDFDocument = require("pdfkit");
const rateLimit = require("express-rate-limit");
const { extractDecisions, extractActionItems, chatQuery } = require("./ai-service");
const { parseVTT, parseTXT } = require("./vtt-parser");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 200, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests." } });
app.use("/api/", apiLimiter);
const heavyLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, standardHeaders: true, legacyHeaders: false, message: { error: "Too many requests." } });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".txt" || ext === ".vtt") cb(null, true);
    else cb(new Error("Only .txt and .vtt files are allowed."));
  },
});

// FIX: Pool instead of Client
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.on("error", (err) => console.error("DB pool error:", err));

app.get("/api/health", async (req, res) => {
  try { await pool.query("SELECT 1"); res.json({ status: "ok", db: "connected" }); }
  catch (e) { res.json({ status: "ok", db: "disconnected" }); }
});

// --- Projects ---
app.get("/api/projects", async (req, res) => {
  try { res.json((await pool.query("SELECT * FROM projects ORDER BY created_at DESC")).rows); }
  catch (e) { res.status(500).json({ error: "Failed to fetch projects" }); }
});

app.post("/api/projects", async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Project name is required" });
    const r = await pool.query("INSERT INTO projects (name,description) VALUES ($1,$2) RETURNING *", [name.trim(), description||null]);
    res.status(201).json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: "Failed to create project" }); }
});

app.get("/api/projects/:id", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM projects WHERE id=$1", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Project not found" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: "Failed to fetch project" }); }
});

app.delete("/api/projects/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM chat_messages WHERE project_id=$1", [id]);
    await pool.query("DELETE FROM action_items WHERE transcript_id IN (SELECT id FROM transcripts WHERE project_id=$1)", [id]);
    await pool.query("DELETE FROM decisions WHERE transcript_id IN (SELECT id FROM transcripts WHERE project_id=$1)", [id]);
    await pool.query("DELETE FROM transcripts WHERE project_id=$1", [id]);
    const r = await pool.query("DELETE FROM projects WHERE id=$1 RETURNING id", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch (e) { res.status(500).json({ error: "Failed to delete project" }); }
});

// --- Transcripts ---
app.post("/api/transcripts/upload", heavyLimiter, upload.array("files"), async (req, res) => {
  try {
    const { projectId } = req.body;
    if (!projectId) return res.status(400).json({ error: "projectId is required" });
    const pc = await pool.query("SELECT id FROM projects WHERE id=$1", [projectId]);
    if (!pc.rows.length) return res.status(404).json({ error: "Project not found" });
    if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });

    const results = [];
    for (const file of req.files) {
      const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
      const rawContent = file.buffer.toString("utf8");
      const parsed = ext === "vtt" ? parseVTT(rawContent) : parseTXT(rawContent);
      const { text, speakers, wordCount } = parsed;
      const title = path.basename(file.originalname, path.extname(file.originalname));

      const tr = await pool.query(
        "INSERT INTO transcripts (project_id,title,content,file_type,word_count,speaker_count) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
        [projectId, title, text, ext, wordCount, speakers.length]
      );
      const transcript = tr.rows[0];

      // FIX: await async calls + use correct exported function names
      try {
        const decisions = await extractDecisions(text);
        for (const d of decisions) {
          await pool.query("INSERT INTO decisions (transcript_id,decision) VALUES ($1,$2)", [transcript.id, d]);
        }
        const items = await extractActionItems(text);
        for (const item of items) {
          await pool.query(
            "INSERT INTO action_items (transcript_id,action,assigned_to,due_date) VALUES ($1,$2,$3,$4)",
            [transcript.id, item.action, item.assigned_to||null, item.due_date||null]
          );
        }
      } catch (aiErr) {
        console.error("AI extraction failed for", file.originalname, aiErr.message);
      }

      results.push({ id: transcript.id, title, file_type: ext, word_count: wordCount, speaker_count: speakers.length, speakers });
    }
    res.status(201).json({ message: "Transcripts uploaded successfully", results });
  } catch (e) { res.status(500).json({ error: e.message || "Failed to upload transcripts" }); }
});

app.get("/api/transcripts/project/:projectId", async (req, res) => {
  try {
    const r = await pool.query(
      "SELECT id,project_id,title,file_type,word_count,speaker_count,meeting_date,created_at FROM transcripts WHERE project_id=$1 ORDER BY created_at DESC",
      [req.params.projectId]
    );
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: "Failed to fetch transcripts" }); }
});

app.get("/api/transcripts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const tr = await pool.query("SELECT * FROM transcripts WHERE id=$1", [id]);
    if (!tr.rows.length) return res.status(404).json({ error: "Transcript not found" });
    const decisions = await pool.query("SELECT * FROM decisions WHERE transcript_id=$1 ORDER BY created_at ASC", [id]);
    const actions = await pool.query("SELECT * FROM action_items WHERE transcript_id=$1 ORDER BY created_at ASC", [id]);
    res.json({ transcript: tr.rows[0], decisions: decisions.rows, action_items: actions.rows });
  } catch (e) { res.status(500).json({ error: "Failed to fetch transcript" }); }
});

app.delete("/api/transcripts/:id", async (req, res) => {
  try {
    const id = req.params.id;
    await pool.query("DELETE FROM action_items WHERE transcript_id=$1", [id]);
    await pool.query("DELETE FROM decisions WHERE transcript_id=$1", [id]);
    const r = await pool.query("DELETE FROM transcripts WHERE id=$1 RETURNING id", [id]);
    if (!r.rows.length) return res.status(404).json({ error: "Transcript not found" });
    res.json({ message: "Transcript deleted" });
  } catch (e) { res.status(500).json({ error: "Failed to delete transcript" }); }
});

// --- Action Items ---
app.patch("/api/action-items/:id", async (req, res) => {
  try {
    const r = await pool.query("UPDATE action_items SET completed=$1 WHERE id=$2 RETURNING *", [req.body.completed, req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Action item not found" });
    res.json(r.rows[0]);
  } catch (e) { res.status(500).json({ error: "Failed to update action item" }); }
});

app.delete("/api/action-items/:id", async (req, res) => {
  try {
    const r = await pool.query("DELETE FROM action_items WHERE id=$1 RETURNING id", [req.params.id]);
    if (!r.rows.length) return res.status(404).json({ error: "Action item not found" });
    res.json({ message: "Action item deleted" });
  } catch (e) { res.status(500).json({ error: "Failed to delete action item" }); }
});

// --- Sentiment ---
app.get("/api/sentiment/transcript/:id", async (req, res) => {
  try {
    const tr = await pool.query("SELECT content FROM transcripts WHERE id=$1", [req.params.id]);
    if (!tr.rows.length) return res.status(404).json({ error: "Transcript not found" });
    const lines = tr.rows[0].content.split("\n").filter(l => l.trim());
    const pos = ["agree","great","good","excellent","happy","love","perfect","amazing","wonderful","fantastic","yes","definitely","absolutely","exciting","awesome","thank","thanks","pleased","glad","success","brilliant"];
    const neg = ["disagree","bad","poor","terrible","hate","wrong","issue","problem","concern","worried","unfortunately","fail","failure","disappointed","angry","frustrat","difficult","never","worst","awful","confused","delay"];
    const results = lines.map((line, i) => {
      const lower = line.toLowerCase();
      const spk = (line.match(/^([A-Za-z\s]+?):/) || [])[1]?.trim() || "Unknown";
      let p=0,n=0;
      pos.forEach(w => { if(lower.includes(w)) p++; });
      neg.forEach(w => { if(lower.includes(w)) n++; });
      const label = p>n ? "positive" : n>p ? "negative" : "neutral";
      const score = p>n ? Math.min(p*0.3,1) : n>p ? -Math.min(n*0.3,1) : 0;
      return { id:i+1, transcript_id:parseInt(req.params.id,10), speaker:spk, text:line, sentiment_label:label, sentiment_score:score };
    });
    res.json(results);
  } catch (e) { res.status(500).json({ error: "Failed to analyze sentiment" }); }
});

// --- Chat (FIX: chatQuery now properly imported and awaited) ---
app.get("/api/chat/history/:projectId", async (req, res) => {
  try {
    const r = await pool.query("SELECT * FROM chat_messages WHERE project_id=$1 ORDER BY created_at ASC", [req.params.projectId]);
    res.json(r.rows);
  } catch (e) { res.status(500).json({ error: "Failed to fetch chat history" }); }
});

async function handleChatAsk(req, res) {
  try {
    const { projectId, question } = req.body;
    if (!question?.trim()) return res.status(400).json({ error: "Question is required" });
    if (!projectId) return res.status(400).json({ error: "projectId is required" });

    const tr = await pool.query("SELECT id,title,content FROM transcripts WHERE project_id=$1", [projectId]);
    if (!tr.rows.length) return res.status(400).json({ error: "No transcripts found. Upload transcripts first." });

    const { answer, sources } = await chatQuery(question, tr.rows);
    const sourceSummary = sources.map(s => s.transcript_title).join(", ") || "N/A";
    const msg = await pool.query(
      "INSERT INTO chat_messages (project_id,user_question,ai_response,source_transcripts) VALUES ($1,$2,$3,$4) RETURNING *",
      [projectId, question.trim(), answer, sourceSummary]
    );
    res.json({ ...msg.rows[0], sources });
  } catch (e) { res.status(500).json({ error: "Failed to process chat query" }); }
}
app.post("/api/chat/ask", heavyLimiter, handleChatAsk);
app.post("/api/chat", heavyLimiter, handleChatAsk);

// --- Export ---
function sanitize(v) { return String(v).replace(/[^a-zA-Z0-9_-]/g,"_"); }

app.get("/api/export/csv/:transcriptId", async (req, res) => {
  try {
    const id = req.params.transcriptId;
    const decisions = await pool.query("SELECT 'Decision' AS type, decision AS content, NULL AS assigned_to, NULL AS due_date FROM decisions WHERE transcript_id=$1", [id]);
    const actions = await pool.query("SELECT 'Action Item' AS type, action AS content, assigned_to, due_date FROM action_items WHERE transcript_id=$1", [id]);
    const data = [...decisions.rows, ...actions.rows];
    const esc = v => '"' + String(v||"").replace(/"/g,'""') + '"';
    const csv = "Type,Content,Assigned To,Due Date\n" + data.map(r => [esc(r.type),esc(r.content),esc(r.assigned_to||""),esc(r.due_date||"")].join(",")).join("\n");
    res.setHeader("Content-Type","text/csv");
    res.setHeader("Content-Disposition",'attachment; filename="export-'+sanitize(id)+'.csv"');
    res.send(csv);
  } catch (e) { res.status(500).json({ error: "Export failed" }); }
});

app.get("/api/export/pdf/:transcriptId", async (req, res) => {
  try {
    const id = req.params.transcriptId;
    const tr = await pool.query("SELECT title FROM transcripts WHERE id=$1", [id]);
    const title = tr.rows[0]?.title || "Transcript";
    const decisions = await pool.query("SELECT decision FROM decisions WHERE transcript_id=$1", [id]);
    const actions = await pool.query("SELECT action,assigned_to,due_date,completed FROM action_items WHERE transcript_id=$1", [id]);
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type","application/pdf");
    res.setHeader("Content-Disposition",'attachment; filename="export-'+sanitize(id)+'.pdf"');
    doc.pipe(res);
    doc.fontSize(20).font("Helvetica-Bold").text("Meeting Intelligence Report", { align:"center" });
    doc.fontSize(14).font("Helvetica").text("Transcript: "+title, { align:"center" });
    doc.fontSize(10).text("Generated: "+new Date().toLocaleString(), { align:"center" });
    doc.moveDown(2);
    if (decisions.rows.length) {
      doc.fontSize(14).font("Helvetica-Bold").text("DECISIONS");
      doc.moveDown(0.5);
      decisions.rows.forEach(r => { doc.fontSize(11).font("Helvetica").text("• "+r.decision); doc.moveDown(0.3); });
    }
    doc.moveDown();
    if (actions.rows.length) {
      doc.fontSize(14).font("Helvetica-Bold").text("ACTION ITEMS");
      doc.moveDown(0.5);
      actions.rows.forEach(r => {
        doc.fontSize(11).font("Helvetica-Bold").text(r.action);
        if (r.assigned_to) doc.fontSize(10).font("Helvetica").fillColor("gray").text("  Assigned to: "+r.assigned_to);
        if (r.due_date) doc.fontSize(10).fillColor("gray").text("  Due: "+r.due_date);
        doc.fillColor("black").moveDown(0.5);
      });
    }
    doc.end();
  } catch (e) { res.status(500).json({ error: "PDF export failed" }); }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log("Server running on http://localhost:" + PORT));
