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
from flan_service import flan_service

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

# Carrega perguntas e respostas
with open("public/perguntas_respostas.json", encoding="utf-8") as f:
    QA = json.load(f)

# Menus
MAIN_MENU = [
    ["📚 Informações sobre Estágio"],
    ["🎓 Informações sobre Matrícula"],    
    ["📝 Registrar Dados Acadêmicos"],
]

ESTAGIO_MENU = [
    ["📋 Requisitos para Estágio"],
    ["📄 Documentos Necessários"],
    ["⏰ Prazos e Cronograma"],
    ["🏢 Como Encontrar Empresas"],
    ["🔙 Voltar ao Menu Principal"]
]

MATRICULA_MENU = [
    ["📅 Calendário Acadêmico"],
    ["📝 Como se Matricular"],
    ["🔄 Trancamento/Cancelamento"],
    ["📊 Histórico Escolar"],
    ["🔙 Voltar ao Menu Principal"]
]

# Função de similaridade
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# 🏁 Start
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await vercel_storage.store_analytics("bot_start", {
        "user_id": update.effective_user.id,
        "username": update.effective_user.username,
        "first_name": update.effective_user.first_name
    })

    await update.message.reply_text(
        f"🎓 Olá {update.effective_user.first_name}! Bem-vindo ao ChatBot da UFC Quixadá.\n\n"
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

    elif msg == "🔙 Voltar ao Menu Principal":
        await start(update, context)

    else:
        await handle_free_question(update, context)

# 📝 Cadastro guiado
async def handle_cadastro(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    user_data = await vercel_storage.get_user_data(user.id) or {}

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

# ❓ Perguntas livres
async def handle_free_question(update: Update, context: ContextTypes.DEFAULT_TYPE):
    question = update.message.text.lower()

    best_match = None
    best_score = 0

    for qa_item in QA:
        # Lista de possíveis perguntas (principal + variações)
        perguntas = [qa_item["pergunta"].lower()]
        if "variacoes" in qa_item:
            perguntas.extend([v.lower() for v in qa_item["variacoes"]])

        # Verificar similaridade com pergunta e variações
        for pergunta in perguntas:
            score = similarity(question, pergunta)
            if score > best_score:
                best_score = score
                best_match = qa_item

    # 🔍 Busca por similaridade na pergunta
    if best_match and best_score >= 0.7:
        response = best_match["resposta"]
        if "tags" in best_match:
            response += f"\n\n🏷️ *Tags:* #{', #'.join(best_match['tags'])}"
        await update.message.reply_text(response, parse_mode='Markdown')
        return

    # 🔍 Busca por tags se a pergunta contém uma palavra-chave
    for qa_item in QA:
        if "tags" in qa_item:
            for tag in qa_item["tags"]:
                if tag.lower() in question:
                    response = qa_item["resposta"]
                    response += f"\n\n🏷️ *Tags:* #{', #'.join(qa_item['tags'])}"
                    await update.message.reply_text(response, parse_mode='Markdown')
                    return

    # 🤖 Fallback para modelo Flan-T5
    try:
        resposta = flan_service.generate_response(question, context="Chatbot do curso de Engenharia de Software da UFC Quixadá.")

        if resposta and resposta.strip():
            await update.message.reply_text(resposta, parse_mode='Markdown')
            return
    except Exception as e:
        print(f"Erro com Flan-T5: {e}")

    # ⚠️ Resposta padrão caso tudo falhe
    await update.message.reply_text(
        "❌ Não encontrei uma resposta específica.\n\n"
        "Você pode tentar:\n"
        "• Reformular sua pergunta\n"
        "• Escolher um tópico no menu\n"
        "• Acessar o site oficial: https://es.quixada.ufc.br",
        parse_mode='Markdown'
    )

# 🚀 Main
def main():
    print("🤖 Bot iniciado...")
    app = Application.builder().token(TOKEN).build()

    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, route_message))

    print("✅ Bot rodando!")
    app.run_polling(allowed_updates=Update.ALL_TYPES)

# 🔀 Roteador
async def route_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    step = context.user_data.get("step", "main_menu")
    if step.startswith("cadastro"):
        await handle_cadastro(update, context)
    else:
        await handle_menu(update, context)

if __name__ == "__main__":
    main()
