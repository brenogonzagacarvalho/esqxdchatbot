import json
import os
from difflib import SequenceMatcher
from telegram import Update, ReplyKeyboardMarkup, InlineKeyboardMarkup, InlineKeyboardButton
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

# Carrega perguntas e respostas pré-definidas
with open("public/perguntas_respostas.json", encoding="utf-8") as f:
    QA = json.load(f)

# Função de similaridade
def similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

# Menus principais
MAIN_MENU = [
    ["📚 Informações sobre Estágio"],
    ["🎓 Informações sobre Matrícula"],
    ["❓ Outras Dúvidas"],
    ["📝 Registrar Dados Acadêmicos"],
]

# ============== 🔍 Scraping site do curso ==============

def obter_links_menu_curso():
    url = "https://es.quixada.ufc.br/"
    try:
        resp = requests.get(url, timeout=5)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "html.parser")
        menu = soup.select("div.menu-curso-container ul li a")

        links = {}
        for item in menu:
            texto = item.get_text(strip=True)
            href = item.get('href')
            if href:
                links[texto] = href if href.startswith('http') else f"https://es.quixada.ufc.br{href}"

        return links
    except Exception as e:
        print(f"[ERRO] Falha ao capturar menu do curso: {e}")
        return {}

def buscar_no_site_curso(pergunta: str, links_menu: dict) -> str:
    resultados = []
    palavras = pergunta.lower().split()

    for titulo, url in links_menu.items():
        try:
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")

            texto = soup.get_text(separator='\n', strip=True)
            linhas = texto.split('\n')

            linhas_relevantes = []
            for linha in linhas:
                if any(p in linha.lower() for p in palavras):
                    if len(linha.strip()) > 30:  # descarta linhas muito curtas
                        linhas_relevantes.append(linha.strip())

            if linhas_relevantes:
                conteudo = "\n".join(linhas_relevantes[:10])  # pega até 10 linhas relevantes
                resultados.append(f"🔹 {titulo}:\n{conteudo}\nLink: {url}")

        except Exception as e:
            print(f"[ERRO] Erro ao acessar {url}: {e}")

    return "\n\n".join(resultados) if resultados else ""
async def enviar_texto_grande(texto, update):
    limite = 4000  # abaixo do máximo de 4096
    if len(texto) <= limite:
        await update.message.reply_text(texto)
        return
    
    # Quebra o texto em partes menores
    partes = []
    for i in range(0, len(texto), limite):
        partes.append(texto[i:i+limite])
    
    # Envia cada parte
    for i, parte in enumerate(partes):
        if i == 0:
            await update.message.reply_text(f"📄 Parte {i+1}/{len(partes)}:\n\n{parte}")
        else:
            await update.message.reply_text(f"📄 Parte {i+1}/{len(partes)}:\n\n{parte}")
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        f"👋 Olá {update.effective_user.first_name}!\n"
        "Sou seu assistente virtual da UFC Quixadá. Como posso ajudar?",
        reply_markup=ReplyKeyboardMarkup(MAIN_MENU, resize_keyboard=True),
    )
    ctx.user_data["step"] = "main_menu"

