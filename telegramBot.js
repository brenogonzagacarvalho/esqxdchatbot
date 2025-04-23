require('dotenv').config();
const { Telegraf } = require('telegraf');
const { classifier, trainChatbotFromTxt, saveClassifier } = require('./trainChatbot'); // Função de treinamento ajustada
const db = require('./database');
const fs = require('fs');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);

const userStates = {};

async function startBot() {
  try {
    console.log('Treinando o chatbot com base no arquivo .txt...');
    const trainingData = fs.readFileSync('./public/perguntas_respostas.txt', 'utf-8'); // Carrega o arquivo .txt com os dados de treinamento
    await trainChatbotFromTxt(trainingData); // Treina o chatbot com os dados do arquivo
    console.log('Chatbot treinado com sucesso.');

    bot.start((ctx) => {
      ctx.reply('Olá! Sou o chatbot. Pergunte algo e tentarei ajudar!');
    });

    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const userMessage = ctx.message.text.trim();
      console.log(`Pergunta recebida: "${userMessage}"`);

      // Dentro do bot.on('text') no telegramBot.js
      const classifications = classifier.getClassifications(userMessage);
      console.log(`Classificações para "${userMessage}":`, classifications);

      if (!userStates[userId]) {
        userStates[userId] = { step: 'main_menu' };
      }

      const userState = userStates[userId];

      if (userState.step === 'main_menu') {
        ctx.reply('Escolha uma das opções abaixo para começar:');
        ctx.reply('1. Informações sobre estágio\n2. Informações sobre matrícula\n3. Outras dúvidas');
        userState.step = 'awaiting_option';
      } else if (userState.step === 'awaiting_option') {
        if (userMessage === '1') {
          ctx.reply('Você escolheu informações sobre estágio. Pergunte algo ou digite "voltar" para o menu inicial.');
          userState.step = 'estagio';
        } else if (userMessage === '2') {
          ctx.reply('Você escolheu informações sobre matrícula. Pergunte algo ou digite "voltar" para o menu inicial.');
          userState.step = 'matricula';
        } else if (userMessage === '3') {
          ctx.reply('Você escolheu outras dúvidas. Pergunte algo ou digite "voltar" para o menu inicial.');
          userState.step = 'outras_duvidas';
        } else {
          ctx.reply('Opção inválida. Por favor, escolha uma das opções: 1, 2 ou 3.');
        }
      } else {
        if (userMessage.toLowerCase() === 'voltar') {
          userState.step = 'main_menu';
          ctx.reply('Voltando ao menu inicial...');
          ctx.reply('Escolha uma das opções abaixo para começar:');
          ctx.reply('1. Informações sobre estágio\n2. Informações sobre matrícula\n3. Outras dúvidas');
        } else {
          // Classificar a pergunta usando o classificador
          const classifications = classifier.getClassifications(userMessage);
          console.log(`Classificações para "${userMessage}":`, classifications);
          const highestClassification = classifications[0];

          if (highestClassification && highestClassification.value >= 0.6) {
            // Responder com a melhor classificação
            ctx.reply(`Resposta: ${highestClassification.label}`);
          } else {
            // Caso o classificador não consiga responder, salvar a pergunta no banco de dados
            ctx.reply('Desculpe, não entendi sua pergunta. Vou registrar para melhorar no futuro.');
            await db.query('INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)', [
              userId,
              userMessage,
            ]);
          }
        }
      }
    });

    await bot.launch();
    console.log('Bot está rodando no Telegram.');
  } catch (err) {
    console.error('Erro ao iniciar o bot:', err);
  }
}

startBot();