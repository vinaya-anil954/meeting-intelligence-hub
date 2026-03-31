const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    await client.connect();
    console.log("Connected to database!");

    // Create projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Projects table created!");

    // Create transcripts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transcripts (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        file_type VARCHAR(10) DEFAULT 'txt',
        word_count INTEGER DEFAULT 0,
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Transcripts table created!");

    // Create decisions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS decisions (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        decision TEXT NOT NULL,
        confidence_score FLOAT DEFAULT 0.8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Decisions table created!");

    // Create action_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS action_items (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        assigned_to VARCHAR(255),
        due_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        confidence_score FLOAT DEFAULT 0.8,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Action items table created!");

    // Create sentiment_analysis table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sentiment_analysis (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        segment_index INTEGER DEFAULT 0,
        segment_text TEXT,
        sentiment_score FLOAT DEFAULT 0,
        sentiment_label VARCHAR(20) DEFAULT 'neutral',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Sentiment analysis table created!");

    // Create chat_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
        user_question TEXT NOT NULL,
        ai_response TEXT NOT NULL,
        source_transcripts TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Chat history table created!");

    // Create topics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS topics (
        id SERIAL PRIMARY KEY,
        transcript_id INTEGER NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
        topic VARCHAR(255) NOT NULL,
        frequency INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Topics table created!");

    console.log("✅ Database initialization complete!");
    await client.end();
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

initDB();