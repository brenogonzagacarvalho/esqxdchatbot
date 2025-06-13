import { SpeedInsights } from "@vercel/speed-insights/next"
const { Telegraf } = require('telegraf');
const mysql = require('mysql2/promise');
require('dotenv').config();

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new Telegraf(TOKEN);

// Configuração do banco de dados (ajuste conforme seu .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Carrega perguntas e respostas
const fs = require('fs');
const path = require('path');
const perguntasRespostas = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), 'public', 'perguntas_respostas.json'), 'utf-8')
);

// Função simples de similaridade (pode trocar por embeddings depois)
function encontrarRespostaPorSimilaridade(perguntaUsuario) {
  let melhorScore = 0;
  let melhorResposta = null;
  perguntasRespostas.forEach(({ pergunta, resposta }) => {
    if (!pergunta || !resposta) return;
    const score = perguntaUsuario.toLowerCase() === pergunta.toLowerCase() ? 1 : 0;
    if (score > melhorScore) {
      melhorScore = score;
      melhorResposta = resposta;
    }
  });
  return melhorScore > 0.8 ? melhorResposta : null;
}

// Handler principal do bot
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const userMessage = ctx.message.text.trim();

  // Busca resposta
  const resposta = encontrarRespostaPorSimilaridade(userMessage);

  if (resposta) {
    await ctx.reply(resposta);
  } else {
    await ctx.reply('Desculpe, não encontrei uma resposta para sua pergunta. Ela será registrada para análise futura.');
    // Salva no banco de dados
    try {
      const conn = await pool.getConnection();
      await conn.query(
        'INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)',
        [userId, userMessage]
      );
      conn.release();
    } catch (err) {
      console.error('Erro ao salvar pergunta não respondida:', err);
    }
  }
});

// Webhook para Vercel
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    // Garante que o corpo seja um objeto
    if (typeof req.body === 'string') {
      req.body = JSON.parse(req.body);
    }

    try {
      await bot.handleUpdate(req.body);
      res.status(200).send('OK');
    } catch (err) {
      console.error('Erro no webhook:', err);
      res.status(500).send('Erro');
    }
  } else {
    res.status(200).send('Webhook do Telegram ativo!');
  }
};