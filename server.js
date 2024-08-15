require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const db = require('./database');
const bot = require('./telegramBot');
const { trainChatbot } = require('./trainChatbot');

app.use(bodyParser.json());

app.post(`/bot${process.env.TELEGRAM_TOKEN}`, (req, res) => {
  bot.handleUpdate(req.body, res);
});

trainChatbot().then(() => {
  console.log('Chatbot trained successfully.');
}).catch(err => {
  console.error('Error training chatbot:', err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

module.exports = app;