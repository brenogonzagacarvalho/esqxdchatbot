const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect(err => {
  if (err) {
    console.error('Error connecting to the PostgreSQL database:', err);
    process.exit(1);
  } else {
    console.log('Connected to the PostgreSQL database.');
  }
});

const createTableQuery = `
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

client.query(createTableQuery, (err, result) => {
  if (err) {
    console.error('Error creating table:', err);
    process.exit(1);
  } else {
    console.log('Table chat_history created or already exists.');
  }
});

module.exports = client;