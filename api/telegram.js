const { Telegraf } = require('telegraf');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Otimização 1: Pré-carrega dados
const perguntasRespostas = require('./public/perguntas_respostas.json');

// Otimização 2: Pool de conexões otimizado
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Otimização 3: Similaridade melhorada
function encontrarResposta(perguntaUsuario) {
  const perguntaLower = perguntaUsuario.toLowerCase();
  const matchExato = perguntasRespostas.find(item => 
    item.pergunta.toLowerCase() === perguntaLower
  );
  
  if (matchExato) return matchExato.resposta;

  // Fallback: busca por inclusão de palavras-chave
  const palavras = perguntaLower.split(/\s+/);
  const matchParcial = perguntasRespostas.find(item =>
    palavras.some(palavra => 
      item.pergunta.toLowerCase().includes(palavra)
    )
  );

  return matchParcial?.resposta || null;
}

// Otimização 4: Middleware de tempo de resposta
bot.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  console.log(`Tempo de resposta: ${duration}ms`);
});

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userMessage = ctx.message.text.trim();

  // Resposta prioritária
  const resposta = encontrarResposta(userMessage);

  if (resposta) {
    await ctx.reply(resposta);
    return; // Finaliza rápido se tiver resposta
  }

  // Processamento assíncrono não-bloqueante para perguntas sem resposta
  setImmediate(async () => {
    try {
      const [rows] = await pool.query(
        'INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)',
        [userId, userMessage]
      );
    } catch (err) {
      console.error('Erro ao salvar pergunta:', err);
    }
  });

  await ctx.reply('Não entendi sua pergunta. Vou registrar para melhorar!');
});

// Webhook otimizado
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({ status: 'ready' });
    }
  } catch (err) {
    console.error('Erro:', err);
    res.status(500).json({ error: 'Internal error' });
  }
};

// Mantém a conexão quente (opcional)
setInterval(() => pool.query('SELECT 1'), 300000);