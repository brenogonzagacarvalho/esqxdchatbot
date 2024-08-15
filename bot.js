require('dotenv').config();
const express = require('express');
const app = require('./server');
const db = require('./database');
const bot = require('./telegramBot');
const { trainChatbot } = require('./trainChatbot');

// Configurando o servidor Express
const port = process.env.PORT || 3000;

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