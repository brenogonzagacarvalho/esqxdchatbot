from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import logging
from typing import Optional

# Configuração básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SafeFlanT5:
    def __init__(self):
        self.device = self._select_safe_device()
        logger.info(f"Inicializando modelo FLAN-T5 no dispositivo: {self.device}")
        
        try:
            # Configurações seguras para hardware limitado
            self.tokenizer = AutoTokenizer.from_pretrained(
                "google/flan-t5-small",
                use_fast=True
            )
            
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                "google/flan-t5-small",
                device_map="auto" if torch.cuda.is_available() else None,
                torch_dtype=torch.float32  # Mais estável que float16 em CPUs
            ).to(self.device)
            
            self.model.eval()
            logger.info("Modelo carregado com sucesso")
            
        except Exception as e:
            logger.error(f"Erro na inicialização: {str(e)}")
            self.model = None  # Modo de fallback

    def _select_safe_device(self) -> str:
        """Seleciona o dispositivo mais adequado com verificações de segurança"""
        if torch.cuda.is_available():
            try:
                # Verificação conservadora para GPUs com pouca VRAM
                if torch.cuda.get_device_properties(0).total_memory >= 4 * 1024**3:  # 4GB
                    return "cuda"
            except:
                pass
        return "cpu"

    def generate_response(self, question: str, context: str) -> str:
        """Gera resposta com proteções extras para hardware limitado"""
        if not self.model:
            return "O serviço de respostas está temporariamente indisponível."
        
        try:
            # Limites conservadores para seu hardware
            safe_question = question[:150]  # Máximo 150 caracteres
            safe_context = context[:1000]   # Máximo 1000 caracteres
            
            input_text = f"question: {safe_question}\ncontext: {safe_context}"
            
            inputs = self.tokenizer(
                input_text,
                return_tensors="pt",
                max_length=384,  # Menor que o padrão (512)
                truncation=True,
                padding=True
            ).to(self.device)
            
            # Configurações ultra-conservadoras
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=80,  # Respostas mais curtas
                    num_beams=2,        # Menos consumo de memória
                    early_stopping=True,
                    temperature=0.8
                )
            
            response = self.tokenizer.decode(
                outputs[0],
                skip_special_tokens=True
            )
            
            return response if response.strip() else "Não consegui gerar uma resposta adequada."
            
        except torch.cuda.OutOfMemoryError:
            logger.warning("Estouro de memória da GPU - retornando fallback")
            return "Desculpe, minha capacidade de processamento está limitada no momento."
            
        except Exception as e:
            logger.error(f"Erro na geração: {str(e)}")
            return "Ocorreu um erro ao processar sua pergunta."

# Instância global segura
try:
    flan_service = SafeFlanT5()
    if flan_service.model is None:
        logger.warning("Modelo não carregado - operando em modo limitado")
except Exception as e:
    logger.critical(f"Falha na inicialização do serviço: {str(e)}")
    flan_service = None