async def handle_menu(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = update.message.text
    if text == "📝 Registrar Dados Acadêmicos":
        await update.message.reply_text(
            "Digite seu número de matrícula:",
            reply_markup=ReplyKeyboardMarkup([["🏠 Menu principal"]], resize_keyboard=True),
        )
        ctx.user_data["step"] = "awaiting_matricula"
    elif text in ["📚 Informações sobre Estágio", "🎓 Informações sobre Matrícula", "❓ Outras Dúvidas"]:
        ctx.user_data["section"] = text
        await update.message.reply_text(
            "Faça sua pergunta ou digite 🏠 Menu principal",
            reply_markup=ReplyKeyboardMarkup([["🏠 Menu principal"]], resize_keyboard=True),
        )
    elif text == "🏠 Menu principal":
        await start(update, ctx)

async def handle_text(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = update.message.text.strip()
    lower = msg.lower()

    step = ctx.user_data.get("step")

    # 🔗 Captura de contatos via scraping do site principal
    if any(kw in lower for kw in ("contato", "telefone", "e-mail", "fale conosco")):
        try:
            url = "https://www.quixada.ufc.br/fale-conosco/"
            resp = requests.get(url, timeout=5)
            resp.raise_for_status()

            soup = BeautifulSoup(resp.text, "html.parser")
            lis = soup.select("ul li")

            if not lis:
                raise ValueError("Nenhum item de contato encontrado")

            lines = [li.get_text(" | ", strip=True) for li in lis]
            texto = "📞 Contatos UFC Quixadá:\n" + "\n".join(lines)
        except Exception as e:
            print(f"[ERRO] Scraping contatos: {e}")
            texto = "❌ Não consegui recuperar os contatos. Tente mais tarde."

        await update.message.reply_text(texto)
        return

    # 📝 Fluxo de cadastro acadêmico
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
                f"✅ Dados registrados:\nMatrícula: {matricula}\nSemestre: {semestre}"
            )
            await start(update, ctx)
            return
        else:
            await update.message.reply_text("Semestre inválido. Digite 1-10:")
            return

    # 🧠 Busca nas perguntas cadastradas
    if len(msg) < 3:
        await update.message.reply_text("Por favor, envie uma mensagem mais longa.")
        return

    resposta = ""
    best = max(QA, key=lambda x: similarity(msg, x["pergunta"]))
    if similarity(msg, best["pergunta"]) >= 0.6:
        resposta = best["resposta"]
    else:
        # 🔍 Busca dinâmica no site do curso
        links_menu = obter_links_menu_curso()
        resposta_site = buscar_no_site_curso(msg, links_menu)

        if resposta_site:
            resposta = resposta_site
        else:
            # 🧠 Fallback para Flan-T5
            try:
                system_prompt = STATIC_CONTEXT.strip()
                examples = "\n\n".join(f"Q: {q['pergunta']}\nA: {q['resposta']}" for q in QA)
                full_context = f"{system_prompt}\n\n{examples}"

                resposta = flan_service.generate_response(msg, full_context)
            except Exception as e:
                print(f"[ERRO] Fallback Flan-T5: {e}")
                resposta = "Desculpe, não consegui processar sua pergunta."

    if not resposta.strip():
        resposta = "Desculpe, não consegui entender sua pergunta. Por favor, tente novamente."

    query(
        "INSERT INTO chat_history (user_id,user_message,bot_response) VALUES (%s,%s,%s)",
        (update.effective_user.id, msg, resposta),
    )

    if resposta:
        await update.message.reply_text(resposta)
    else:
        await update.message.reply_text("❌ Não consegui encontrar informações relevantes.")
    await update.message.reply_text(
        "Precisa de mais alguma informação?",
        reply_markup=InlineKeyboardMarkup([
            [InlineKeyboardButton("Sim", callback_data="sim"), InlineKeyboardButton("Não", callback_data="nao")]
        ])
    )

async def button(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    data = update.callback_query.data
    await update.callback_query.answer()
    if data == "sim":
        await update.callback_query.message.reply_text("Por favor, digite sua próxima dúvida:")
    else:
        await update.callback_query.message.reply_text("Perfeito! 😊")
        await start(update, ctx)

# 🔗 Contexto fixo que o modelo usa como base
STATIC_CONTEXT = """
Campus UFC Quixadá – Contatos:
• Coordenação: coordenacao@quixada.ufc.br | (88) 3541-1234
• Secretaria Acadêmica: sec-academica@quixada.ufc.br | (88) 3541-5678
• Site oficial: https://quixada.ufc.br
• Site do Curso: https://es.quixada.ufc.br
"""

# 🚀 Main
def main():
    app = Application.builder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu), group=0)
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text), group=1)
    app.add_handler(CallbackQueryHandler(button))
    app.run_polling()

if __name__ == "__main__":
    main()