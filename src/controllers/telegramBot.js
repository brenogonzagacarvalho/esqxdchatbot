require('dotenv').config();
const express = require('express');
const bot = require('../services/telegramBot');
const { trainChatbot } = require('../controllers/trainChatbot');
const db = require('../services/database');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

async function initialize() {
  try {
    await trainChatbot();
    await bot.launch();
    console.log('Bot is running');
  } catch (err) {
    console.error('Error during initialization:', err);
    process.exit(1); // Exit the process with an error code
  }

  app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
  });
}

initialize();

module.exports = app;