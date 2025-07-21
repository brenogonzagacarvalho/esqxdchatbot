"""
Configurações Centralizadas da Aplicação

Este módulo centraliza todas as configurações do chatbot,
seguindo o padrão de configuração por ambiente.
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

class Settings:
    """Configurações principais da aplicação"""
    
    # =============================================================================
    # TELEGRAM CONFIGURATION
    # =============================================================================
    TELEGRAM_TOKEN: str = os.getenv("TELEGRAM_TOKEN", "")
    
    # =============================================================================
    # AI SERVICES CONFIGURATION
    # =============================================================================
    HF_API_TOKEN: Optional[str] = os.getenv("HF_API_TOKEN")
    AI_TIMEOUT: int = int(os.getenv("AI_TIMEOUT", "30"))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "150"))
    
    # =============================================================================
    # APPLICATION CONFIGURATION
    # =============================================================================
    DEBUG_MODE: bool = os.getenv("DEBUG_MODE", "false").lower() == "true"
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # =============================================================================
    # VERCEL CONFIGURATION
    # =============================================================================
    WEBHOOK_URL: Optional[str] = os.getenv("WEBHOOK_URL")
    
    # =============================================================================
    # PATHS CONFIGURATION
    # =============================================================================
    PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    DATA_DIR = os.path.join(PROJECT_ROOT, "data")
    QA_DATA_DIR = os.path.join(DATA_DIR, "qa")
    RAW_DATA_DIR = os.path.join(DATA_DIR, "raw")
    PROCESSED_DATA_DIR = os.path.join(DATA_DIR, "processed")
    
    # =============================================================================
    # CHATBOT CONFIGURATION
    # =============================================================================
    MAX_MESSAGE_LENGTH: int = 4000
    SIMILARITY_THRESHOLD: float = 0.5
    AMBIGUITY_THRESHOLD: int = 2
    MIN_QUESTION_LENGTH: int = 10
    
    # =============================================================================
    # PPC SEARCH CONFIGURATION
    # =============================================================================
    MAX_CHUNKS: int = 3
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150
    
    @classmethod
    def validate(cls) -> bool:
        """Valida configurações obrigatórias"""
        if not cls.TELEGRAM_TOKEN:
            raise ValueError("TELEGRAM_TOKEN é obrigatório")
        return True

# Instância global das configurações
settings = Settings()

# Validação na importação
if __name__ != "__main__":
    settings.validate()
