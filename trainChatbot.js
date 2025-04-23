const natural = require('natural');
const path = require('path');
const fs = require('fs');
const classifier = new natural.BayesClassifier();


function loadClassifier() {
  if (fs.existsSync('classifier.json')) {
    natural.BayesClassifier.load('classifier.json', null, (err, loadedClassifier) => {
      if (err) {
        console.error('Erro ao carregar o classificador:', err);
      } else {
        console.log('Classificador Bayer carregado com sucesso.');
        Object.assign(classifier, loadedClassifier);
      }
    });
  } else {
    console.log('Nenhum classificador salvo encontrado. Um novo será criado.');
  }
}

loadClassifier();

async function trainChatbotFromTxt(trainingData) {
  const lines = trainingData.split('\n');
  let currentQuestion = null;

  for (const line of lines) {
    if (line.startsWith('- Pergunta:')) {
      currentQuestion = line.replace('- Pergunta:', '').trim();
    } else if (line.startsWith('- Resposta:') && currentQuestion) {
      const answer = line.replace('- Resposta:', '').trim();
      classifier.addDocument(currentQuestion, answer);
      currentQuestion = null;
    }
  }

  classifier.train();
  console.log('Classificador treinado com sucesso com o txt.');
}

async function saveClassifier() {
  classifier.save('classifier.json', (err) => {
    if (err) {
      console.error('Erro ao salvar o classificador:', err);
    } else {
      console.log('Classificador salvo com sucesso.');
    }
  });
}

module.exports = { classifier, trainChatbotFromTxt, saveClassifier };