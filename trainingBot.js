const axios = require('axios');
require('dotenv').config();

const TELEGRAM_USER_ID = 88996851679; // Substitua pelo seu ID do Telegram (simulado)
const API_BASE_URL = 'http://localhost:3001'; // URL da API do bot principal

// Perguntas simuladas para treinamento
const simulatedQuestions = [
  // Perguntas sobre Estágio
  { question: 'O estágio pode ser prorrogado? Como fazer isso?', answer: 'Sim, desde que seja formalizado com a instituição e aprovado pela coordenação.' },
  { question: 'Existe um limite de horas semanais para o estágio?', answer: 'Sim, o limite é de 30 horas semanais para estágios não obrigatórios.' },
  { question: 'O estágio pode ser realizado remotamente?', answer: 'Sim, desde que aprovado pela coordenação do curso e pela empresa.' },
  { question: 'Quais são os direitos do estagiário segundo a legislação?', answer: 'Os direitos incluem bolsa-auxílio, recesso remunerado e seguro contra acidentes pessoais.' },
  { question: 'O que acontece se o estágio não for concluído dentro do prazo?', answer: 'O aluno pode ser reprovado na disciplina de estágio e precisará refazê-la.' },
  { question: 'Como funciona a supervisão do estágio em empresas externas?', answer: 'A supervisão é feita por um professor orientador e um supervisor na empresa.' },
  { question: 'É possível trocar de empresa durante o estágio?', answer: 'Sim, desde que seja formalizado com a universidade e a nova empresa.' },
  { question: 'O estágio pode ser realizado em uma startup?', answer: 'Sim, desde que a startup cumpra os requisitos legais para oferecer estágio.' },
  { question: 'Quais são os critérios para validar o relatório final do estágio?', answer: 'O relatório deve ser aprovado pelo professor orientador e atender às diretrizes do curso.' },
  { question: 'O estágio pode ser interrompido temporariamente?', answer: 'Sim, em casos excepcionais, com aprovação da coordenação do curso.' },

  // Perguntas sobre Matrícula
  { question: 'Como faço para alterar minha matrícula após o prazo?', answer: 'Você deve solicitar à coordenação do curso e justificar o motivo do atraso.' },
  { question: 'O que acontece se eu não renovar minha matrícula no prazo?', answer: 'Você pode perder o vínculo com a universidade e precisará solicitar reativação.' },
  { question: 'Posso cursar disciplinas de outro curso sem mudar de curso?', answer: 'Sim, desde que autorizado pela coordenação do seu curso e do curso desejado.' },
  { question: 'Existe um limite de disciplinas que posso trancar?', answer: 'Sim, o limite é definido pelo regulamento acadêmico da universidade.' },
  { question: 'Como funciona o processo de matrícula para alunos transferidos?', answer: 'Os alunos transferidos devem apresentar a documentação exigida e seguir o calendário acadêmico.' },
  { question: 'Posso cancelar minha matrícula e reativá-la depois?', answer: 'Sim, mas a reativação está sujeita às regras da universidade.' },
  { question: 'Como faço para solicitar matrícula em disciplinas de outro campus?', answer: 'Você deve solicitar à coordenação do curso e justificar a necessidade.' },
  { question: 'Existe um prazo para regularizar pendências de matrícula?', answer: 'Sim, o prazo é definido no calendário acadêmico da universidade.' },
  { question: 'O que é o ajuste de matrícula e como funciona?', answer: 'O ajuste de matrícula é um período para corrigir ou alterar disciplinas matriculadas.' },
  { question: 'Como faço para me matricular em disciplinas optativas?', answer: 'Você deve verificar as disciplinas disponíveis e solicitar matrícula no sistema acadêmico.' },

  // Perguntas sobre Vida Acadêmica
  { question: 'Como posso acessar meu histórico acadêmico?', answer: 'Você pode acessar pelo sistema acadêmico da universidade.' },
  { question: 'O que é o IRA (Índice de Rendimento Acadêmico) e como ele é calculado?', answer: 'O IRA é calculado com base nas notas e cargas horárias das disciplinas cursadas.' },
  { question: 'Existe algum programa de monitoria disponível para minha área?', answer: 'Sim, verifique os editais de monitoria publicados pela coordenação do curso.' },
  { question: 'Como posso participar de projetos de pesquisa ou extensão?', answer: 'Você deve entrar em contato com os professores responsáveis pelos projetos.' },
  { question: 'Quais são os critérios para solicitar uma bolsa de estudos?', answer: 'Os critérios incluem desempenho acadêmico e situação socioeconômica.' },
  { question: 'Como funciona o processo de transferência para outra universidade?', answer: 'Você deve seguir os editais de transferência publicados pela universidade de destino.' },
  { question: 'Existe algum suporte para alunos com dificuldades acadêmicas?', answer: 'Sim, a universidade oferece apoio pedagógico e psicológico.' },
  { question: 'Como posso solicitar uma declaração de vínculo com a universidade?', answer: 'Você pode solicitar pelo sistema acadêmico ou na secretaria do curso.' },
  { question: 'Quais são os benefícios oferecidos pela PRAE (Pró-Reitoria de Assuntos Estudantis)?', answer: 'A PRAE oferece bolsas, auxílios e suporte psicológico aos alunos.' },
  { question: 'Como posso participar de programas de intercâmbio acadêmico?', answer: 'Você deve verificar os editais de intercâmbio publicados pela universidade.' },

  // Perguntas sobre Assistência Estudantil
  { question: 'Como faço para solicitar auxílio transporte?', answer: 'Você deve preencher o formulário disponível no site da PRAE.' },
  { question: 'Existe algum programa de moradia estudantil?', answer: 'Sim, a universidade oferece vagas em residências estudantis.' },
  { question: 'Como funciona o processo de seleção para bolsas de assistência estudantil?', answer: 'O processo é baseado em análise socioeconômica e edital publicado pela PRAE.' },
  { question: 'Quais são os critérios para receber auxílio alimentação?', answer: 'Os critérios incluem análise socioeconômica e disponibilidade de recursos.' },
  { question: 'Existe algum suporte psicológico para os alunos?', answer: 'Sim, a PRAE oferece suporte psicológico gratuito.' },
  { question: 'Como posso me inscrever em atividades esportivas oferecidas pela universidade?', answer: 'Você deve procurar o setor de esportes da universidade.' },
  { question: 'Existe algum programa de inclusão para alunos com deficiência?', answer: 'Sim, a universidade oferece suporte e adaptações para alunos com deficiência.' },
  { question: 'Como posso acessar os serviços médicos da universidade?', answer: 'Você deve agendar atendimento no setor de saúde da universidade.' },
  { question: 'Existe algum programa de apoio financeiro para alunos em situação de vulnerabilidade?', answer: 'Sim, a PRAE oferece auxílios financeiros para alunos em vulnerabilidade.' },
  { question: 'Como funciona o atendimento odontológico para os alunos?', answer: 'O atendimento odontológico é oferecido pelo setor de saúde da universidade.' },

  // Perguntas Gerais
  { question: 'Como posso recuperar minha senha do sistema acadêmico?', answer: 'Você pode usar a opção de recuperação de senha no portal acadêmico.' },
  { question: 'Existe algum aplicativo oficial da universidade?', answer: 'Sim, a universidade possui um aplicativo oficial para acesso ao sistema acadêmico.' },
  { question: 'Como posso entrar em contato com a coordenação do meu curso?', answer: 'Você pode enviar um e-mail ou visitar a secretaria do curso.' },
  { question: 'Quais são os horários de funcionamento da biblioteca?', answer: 'Os horários estão disponíveis no site da biblioteca da universidade.' },
  { question: 'Como posso reservar uma sala de estudo na universidade?', answer: 'Você deve fazer a reserva pelo sistema da biblioteca ou presencialmente.' },
  { question: 'Existe algum canal para denunciar irregularidades acadêmicas?', answer: 'Sim, você pode usar a ouvidoria da universidade para denúncias.' },
  { question: 'Como posso acessar o calendário acadêmico?', answer: 'O calendário acadêmico está disponível no site da universidade.' },
  { question: 'Quais são os procedimentos para solicitar segunda chamada de provas?', answer: 'Você deve justificar a ausência e solicitar à coordenação do curso.' },
  { question: 'Existe algum programa de mentoria para novos alunos?', answer: 'Sim, a universidade oferece programas de mentoria para calouros.' },
  { question: 'Como posso obter informações sobre eventos acadêmicos e culturais?', answer: 'Você pode acessar o site da universidade ou os murais informativos.' },
];

async function simulateTraining() {
  try {
    console.log('Iniciando simulação de treinamento...');

    for (const { question, answer } of simulatedQuestions) {
      // Enviar pergunta para a tabela de perguntas não respondidas
      console.log(`Enviando pergunta: "${question}"`);
      await axios.post(`${API_BASE_URL}/unanswered-questions`, {
        user_id: TELEGRAM_USER_ID,
        question,
      });

      // Adicionar resposta para a pergunta
      const { data: unansweredQuestions } = await axios.get(`${API_BASE_URL}/unanswered-questions`);
      const questionEntry = unansweredQuestions.find((q) => q.question === question);

      if (questionEntry) {
        console.log(`Adicionando resposta: "${answer}" para a pergunta ID: ${questionEntry.id}`);
        await axios.post(`${API_BASE_URL}/add-answer`, {
          questionId: questionEntry.id,
          answer,
        });
        console.log(`Pergunta "${question}" treinada com sucesso!`);
      } else {
        console.error(`Pergunta "${question}" não encontrada na tabela de perguntas não respondidas.`);
      }
    }

    console.log('Simulação de treinamento concluída.');
  } catch (err) {
    console.error('Erro durante a simulação de treinamento:', err.message);
  }
}

simulateTraining();