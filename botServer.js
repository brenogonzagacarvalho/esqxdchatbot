require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const app = express();
const telegramBot = require('./telegramBot'); 
const db = require('./database');

// Configurando o servidor Express
const PORT = process.env.PORT || 3000;
const TOKEN = process.env.TELEGRAM_TOKEN;

if (!TOKEN) {
  console.error('Erro: TELEGRAM_TOKEN não está definido nas variáveis de ambiente.');
  process.exit(1);
}

app.use(express.json());

app.post(`/bot${TOKEN}`, (req, res) => {
  telegramBot.handleUpdate(req.body, res);
});

app.get('/', (req, res) => {
  res.send('Chatbot está rodando!');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;