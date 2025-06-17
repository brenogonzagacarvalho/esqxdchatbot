import json
import os
from difflib import SequenceMatcher
from telegram import Update, ReplyKeyboardMarkup, InlineKeyboardMarkup, KeyboardButton
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)
from dotenv import load_dotenv

from database import query
from flan_service import flan_service

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

# carrega Q/A
with open("public/perguntas_respostas.json", encoding="utf-8") as f:
    QA = json.load(f)

# util similarity
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# menus
MAIN_MENU = [
    ["📚 Informações sobre Estágio"],
    ["🎓 Informações sobre Matrícula"],
    ["❓ Outras Dúvidas"],
    ["📝 Registrar Dados Acadêmicos"],
]

async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        f"👋 Olá {update.effective_user.first_name}!\n"
        "Sou seu assistente virtual da UFC. Como posso ajudar?",
        reply_markup=ReplyKeyboardMarkup(MAIN_MENU, resize_keyboard=True),
    )
    ctx.user_data["step"] = "main_menu"

async def handle_menu(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text == "📝 Registrar Dados Acadêmicos":
        await update.message.reply_text("Digite seu número de matrícula:", reply_markup=ReplyKeyboardMarkup([["🏠 Menu principal"]], resize_keyboard=True))
        ctx.user_data["step"] = "awaiting_matricula"
    elif text in ["📚 Informações sobre Estágio", "🎓 Informações sobre Matrícula", "❓ Outras Dúvidas"]:
        ctx.user_data["section"] = text
        await update.message.reply_text("Faça sua pergunta ou digite 🏠 Menu principal", reply_markup=ReplyKeyboardMarkup([["🏠 Menu principal"]], resize_keyboard=True))
    elif text == "🏠 Menu principal":
        await start(update, ctx)

async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    
    msg = update.message.text.strip()
    step = ctx.user_data.get("step", "chat")

    # fluxo de matrícula
    if step == "awaiting_matricula":
        if msg.isdigit() and 6 <= len(msg) <= 10:
            ctx.user_data["matricula"] = msg
            ctx.user_data["step"] = "awaiting_semester"
            await update.message.reply_text("Agora digite seu semestre (1-10):")
            return
        else:
            await update.message.reply_text("Formato inválido. Digite apenas números (6-10 dígitos):")
            return

    if step == "awaiting_semester":
        if msg.isdigit() and 1 <= int(msg) <= 10:
            matricula = ctx.user_data["matricula"]
            semestre = int(msg)
            query(
                """
                INSERT INTO user_academic_data (user_id, matricula, semestre)
                VALUES (%s,%s,%s)
                ON DUPLICATE KEY UPDATE
                  matricula=VALUES(matricula), semestre=VALUES(semestre)
                """,
                (update.effective_user.id, matricula, semestre),
            )
            await update.message.reply_text(
                f"✅ Dados registrados:\nMatrícula: {matricula}\nSemestre: {semestre}",
            )
            await start(update, ctx)
            return
        else:
            await update.message.reply_text("Semestre inválido. Digite 1-10:")
            return

    # chat normal
    if len(msg) < 3:
        await update.message.reply_text("Por favor, envie uma mensagem mais longa.")
        return

    resposta = ""
    # 1) similaridade simples
    best = max(QA, key=lambda x: similarity(msg, x["pergunta"]))
    if similarity(msg, best["pergunta"]) >= 0.6:
        resposta = best["resposta"]
    else:
        # 2) fallback Flan-T5
        try:
            context = "\n\n".join([f"Q: {q['pergunta']}\nA: {q['resposta']}" for q in QA])
            resposta = flan_service.generate_response(msg, context)
        except Exception as e:
            print(f"Erro ao gerar resposta: {e}")
            resposta = "Desculpe, não consegui processar sua pergunta. Por favor, tente reformular."

    # Verifica se a resposta está vazia
    if not resposta.strip():
        resposta = "Desculpe, não consegui entender sua pergunta. Por favor, tente novamente."

    # salva histórico
    query(
        "INSERT INTO chat_history (user_id,user_message,bot_response) VALUES (%s,%s,%s)",
        (update.effective_user.id, msg, resposta),
    )

    await update.message.reply_text(resposta)
    await update.message.reply_text(
        "Precisa de mais alguma informação?",
        reply_markup=InlineKeyboardMarkup([[{"text":"Sim","callback_data":"sim"},{"text":"Não","callback_data":"nao"}]]),
    )

async def button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = update.callback_query.data
    await update.callback_query.answer()
    if data == "sim":
        await update.callback_query.message.reply_text("Por favor, digite sua próxima dúvida:")
    else:
        await update.callback_query.message.reply_text("Perfeito! 😊")
        await start(update, ctx)

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu), group=0)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text), group=1)
    app.add_handler(CallbackQueryHandler(button))
    app.run_polling()

if __name__ == "__main__":
    main()