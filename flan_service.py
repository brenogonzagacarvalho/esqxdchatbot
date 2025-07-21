"""
Serviço de Inteligência Artificial - FLAN-T5 para Chatbot Educacional

Este módulo implementa a integração com o modelo FLAN-T5 da Hugging Face
para geração de respostas contextualizadas em perguntas acadêmicas.

Características técnicas:
- Modelo: google/flan-t5-small (otimizado para recursos limitados)
- Framework: Transformers + PyTorch
- Suporte: CPU e GPU com detecção automática
- Fallbacks: Sistema robusto de tratamento de erros

Otimizações implementadas:
- Monkey-patch para compatibilidade com versões
- Detecção conservadora de hardware
- Configurações seguras para hardware limitado
- Pós-processamento de respostas

Uso no contexto educacional:
- Respostas baseadas no PPC-ES 2023
- Contexto específico do curso de Engenharia de Software
- Integração com sistema de busca em documentos

Autor: Desenvolvimento para TCC - Engenharia de Software UFC Quixadá
Data: 2025
"""

# Monkey-patch for split_torch_state_dict_into_shards
import huggingface_hub

# Contexto padrão específico do curso de Engenharia de Software UFC Quixadá
DEFAULT_CONTEXT = """
Você é um assistente virtual do curso de Engenharia de Software da UFC Quixadá.
Informações relevantes:
- Carga horária mínima por semestre: 12 créditos (180h)
- Estágio obrigatório: 300 horas
- Disciplinas por semestre: 4-6
- Período de matrícula: Janeiro e Julho
"""

if not hasattr(huggingface_hub, "split_torch_state_dict_into_shards"):
    def split_torch_state_dict_into_shards(state_dict, max_shard_size, post_process_kwargs=None):
        # fallback trivial: um único “shard” com o estado completo
        yield state_dict
    huggingface_hub.split_torch_state_dict_into_shards = split_torch_state_dict_into_shards

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import torch
import logging
from typing import Optional

# Configuração básica de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SafeFlanT5:
    """
    Wrapper seguro para o modelo FLAN-T5 com otimizações para ambiente educacional.
    
    Esta classe implementa uma interface robusta para o modelo FLAN-T5,
    incluindo detecção automática de hardware, configurações otimizadas
    e tratamento de erros para garantir estabilidade em produção.
    
    Características:
    - Detecção automática de dispositivo (CPU/GPU)
    - Configurações conservadoras para hardware limitado
    - Sistema de fallback para casos de erro
    - Logging estruturado para monitoramento
    
    Uso:
        service = SafeFlanT5()
        response = service.generate_response("pergunta", "contexto")
    """
    
    def __init__(self):
        """
        Inicializa o serviço FLAN-T5 com configurações seguras.
        
        Processo de inicialização:
        1. Detecta o melhor dispositivo disponível
        2. Carrega tokenizer com configurações rápidas
        3. Carrega modelo com configurações conservadoras
        4. Configura modo de avaliação para inferência
        """
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

    def generate_response(self, question: str, context: str = None) -> str:
        if not self.model:
            return "Serviço temporariamente indisponível."
        
        try:
            # Contexto aprimorado
            safe_context = DEFAULT_CONTEXT + (context if context else "")
            
            input_text = f"question: {question[:150]}\ncontext: {safe_context[:1000]}"
            
            inputs = self.tokenizer(
                input_text,
                return_tensors="pt",
                max_length=384,
                truncation=True
            ).to(self.device)
            
            with torch.no_grad():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=100,
                    num_beams=3,
                    temperature=0.7,
                    do_sample=True
                )
            
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            
            # Pós-processamento para respostas mais naturais
            if response.lower().startswith("não sei") or len(response) < 5:
                return "Não encontrei informações precisas sobre isso no meu banco de dados."
                
            return response.strip()
        
        except Exception as e:
            print(f"Erro na geração: {e}")
            return "Houve um erro ao processar sua pergunta."
# Instância global
try:
    flan_service = SafeFlanT5()
    if flan_service.model is None:
        logger.warning("Modelo não carregado - operando em modo limitado")
except Exception as e:
    logger.critical(f"Falha na inicialização do serviço: {str(e)}")
    flan_service = None