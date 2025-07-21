"""
Chatbot Educacional para Engenharia de Software - UFC Quixadá

Este módulo implementa o núcleo do chatbot desenvolvido como parte do TCC,
fornecendo interface conversacional via Telegram para consultas acadêmicas.

Funcionalidades principais:
- Interface com API do Telegram
- Sistema de menus hierárquicos para navegação
- Processamento inteligente de perguntas em linguagem natural
- Integração com base de conhecimento do PPC-ES 2023
- Analytics e armazenamento de dados de uso

Arquitetura:
- Message Router: Roteia mensagens entre handlers apropriados
- Question Processor: Processa perguntas usando múltiplas estratégias
- Menu System: Sistema hierárquico de navegação por tópicos
- Media Handlers: Tratamento de diferentes tipos de mídia

Autor: Desenvolvimento para TCC - Engenharia de Software UFC Quixadá
Data: 2025
"""

import json
import os
from difflib import SequenceMatcher
from telegram import Update, ReplyKeyboardMarkup, ReplyKeyboardRemove
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    ContextTypes,
    filters,
)
from dotenv import load_dotenv

from src.services.storage.vercel_storage import vercel_storage
from src.services.ai.flan_service import flan_service, DEFAULT_CONTEXT
from src.services.search.ppc_search import ppc_search

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

async def send_long_message(update: Update, message: str, parse_mode: str = 'Markdown'):
    """Envia mensagem longa dividindo em chunks se necessário"""
    MAX_MESSAGE_LENGTH = 4000  # Deixa margem de segurança
    
    if len(message) <= MAX_MESSAGE_LENGTH:
        await update.message.reply_text(message, parse_mode=parse_mode)
        return
    
    # Divide a mensagem em chunks
    chunks = []
    current_chunk = ""
    
    for line in message.split('\n'):
        if len(current_chunk) + len(line) + 1 <= MAX_MESSAGE_LENGTH:
            current_chunk += line + '\n'
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = line + '\n'
    
    if current_chunk:
        chunks.append(current_chunk.strip())
    
    # Envia cada chunk
    for i, chunk in enumerate(chunks):
        if i == 0:
            await update.message.reply_text(chunk, parse_mode=parse_mode)
        else:
            await update.message.reply_text(f"(continuação...)\n\n{chunk}", parse_mode=parse_mode)

# Carrega perguntas e respostas
with open("data/qa/perguntas_respostas_melhorado.json", encoding="utf-8") as f:
    DATA = json.load(f)
    QA = DATA["qa_items"]
    AMBIGUITY_CONFIG = DATA["ambiguity_detection"]

# Menus
MAIN_MENU = [
    ["📚 Informações sobre Estágio"],
    ["🎓 Informações sobre Matrícula"],    
    ["📝 Registrar Dados Acadêmicos"],
    ["📞 Fale com a Coordenação"],
    ["🏆 Atividades Complementares"],
]

ESTAGIO_MENU = [
    ["💼 Estágio Curricular Supervisionado"],
    ["🏢 Empresas Conveniadas para Estágio"],
    ["🏛️ Núcleo de Práticas em Informática (NPI)"],
    ["🚀 Iniciativa Empreendedora (IE)"],
    ["🔬 Projetos de Pesquisa como Estágio"],
    ["🔙 Voltar ao Menu Principal"]
]

MATRICULA_MENU = [
    ["📅 Calendário Acadêmico"],
    ["📝 Como se Matricular"],
    ["🔄 Trancamento/Cancelamento"],
    ["📊 Histórico Escolar"],
    ["🔙 Voltar ao Menu Principal"]
]

CURSO_MENU = [
    ["📝 Trabalho de Conclusão de Curso (TCC)"],
    ["🌍 Curricularização da Extensão"],
    ["📖 Metodologias de Ensino"],
    ["⚖️ Avaliação do Curso"],
    ["👥 Gestão Acadêmica"],
    ["🔙 Voltar ao Menu Principal"]
]

