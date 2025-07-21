#!/usr/bin/env python3
"""
Bot simples para testar handlers de mídia
"""

import os
from telegram import Update
from telegram.ext import Application, MessageHandler, ContextTypes, filters
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")

async def handle_audio(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("FUNCIONA: Audio recebido!")

async def handle_photo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("FUNCIONA: Imagem recebida!")

async def handle_video(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("FUNCIONA: Video recebido!")

async def handle_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text("FUNCIONA: Texto recebido!")

def main():
    print("Testando bot...")
    app = Application.builder().token(TOKEN).build()
    
    # Handlers de mídia ANTES do handler de texto
    app.add_handler(MessageHandler(filters.AUDIO, handle_audio))
    app.add_handler(MessageHandler(filters.PHOTO, handle_photo))
    app.add_handler(MessageHandler(filters.VIDEO, handle_video))
    app.add_handler(MessageHandler(filters.TEXT, handle_text))
    
    print("Bot teste rodando...")
    app.run_polling()

if __name__ == "__main__":
    main()
