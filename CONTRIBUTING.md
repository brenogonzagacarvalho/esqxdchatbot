# 🤝 Contribuindo para o Projeto

> **Guia para contribuições acadêmicas e melhorias no Chatbot Educacional**

## 📋 Índice

- [Como Contribuir](#como-contribuir)
- [Tipos de Contribuição](#tipos-de-contribuição)
- [Configuração de Desenvolvimento](#configuração-de-desenvolvimento)
- [Padrões de Código](#padrões-de-código)
- [Processo de Pull Request](#processo-de-pull-request)
- [Reportando Issues](#reportando-issues)

## 🚀 Como Contribuir

Este projeto foi desenvolvido como TCC e agradecemos contribuições que:

- 🎓 **Melhorem a experiência educacional**
- 🧠 **Aprimorem o processamento de linguagem natural**
- 📚 **Expandam a base de conhecimento**
- 🔧 **Otimizem performance e escalabilidade**
- 📝 **Melhorem a documentação**

## 🎯 Tipos de Contribuição

### 1. 📝 Melhorias na Base de Conhecimento

**Adicionando novas perguntas e respostas:**

```json
{
  "pergunta": "Nova pergunta sobre ES",
  "variacoes": ["variação 1", "variação 2"],
  "resposta": "Resposta formatada em **Markdown**",
  "tags": ["tag1", "tag2"],
  "categoria": "nova_categoria"
}
```

**Diretrizes:**
- Use Markdown para formatação
- Seja específico e preciso
- Inclua variações comuns da pergunta
- Adicione tags relevantes

### 2. 🤖 Melhorias no Processamento de IA

**Áreas de interesse:**
- Algoritmos de similaridade
- Detecção de ambiguidade
- Processamento de contexto
- Otimizações do FLAN-T5

### 3. 🏗️ Melhorias na Arquitetura

**Oportunidades:**
- Novos handlers para tipos de mídia
- Sistema de cache
- Otimizações de performance
- Monitoramento avançado

### 4. 📊 Analytics e Métricas

**Possíveis adições:**
- Dashboard de métricas
- Relatórios de uso
- Análise de sentimento
- A/B testing

## 🛠️ Configuração de Desenvolvimento

### Pré-requisitos

```bash
Python 3.11+
Git 2.40+
Node.js (para Vercel)
```

### Setup Inicial

```bash
# 1. Fork o repositório
git clone https://github.com/SEU_USUARIO/esqxdchatbot.git
cd esqxdchatbot

# 2. Crie ambiente virtual
python -m venv .venv
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # Linux/Mac

# 3. Instale dependências
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Se existir

# 4. Configure variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# 5. Execute testes
python -m pytest tests/  # Se existir
```

### Estrutura de Desenvolvimento

```
Desenvolvimento local:
├── 🧪 Testes unitários (pytest)
├── 🔍 Lint (flake8/black)
├── 📝 Type checking (mypy)
├── 🚀 Bot local (python bot.py)
└── 📊 Análise de dados
```

## 📏 Padrões de Código

### Python

```python
# Use type hints sempre que possível
def process_question(query: str, context: Optional[str] = None) -> str:
    """
    Processa pergunta do usuário.
    
    Args:
        query: Pergunta do usuário
        context: Contexto adicional opcional
        
    Returns:
        Resposta processada
    """
    pass

# Use docstrings Google style
# Use logging ao invés de print
# Trate exceções adequadamente
```

### Formatação

```bash
# Use black para formatação automática
black *.py

# Use isort para imports
isort *.py

# Use flake8 para linting
flake8 *.py
```

### Commits

```bash
# Formato de commits
feat: adiciona nova funcionalidade X
fix: corrige bug na função Y
docs: atualiza documentação Z
refactor: melhora algoritmo W
test: adiciona testes para V

# Exemplo
feat: adiciona detecção de perguntas sobre disciplinas optativas
fix: corrige erro de encoding em perguntas com acentos
docs: atualiza README com novos exemplos de uso
```

## 🔄 Processo de Pull Request

### 1. Preparação

```bash
# Crie branch para sua feature
git checkout -b feature/nova-funcionalidade

# Ou para correção
git checkout -b fix/corrige-bug-x
```

### 2. Desenvolvimento

- ✅ Escreva código seguindo padrões
- ✅ Adicione testes se aplicável
- ✅ Atualize documentação
- ✅ Execute testes locais

### 3. Pull Request

**Template de PR:**

```markdown
## 📋 Descrição

Breve descrição das mudanças propostas.

## 🎯 Tipo de Mudança

- [ ] 🐛 Bug fix
- [ ] ✨ Nova funcionalidade
- [ ] 📝 Documentação
- [ ] 🔧 Refatoração
- [ ] 🧪 Testes

## 🧪 Como Testar

1. Passos para testar a mudança
2. Casos de teste específicos
3. Resultados esperados

## ✅ Checklist

- [ ] Código segue padrões do projeto
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] Sem conflitos de merge

## 📸 Screenshots (se aplicável)

Capturas de tela das mudanças na interface.
```

### 4. Review Process

1. **Automated checks** - CI/CD executa testes
2. **Code review** - Revisão por mantenedores
3. **Testing** - Testes em ambiente de staging
4. **Merge** - Integração ao main branch

## 🐛 Reportando Issues

### Bug Reports

```markdown
**🐛 Descrição do Bug**
Descrição clara do comportamento inesperado.

**🔄 Como Reproduzir**
1. Passo 1
2. Passo 2
3. Resultado obtido

**✅ Comportamento Esperado**
O que deveria acontecer.

**📱 Ambiente**
- OS: [Windows/Linux/Mac]
- Python: [versão]
- Telegram: [client usado]

**📎 Logs**
```
Logs de erro relevantes
```

**📸 Screenshots**
Se aplicável, adicione screenshots.
```

### Feature Requests

```markdown
**💡 Descrição da Feature**
Descrição clara da funcionalidade desejada.

**🎯 Problema que Resolve**
Que problema esta feature resolve?

**💭 Solução Proposta**
Como você imagina que funcionaria?

**🔄 Alternativas Consideradas**
Outras formas de resolver o problema.

**📊 Impacto Educacional**
Como isso beneficiaria estudantes/coordenação?
```

## 🎓 Contribuições Acadêmicas

### Para Estudantes

**Oportunidades de TCC/Projeto:**
- Integração com SIGAA
- Dashboard de analytics
- App mobile
- Fine-tuning de modelos
- Expansão para outros cursos

### Para Pesquisadores

**Áreas de Pesquisa:**
- NLP em contexto educacional brasileiro
- Chatbots para ensino superior
- Analytics educacionais
- Acessibilidade em interfaces conversacionais

### Para Professores

**Possíveis Extensões:**
- Integração com sistemas LMS
- Personalização por disciplina
- Sistema de avaliação automática
- Ferramentas de acompanhamento

## 📞 Contato

### Discussões

- **GitHub Discussions**: Para ideias e perguntas
- **Issues**: Para bugs e feature requests
- **Email**: es@quixada.ufc.br

### Mantenedores

- **Coordenação ES**: Supervisão acadêmica
- **Desenvolvedor Principal**: Implementação técnica
- **Community**: Contribuições externas

## 🏆 Reconhecimento

Contribuidores serão reconhecidos:

- ✨ **Contributors list** no README
- 🎓 **Academic acknowledgments** em publicações
- 📜 **Certificate of contribution** para estudantes
- 🌟 **Special mentions** em apresentações

---

**Obrigado por contribuir para a educação! 🎓**

*Juntos, estamos melhorando o acesso à informação acadêmica na UFC Quixadá.*