# Função de similaridade melhorada
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def advanced_similarity(query: str, item: dict) -> float:
    """
    Calcula similaridade avançada considerando múltiplos fatores.
    
    Algoritmo multi-fator que combina diferentes métricas de similaridade
    para melhorar a precisão do matching entre perguntas do usuário e
    itens da base de conhecimento.
    
    Args:
        query (str): Pergunta do usuário
        item (dict): Item da base Q&A com estrutura:
                    - pergunta: pergunta principal
                    - variacoes: lista de variações da pergunta
                    - tags: lista de palavras-chave
    
    Returns:
        float: Score de similaridade entre 0.0 e 1.0
        
    Fatores considerados:
        - Similaridade textual com pergunta principal (60%)
        - Similaridade com variações
        - Matching de tags (20%)
        - Matching de palavras-chave específicas (20%)
    """
    query_lower = query.lower()
    
    # Similaridade com a pergunta principal
    main_score = similarity(query, item["pergunta"])
    
    # Similaridade com variações
    variation_scores = []
    for variacao in item.get("variacoes", []):
        variation_scores.append(similarity(query, variacao))
    
    max_variation_score = max(variation_scores) if variation_scores else 0
    
    # Similaridade com tags
    tag_score = 0
    for tag in item.get("tags", []):
        if tag.lower() in query_lower:
            tag_score += 0.3
    
    # Pontuação por palavras-chave específicas
    keyword_score = 0
    query_words = query_lower.split()
    for word in query_words:
        if len(word) > 3:  # Ignora palavras muito pequenas
            for variacao in item.get("variacoes", []):
                if word in variacao.lower():
                    keyword_score += 0.2
    
    # Combina as pontuações
    final_score = max(main_score, max_variation_score) * 0.6 + tag_score * 0.2 + keyword_score * 0.2
    
    return min(final_score, 1.0)  # Limita a 1.0

# 🏁 Start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    vercel_storage.store_analytics("bot_start", {
        "user_id": update.effective_user.id,
        "username": update.effective_user.username,
        "first_name": update.effective_user.first_name
    })

    await update.message.reply_text(
        f"🎓 Olá {update.effective_user.first_name}! Bem-vindo ao ChatBot da Coordenação de Engenharia de Software.\n\n"
        "Escolha uma opção abaixo ou digite sua pergunta.",
        reply_markup=ReplyKeyboardMarkup(MAIN_MENU, resize_keyboard=True)
    )
    context.user_data["step"] = "main_menu"

# 🎯 Menu Principal
async def handle_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text

    if msg == "📚 Informações sobre Estágio":
        await update.message.reply_text(
            "Selecione uma opção:",
            reply_markup=ReplyKeyboardMarkup(ESTAGIO_MENU, resize_keyboard=True)
        )
        context.user_data["step"] = "estagio_menu"

    elif msg == "🎓 Informações sobre Matrícula":
        await update.message.reply_text(
            "Selecione uma opção:",
            reply_markup=ReplyKeyboardMarkup(MATRICULA_MENU, resize_keyboard=True)
        )
        context.user_data["step"] = "matricula_menu"

    elif msg == "📝 Registrar Dados Acadêmicos":
        context.user_data["step"] = "cadastro_nome"
        await update.message.reply_text("Informe seu nome completo:", reply_markup=ReplyKeyboardRemove())

    elif msg == "📞 Fale com a Coordenação":
        await handle_specific_question(update, context, "📞 Fale com a Coordenação")

    elif msg == "🏆 Atividades Complementares":
        await handle_specific_question(update, context, "🏆 Atividades Complementares")

    elif msg == "🔙 Voltar ao Menu Principal":
        await start(update, context)

    else:
        await handle_free_question(update, context)

