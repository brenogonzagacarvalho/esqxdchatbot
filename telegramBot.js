require('dotenv').config();
const { Telegraf } = require('telegraf');
const { classifier, respostasMap, loadClassifier } = require('./trainChatbot');
const db = require('./database');
const fs = require('fs');
const flanT5Service = require('./flanT5Service');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);
const userStates = {};
const perguntasRespostas = [];
const userData = {};

// Função de similaridade
function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  return intersection.length / union.length;
}

// Função para exibir o menu
function showMainMenu(ctx, message = 'Escolha uma opção: 1 a 4') {
  ctx.reply(message, {
    reply_markup: {
      keyboard: [
        ['📚 Informações sobre Estágio'],
        ['🎓 Informações sobre Matrícula'],
        ['❓ Outras Dúvidas'],
        ['📝 Registrar Dados Acadêmicos']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

// Inicializa o banco
async function initializeDatabase() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      user_message TEXT NOT NULL,
      bot_response TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      intent VARCHAR(255),
      confidence FLOAT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS unanswered_questions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      question TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS user_academic_data (
      user_id BIGINT PRIMARY KEY,
      matricula VARCHAR(20),
      semestre INT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  console.log('Banco verificado!');
}

// Busca por similaridade
function findBestMatch(perguntaUsuario) {
  let bestMatch = { similarity: 0, answer: null, question: null };
  perguntasRespostas.forEach(item => {
    const similarity = calculateSimilarity(perguntaUsuario, item.pergunta);
    if (similarity > bestMatch.similarity) {
      bestMatch = {
        similarity,
        answer: item.resposta,
        question: item.pergunta
      };
    }
  });
  return bestMatch;
}

// Salvar histórico
async function handlerChatHistory(ctx, userMessage, botResponse, intent = null, confidence = null) {
  const userId = ctx.from.id;
  await db.query(
    'INSERT INTO chat_history (user_id, user_message, bot_response, intent, confidence) VALUES (?, ?, ?, ?, ?)',
    [userId, userMessage, botResponse, intent, confidence]
  );
}

// Pergunta sem resposta
async function handleUnansweredQuestion(ctx, question) {
  const userId = ctx.from.id;
  await db.query(
    'INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)',
    [userId, question]
  );

  const suggestions = perguntasRespostas
    .map(item => ({
      question: item.pergunta,
      similarity: calculateSimilarity(question, item.pergunta)
    }))
    .filter(item => item.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);

  let reply = 'Não entendi muito bem, mas talvez você queira saber sobre:\n';
  reply += suggestions.map((s, i) => `${i + 1}. "${s.question}"`).join('\n');
  reply += '\n\nPor favor, selecione uma opção ou reformule sua pergunta.';

  await ctx.reply(reply);
  await handlerChatHistory(ctx, question, reply, 'unknown', 0);
}

// Início do bot
async function startBot() {
  await initializeDatabase();
  await loadClassifier();

  const jsonData = JSON.parse(fs.readFileSync('./public/perguntas_respostas.json', 'utf-8'));
  jsonData.forEach(item => {
    perguntasRespostas.push({ pergunta: item.pergunta, resposta: item.resposta });
    classifier.addDocument(item.pergunta, item.intent);
    respostasMap.set(item.intent, item.resposta);
  });
  await classifier.train();

  console.log('Chatbot pronto! ✅');

  // Handler /start
  bot.start((ctx) => {
    const userId = ctx.from.id;
    userStates[userId] = { step: 'main_menu' };
    ctx.reply(`👋 Olá ${ctx.from.first_name}! 
Sou seu assistente virtual da UFC. Como posso ajudar?`);
    showMainMenu(ctx);
  });

  // Handlers de menu
  bot.hears('📚 Informações sobre Estágio', (ctx) => {
    userStates[ctx.from.id] = { step: 'estagio' };
    ctx.reply('Você está na seção de estágio. Pergunte ou clique em "🏠 Menu principal".', {
      reply_markup: { keyboard: [['🏠 Menu principal']], resize_keyboard: true }
    });
  });

  bot.hears('🎓 Informações sobre Matrícula', (ctx) => {
    userStates[ctx.from.id] = { step: 'matricula' };
    ctx.reply('Você está na seção de matrícula. Pergunte ou clique em "🏠 Menu principal".', {
      reply_markup: { keyboard: [['🏠 Menu principal']], resize_keyboard: true }
    });
  });

  bot.hears('❓ Outras Dúvidas', (ctx) => {
    userStates[ctx.from.id] = { step: 'outras_duvidas' };
    ctx.reply('Você está na seção de outras dúvidas. Pergunte ou clique em "🏠 Menu principal".', {
      reply_markup: { keyboard: [['🏠 Menu principal']], resize_keyboard: true }
    });
  });

  bot.hears('📝 Registrar Dados Acadêmicos', (ctx) => {
    userStates[ctx.from.id] = { step: 'awaiting_matricula' };
    ctx.reply('Por favor, digite seu número de matrícula:', {
      reply_markup: { remove_keyboard: true }
    });
  });

  bot.hears('🏠 Menu principal', (ctx) => {
    userStates[ctx.from.id] = { step: 'main_menu' };
    showMainMenu(ctx, 'Voltando ao menu principal:');
  });

  // Processamento de texto
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text.trim();
    const currentState = userStates[userId] || { step: 'main_menu' };

    if (currentState.step === 'awaiting_matricula') {
      if (/^\d{6,10}$/.test(userMessage)) {
        userData[userId] = { matricula: userMessage };
        userStates[userId].step = 'awaiting_semester';
        await ctx.reply('Agora, digite seu semestre atual (1-10):');
        return;
      } else {
        await ctx.reply('Formato inválido. Digite apenas números (6 a 10 dígitos):');
        return;
      }
    }

    if (currentState.step === 'awaiting_semester') {
      const semestre = parseInt(userMessage);
      if (semestre >= 1 && semestre <= 10) {
        await db.query(
          'INSERT INTO user_academic_data (user_id, matricula, semestre) VALUES (?, ?, ?) ' +
          'ON DUPLICATE KEY UPDATE matricula = VALUES(matricula), semestre = VALUES(semestre)',
          [userId, userData[userId].matricula, semestre]
        );

        await ctx.reply(`✅ Dados registrados com sucesso!\nMatrícula: ${userData[userId].matricula}\nSemestre: ${semestre}`);
        showMainMenu(ctx);
        userStates[userId] = { step: 'main_menu' };
        return;
      } else {
        await ctx.reply('Semestre inválido. Digite um número entre 1 e 10:');
        return;
      }
    }

    if (userMessage.length < 3) return;

    const classifications = classifier.getClassifications(userMessage);
    const bestClassification = classifications[0];
    const bestMatch = findBestMatch(userMessage);

    let resposta = null;
    let intent = null;
    let confidence = null;

    if (bestClassification && bestClassification.value >= 0.7) {
      resposta = respostasMap.get(bestClassification.label);
      intent = bestClassification.label;
      confidence = bestClassification.value;
    } else if (bestMatch.similarity >= 0.6) {
      resposta = bestMatch.answer;
      intent = 'similarity_match';
      confidence = bestMatch.similarity;
    }

    if (resposta) {
      await ctx.reply(resposta);
      await handlerChatHistory(ctx, userMessage, resposta, intent, confidence);
      await ctx.reply('Precisa de mais alguma informação?', {
        reply_markup: {
          inline_keyboard: [
            [{ text: 'Sim', callback_data: 'sim' }, { text: 'Não', callback_data: 'nao' }]
          ]
        }
      });
    } else {
      await handleUnansweredQuestion(ctx, userMessage);
    }
    const context = perguntasRespostas
    .map(item => `Q: ${item.pergunta}\nA: ${item.resposta}`)
    .join('\n\n');

  try {
    const generated = await flanT5Service.generateResponse(userMessage, context);
    if (generated) {
      await ctx.reply(generated);
      await handlerChatHistory(ctx, userMessage, generated, 'flan-t5-generation', null);
      return;
    }
  } catch (err) {
    console.error('Erro ao gerar com FLAN-T5:', err);
  }

  // 5) Se ainda sem resposta, registra como não respondida
  await handleUnansweredQuestion(ctx, userMessage);
  });

  bot.action('sim', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Por favor, digite sua próxima dúvida:');
  });

  bot.action('nao', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Perfeito! Se precisar, estarei aqui. 😊');
    showMainMenu(ctx);
  });

  await bot.launch();
  console.log('🤖 Bot rodando!');
}

process.on('unhandledRejection', (error) => console.error('Unhandled Rejection:', error));
process.on('uncaughtException', (error) => console.error('Uncaught Exception:', error));

startBot();
