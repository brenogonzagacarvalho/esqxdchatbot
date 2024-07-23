require('dotenv').config();
const fs = require('fs');
const pdf = require('pdf-parse');
const { Telegraf } = require('telegraf');
const mysql = require('mysql');
const natural = require('natural');
const express = require('express');

// Configurando o servidor Express
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Necessário para analisar JSON no corpo da requisição

app.get('/', (req, res) => res.send('Bot is running'));

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

app.post('/ask', (req, res) => {
  const userQuestion = preprocessText(req.body.question);
  const classifications = classifier.getClassifications(userQuestion);
  const highestClassification = classifications[0];

  let botAnswer;
  if (highestClassification.value < 0.5) { // Ajuste o valor conforme necessário
    botAnswer = 'Desculpe, não tenho certeza sobre a resposta. Pode reformular a pergunta ou fornecer mais informações?';
  } else {
    botAnswer = classifier.classify(userQuestion);
  }

  const insertQuery = 'INSERT INTO questions (question, answer) VALUES (?, ?)';
  db.query(insertQuery, [userQuestion, botAnswer], (error, results) => {
    if (error) throw error;
    console.log(`A row has been inserted with id ${results.insertId}`);
  });

  res.json({ answer: botAnswer });
});

app.post('/retrain', (req, res) => {
  retrainChatbot();
  res.send('Chatbot retrained.');
});

// Conectando ao banco de dados MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the MySQL database:', err);
    process.exit(1);
  }
  console.log('Connected to the MySQL database.');
});

// Criar a tabela chat_history, se não existir
const createTableQuery = `
CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_message TEXT NOT NULL,
    bot_response TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`;

db.query(createTableQuery, (err, result) => {
  if (err) throw err;
  console.log('Table created or already exists.');
});

// Token do bot obtido do BotFather
const TOKEN = process.env.TELEGRAM_TOKEN;

// Configurando o bot do Telegram
const bot = new Telegraf(TOKEN);

// Função para extrair texto do PDF
async function extractTextFromPDF(pdfPath) {
  let dataBuffer = fs.readFileSync(pdfPath);
  let data = await pdf(dataBuffer);
  return data.text;
}

// Função para pré-processar o texto extraído do PDF
function preprocessText(text) {
  return text.replace(/([a-z])([A-Z])/g, '$1 $2')
             .replace(/([0-9])([a-zA-Z])/g, '$1 $2')
             .replace(/([a-zA-Z])([0-9])/g, '$1 $2')
             .replace(/([.,!?])([a-zA-Z])/g, '$1 $2')
             .replace(/([a-zA-Z])([.,!?])/g, '$1 $2')
             .replace(/\s+/g, ' ')
             .trim();
}

// Função para processar o texto extraído do PDF
function processText(text) {
  const lines = text.split('\n');
  const trainingData = [
    { input: 'O que é o Estágio Curricular Supervisionado?', output: 'O Estágio Curricular Supervisionado previsto no Projeto Pedagógico do Curso é uma atividade obrigatória individual em que o discente deverá cumprir para a obtenção do grau (Art.1º).' },
    { input: 'Quais são os critérios para a matrícula em estágio?', output: 'Os critérios para efetivação da matrícula de discente em atividade de estágio são: (I) Realização da solicitação de matrícula na atividade curricular de estágio durante o período de matrícula; (II) Apresentação do termo de compromisso de estágio homologado pela Agência de Estágios da UFC (Art.3º).' },
    { input: 'Quais são as modalidades de estágio curricular supervisionado?', output: 'O Estágio Curricular Supervisionado é executado nas seguintes modalidades: (I) Estágio externo em empresa conveniada ou participação em projeto de pesquisa e desenvolvimento (P&D); (II) Estágio interno no Núcleo de Práticas da UFC em Quixadá, iniciativa empreendedora ou projeto de Pesquisa e Desenvolvimento (Art.4º).' },
    { input: 'Como são realizados os estágios externos?', output: 'Os estágios externos em empresa conveniada serão realizados mediante a celebração de um Termo de Convênio entre a UFC e a Instituição/Empresa interessada, com assinatura do Termo de Compromisso de Estágio (Art.5º).' },
    { input: 'Como são realizados os estágios internos?', output: 'O estágio interno consiste nas atividades “Estágio Supervisionado I” e “Estágio Supervisionado II”, quando se tratar de estágio realizado no Núcleo de Práticas da UFC em Quixadá, iniciativa empreendedora ou projeto de Pesquisa e Desenvolvimento (Art.4º,II).' },
    { input: 'Qual a carga horária das atividades de estágio?', output: 'As atividades Estágio Supervisionado I e Estágio Supervisionado II terão, cada uma, carga horária de 160 horas, e período mínimo de 4 meses de atividade (Art.10º).' },
    { input: 'Como é o aproveitamento de atuação profissional do discente na área do curso?', output: 'O aproveitamento de atuação profissional do discente na área do curso pode ser pleiteado para atividades realizadas em modalidades como estágio prévio, trabalhador formal, atuação como pessoa jurídica, empresa sediada no exterior, programa de imersão profissional e Projeto de Pesquisa e Desenvolvimento (Art.11º).' },
    { input: 'Quais são as responsabilidades do discente em estágio supervisionado?', output: 'Cabe ao discente em estágio supervisionado: (I) Apresentar Plano de Trabalho no início das atividades; (II) Apresentar Seminário de Relato de Experiência ao término do período de estágio ou semestralmente; (III) Apresentar Relatório Final de Estágio ao término do período de estágio ou semestralmente (Art.18º).' },
    { input: 'Quais são as responsabilidades do supervisor de estágio?', output: 'Cabe ao supervisor: Apresentar a Avaliação do Rendimento do discente ao término do período de estágio ou semestralmente (Art.19º).' },
    { input: 'Quais são as responsabilidades do professor orientador de estágio?', output: 'Cabe ao professor orientador: (I) Avaliar o Plano de Trabalho apresentado pelo discente; (II) Organizar Seminário de Relato de Experiência e avaliar a participação do discente; (III) Avaliar a Avaliação do Rendimento do discente apresentada pelo supervisor da empresa concedente; (IV) Análise de Relatório Final de Estágio (Art.20º).' },
    { input: 'Como é realizada a avaliação do discente nas atividades de Estágio Curricular Supervisionado?', output: 'A avaliação do discente nas atividades de Estágio Curricular Supervisionado será realizada em data a ser definida pelo professor orientador, não devendo ultrapassar o término do período letivo. A AV será calculada pela fórmula: AV = (PT + S + 3 AR + RF) / 6 (Art.22º).' },
    { input: 'O que acontece em caso de reprovação no estágio curricular supervisionado?', output: 'Em caso de reprovação, o discente deverá solicitar matrícula no componente no semestre subsequente. A coordenação de curso deverá acompanhar o discente reprovado para identificar os motivos e ajudar na resolução de conflitos e gestão de prazos (Art.24º).' }
  ];

  let currentQuestion = null;
  trainingData.forEach(item => {
    classifier.addDocument(preprocessText(item.input), preprocessText(item.output));
  });

  classifier.train();

  // Processar linhas do texto para identificar perguntas e respostas
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('-Pergunta:')) {
      currentQuestion = trimmedLine.replace('-Pergunta:', '').trim();
    } else if (trimmedLine.startsWith('-Resposta:') && currentQuestion) {
      const answer = trimmedLine.replace('-Resposta:', '').trim();
      trainingData.push({ input: currentQuestion, output: answer });
      currentQuestion = null;
    }
  });

  return trainingData;
}

