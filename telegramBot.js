require('dotenv').config();
const { Telegraf } = require('telegraf');
const { classifier, respostasMap, loadClassifier } = require('./trainChatbot');
const db = require('./database');
const fs = require('fs');

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);
const userStates = {};
const perguntasRespostas = [];

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
    await db.query(`
      CREATE TABLE IF NOT EXISTS unanswered_questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        question TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Banco de dados inicializado com sucesso.');
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

async function handleUnansweredQuestion(ctx, question) {
  const userId = ctx.from.id;
  try {
    await db.query('INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)', 
      [userId, question]);
    
    // Sugere perguntas similares
    const suggestions = perguntasRespostas
      .map(item => ({
        question: item.pergunta,
        similarity: calculateSimilarity(question, item.pergunta)
      }))
      .filter(item => item.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
    
    if (suggestions.length > 0) {
      let reply = 'Não entendi completamente, mas talvez você queira saber sobre:\n';
      reply += suggestions.map((s, i) => 
        `${i+1}. "${s.question.substring(0, 50)}${s.question.length > 50 ? '...' : ''}"`).join('\n');
      reply += '\n\nPor favor, selecione uma opção ou reformule sua pergunta.';
      return ctx.reply(reply);
    }
    
    return ctx.reply('Não encontrei uma resposta para sua pergunta. Um humano irá responder em breve!');
  } catch (err) {
    console.error('Erro ao registrar pergunta não respondida:', err);
    return ctx.reply('Ocorreu um erro ao processar sua pergunta. Tente novamente mais tarde.');
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

    classifier.train();
    console.log('Chatbot treinado e pronto.');

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

    bot.hears(['🏠 menu principal', 'menu', 'voltar'], (ctx) => {
      userStates[ctx.from.id] = { step: 'main_menu' };
      showMainMenu(ctx, 'Voltando ao menu principal:');
    });

    bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userMessage = ctx.message.text.trim();

  // Ignorar mensagens muito curtas
  if (userMessage.length < 3) return;

  try {
    // 1. Tentar classificação direta
    const classifications = classifier.getClassifications(userMessage);
    const bestMatch = findBestMatch(userMessage); // Função de similaridade

    // 2. Definir resposta com base na melhor correspondência
    let resposta = null;
    
    if (classifications[0] && classifications[0].value >= 0.7) {
      resposta = respostasMap.get(classifications[0].label);
    } else if (bestMatch.similarity >= 0.6) {
      resposta = bestMatch.answer;
    }

    // 3. Enviar resposta simplificada
    if (resposta) {
      await ctx.reply(resposta); // Resposta direta sem cabeçalhos
      
      // 4. Perguntar se precisa de mais algo
      await ctx.reply('Precisa de mais alguma informação?', {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Sim, outra dúvida', callback_data: 'sim' },
              { text: 'Não, obrigado', callback_data: 'nao' }
            ]
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

// Handler para os botões de feedback
bot.action('sim', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Por favor, digite sua próxima dúvida:');
});

bot.action('nao', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Ótimo! Se precisar de algo mais, estou à disposição. 😊');
  showMainMenu(ctx); // Mostra o menu principal novamente
});;

    // Feedback handler
    bot.action(/feedback_(yes|no)/, (ctx) => {
      ctx.answerCbQuery();
      ctx.reply('Obrigado pelo seu feedback! Vamos melhorar com base nele.');
    });

    bot.action('menu', (ctx) => {
      ctx.answerCbQuery();
      userStates[ctx.from.id] = { step: 'main_menu' };
      showMainMenu(ctx);
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