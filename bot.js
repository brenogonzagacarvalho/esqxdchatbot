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
const classifier = new natural.LogisticRegressionClassifier();

const classifyMessage = (message) => {
  try {
    if (message && message.length > 0) {
      const classifications = classifier.getClassifications(message);
      return classifications;
    } else {
      throw new Error("Invalid message input");
    }
  } catch (error) {
    console.error("Error processing message:", error);
    return null;
  }
};

async function trainChatbot() {
  try {
    const text = await extractTextFromPDF('respostas1.pdf');
    console.log('Texto extraído do PDF:', text);
    const trainingData = processText(text);
    console.log('Dados de treinamento:', trainingData);

    if (trainingData.length === 0) {
      throw new Error('No training data found.');
    }

    trainingData.forEach(item => {
      classifier.addDocument(item.input, item.output);
    });

    trainingData.forEach(item => {
      console.log('Adding document to classifier:', item);
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
    console.log('Mensagem do usuário:', userMessage);

    // Certifique-se de que o classificador está treinado antes de classificar
    if (!classifier.docs || classifier.docs.length === 0) {
      throw new Error("Classifier has not been trained.");
    }

    let botResponse = classifier.classify(userMessage);
    console.log('Resposta do bot:', botResponse);

    const insertQuery = `INSERT INTO chat_history (user_message, bot_response) VALUES (?, ?)`;

    db.query(insertQuery, [userMessage, botResponse], (err, result) => {
      if (err) {
        console.error('Erro ao inserir no banco de dados:', err);
        throw err;
      }
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