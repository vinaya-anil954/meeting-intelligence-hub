const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDB() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    console.log("✅ projects");

    await pool.query(`CREATE TABLE IF NOT EXISTS transcripts (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      file_type VARCHAR(10),
      word_count INTEGER DEFAULT 0,
      speaker_count INTEGER DEFAULT 0,
      meeting_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    console.log("✅ transcripts");

    await pool.query(`CREATE TABLE IF NOT EXISTS decisions (
      id SERIAL PRIMARY KEY,
      transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
      decision TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    console.log("✅ decisions");

    await pool.query(`CREATE TABLE IF NOT EXISTS action_items (
      id SERIAL PRIMARY KEY,
      transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      assigned_to VARCHAR(255),
      due_date VARCHAR(100),
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    console.log("✅ action_items");

    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_question TEXT NOT NULL,
      ai_response TEXT NOT NULL,
      source_transcripts TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );`);
    console.log("✅ chat_messages");

    console.log("\n🎉 Database ready!");
    await pool.end();
  } catch (err) {
    console.error("❌ Init failed:", err);
    process.exit(1);
  }
}

initDB();
