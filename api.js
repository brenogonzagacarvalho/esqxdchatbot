const express = require('express');
const db = require('./database');
const { classifier } = require('./trainChatbot'); // Importando o classifier corretamente
const app = express();

app.use(express.json());

// Rota para listar perguntas não respondidas
app.get('/unanswered-questions', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM unanswered_questions');
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar perguntas não respondidas:', err);
    res.status(500).send('Erro ao buscar perguntas.');
  }
});

// Rota para adicionar perguntas simuladas
app.post('/unanswered-questions', async (req, res) => {
  const { user_id, question } = req.body;

  if (!user_id || !question) {
    return res.status(400).send('ID do usuário e pergunta são obrigatórios.');
  }

  try {
    await db.query('INSERT INTO unanswered_questions (user_id, question) VALUES (?, ?)', [user_id, question]);
    res.send('Pergunta adicionada com sucesso.');
  } catch (err) {
    console.error('Erro ao adicionar pergunta:', err);
    res.status(500).send('Erro ao adicionar pergunta.');
  }
});

// Rota para adicionar uma resposta
app.post('/add-answer', async (req, res) => {
  const { questionId, answer } = req.body;

  console.log('Recebendo dados:', { questionId, answer });

  if (!questionId || !answer) {
    console.error('Dados inválidos:', { questionId, answer });
    return res.status(400).send('ID da pergunta e resposta são obrigatórios.');
  }

  try {
    const [questionRow] = await db.query('SELECT question FROM unanswered_questions WHERE id = ?', [questionId]);
    console.log('Resultado da consulta:', questionRow);

    if (questionRow.length === 0) {
      console.error('Pergunta não encontrada:', questionId);
      return res.status(404).send('Pergunta não encontrada.');
    }

    const question = questionRow[0].question;
    console.log('Pergunta encontrada:', question);

    // Adicionar ao classificador
    console.log('Adicionando ao classificador...');
    classifier.addDocument(question, answer);
    console.log('Treinando o classificador...');
    classifier.train();

    // Remover a pergunta da tabela
    console.log('Removendo pergunta da tabela unanswered_questions...');
    await db.query('DELETE FROM unanswered_questions WHERE id = ?', [questionId]);
    console.log('Pergunta removida com sucesso.');

    res.send('Resposta adicionada e bot treinado com sucesso.');
  } catch (err) {
    console.error('Erro ao adicionar resposta:', err);
    res.status(500).send('Erro ao adicionar resposta.');
  }
});

app.listen(3001, () => {
  console.log('API rodando na porta 3001');
});