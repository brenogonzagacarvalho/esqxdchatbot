#!/usr/bin/env python3
"""
Teste simples para verificar se os filtros do Telegram estão corretos
"""

import os
from dotenv import load_dotenv

load_dotenv()

try:
    from telegram.ext import filters
    print("OK Filtros telegram.ext importados com sucesso")
    
    # Testa filtros básicos
    print(f"OK filters.AUDIO: {hasattr(filters, 'AUDIO')}")
    print(f"OK filters.PHOTO: {hasattr(filters, 'PHOTO')}")
    print(f"OK filters.VIDEO: {hasattr(filters, 'VIDEO')}")
    print(f"OK filters.VOICE: {hasattr(filters, 'VOICE')}")
    print(f"OK filters.LOCATION: {hasattr(filters, 'LOCATION')}")
    print(f"OK filters.ANIMATION: {hasattr(filters, 'ANIMATION')}")
    print(f"OK filters.VIDEO_NOTE: {hasattr(filters, 'VIDEO_NOTE')}")
    
    # Testa filtros compostos
    print(f"OK filters.Document.ALL: {hasattr(filters.Document, 'ALL')}")
    print(f"OK filters.Sticker.ALL: {hasattr(filters.Sticker, 'ALL')}")
    
except ImportError as e:
    print(f"ERRO Erro ao importar filters: {e}")
except Exception as e:
    print(f"ERRO Erro: {e}")

try:
    from telegram import Update
    from telegram.ext import Application, MessageHandler
    print("OK Classes principais importadas com sucesso")
except ImportError as e:
    print(f"ERRO Erro ao importar classes: {e}")
