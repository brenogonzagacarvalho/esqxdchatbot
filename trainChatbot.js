const natural = require('natural');
const fs = require('fs');
let classifier = new natural.BayesClassifier();

// Mapa de intents → respostas
const respostasMap = new Map();

// Carrega classificador salvo (de forma segura e assíncrona)
async function loadClassifier() {
  if (fs.existsSync('classifier.json')) {
    return new Promise((resolve, reject) => {
      natural.BayesClassifier.load('classifier.json', null, (err, loadedClassifier) => {
        if (err) {
          console.error('Erro ao carregar o classificador:', err);
          reject(err);
        } else {
          console.log('Classificador Bayes carregado com sucesso.');
          classifier = loadedClassifier;
          resolve();
        }
      });
    });
  } else {
    console.log('Nenhum classificador salvo encontrado. Um novo será criado.');
  }
}

// Treina o classificador a partir do .txt
async function trainChatbotFromTxt(trainingData) {
  const lines = trainingData.split('\n');
  let currentQuestion = null;
  let perguntaId = 0;

  for (const line of lines) {
    if (line.startsWith('- Pergunta:')) {
      currentQuestion = line.replace('- Pergunta:', '').trim();
    } else if (line.startsWith('- Resposta:') && currentQuestion) {
      const resposta = line.replace('- Resposta:', '').trim();
      const intent = `resposta_${perguntaId++}`;

      classifier.addDocument(currentQuestion, intent);      // Treina com o rótulo
      respostasMap.set(intent, resposta);                   // Guarda a resposta associada

      currentQuestion = null;
    }
  }

  classifier.train();
  console.log('Classificador treinado com sucesso com o txt.');
}

// Salva o classificador treinado
async function saveClassifier() {
  return new Promise((resolve, reject) => {
    classifier.save('classifier.json', (err) => {
      if (err) {
        console.error('Erro ao salvar o classificador:', err);
        reject(err);
      } else {
        console.log('Classificador salvo com sucesso.');
        resolve();
      }
    });
  });
}

module.exports = {
  classifier,
  respostasMap,
  loadClassifier,
  trainChatbotFromTxt,
  saveClassifier,
};
