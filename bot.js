require('dotenv').config();
const express = require('express');
const app = express(); 
const bot = require('./telegramBot');
const { trainChatbot } = require('./trainChatbot');
const db = require('./database'); 

// Configurando o servidor Express
const port = process.env.PORT || 3000;

app.use(express.json());

app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

trainChatbot().then(() => {
  bot.launch().then(() => {
    console.log('Bot is running');
  }).catch(err => {
    console.error('Error launching bot:', err);
  });
}).catch(err => {
  console.error('Error training chatbot:', err);
});
// Iniciar o servidor Express
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});

module.exports = app;