const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function initializeDatabase() {
  try {
    const connection = await pool.getConnection();
    console.log('Conectado ao banco de dados MySQL.');

    // Criação da tabela chat_history
    const createChatHistoryTable = `
      CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await connection.query(createChatHistoryTable);

    // Criação da tabela user_data
    const createUserDataTable = `
      CREATE TABLE IF NOT EXISTS user_data (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        matricula TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await connection.query(createUserDataTable);

    // Criação da tabela unanswered_questions
    const createUnansweredQuestionsTable = `
      CREATE TABLE IF NOT EXISTS unanswered_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await connection.query(createUnansweredQuestionsTable);

    connection.release();
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err);
    process.exit(1);
  }
}

initializeDatabase();

module.exports = pool;