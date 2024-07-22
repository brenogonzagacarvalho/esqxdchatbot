require('dotenv').config();
const fs = require('fs');
const pdf = require('pdf-parse');
const { Telegraf } = require('telegraf');
const mysql = require('mysql');
const natural = require('natural');
const express = require('express');


// Configurando o servidor Express
const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot is running'));
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Conectando ao banco de dados MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the MySQL database:', err);
    process.exit(1);
  }
  console.log('Connected to the MySQL database.');
});

// Criar a tabela chat_history, se não existir
const createTableQuery = `
CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(createTableQuery, (err, result) => {
  if (err) throw err;
  console.log('Table created or already exists.');
});

// Token do bot obtido do BotFather
const TOKEN = process.env.TELEGRAM_TOKEN;

// Configurando o bot do Telegram
const bot = new Telegraf(TOKEN);

// Função para extrair texto do PDF
async function extractTextFromPDF(pdfPath) {
  let dataBuffer = fs.readFileSync(pdfPath);
  let data = await pdf(dataBuffer);
  return data.text;
}

// Função para processar o texto extraído do PDF
function processText(text) {
  const lines = text.split('\n');
  let trainingData = [];
  let currentQuestion = null;

  // Processar linhas do texto para identificar perguntas e respostas
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.endsWith('?')) {
      currentQuestion = trimmedLine;
    } else if (currentQuestion) {
      trainingData.push({ input: currentQuestion, output: trimmedLine });
      currentQuestion = null;
    }
  });

  return trainingData;
}

// Treinamento do ChatBot
const classifier = new natural.BayesClassifier();

async function trainChatbot() {
  try {
    const text = await extractTextFromPDF('respostas.pdf');
    const trainingData = processText(text);

    trainingData.forEach(item => {
      classifier.addDocument(item.input, item.output);
    });

    classifier.train();
    console.log('Chatbot trained successfully.');
  } catch (err) {
    console.error('Error training chatbot:', err);
    process.exit(1); // Para garantir que o bot não inicie sem treinamento adequado
  }
}

bot.start((ctx) => ctx.reply('Olá! Eu sou o chatbot da coordenação de engenharia de software. Como posso ajudar você?'));

bot.on('text', (ctx) => {
  try {
    let userMessage = ctx.message.text;
    let botResponse = classifier.classify(userMessage);

    const insertQuery = `INSERT INTO chat_history (user_message, bot_response) VALUES (?, ?)`;

    db.query(insertQuery, [userMessage, botResponse], (err, result) => {
      if (err) throw err;
      console.log(`A row has been inserted with id ${result.insertId}`);
    });

    ctx.reply(botResponse);
  } catch (error) {
    console.error('Error processing message:', error);
    ctx.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
  }
});


// Iniciando o bot
bot.launch().then(() => {
  console.log('Bot is running');
  trainChatbot();
});