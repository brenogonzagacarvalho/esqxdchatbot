
const userStates = {};

function handleUserMessage(ctx, classifier) {
  const userId = ctx.from.id;
  let userMessage = ctx.message.text;
  console.log('Mensagem do usuário:', userMessage);

  if (!classifier.docs || classifier.docs.length === 0) {
    throw new Error("Classifier has not been trained.");
  }

  const classifications = classifier.getClassifications(userMessage);
  const highestClassification = classifications[0];
  let botResponse;

  if (highestClassification) {
    botResponse = highestClassification.label;
  } else {
    botResponse = "Desculpe, não entendi sua mensagem.";
  }

  ctx.reply(botResponse);

  if (!userStates[userId]) {
    userStates[userId] = { step: 0 };
  }

  if (userStates[userId].step === 0) {
    userStates[userId].step = 1;
    setTimeout(() => ctx.reply('Você precisa de mais alguma coisa?'), 1000);
  } else if (userStates[userId].step === 1) {
    userStates[userId].step = 2;
    setTimeout(() => ctx.reply('Posso ajudar com mais alguma coisa?'), 1000);
  } else if (userStates[userId].step === 2) {
    ctx.reply('Obrigado por entrar em contato. Tenha um ótimo dia!');
    setTimeout(() => ctx.reply('Se precisar de mais assistência, entre em contato diretamente com a coordenação do curso.'), 1000);
    delete userStates[userId];
  }
}

module.exports = { handleUserMessage };