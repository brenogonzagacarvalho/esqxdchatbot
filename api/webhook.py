import os
import json
from bot import button, handle_menu, handle_text, start
from telegram import Bot, Update
from telegram.ext import Dispatcher, CommandHandler, MessageHandler, CallbackQueryHandler, filters
from flan_service import flan_service
from database import query

# carrega Q/A
with open("public/perguntas_respostas.json", encoding="utf-8") as f:
    QA = json.load(f)

bot = Bot(token=os.getenv("TELEGRAM_TOKEN"))
dp = Dispatcher(bot, None, workers=0, use_context=True)

# (importe as funções start, handle_menu, handle_text e button de bot.py,
# ou copie/cole elas aqui ajustando imports)

dp.add_handler(CommandHandler("start", start))
dp.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_menu), group=0)
dp.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_text), group=1)
dp.add_handler(CallbackQueryHandler(button))

def handler(request):
    """Vercel invoca esta função em cima do Flask-like request object"""
    update = Update.de_json(request.get_json(force=True), bot)
    dp.process_update(update)
    return "OK"
