const natural = require('natural');
const db = require('./database');
const path = require('path');
const classifier = new natural.LogisticRegressionClassifier();
const {extractTextFromPDF, preprocessText} = require('./pdfProcessor');

function processText(text) {
  const lines = text.split('\n');
  const trainingData = [
    { "input": "O que é o Estágio Curricular Supervisionado?", "output": "O Estágio Curricular Supervisionado previsto no Projeto Pedagógico do Curso é uma atividade obrigatória individual em que o discente deverá cumprir para a obtenção do grau (Art. 1º)." },
    { "input": "Quais são os critérios para a matrícula em estágio?", "output": "Os critérios para efetivação da matrícula de discente em atividade de estágio são: (I) Realização da solicitação de matrícula na atividade curricular de estágio durante o período de matrícula; (II) Apresentação de termo de compromisso de estágio homologado pela Agência de Estágios da UFC (Art. 3º)." },
    { "input": "Quais são as modalidades de estágio curricular supervisionado?", "output": "O Estágio Curricular Supervisionado é executado nas seguintes modalidades: (I) Estágio externo em empresa conveniada ou participação em projeto de pesquisa e desenvolvimento (P&D); (II) Estágio interno no Núcleo de Práticas da UFC em Quixadá, iniciativa empreendedora ou projeto de Pesquisa e Desenvolvimento (Art. 4º)." },
    { "input": "Como são realizados os estágios externos?", "output": "Os estágios externos em empresa conveniada serão realizados mediante a celebração de um Termo de Convênio entre a UFC e a Instituição/Empresa interessada, com assinatura do Termo de Compromisso de Estágio (Art. 5º)." },
    { "input": "Como são realizados os estágios internos?", "output": "O estágio interno consiste nas atividades 'Estágio Supervisionado I' e 'Estágio Supervisionado II', quando se tratar de estágio realizado no Núcleo de Práticas da UFC em Quixadá, iniciativa empreendedora ou projeto de Pesquisa e Desenvolvimento (Art. 4º, II)." },
    { "input": "Qual a carga horária das atividades de estágio?", "output": "As atividades Estágio Supervisionado I e Estágio Supervisionado II terão, cada uma, carga horária de 160 horas, e período mínimo de 4 meses de atividade (Art. 10º)." },
    { "input": "Como é o aproveitamento de atuação profissional do discente na área do curso?", "output": "O aproveitamento de atuação profissional do discente na área do curso pode ser pleiteado para atividades realizadas em modalidades como estágio prévio, trabalhador formal, atuação como pessoa jurídica, empresa sediada no exterior, programa de imersão profissional e Projeto de Pesquisa e Desenvolvimento (Art. 11º)." },
    { "input": "Quais são as responsabilidades do discente em estágio supervisionado?", "output": "Cabe ao discente em estágio supervisionado: (I) Apresentar Plano de Trabalho no início das atividades; (II) Apresentar Seminário de Relato de Experiência ao término do período de estágio ou semestralmente; (III) Apresentar Relatório Final de Estágio ao término do período de estágio ou semestralmente (Art. 18º)." },
    { "input": "Quais são as responsabilidades do supervisor de estágio?", "output": "Cabe ao supervisor: Apresentar a Avaliação do Rendimento do discente ao término do período de estágio ou semestralmente (Art. 19º)." },
    { "input": "Quais são as responsabilidades do professor orientador de estágio?", "output": "Cabe ao professor orientador: (I) Avaliar o Plano de Trabalho apresentado pelo discente; (II) Organizar Seminário de Relato de Experiência e avaliar a participação do discente; (III) Avaliar a Avaliação do Rendimento do discente apresentada pelo supervisor da empresa concedente; (IV) Análise de Relatório Final de Estágio (Art. 20º)." },
    { "input": "Como é realizada a avaliação do discente nas atividades de Estágio Curricular Supervisionado?", "output": "A avaliação do discente nas atividades de Estágio Curricular Supervisionado será realizada em data a ser definida pelo professor orientador, não devendo ultrapassar o término do período letivo. A AV será calculada pela fórmula: AV = (PT + S + 3AR + RF) / 6 (Art. 22º)." },
    { "input": "O que acontece em caso de reprovação no estágio curricular supervisionado?", "output": "Em caso de reprovação, o discente deverá solicitar matrícula no componente no semestre subsequente. A coordenação de curso deverá acompanhar o discente reprovado para identificar os motivos e ajudar na resolução de conflitos e gestão de prazos (Art. 24º)." },
    { "input": "O que é o processo de admissão de graduados na UFC?", "output": "O processo é regido por edital específico publicado no site da Prograd, com base na nota do Exame Nacional do Ensino Médio (Enem)." },
    { "input": "Como posso me inscrever como aluno especial na UFC?", "output": "O estudante deve se dirigir à coordenação de cada curso e, após consentimento, comparecer à Divisão de Seleção e Matrícula da Prograd." },
    { "input": "Qual é a documentação exigida para alunos especiais?", "output": "Cópias legíveis do diploma de graduação, documento de identidade e CPF são necessárias." },
    { "input": "A UFC oferece assistência estudantil?", "output": "Sim, a assistência estudantil inclui programas como Residência Universitária, Restaurante Universitário e Apoio Psicopedagógico." },
    { "input": "O que é a Educação à Distância (EaD)?", "output": "É um processo de ensino-aprendizagem mediado por tecnologia, onde professores e alunos não estão no mesmo espaço físico." },
    { "input": "Como é calculado o Índice de Rendimento Acadêmico (IRA) Geral?", "output": "O IRA Geral é calculado com base na média das notas dos alunos do mesmo curso, normalizada por desempenho." },
    { "input": "O que acontece se um aluno tiver a matrícula bloqueada?", "output": "O bloqueio ocorre após duas reprovações por frequência na mesma disciplina ou quatro reprovações em disciplinas do curso." },
    { "input": "Como posso solicitar o trancamento parcial de matrícula?", "output": "O aluno deve encaminhar solicitação à Coordenação de Curso dentro do prazo estabelecido pelo Calendário Universitário." },
    { "input": "Quais são os critérios para solicitar trancamento total de matrícula?", "output": "Doença, mudança de domicílio, emprego ou obrigação militar são algumas das situações que permitem o trancamento." },
    { "input": "O que é mobilidade acadêmica?", "output": "É o processo que permite ao aluno cursar disciplinas em outra Instituição Federal de Ensino Superior (IFES)." },
    { "input": "Como posso participar do programa de mobilidade acadêmica?", "output": "O aluno deve procurar o setor responsável na sua IFES de origem e seguir os procedimentos estabelecidos." },
    { "input": "É possível mudar de curso na UFC?", "output": "Sim, é possível, mas o aluno deve verificar as normas e critérios no edital de mudança de curso." },
    { "input": "Como funciona o Sistema de Seleção Unificada (SiSU) na UFC?", "output": "O SiSU utiliza a nota do Enem para selecionar alunos para os cursos da universidade, conforme edital específico." },
    { "input": "Quais são as condições para a transferência de outras IES para a UFC?", "output": "A transferência é regida por edital e depende da nota do Enem, além de outras condições." },
    { "input": "O que é o Auxílio Moradia?", "output": "É um benefício concedido a alunos em situação de vulnerabilidade socioeconômica, que pode ser acumulado com outras bolsas." },
    { "input": "Como é calculado o IRA Individual?", "output": "O IRA Individual é calculado com base nas notas e carga horária das disciplinas cursadas pelo aluno." },
    { "input": "Quais atividades complementares são consideradas para o IRA?", "output": "Atividades complementares de ensino não são incluídas no cálculo do IRA Individual." },
    { "input": "O que é o Auxílio Emergencial e quando pode ser solicitado?", "output": "É concedido em situações de emergência, como problemas de saúde ou limitações financeiras temporárias." },
    { "input": "Como posso consultar meu IRA?", "output": "O IRA pode ser consultado no histórico acadêmico do aluno." },
    { "input": "Qual é o limite de disciplinas que um aluno especial pode cursar na UFC?", "output": "O aluno especial não pode exceder cinco disciplinas e deve completar isso em até quatro semestres letivos." },
    { "input": "Quais são os critérios para solicitar mudança de curso na UFC?", "output": "Os critérios são estabelecidos em edital específico publicado pela Prograd, com base em IRA, vagas disponíveis e período cursado." },
    { "input": "Como funciona o Programa de Residência Universitária?", "output": "O programa oferece moradia estudantil aos alunos em situação de vulnerabilidade socioeconômica." },
    { "input": "O que é o Programa de Apoio Psicopedagógico?", "output": "É um programa que oferece apoio psicológico e pedagógico aos alunos da UFC." },
    { "input": "O que é o Programa de Apoio ao Estudante Estrangeiro?", "output": "É um programa que oferece apoio aos estudantes estrangeiros que desejam estudar na UFC." },
    { "input": "O que é o Programa de Apoio ao Estudante com Deficiência?", "output": "É um programa que oferece apoio aos estudantes com deficiência que desejam estudar na UFC." }
  ];

  const uniqueTrainingData = Array.from(new Set(trainingData.map(JSON.stringify))).map(JSON.parse);

  let currentQuestion = null;
  uniqueTrainingData.forEach(item => {
    classifier.addDocument(preprocessText(item.input), preprocessText(item.output));
  });

  classifier.train();
  
  lines.forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('-Pergunta:')) {
      currentQuestion = trimmedLine.replace('-Pergunta:', '').trim();
    } else if (trimmedLine.startsWith('-Resposta:') && currentQuestion) {
      const answer = trimmedLine.replace('-Resposta:', '').trim();
      uniqueTrainingData.push({ input: currentQuestion, output: answer });
      currentQuestion = null;
    }
  });

  return uniqueTrainingData;
}

async function trainChatbot() {
  try {
    const filePath = path.join(__dirname, 'public', 'respostas.pdf'); // Atualize o caminho conforme necessário
    const text = await extractTextFromPDF(filePath); 
    const trainingData = processText(text);    

    if (trainingData.length === 0) {
      throw new Error('No training data found.');
    }

    // Salvar dados de treinamento no banco de dados
    for (const item of trainingData) {
      if (item.input && item.output) {
        await db.query(
          'INSERT INTO chat_history (user_message, bot_response) VALUES ($1, $2)',
          [item.input, item.output]
        );
        classifier.addDocument(item.input, item.output);
      }
    }

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

    const newTrainingData = results.rows.map(row => ({
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

module.exports = { processText, classifier, trainChatbot, retrainChatbot };