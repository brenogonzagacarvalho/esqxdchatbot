const natural = require('natural');
const db = require('./database');
const { extractTextFromPDF, preprocessText } = require('./pdfProcessor');

const classifier = new natural.LogisticRegressionClassifier();

function processText(text) {
  const lines = text.split('\n');
  const trainingData = [
    { input: 'O que é o Estágio Curricular Supervisionado?', output: 'O Estágio Curricular Supervisionado previsto no Projeto Pedagógico do Curso é uma atividade obrigatória individual em que o discente deverá cumprir para a obtenção do grau (Art.1º).' },
    // Adicione mais dados de treinamento conforme necessário
  ];

  let currentQuestion = null;
  trainingData.forEach(item => {
    classifier.addDocument(preprocessText(item.input), preprocessText(item.output));
  });

  classifier.train();

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
        classifier.addDocument(item.input, item.output);
      }
    });

    classifier.train();
    console.log('Chatbot trained successfully.');
  } catch (err) {
    console.error('Error training chatbot:', err);
    process.exit(1);
  }
}

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

module.exports = { preprocessText, classifier, trainChatbot, retrainChatbot };