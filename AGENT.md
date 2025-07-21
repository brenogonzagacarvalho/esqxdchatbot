# 🤖 AGENT.md - Chatbot Educacional UFC Quixadá

> **Documento de configuração para agentes IA e informações técnicas do projeto**

## 📋 Comandos Frequentes

### Desenvolvimento e Teste
```bash
# Executar bot localmente
python bot.py

# Processar PDF do PPC
python pdf_processor.py

# Testar componentes individuais
python -c "from ppc_search import ppc_search; print(ppc_search.search_ppc('estágio'))"
python -c "from flan_service import flan_service; print(flan_service.generate_response('teste', 'contexto'))"

# Executar testes
python test_bot.py
python test_filters.py
```

### Deploy e Produção
```bash
# Deploy na Vercel
vercel --prod

# Configurar webhook
python setup_webhook.py

# Verificar logs
vercel logs

# Instalar dependências
pip install -r requirements.txt
npm install
```

### Análise e Debug
```bash
# Verificar estrutura de arquivos
find . -name "*.py" -type f

# Verificar chunks do PPC
python -c "import json; data=json.load(open('public/ppc_chunks.json')); print(f'Chunks: {len(data[\"chunks\"])}')"

# Testar busca local
python -c "import json; qa=json.load(open('public/perguntas_respostas_melhorado.json')); print(f'Q&A items: {len(qa[\"qa_items\"])}')"
```

## 🏗️ Estrutura do Projeto

### Arquivos Principais
- `bot.py` - Núcleo do bot com handlers principais
- `flan_service.py` - Serviço de IA com modelo FLAN-T5
- `ppc_search.py` - Motor de busca no PPC
- `pdf_processor.py` - Processamento de documentos PDF
- `vercel_storage.py` - Interface com Vercel Blob Storage

### Diretórios
- `api/` - Endpoints para Vercel (webhook.py, history.py)
- `public/` - Dados públicos (JSON Q&A, chunks do PPC)
- `examples/` - Documentação e exemplos de uso
- `.venv/` - Ambiente virtual Python

### Configuração
- `requirements.txt` - Dependências Python
- `package.json` - Dependências Node.js  
- `vercel.json` - Configuração de deploy
- `.env` - Variáveis de ambiente (não commitado)

## 🔧 Convenções de Código

### Python
- **Encoding**: UTF-8 para todos os arquivos
- **Docstrings**: Google style para funções principais
- **Type Hints**: Usar sempre que possível
- **Error Handling**: Try-catch com fallbacks robustos
- **Logging**: Usar módulo logging para debug

### Telegram Bot
- **Mensagens longas**: Dividir em chunks de 4000 caracteres
- **Parse mode**: Markdown para formatação
- **Keyboards**: ReplyKeyboardMarkup para menus
- **Error handling**: Resposta amigável mesmo em caso de erro

### Variáveis de Ambiente
```bash
TELEGRAM_TOKEN=obrigatório_para_funcionamento
HF_API_TOKEN=opcional_para_modelos_premium
WEBHOOK_URL=configurado_automaticamente_no_deploy
DEBUG_MODE=false_por_padrão
```

## 📊 Organização dos Dados

### Base Q&A (`public/perguntas_respostas_melhorado.json`)
```json
{
  "qa_items": [
    {
      "pergunta": "pergunta principal",
      "variacoes": ["variação 1", "variação 2"],
      "resposta": "resposta em **Markdown**",
      "tags": ["tag1", "tag2"],
      "categoria": "categoria"
    }
  ],
  "ambiguity_detection": {
    "keywords": ["lista", "de", "palavras", "ambíguas"],
    "generic_terms": ["termos", "genéricos"],
    "clarification_map": {},
    "default_clarifications": []
  }
}
```

### Chunks do PPC (`public/ppc_chunks.json`)
```json
{
  "source": "PPC-ES-2023.pdf",
  "total_chunks": 150,
  "chunks": [
    {
      "id": "chunk_1",
      "text": "texto do chunk",
      "keywords": ["palavras", "chave"],
      "section": "categoria",
      "word_count": 100
    }
  ]
}
```

## 🎯 Fluxo de Processamento