# 📝 Cadastro guiado
async def handle_cadastro(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_data = vercel_storage.get_user_data(user.id) or {}

    text = (
        "📝 **Seus Dados Acadêmicos**\n\n"
        f"👤 Nome: {user_data.get('nome', 'Não informado')}\n"
        f"🎓 Matrícula: {user_data.get('matricula', 'Não informado')}\n"
        f"📅 Semestre: {user_data.get('semestre', 'Não informado')}\n"
        f"📧 Email: {user_data.get('email', 'Não informado')}\n\n"
        "Para atualizar, use os comandos:\n"
        "/nome Seu Nome\n"
        "/matricula 123456\n"
        "/semestre de inicio2024.1\n"
        "/email seu@email.com"
    )

    await update.message.reply_text(text, parse_mode="Markdown")

# 🎯 Pergunta específica do menu
async def handle_specific_question(update: Update, context: ContextTypes.DEFAULT_TYPE, question: str):
    """Handle questions triggered by menu options"""
    # Procura pela pergunta específica no JSON
    for item in QA:
        if item["pergunta"] == question:
            await update.message.reply_text(item["resposta"], parse_mode='Markdown')
            return
    
    # Fallback para busca livre se não encontrar
    await handle_free_question(update, context)

# 🔍 Detecção de perguntas ambíguas
def is_ambiguous_question(question: str) -> bool:
    """Detecta se uma pergunta é muito ambígua ou genérica"""
    question_lower = question.lower()
    
    # Carrega configurações do JSON
    ambiguous_keywords = AMBIGUITY_CONFIG["keywords"]
    generic_terms = AMBIGUITY_CONFIG["generic_terms"]
    
    # Conta palavras ambíguas
    ambiguous_count = sum(1 for keyword in ambiguous_keywords if keyword in question_lower)
    
    # Verifica se tem termos genéricos sem especificação
    has_generic = any(term in question_lower for term in generic_terms)
    
    # Pergunta muito curta (menos de 20 caracteres)
    is_too_short = len(question.strip()) < 20
    
    # Considera ambígua se tem muitas palavras ambíguas OU é muito genérica
    return (ambiguous_count >= 2) or (has_generic and ambiguous_count >= 1) or is_too_short

# 💬 Gerar pedidos de esclarecimento
def generate_clarification_request(question: str) -> str:
    """Gera um pedido de esclarecimento específico baseado na pergunta"""
    question_lower = question.lower()
    
    # Carrega mapeamento do JSON
    clarification_map = AMBIGUITY_CONFIG["clarification_map"]
    
    # Encontra o termo mais relevante
    relevant_clarifications = []
    for term, clarifications in clarification_map.items():
        if term in question_lower:
            relevant_clarifications.extend(clarifications)
    
    # Se não encontrou termos específicos, usa esclarecimento genérico
    if not relevant_clarifications:
        relevant_clarifications = AMBIGUITY_CONFIG["default_clarifications"]
    
    clarification_text = "\n".join(relevant_clarifications[:5])  # Limita a 5 opções
    
    return (
        f"🤔 Sua pergunta precisa de mais detalhes para eu te ajudar melhor.\n\n"
        f"**Você está perguntando sobre:**\n"
        f"{clarification_text}\n\n"
        f"💡 **Dica:** Seja mais específico em sua pergunta para obter uma resposta mais precisa.\n"
        f"📞 **Ou contate:** es@quixada.ufc.br"
    )

# ❓ Perguntas livres
async def handle_free_question(update: Update, context: ContextTypes.DEFAULT_TYPE):
    question = update.message.text
    
    # 0. Verifica se a pergunta é muito ambígua
    if is_ambiguous_question(question):
        clarification = generate_clarification_request(question)
        await update.message.reply_text(clarification, parse_mode='Markdown')
        return
    
    # 1. Busca avançada no JSON local
    scored_items = []
    for item in QA:
        score = advanced_similarity(question, item)
        if score > 0.3:  # Threshold mais baixo para capturar mais opções
            scored_items.append((item, score))
    
    # Ordena por score e pega o melhor
    if scored_items:
        scored_items.sort(key=lambda x: x[1], reverse=True)
        best_match, best_score = scored_items[0]
        
        if best_score >= 0.5:  # Threshold ajustado
            response = best_match["resposta"]
            await update.message.reply_text(response, parse_mode='Markdown')
            return

    # 2. Busca por tags (mantida como fallback)
    for qa_item in QA:
        if any(tag.lower() in question.lower() for tag in qa_item.get("tags", [])):
            response = qa_item["resposta"]
            await update.message.reply_text(response, parse_mode='Markdown')
            return

    # 3. Busca no PPC
    ppc_response = ppc_search.get_formatted_response(question)
    if ppc_response:
        await send_long_message(update, ppc_response)
        return

    # 4. Verificação final antes do fallback
    if len(question.strip()) < 10:
        await update.message.reply_text(
            "🤔 Sua pergunta está muito curta.\n\n"
            "💡 **Tente ser mais específico:**\n"
            "• Qual é exatamente sua dúvida?\n"
            "• Sobre qual assunto você precisa de ajuda?\n\n"
            "📞 **Ou contate:** es@quixada.ufc.br",
            parse_mode='Markdown'
        )
        return

    # 5. Fallback controlado (apenas para perguntas bem estruturadas)
    try:
        # Contexto dinâmico baseado no PPC
        ppc_context = ppc_search.get_context_for_flan(question)
        
        # Só usa FLAN se encontrou contexto relevante no PPC
        if ppc_context and len(ppc_context.strip()) > 50:
            context_text = f"{DEFAULT_CONTEXT}\n\nContexto do PPC:\n{ppc_context}"
            resposta = flan_service.generate_response(question, context_text)
            await send_long_message(update, resposta)
        else:
            # Sem contexto suficiente, não tenta responder
            await update.message.reply_text(
                "😔 Não encontrei informações específicas sobre sua pergunta.\n\n"
                "💡 **Sugestões:**\n"
                "• Tente reformular com palavras-chave mais específicas\n"
                "• Use o menu principal para navegar por tópicos\n"
                "• Consulte: https://es.quixada.ufc.br\n"
                "• Fale com a coordenação: es@quixada.ufc.br",
                parse_mode='Markdown'
            )
    except Exception as e:
        print(f"Erro FLAN-T5: {e}")
        await update.message.reply_text(
            "😔 Não consegui processar sua pergunta no momento.\n\n"
            "💡 **Sugestões:**\n"
            "• Tente reformular sua pergunta\n"
            "• Use o menu principal para navegar\n"
            "• Consulte: https://es.quixada.ufc.br\n"
            "• Fale com a coordenação: es@quixada.ufc.br",
            parse_mode='Markdown'
        )

# 🎵 Handler para áudio
async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde quando usuário envia áudio"""
    await update.message.reply_text(
        "🎵 **Áudio recebido!**\n\n"
        "Ainda não consigo processar mensagens de áudio, mas estou aprendendo! 🤖\n\n"
        "💡 **Por enquanto, você pode:**\n"
        "• Escrever sua pergunta em texto\n"
        "• Descrever o que você gostaria de saber\n"
        "• Usar o menu principal para navegar\n\n"
        "📞 **Urgente?** Contate: es@quixada.ufc.br",
        parse_mode='Markdown'
    )

# 📷 Handler para imagens
async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde quando usuário envia imagem"""
    await update.message.reply_text(
        "📷 **Imagem recebida!**\n\n"
        "Ainda não consigo analisar imagens, mas estou evoluindo! 🤖\n\n"
        "💡 **Por enquanto, você pode:**\n"
        "• Descrever o conteúdo da imagem em texto\n"
        "• Fazer sua pergunta por escrito\n"
        "• Usar o menu principal para navegar\n\n"
        "📞 **Precisa de ajuda?** Contate: es@quixada.ufc.br",
        parse_mode='Markdown'
    )

# 📹 Handler para vídeos
async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde quando usuário envia vídeo"""
    await update.message.reply_text(
        "📹 **Vídeo recebido!**\n\n"
        "Ainda não consigo processar vídeos, mas estou me desenvolvendo! 🤖\n\n"
        "💡 **Por enquanto, você pode:**\n"
        "• Descrever o conteúdo do vídeo em texto\n"
        "• Fazer sua pergunta por escrito\n"
        "• Usar o menu principal para informações\n\n"
        "📞 **Precisa de ajuda?** Contate: es@quixada.ufc.br",
        parse_mode='Markdown'
    )

# 📄 Handler para documentos
async def handle_document(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde quando usuário envia documento"""
    file_name = update.message.document.file_name if update.message.document.file_name else "documento"
    
    await update.message.reply_text(
        f"📄 **Documento '{file_name}' recebido!**\n\n"
        "Ainda não consigo analisar documentos, mas estou aprendendo! 🤖\n\n"
        "💡 **Por enquanto, você pode:**\n"
        "• Copiar e colar o texto do documento\n"
        "• Resumir o conteúdo em sua pergunta\n"
        "• Usar o menu principal para navegar\n\n"
        "📞 **Documento oficial?** Envie para: es@quixada.ufc.br",
        parse_mode='Markdown'
    )

# 🎤 Handler para notas de voz
async def handle_voice(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde quando usuário envia nota de voz"""
    await update.message.reply_text(
        "🎤 **Nota de voz recebida!**\n\n"
        "Ainda não consigo ouvir notas de voz, mas estou me aperfeiçoando! 🤖\n\n"
        "💡 **Por enquanto, você pode:**\n"
        "• Escrever sua pergunta em texto\n"
        "• Usar palavras-chave específicas\n"
        "• Navegar pelo menu principal\n\n"
        "📞 **Urgente?** Contate: es@quixada.ufc.br",
        parse_mode='Markdown'
    )

# 📍 Handler para localização
async def handle_location(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Responde quando usuário envia localização"""
    await update.message.reply_text(
        "📍 **Localização recebida!**\n\n"
        "Obrigado por compartilhar! Ainda não processo localizações, mas estou evoluindo! 🤖\n\n"
        "🏫 **Campus UFC Quixadá:**\n"
        "• Endereço: Av. José de Freitas Queiroz, 5003\n"
        "• Bairro: Cedro, Quixadá - CE\n"
        "• CEP: 63902-580\n\n"
        "💡 **Precisa de informações?** Use o menu principal ou escreva sua pergunta.",
        parse_mode='Markdown'
    )

# 🎮 Handler para outros tipos de mídia
async def handle_other_media(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handler genérico para outros tipos de mídia"""
    media_type = "mídia"
    
    if update.message.sticker:
        media_type = "sticker"
    elif update.message.animation:
        media_type = "GIF"
    elif update.message.video_note:
        media_type = "vídeo circular"
    
    await update.message.reply_text(
        f"📱 **{media_type.title()} recebido!**\n\n"
        "Ainda não consigo processar esse tipo de conteúdo, mas estou aprendendo! 🤖\n\n"
        "💡 **Por enquanto, você pode:**\n"
        "• Escrever sua pergunta em texto\n"
        "• Usar o menu principal para navegar\n"
        "• Ser específico em suas dúvidas\n\n"
        "📞 **Precisa de ajuda?** Contate: es@quixada.ufc.br",
        parse_mode='Markdown'
    )

# 🚀 Main
def main():
    print("Bot iniciado...")
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    
    # 📱 Handlers para diferentes tipos de mídia
    app.add_handler(MessageHandler(filters.AUDIO, handle_audio))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.VIDEO, handle_video))
    app.add_handler(MessageHandler(filters.Document.ALL, handle_document))
    app.add_handler(MessageHandler(filters.VOICE, handle_voice))
    app.add_handler(MessageHandler(filters.LOCATION, handle_location))
    app.add_handler(MessageHandler(filters.Sticker.ALL | filters.ANIMATION | filters.VIDEO_NOTE, handle_other_media))
    
    # 💬 Handler para mensagens de texto (deve vir por último)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, route_message))

    print("Bot rodando!")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

# 🔀 Roteador
async def route_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    step = context.user_data.get("step", "main_menu")
    msg = update.message.text
    
    # Handle submenu navigation
    if step == "estagio_menu":
        await handle_estagio_menu(update, context)
    elif step == "matricula_menu":
        await handle_matricula_menu(update, context)
    elif step == "curso_menu":
        await handle_curso_menu(update, context)
    elif step.startswith("cadastro"):
        await handle_cadastro(update, context)
    else:
        await handle_menu(update, context)

# 📚 Menu Estágio
async def handle_estagio_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text
    
    if msg == "🔙 Voltar ao Menu Principal":
        await start(update, context)
    else:
        await handle_specific_question(update, context, msg)

# 🎓 Menu Matrícula
async def handle_matricula_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text
    
    if msg == "🔙 Voltar ao Menu Principal":
        await start(update, context)
    else:
        await handle_specific_question(update, context, msg)

# 📖 Menu Curso
async def handle_curso_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text
    
    if msg == "🔙 Voltar ao Menu Principal":
        await start(update, context)
    else:
        await handle_specific_question(update, context, msg)

if __name__ == "__main__":
    main()
