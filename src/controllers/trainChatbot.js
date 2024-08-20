const natural = require('natural');
const db = require('./services/database');
const { extractTextFromPDF, preprocessText } = require('./pdfProcessor');

const classifier = new natural.LogisticRegressionClassifier();

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
    { input: 'O que acontece em caso de reprovação no estágio curricular supervisionado?', output: 'Em caso de reprovação, o discente deverá solicitar matrícula no componente no semestre subsequente. A coordenação de curso deverá acompanhar o discente reprovado para identificar os motivos e ajudar na resolução de conflitos e gestão de prazos (Art.24º).' },
    { input: 'O que são Atividades Complementares?', output: 'As Atividades Complementares são atividades acadêmicas que complementam a formação do aluno, obrigatórias para a obtenção do grau, com a finalidade de enriquecer o currículo (Art. 1º).' },
    { input: 'Quantas horas de Atividades Complementares são necessárias para o curso?', output: 'O aluno deverá cumprir 100 horas de Atividades Complementares, conforme o estabelecido no currículo do curso (Art. 4º).' },
    { input: 'Quais são os tipos de Atividades Complementares reconhecidas?', output: 'As Atividades Complementares reconhecidas incluem participação em projetos de pesquisa, extensão, monitorias, eventos científicos, culturais, esportivos, entre outros, desde que relacionados ao curso (Art. 2º).' },
    { input: 'Como é realizada a comprovação das Atividades Complementares?', output: 'A comprovação das Atividades Complementares é feita mediante a apresentação de certificados ou documentos que comprovem a participação nas atividades, os quais serão avaliados pela coordenação do curso (Art. 5º).' },
    { input: 'É possível realizar Atividades Complementares fora da instituição?', output: 'Sim, é possível realizar Atividades Complementares fora da instituição, desde que as atividades sejam pertinentes ao curso e aprovadas pela coordenação (Art. 3º).' }
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
    const text = await extractTextFromPDF('data/respostas1.pdf'); 
    const trainingData = processText(text);    

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