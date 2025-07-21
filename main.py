#!/usr/bin/env python3
"""
Chatbot Educacional UFC Quixadá - Ponto de Entrada Principal

Este é o ponto de entrada principal da aplicação, seguindo a nova
estrutura organizacional baseada em Clean Architecture.

Uso:
    python main.py
    
Variáveis de ambiente necessárias:
    TELEGRAM_TOKEN: Token do bot Telegram (obrigatório)
    HF_API_TOKEN: Token Hugging Face (opcional)
    
Autor: TCC Engenharia de Software - UFC Quixadá
"""

import sys
import os
from pathlib import Path

# Adiciona o diretório src ao Python path
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Configuração de logging deve ser a primeira importação
from config.logging_config import setup_logging
from config.settings import settings

def main():
    """Função principal da aplicação"""
    
    try:
        # Setup do sistema de logging
        setup_logging()
        
        # Validação das configurações
        settings.validate()
        
        # Importa e executa o bot principal
        from src.core.bot import main as bot_main
        
        print("🚀 Iniciando Chatbot Educacional UFC Quixadá...")
        print(f"📊 Modo Debug: {'Ativado' if settings.DEBUG_MODE else 'Desativado'}")
        print(f"📝 Log Level: {settings.LOG_LEVEL}")
        
        # Executa o bot
        bot_main()
        
    except KeyboardInterrupt:
        print("\\n👋 Chatbot finalizado pelo usuário")
        sys.exit(0)
        
    except Exception as e:
        print(f"❌ Erro crítico na inicialização: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
