import json
import os
from difflib import SequenceMatcher
from telegram import Update, ReplyKeyboardMarkup, InlineKeyboardMarkup
from telegram.ext import (
    Application,
    CommandHandler,
    MessageHandler,
    CallbackQueryHandler,
    ContextTypes,
    filters,
)
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup

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
    lower = msg.lower()

    # captura dinâmica de "contato" via scraping do site
    if any(kw in lower for kw in ("contato", "telefone", "e-mail")):
        try:
            url = "https://www.quixada.ufc.br/fale-conosco/"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")
            # seleciona todos os <li> dentro do primeiro <ul>
            lis = soup.select("ul li")  
            if not lis:
                raise ValueError("Nenhum item de contato encontrado")

            # extrai texto de cada <li> e formata
            lines = [li.get_text(" | ", strip=True) for li in lis]
            texto = "📞 Contatos UFC Quixadá:\n" + "\n".join(lines)

        except Exception:
            texto = "❌ Não consegui recuperar os contatos. Tente mais tarde."

        await update.message.reply_text(texto)
        return

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
            # 1) Contexto estático + exemplos do JSON
            system_prompt = STATIC_CONTEXT.strip()
            examples = "\n\n".join(f"Q: {q['pergunta']}\nA: {q['resposta']}" for q in QA)
            full_context = f"{system_prompt}\n\n{examples}"

            resposta = flan_service.generate_response(msg, full_context)
        except Exception:
            resposta = "Desculpe, não consegui processar sua pergunta."

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

# Fatos “hard‐coded” que o modelo deve usar em qualquer fallback
STATIC_CONTEXT = """
Campus UFC Quixadá – Contatos:
• Coordenação: coordenacao@quixada.ufc.br | (88) 3541-1234
• Secretaria Acadêmica: sec-academica@quixada.ufc.br | (88) 3541-5678
• Site oficial: https://quixada.ufc.br
"""

def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu), group=0)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text), group=1)
    app.add_handler(CallbackQueryHandler(button))
    app.run_polling()

if __name__ == "__main__":
    main()