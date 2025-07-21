# 🔧 Guia de Configuração - Chatbot Educacional

> **Guia completo para configuração e deployment do chatbot para fins acadêmicos**

## 📋 Índice

- [Pré-requisitos](#pré-requisitos)
- [Configuração do Ambiente](#configuração-do-ambiente)
- [Criação do Bot Telegram](#criação-do-bot-telegram)
- [Configuração de Variáveis](#configuração-de-variáveis)
- [Deploy na Vercel](#deploy-na-vercel)
- [Testes e Validação](#testes-e-validação)
- [Monitoramento](#monitoramento)
- [Troubleshooting](#troubleshooting)

## 🛠️ Pré-requisitos

### Software Necessário

```bash
# Versões recomendadas
Python 3.11+
Node.js 18+
Git 2.40+
```

### Contas Necessárias

- [x] **Telegram**: Para criar e configurar o bot
- [x] **Vercel**: Para deploy e hospedagem
- [x] **Hugging Face**: Para acesso aos modelos de IA (opcional)
- [x] **GitHub**: Para versionamento do código

## 🚀 Configuração do Ambiente

### 1. Clone e Preparação

```bash
# Clone o repositório
git clone https://github.com/brenogonzagacarvalho/esqxdchatbot.git
cd esqxdchatbot

# Crie ambiente virtual
python -m venv .venv

# Ative o ambiente
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# Instale dependências
pip install -r requirements.txt
npm install
```

### 2. Estrutura de Arquivos

```
Certifique-se de que a estrutura está assim:
esqxdchatbot/
├── api/
│   ├── webhook.py
│   └── history.py
├── public/
│   ├── perguntas_respostas_melhorado.json
│   └── ppc_chunks.json
├── bot.py
├── requirements.txt
├── vercel.json
└── .env (criar)
```

## 🤖 Criação do Bot Telegram

### Passo a Passo

1. **Acesse o BotFather**
   ```
   Telegram: @BotFather
   ```

2. **Crie o Bot**
   ```
   /newbot
   Nome do Bot: UFC ES Chatbot
   Username: @ufc_es_chatbot (deve ser único)
   ```

3. **Configure o Bot**
   ```
   /setdescription - Chatbot para Engenharia de Software UFC Quixadá
   /setcommands - start: Iniciar conversa
   /setprivacy - Disable (para ler todas as mensagens)
   ```

4. **Obtenha o Token**
   ```
   Token será algo como: 123456789:ABCdefGHIjklMNOpqrSTUvwxyz
   ```

### Configurações Avançadas

```bash
# Comandos opcionais do BotFather
/setabouttext - Bot desenvolvido para TCC - ES UFC Quixadá
/setuserpic - Upload de foto do bot
/setinline - Habilitar modo inline (opcional)
```

## ⚙️ Configuração de Variáveis

### Arquivo .env

Crie o arquivo `.env` na raiz do projeto:

```env
# Token do Bot Telegram (OBRIGATÓRIO)
TELEGRAM_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxyz

# Token Hugging Face (OPCIONAL - para modelos premium)
HF_API_TOKEN=hf_xxxxxxxxxxxxxxxxxxxxxxxxx

# URL do Webhook (será preenchida após deploy)
WEBHOOK_URL=https://seu-projeto.vercel.app/api/webhook

# Configurações de Debug (OPCIONAL)
DEBUG_MODE=false
LOG_LEVEL=INFO
```

### Variáveis da Vercel

```bash
# Configure via Vercel CLI
vercel env add TELEGRAM_TOKEN
vercel env add HF_API_TOKEN
```

## 🚀 Deploy na Vercel

### Configuração Inicial

1. **Instale Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login na Vercel**
   ```bash
   vercel login
   ```

3. **Configure o Projeto**
   ```bash
   vercel
   # Siga as instruções:
   # - Link to existing project? No
   # - Project name: esqxd-chatbot
   # - Directory: ./
   ```

### Deploy

```bash
# Deploy de desenvolvimento
vercel

# Deploy de produção
vercel --prod
```

### Configuração do Webhook

```bash
# Execute após o deploy
python setup_webhook.py
```

## ✅ Testes e Validação

### Testes Locais

```bash
# Teste o processamento de PDF
python pdf_processor.py

# Teste a busca no PPC
python ppc_search.py

# Teste o modelo FLAN-T5
python flan_service.py

# Execute o bot localmente
python bot.py
```

### Testes do Bot

1. **Teste Básico**
   ```
   Telegram: /start
   Esperado: Menu principal aparecer
   ```

2. **Teste de Perguntas**
   ```
   "Como fazer matrícula?"
   Esperado: Resposta estruturada sobre matrícula
   ```

3. **Teste de Menu**
   ```
   Navegue pelos menus usando os botões
   Esperado: Navegação funcional
   ```

### Validação do Deploy

```bash
# Teste webhook
curl -X POST https://seu-projeto.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Verificar logs
vercel logs
```

## 📊 Monitoramento

### Analytics via Vercel

```python
# Exemplo de tracking personalizado
from vercel_storage import vercel_storage

vercel_storage.store_analytics("custom_event", {
    "user_id": user_id,
    "action": "pergunta_respondida",
    "timestamp": datetime.now().isoformat()
})
```

### Logs de Sistema

```python
# Configure logging
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

### Métricas Importantes

- **Taxa de Resposta**: % de perguntas respondidas com sucesso
- **Tempo de Resposta**: Latência média das respostas
- **Uso de Fallbacks**: Frequência de uso do FLAN-T5
- **Erros**: Monitoramento de exceções

## 🔧 Troubleshooting

### Problemas Comuns

#### 1. Bot não responde

**Sintomas:**
- Bot online mas não responde mensagens
- Webhook retorna erro 500

**Soluções:**
```bash
# Verifique o token
echo $TELEGRAM_TOKEN

# Teste webhook manualmente
curl -X POST https://api.telegram.org/bot{TOKEN}/getWebhookInfo

# Reconfigure webhook
python setup_webhook.py
```

#### 2. Modelo FLAN-T5 não carrega

**Sintomas:**
- Respostas de fallback sempre ativadas
- Erros de CUDA/memória nos logs

**Soluções:**
```python
# Force CPU mode
import os
os.environ['CUDA_VISIBLE_DEVICES'] = ''

# Reduza batch size
# Em flan_service.py, ajuste max_new_tokens
```

#### 3. Arquivo PPC não encontrado

**Sintomas:**
- Busca no PPC sempre vazia
- Erro "arquivo não encontrado"

**Soluções:**
```bash
# Verifique se o arquivo existe
ls -la public/ppc_chunks.json

# Reprocesse o PDF
python pdf_processor.py
```

#### 4. Problemas de Deploy

**Sintomas:**
- Build fail na Vercel
- Dependências não instaladas

**Soluções:**
```bash
# Limpe cache
vercel dev --clean

# Verifique requirements.txt
pip freeze > requirements.txt

# Teste localmente
python -m pytest tests/
```

### Debug Avançado

#### Logs Detalhados

```python
# Adicione no início dos arquivos principais
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Teste de Componentes

```python
# Teste individual dos serviços
if __name__ == "__main__":
    # Teste PPC Search
    results = ppc_search.search_ppc("estágio")
    print(f"Resultados PPC: {len(results)}")
    
    # Teste FLAN-T5
    if flan_service.model:
        response = flan_service.generate_response("teste", "contexto")
        print(f"FLAN Response: {response}")
```

## 📞 Suporte

### Documentação Adicional

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Vercel Documentation](https://vercel.com/docs)
- [Hugging Face Transformers](https://huggingface.co/docs)

### Contato

- **Issues**: [GitHub Issues](https://github.com/brenogonzagacarvalho/esqxdchatbot/issues)
- **Email**: es@quixada.ufc.br
- **Campus**: UFC Quixadá - Engenharia de Software

---

*Este guia foi desenvolvido para facilitar a replicação e manutenção do projeto para fins acadêmicos.*
