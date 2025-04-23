require('dotenv').config();
const { Telegraf } = require('telegraf');
const db = require('./database');
const { classifier, trainChatbot } = require('./trainChatbot');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);

const userStates = {};

async function startBot() {
  try {
    console.log('Treinando o chatbot...');
    await trainChatbot();
    console.log('Chatbot treinado com sucesso.');

    bot.start(async (ctx) => {
      const userId = ctx.from.id;
      userStates[userId] = { step: 'collecting_matricula' };
      ctx.reply('Olá! Antes de começarmos, por favor, informe sua matrícula:');
    });

    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const userMessage = ctx.message.text.trim();

      if (!userStates[userId]) {
        userStates[userId] = { step: 'collecting_matricula' };
      }

      const userState = userStates[userId];

      if (userState.step === 'collecting_matricula') {
        if (/^\d+$/.test(userMessage)) { // Verifica se a matrícula é numérica
          userState.matricula = userMessage;
          userState.step = 'main_menu';

          // Armazena a matrícula no banco de dados
          await db.query(
            'INSERT INTO user_data (user_id, matricula) VALUES (?, ?)',
            [userId, userMessage]
          );

          ctx.reply('Matrícula registrada com sucesso!');
          ctx.reply('Escolha uma das opções abaixo para começar:');
          ctx.reply('1. Informações sobre estágio\n2. Informações sobre matrícula\n3. Outras dúvidas');
        } else {
          ctx.reply('Por favor, informe uma matrícula válida (apenas números).');
        }
      } else if (userState.step === 'main_menu') {
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
          const classifications = classifier.getClassifications(userMessage);
          const highestClassification = classifications[0];
          let botResponse;

          if (highestClassification && highestClassification.value >= 0.6) {
            botResponse = highestClassification.label;
          } else {
            botResponse = "Desculpe, não entendi sua mensagem.";

            // Salvar a pergunta no banco de dados para treinamento futuro
            await db.query(
              'INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)',
              [userId, userMessage]
            );

            ctx.reply(botResponse);
            ctx.reply('Sua pergunta foi registrada e será usada para melhorar o bot no futuro.');
          }

          ctx.reply(botResponse);
        }
      }
    });

    await bot.launch();
    console.log('Bot is running');
  } catch (err) {
    console.error('Erro ao treinar o chatbot ou iniciar o bot:', err);
  }
}

startBot();