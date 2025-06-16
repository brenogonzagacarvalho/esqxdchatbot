require('dotenv').config();
const { Telegraf } = require('telegraf');
const { classifier, respostasMap, loadClassifier } = require('./trainChatbot');
const db = require('./database');
const fs = require('fs');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);
const userStates = {};
const perguntasRespostas = [];
const userData = {}; // Para armazenar dados do usuário durante a conversa

// Função de similaridade melhorada
function calculateSimilarity(str1, str2) {
  const words1 = str1.toLowerCase().split(/\s+/);
  const words2 = str2.toLowerCase().split(/\s+/);
  const intersection = words1.filter(word => words2.includes(word));
  const union = [...new Set([...words1, ...words2])];
  return intersection.length / union.length;
}

async function initializeDatabase() {
  try {
    // Tabela de histórico de chat atualizada
    await db.query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        user_message TEXT NOT NULL,
        bot_response TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        intent VARCHAR(255),
        confidence FLOAT,
        INDEX (user_id)  -- Adiciona índice para melhor performance
      )
    `);

    // Suas outras tabelas...
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

    console.log('Todas as tabelas foram verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar o banco de dados:', err);
    throw err;
  }
}

function showMainMenu(ctx, message = 'Escolha uma opção:') {
  ctx.reply(message, {
    reply_markup: {
      keyboard: [
        ['📚 Informações sobre estágio'],
        ['🎓 Informações sobre matrícula'],
        ['❓ Outras dúvidas'],
        ['📝 Registrar dados acadêmicos'],
        ['🏠 Menu principal']
      ],
      resize_keyboard: true,
      one_time_keyboard: false
    }
  });
}

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

async function handlerChatHistory(ctx, userMessage, botResponse, intent = null, confidence = null) {
  const userId = ctx.from.id;
  try {
    await db.query(
      'INSERT INTO chat_history (user_id, user_message, bot_response, intent, confidence) VALUES (?, ?, ?, ?, ?)',
      [userId, userMessage, botResponse, intent, confidence]
    );
    console.log(`Histórico registrado para usuário ${userId}`);
  } catch (err) {
    console.error('Erro ao registrar histórico:', err);
    // Tenta criar a tabela se não existir
    if (err.code === 'ER_NO_SUCH_TABLE' || err.code === 'ER_BAD_FIELD_ERROR') {
      console.log('Tabela chat_history não encontrada ou incompleta, tentando recriar...');
      await initializeDatabase();
      await handlerChatHistory(ctx, userMessage, botResponse, intent, confidence); // Tenta novamente
    }
  }
}

async function handleUnansweredQuestion(ctx, question) {
  const userId = ctx.from.id;
  try {
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
    
    let reply = 'Não entendi completamente, mas talvez você queira saber sobre:\n';
    reply += suggestions.map((s, i) => 
      `${i+1}. "${s.question.substring(0, 50)}${s.question.length > 50 ? '...' : ''}"`).join('\n');
    reply += '\n\nPor favor, selecione uma opção ou reformule sua pergunta.';
    
    await ctx.reply(reply);
    await handlerChatHistory(ctx, question, reply, 'unknown', 0);
  } catch (err) {
    console.error('Erro ao registrar pergunta:', err);
    await ctx.reply('Ocorreu um erro. Por favor, tente novamente.');
  }
}

async function startBot() {
  try {
    await initializeDatabase();
    await loadClassifier();

    console.log('Carregando perguntas e respostas...');
    const jsonData = JSON.parse(fs.readFileSync('./public/perguntas_respostas.json', 'utf-8'));
    
    jsonData.forEach(item => {
      perguntasRespostas.push({
        pergunta: item.pergunta,
        resposta: item.resposta
      });
      classifier.addDocument(item.pergunta, item.intent);
      respostasMap.set(item.intent, item.resposta);
    });

    await classifier.train();
    console.log('Chatbot treinado e pronto.');

    // Handlers
    bot.start((ctx) => {
      const userId = ctx.from.id;
      userStates[userId] = { step: 'main_menu' };
      ctx.reply(`👋 Olá ${ctx.from.first_name}! Sou seu assistente virtual. Como posso ajudar?`);
      showMainMenu(ctx);
    });

    // Menu handlers
    bot.hears(['📚 informações sobre estágio', 'estágio', 'estagio'], (ctx) => {
      userStates[ctx.from.id] = { step: 'estagio' };
      ctx.reply('Você está na seção de estágio. Faça sua pergunta ou digite "menu" para voltar.', {
        reply_markup: { remove_keyboard: true }
      });
    });

    bot.hears(['🎓 informações sobre matrícula', 'matricula', 'matrícula'], (ctx) => {
      userStates[ctx.from.id] = { step: 'matricula' };
      ctx.reply('Você está na seção de matrícula. Faça sua pergunta ou digite "menu" para voltar.', {
        reply_markup: { remove_keyboard: true }
      });
    });

    bot.hears(['❓ outras dúvidas', 'outras', 'duvidas'], (ctx) => {
      userStates[ctx.from.id] = { step: 'outras_duvidas' };
      ctx.reply('Você está na seção de outras dúvidas. Faça sua pergunta ou digite "menu" para voltar.', {
        reply_markup: { remove_keyboard: true }
      });
    });

    bot.hears(['📝 registrar dados acadêmicos', 'registrar'], (ctx) => {
      userStates[ctx.from.id] = { step: 'awaiting_matricula' };
      ctx.reply('Por favor, digite seu número de matrícula:', {
        reply_markup: { remove_keyboard: true }
      });
    });

    bot.hears(['🏠 menu principal', 'menu', 'voltar'], (ctx) => {
      userStates[ctx.from.id] = { step: 'main_menu' };
      showMainMenu(ctx, 'Voltando ao menu principal:');
    });

    bot.on('text', async (ctx) => {
      const userId = ctx.from.id;
      const userMessage = ctx.message.text.trim();
      const currentState = userStates[userId] || { step: 'main_menu' };

      // Fluxo de registro de dados acadêmicos
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
          try {
            await db.query(
              'INSERT INTO user_academic_data (user_id, matricula, semestre) VALUES (?, ?, ?) ' +
              'ON DUPLICATE KEY UPDATE matricula = VALUES(matricula), semestre = VALUES(semestre)',
              [userId, userData[userId].matricula, semestre]
            );
            
            await ctx.reply(`✅ Dados registrados com sucesso!\nMatrícula: ${userData[userId].matricula}\nSemestre: ${semestre}`);
            showMainMenu(ctx);
            userStates[userId] = { step: 'main_menu' };
            return;
          } catch (err) {
            console.error('Erro ao salvar dados:', err);
            await ctx.reply('Ocorreu um erro. Por favor, tente novamente mais tarde.');
            return;
          }
        } else {
          await ctx.reply('Semestre inválido. Digite um número entre 1 e 10:');
          return;
        }
      }

      // Processamento normal de mensagens
      if (userMessage.length < 3) return;

      try {
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
      } catch (err) {
        console.error('Erro:', err);
        await ctx.reply('Ocorreu um erro. Por favor, tente novamente.');
      }
    });

    // Handlers de callback
    bot.action('sim', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply('Por favor, digite sua próxima dúvida:');
    });

    bot.action('nao', async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply('Ótimo! Se precisar de algo mais, estou à disposição. 😊');
      showMainMenu(ctx);
    });

    bot.action(/feedback_(yes|no)/, async (ctx) => {
      await ctx.answerCbQuery();
      await ctx.reply('Obrigado pelo seu feedback!');
    });

    await bot.launch();
    console.log('🤖 Bot está operacional!');
  } catch (err) {
    console.error('Falha ao iniciar o bot:', err);
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