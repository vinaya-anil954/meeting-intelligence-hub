const { Client } = require("pg");
require("dotenv").config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    await client.connect();
    console.log("Connected to database!");

    // Create meetings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        transcript TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Meetings table created!");

    // Create decisions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS decisions (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        decision TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Decisions table created!");

    // Create action_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS action_items (
        id SERIAL PRIMARY KEY,
        meeting_id INTEGER NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        action TEXT NOT NULL,
        assigned_to VARCHAR(255),
        due_date DATE,
        completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Action items table created!");

    console.log("Database initialization complete!");
    await client.end();
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

initDB();