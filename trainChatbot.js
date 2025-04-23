const natural = require('natural');
const db = require('./database');
const path = require('path');
const classifier = new natural.LogisticRegressionClassifier();
const { loadQuestionsAndAnswersFromTxt } = require('./pdfProcessor');

async function trainChatbot() {
  try {
    const filePath = path.join(__dirname, 'public', 'perguntas_respostas.txt'); // Caminho do arquivo .txt
    const trainingData = loadQuestionsAndAnswersFromTxt(filePath);

    if (trainingData.length === 0) {
      throw new Error('Nenhum dado de treinamento encontrado.');
    }

    // Treinar o chatbot com os dados do arquivo .txt
    for (const item of trainingData) {
      if (item.input && item.output) {
        classifier.addDocument(item.input, item.output);
      }
    }

    classifier.train();
    console.log('Chatbot treinado com sucesso.');
  } catch (err) {
    console.error('Erro ao treinar o chatbot:', err);
    process.exit(1);
  }
}

module.exports = { classifier, trainChatbot };