const { Telegraf } = require('telegraf');
const db = require('./database');
const { preprocessText, classifier, trainChatbot, retrainChatbot } = require('./chatbot');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);

bot.start((ctx) => ctx.reply('Olá! Eu sou o chatbot da coordenação de engenharia de software. Como posso ajudar você?'));
bot.help((ctx) => ctx.reply('Como posso ajudar?'));
bot.on('text', (ctx) => {
  try {
    let userMessage = ctx.message.text;
    console.log('Mensagem do usuário:', userMessage);

    if (!classifier.docs || classifier.docs.length === 0) {
      throw new Error("Classifier has not been trained.");
    }

    const classifications = classifier.getClassifications(userMessage);
    const highestClassification = classifications[0];
    let botResponse;

    if (highestClassification.value < 0.5) {
      botResponse = 'Desculpe, não tenho certeza sobre a resposta. Pode reformular a pergunta ou fornecer mais informações?';
    } else {
      botResponse = highestClassification.label;
    }

    console.log('Resposta do bot:', botResponse);

    const insertQuery = `INSERT INTO chat_history (user_message, bot_response) VALUES (?, ?)`;

    db.query(insertQuery, [userMessage, botResponse], (err, result) => {
      if (err) {
        console.error('Error inserting into database:', err);
      }
      console.log(`A row has been inserted with id ${result.insertId}`);
    });

    ctx.reply(botResponse);
  } catch (error) {
    console.error('Error processing message:', error);
    ctx.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
  }
});

const retrainInterval = 24 * 60 * 60 * 1000;
setInterval(retrainChatbot, retrainInterval);

bot.telegram.setWebhook(`https://esqxdchatbot.vercel.app/bot${TOKEN}`);

module.exports = bot;