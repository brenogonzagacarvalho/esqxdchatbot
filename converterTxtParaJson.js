const fs = require('fs');

function converterTxtParaJson(caminhoTxt, caminhoJson) {
  const conteudo = fs.readFileSync(caminhoTxt, 'utf-8');
  const linhas = conteudo.split('\n');

  const dados = [];
  let perguntaAtual = null;
  let contador = 0;

  for (const linha of linhas) {
    if (linha.startsWith('- Pergunta:')) {
      perguntaAtual = linha.replace('- Pergunta:', '').trim();
    } else if (linha.startsWith('- Resposta:') && perguntaAtual) {
      const resposta = linha.replace('- Resposta:', '').trim();
      dados.push({
        intent: `resposta_${contador++}`,
        pergunta: perguntaAtual,
        resposta,
      });
      perguntaAtual = null;
    }
  }

  fs.writeFileSync(caminhoJson, JSON.stringify(dados, null, 2), 'utf-8');
  console.log(`Arquivo JSON gerado com sucesso: ${caminhoJson}`);
}

converterTxtParaJson('./public/perguntas_respostas.txt', './public/perguntas_respostas.json');