### 1. Recebimento de Mensagem
```python
def route_message(update, context):
    # 1. Identifica tipo de usuário e estado
    # 2. Roteia para handler apropriado
    # 3. Processa resposta
    # 4. Envia resposta formatada
```

### 2. Processamento de Perguntas
```python
def handle_free_question(update, context):
    # 1. Verifica ambiguidade
    # 2. Busca em Q&A local (similaridade avançada)
    # 3. Busca no PPC (chunks indexados)
    # 4. Fallback para FLAN-T5 com contexto
    # 5. Resposta padrão se nada encontrado
```

### 3. Sistema de Similaridade
```python
def advanced_similarity(query, item):
    # Fatores:
    # - Similaridade textual (60%)
    # - Tags matching (20%)
    # - Keywords específicas (20%)
    # Threshold: 0.5 para respostas diretas
```

## 🚀 Deployment

### Vercel Configuration
```json
{
  "version": 2,
  "builds": [
    {"src": "api/webhook.py", "use": "@vercel/python"},
    {"src": "api/history.py", "use": "@vercel/python"}
  ],
  "routes": [
    {"src": "/api/webhook", "dest": "/api/webhook.py"},
    {"src": "/api/history/(.*)", "dest": "/api/history.py"}
  ]
}
```

### Webhook Setup
```python
# URL padrão: https://projeto.vercel.app/api/webhook
# Configurado automaticamente por setup_webhook.py
# Verificar com: curl -X POST webhook_url/api/webhook
```

## 📈 Monitoramento e Analytics

### Eventos Trackados
- `bot_start` - Usuário iniciou conversa
- `menu_selection` - Navegação por menus
- `question_asked` - Pergunta feita
- `answer_provided` - Resposta fornecida
- `fallback_used` - Uso de fallback (FLAN-T5)

### Estrutura de Analytics
```python
vercel_storage.store_analytics("evento", {
    "user_id": user_id,
    "timestamp": datetime.now().isoformat(),
    "data": "dados_específicos_do_evento"
})
```

## 🧪 Testes e Validação

### Testes Funcionais
```bash
# Testar Q&A local
python -c "from bot import advanced_similarity; print(advanced_similarity('estágio', {'pergunta': 'Como fazer estágio?', 'tags': ['estágio']}))"

# Testar PPC search
python -c "from ppc_search import ppc_search; results = ppc_search.search_ppc('estágio'); print(len(results))"

# Testar FLAN-T5
python -c "from flan_service import flan_service; print(flan_service.generate_response('teste', 'contexto'))"
```

### Validação de Deploy
```bash
# Verificar webhook ativo
curl -I https://seu-projeto.vercel.app/api/webhook

# Testar bot no Telegram
# Enviar /start e verificar resposta
```

## 🎓 Contexto Acadêmico

### Objetivos do TCC
- Desenvolver chatbot educacional para ES-UFC
- Implementar processamento de linguagem natural
- Integrar dados do PPC-ES 2023
- Criar sistema de fallbacks inteligentes
- Validar eficácia através de testes práticos

### Tecnologias Justificadas
- **Python**: Excelente para IA/ML e processamento de texto
- **FLAN-T5**: Modelo seq2seq otimizado para Q&A
- **Telegram**: API robusta e amplamente utilizada
- **Vercel**: Deploy simplificado e escalável
- **JSON**: Estrutura flexível para dados educacionais

### Métricas de Avaliação
- Taxa de resolução de perguntas: > 85%
- Tempo de resposta médio: < 2 segundos
- Cobertura do PPC: ~80% das informações
- Facilidade de uso: Interface intuitiva

## 🔮 Roadmap e Melhorias

### Próximas Versões
1. **v2.0**: Integração com SIGAA para dados em tempo real
2. **v2.1**: Dashboard de analytics em tempo real  
3. **v2.2**: Fine-tuning do modelo para domínio específico
4. **v3.0**: Expansão para outros cursos da UFC

### Limitações Conhecidas
- Modelo FLAN-T5 Small (limitações de hardware)
- Contexto limitado ao PPC-ES 2023
- Português brasileiro específico
- Dependência de internet para Vercel

---

*Este documento serve como guia técnico completo para manutenção, extensão e compreensão do projeto desenvolvido como TCC.*
