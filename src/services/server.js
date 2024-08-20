require('dotenv').config();
const express = require('express');
const { Telegraf } = require('telegraf');
const db = require('./database');
const { classifier } = require('../controllers/trainChatbot');
const { handleUserMessage } = require('../controllers/botHelper');

const app = express();
const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

bot.start((ctx) => {
  ctx.reply('Olá! Eu sou o chatbot da coordenação de engenharia de software. Como posso ajudar você?');
});

bot.help((ctx) => ctx.reply('Como posso ajudar?'));

bot.on('text', (ctx) => {
  try {
    handleUserMessage(ctx, classifier);
  } catch (error) {
    console.error('Erro ao processar a mensagem:', error);
    ctx.reply('Ocorreu um erro ao processar sua mensagem.');
  }
});

bot.launch();

app.get('/', (req, res) => {
  res.send('Chatbot está rodando!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});