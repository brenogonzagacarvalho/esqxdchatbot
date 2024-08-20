require('dotenv').config();
const { Telegraf } = require('telegraf');
const db = require('./database');
const { classifier, trainChatbot } = require('./trainChatbot');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);

const userStates = {};

// Função para iniciar o bot após o treinamento
async function startBot() {
  try {
    console.log('Treinando o chatbot...');
    await trainChatbot();
    console.log('Chatbot treinado com sucesso.');

    bot.start((ctx) => {
      userStates[ctx.from.id] = { step: 0 };
      ctx.reply('Olá! Eu sou o chatbot da coordenação de engenharia de software. Como posso ajudar você?');
    });

    bot.on('text', (ctx) => {
      try {
        const userId = ctx.from.id;
        let userMessage = ctx.message.text;
        console.log('Mensagem do usuário:', userMessage);

        const classifications = classifier.getClassifications(userMessage);
        const highestClassification = classifications[0];
        let botResponse;

        // Função para verificar se a confiança é maior que 80%
        function isConfidentEnough(classification) {
          return classification && classification.value >= 0.8;
        }

        if (isConfidentEnough(highestClassification)) {
          botResponse = highestClassification.label;
        } else {
          botResponse = "Desculpe, não entendi sua mensagem.";
        }

        // Verificar se a resposta do bot é uma string legível
        if (typeof botResponse !== 'string' || botResponse.trim() === '') {
          botResponse = "Desculpe, não entendi sua mensagem.";
        }

        ctx.reply(botResponse);
        console.log('Resposta do bot:', botResponse);

        if (!userStates[userId]) {
          userStates[userId] = { step: 0 };
        }

        if (userStates[userId].step === 0) {
          userStates[userId].step = 1;
          setTimeout(() => ctx.reply('Você precisa de mais alguma coisa?'), 1000);
        } else if (userStates[userId].step === 1) {
          userStates[userId].step = 2;
          setTimeout(() => ctx.reply('Posso ajudar com mais alguma coisa?'), 1000);
        } else if (userStates[userId].step === 2) {
          ctx.reply('Obrigado por entrar em contato. Tenha um ótimo dia!');
          setTimeout(() => ctx.reply('Se precisar de mais assistência, entre em contato diretamente com a coordenação do curso.'), 1000);
          delete userStates[userId];
        }
      } catch (error) {
        console.error('Erro ao processar a mensagem:', error);
        ctx.reply('Ocorreu um erro ao processar sua mensagem.');
      }
    });

    await bot.launch();
    console.log('Bot is running');
  } catch (err) {
    console.error('Erro ao treinar o chatbot ou iniciar o bot:', err);
  }
}

// Iniciar o bot após o treinamento
startBot();