// Treinamento do ChatBot
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.LogisticRegressionClassifier();

const classifyMessage = (message) => {
  try {
    if (message && message.length > 0) {
      const classifications = classifier.getClassifications(message);
      return classifications;
    } else {
      throw new Error("Invalid message input");
    }
  } catch (error) {
    console.error("Error processing message:", error);
    return null;
  }
};

async function trainChatbot() {
  try {
    const text = await extractTextFromPDF('respostas1.pdf');
    console.log('Texto extraído do PDF:', text);
    const trainingData = processText(text);
    console.log('Dados de treinamento:', trainingData);

    if (trainingData.length === 0) {
      throw new Error('No training data found.');
    }

    trainingData.forEach(item => {
      if (item.input && item.output) {
        console.log('Adding document to classifier:', item);
        classifier.addDocument(item.input, item.output);
      }
    });

    classifier.train();
    console.log('Chatbot trained successfully.');
  } catch (err) {
    console.error('Error training chatbot:', err);
    process.exit(1); // Para garantir que o bot não inicie sem treinamento adequado
  }
}

bot.start((ctx) => ctx.reply('Olá! Eu sou o chatbot da coordenação de engenharia de software. Como posso ajudar você?'));

bot.on('text', (ctx) => {
  try {
    let userMessage = ctx.message.text;
    console.log('Mensagem do usuário:', userMessage);

    // Certifique-se de que o classificador está treinado antes de classificar
    if (!classifier.docs || classifier.docs.length === 0) {
      throw new Error("Classifier has not been trained.");
    }

    const classifications = classifier.getClassifications(userMessage);
    const highestClassification = classifications[0];
    let botResponse;

    if (highestClassification.value < 0.5) { // Ajuste o valor conforme necessário
      botResponse = 'Desculpe, não tenho certeza sobre a resposta. Pode reformular a pergunta ou fornecer mais informações?';
    } else {
      botResponse = highestClassification.label;
    }

    console.log('Resposta do bot:', botResponse);

    const insertQuery = `INSERT INTO chat_history (user_message, bot_response) VALUES (?, ?)`;

    db.query(insertQuery, [userMessage, botResponse], (err, result) => {
      if (err) {
        console.error('Erro ao inserir no banco de dados:', err);
        throw err;
      }
      console.log(`A row has been inserted with id ${result.insertId}`);
    });

    ctx.reply(botResponse);
  } catch (error) {
    console.error('Error processing message:', error);
    ctx.reply('Desculpe, ocorreu um erro ao processar sua mensagem.');
  }
});

function retrainChatbot() {
  db.query('SELECT * FROM chat_history', (err, results) => {
    if (err) {
      console.error('Erro ao recuperar dados do banco de dados:', err);
      return;
    }

    const newTrainingData = results.map(row => ({
      input: preprocessText(row.user_message),
      output: preprocessText(row.bot_response)
    }));

    newTrainingData.forEach(item => {
      classifier.addDocument(item.input, item.output);
    });

    classifier.train();
    console.log('Chatbot retrained with new data.');
  });
}



const retrainInterval = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
setInterval(retrainChatbot, retrainInterval);

// Iniciando o bot após o treinamento
trainChatbot().then(() => {
  bot.launch().then(() => {
    console.log('Bot is running');
  }).catch(err => {
    console.error('Error launching bot:', err);
  });
}).catch(err => {
  console.error('Error training chatbot:', err);
});
