require('dotenv').config();
const { Telegraf } = require('telegraf');
const { classifier, respostasMap, trainChatbotFromTxt, loadClassifier } = require('./trainChatbot');
const db = require('./database');
const fs = require('fs');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);
const userStates = {};

async function initializeDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS unanswered_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Tabela de perguntas não respondidas verificada/criada com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err);
    throw err;
  }
}

function showMainMenu(ctx) {
  ctx.reply('Escolha uma das opções abaixo para começar:', {
    reply_markup: {
      keyboard: [
        ['1. Informações sobre estágio'],
        ['2. Informações sobre matrícula'],
        ['3. Outras dúvidas']
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
}

async function startBot() {
  try {
    await initializeDatabase();
    await loadClassifier();

    console.log('Treinando o chatbot com base no arquivo JSON...');
    const jsonData = JSON.parse(fs.readFileSync('./public/perguntas_respostas.json', 'utf-8'));

    jsonData.forEach(({ pergunta, intent, resposta }) => {
      classifier.addDocument(pergunta, intent);
      respostasMap.set(intent, resposta);
    });

    classifier.train();
    console.log('Chatbot treinado com sucesso.');

    bot.start((ctx) => {
      const userId = ctx.from.id;
      userStates[userId] = { step: 'main_menu' };
      ctx.reply('Olá! Sou o chatbot. Pergunte algo e tentarei ajudar!');
      showMainMenu(ctx);
    });

    bot.hears(['1', '1. Informações sobre estágio'], (ctx) => {
      userStates[ctx.from.id] = { step: 'estagio' };
      ctx.reply('Você escolheu informações sobre estágio. Pergunte algo ou digite "voltar" para o menu inicial.');
    });

    bot.hears(['2', '2. Informações sobre matrícula'], (ctx) => {
      userStates[ctx.from.id] = { step: 'matricula' };
      ctx.reply('Você escolheu informações sobre matrícula. Pergunte algo ou digite "voltar" para o menu inicial.');
    });

    bot.hears(['3', '3. Outras dúvidas'], (ctx) => {
      userStates[ctx.from.id] = { step: 'outras_duvidas' };
      ctx.reply('Você escolheu outras dúvidas. Pergunte algo ou digite "voltar" para o menu inicial.');
    });

    bot.hears(['voltar', 'menu', 'voltar ao menu'], (ctx) => {
      userStates[ctx.from.id] = { step: 'main_menu' };
      ctx.reply('Voltando ao menu inicial...');
      showMainMenu(ctx);
    });

    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const userMessage = ctx.message.text.trim();

      if (!userStates[userId]) userStates[userId] = { step: 'main_menu' };
      const userState = userStates[userId];

      if (userState.step !== 'main_menu') {
        console.log(`Pergunta recebida: "${userMessage}"`);

        try {
          const classificacoes = classifier.getClassifications(userMessage);
          console.log(`Classificações para "${userMessage}":`, classificacoes);

          if (classificacoes.length > 0 && classificacoes[0].value >= 0.6) {
            const resposta = respostasMap.get(classificacoes[0].label);
            if (resposta) return ctx.reply(`Resposta: ${resposta}`);
          }

          ctx.reply('Desculpe, não entendi sua pergunta. Vou registrar para melhorar no futuro.');
          await db.query('INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)', [
            userId,
            userMessage,
          ]);
        } catch (err) {
          console.error('Erro ao processar pergunta:', err);
          ctx.reply('Ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.');
        }
      } else {
        showMainMenu(ctx);
      }
    });

    await bot.launch();
    console.log('Bot está rodando no Telegram.');
  } catch (err) {
    console.error('Erro ao iniciar o bot:', err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

startBot();
