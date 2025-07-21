"""
Configuração de Logging

Configuração centralizada do sistema de logs para
monitoramento e debug da aplicação.
"""

import logging
import sys
from pathlib import Path
from typing import Dict, Any

from .settings import settings

def setup_logging() -> None:
    """
    Configura o sistema de logging da aplicação.
    
    Níveis suportados:
    - DEBUG: Informações detalhadas de debug
    - INFO: Informações gerais de funcionamento
    - WARNING: Avisos e situações inesperadas
    - ERROR: Erros que não impedem funcionamento
    - CRITICAL: Erros críticos
    """
    
    # Configuração do formato
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    # Configuração básica
    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL.upper()),
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout),
            logging.FileHandler("logs/chatbot.log", encoding="utf-8")
        ]
    )
    
    # Criar diretório de logs se não existir
    Path("logs").mkdir(exist_ok=True)
    
    # Configurar loggers específicos
    configure_service_loggers()

def configure_service_loggers() -> None:
    """Configura loggers específicos para cada serviço"""
    
    loggers_config: Dict[str, Dict[str, Any]] = {
        "telegram": {"level": logging.INFO},
        "ai_service": {"level": logging.DEBUG if settings.DEBUG_MODE else logging.INFO},
        "ppc_search": {"level": logging.INFO},
        "storage": {"level": logging.WARNING},
        "document_processor": {"level": logging.INFO}
    }
    
    for logger_name, config in loggers_config.items():
        logger = logging.getLogger(logger_name)
        logger.setLevel(config["level"])

def get_logger(name: str) -> logging.Logger:
    """
    Obtém um logger configurado para o módulo específico.
    
    Args:
        name: Nome do módulo/serviço
        
    Returns:
        Logger configurado
    """
    return logging.getLogger(name)
