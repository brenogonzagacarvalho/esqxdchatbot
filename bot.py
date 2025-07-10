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

from vercel_storage import vercel_storage
from flan_service import flan_service, DEFAULT_CONTEXT
from ppc_search import ppc_search

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
with open("public/perguntas_respostas_melhorado.json", encoding="utf-8") as f:
    QA = json.load(f)

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
    """Calcula similaridade avançada considerando múltiplos fatores"""
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

# ❓ Perguntas livres
async def handle_free_question(update: Update, context: ContextTypes.DEFAULT_TYPE):
    question = update.message.text
    
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

    # 4. Fallback para FLAN com contexto do PPC
    try:
        # Contexto dinâmico baseado no PPC
        ppc_context = ppc_search.get_context_for_flan(question)
        context_text = f"{DEFAULT_CONTEXT}\n\nContexto do PPC:\n{ppc_context}"
        
        resposta = flan_service.generate_response(question, context_text)
        await send_long_message(update, resposta)
    except Exception as e:
        print(f"Erro FLAN-T5: {e}")
        await update.message.reply_text(
            "😔 Não consegui encontrar uma resposta precisa para sua pergunta.\n\n"
            "💡 **Sugestões:**\n"
            "• Tente reformular sua pergunta\n"
            "• Use palavras-chave mais específicas\n"
            "• Consulte: https://es.quixada.ufc.br\n"
            "• Fale com a coordenação: es@quixada.ufc.br",
            parse_mode='Markdown'
        )
# 🚀 Main
def main():
    print("Bot iniciado...")
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
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
