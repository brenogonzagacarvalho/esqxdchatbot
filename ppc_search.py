import json
from typing import List, Dict, Any
from difflib import SequenceMatcher

class PPCSearch:
    def __init__(self, chunks_file: str = "public/ppc_chunks.json"):
        self.chunks_file = chunks_file
        self.chunks = []
        self.load_chunks()
    
    def load_chunks(self):
        """Carrega os chunks do arquivo JSON"""
        try:
            with open(self.chunks_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.chunks = data.get('chunks', [])
            print(f"Carregados {len(self.chunks)} chunks do PPC")
        except FileNotFoundError:
            print(f"Arquivo {self.chunks_file} não encontrado")
            self.chunks = []
        except Exception as e:
            print(f"Erro ao carregar chunks: {e}")
            self.chunks = []
    
    def search_ppc(self, query: str, max_chunks: int = 3) -> List[Dict[str, Any]]:
        """Busca informações no PPC baseado na query"""
        if not self.chunks:
            return []
        
        query_lower = query.lower()
        scored_chunks = []
        
        for chunk in self.chunks:
            score = self._calculate_relevance_score(query_lower, chunk)
            
            if score > 0.1:  # Threshold mínimo
                scored_chunks.append({
                    'chunk': chunk,
                    'score': score,
                    'relevance': self._get_relevance_reason(query_lower, chunk)
                })
        
        # Ordena por score
        scored_chunks.sort(key=lambda x: x['score'], reverse=True)
        
        # Retorna os melhores chunks
        return scored_chunks[:max_chunks]
    
    def _calculate_relevance_score(self, query: str, chunk: Dict[str, Any]) -> float:
        """Calcula a relevância do chunk para a query"""
        chunk_text = chunk['text'].lower()
        chunk_keywords = [k.lower() for k in chunk.get('keywords', [])]
        
        # Score baseado em palavras-chave
        keyword_matches = 0
        for keyword in chunk_keywords:
            if keyword in query:
                keyword_matches += 1
        
        # Score baseado em termos específicos da query
        query_terms = query.split()
        term_matches = 0
        for term in query_terms:
            if len(term) > 2:  # Ignora termos muito pequenos
                if term in chunk_text:
                    term_matches += 1
        
        # Score baseado em similaridade textual
        text_similarity = SequenceMatcher(None, query, chunk_text).ratio()
        
        # Score baseado na seção
        section_bonus = 0
        if chunk.get('section') == 'estágio' and 'estágio' in query:
            section_bonus = 0.3
        elif chunk.get('section') == 'matrícula' and 'matrícula' in query:
            section_bonus = 0.3
        elif chunk.get('section') == 'disciplinas' and 'disciplina' in query:
            section_bonus = 0.3
        
        # Combina os scores
        final_score = (
            (keyword_matches * 0.3) +
            (term_matches * 0.25) +
            (text_similarity * 0.25) +
            section_bonus
        )
        
        return final_score
    
    def _get_relevance_reason(self, query: str, chunk: Dict[str, Any]) -> str:
        """Explica por que este chunk é relevante"""
        reasons = []
        
        chunk_keywords = [k.lower() for k in chunk.get('keywords', [])]
        for keyword in chunk_keywords:
            if keyword in query:
                reasons.append(f"palavra-chave: {keyword}")
        
        if chunk.get('section') in query:
            reasons.append(f"seção: {chunk.get('section')}")
        
        if not reasons:
            reasons.append("similaridade textual")
        
        return ", ".join(reasons)
    
    def get_context_for_flan(self, query: str, max_length: int = 1500) -> str:
        """Retorna contexto específico do PPC para o modelo FLAN-T5"""
        relevant_chunks = self.search_ppc(query, max_chunks=3)
        
        if not relevant_chunks:
            return "Informações não encontradas no PPC do curso."
        
        context_parts = []
        current_length = 0
        
        for item in relevant_chunks:
            chunk_text = item['chunk']['text']
            
            # Trunca o texto se necessário
            if current_length + len(chunk_text) > max_length:
                remaining_space = max_length - current_length
                chunk_text = chunk_text[:remaining_space] + "..."
            
            context_parts.append(f"[PPC] {chunk_text}")
            current_length += len(chunk_text)
            
            if current_length >= max_length:
                break
        
        return "\n\n".join(context_parts)
    
    def get_formatted_response(self, query: str) -> str:
        """Retorna resposta formatada baseada na busca no PPC"""
        relevant_chunks = self.search_ppc(query, max_chunks=2)
        
        if not relevant_chunks:
            return None
        
        # Monta resposta com as informações mais relevantes
        best_chunk = relevant_chunks[0]['chunk']
        
        # Extrai informação mais relevante do chunk
        chunk_text = best_chunk['text']
        
        # Tenta encontrar parágrafo mais relevante
        paragraphs = chunk_text.split('\n')
        best_paragraph = ""
        best_score = 0
        
        for paragraph in paragraphs:
            if len(paragraph) > 50:  # Ignora linhas muito curtas
                score = SequenceMatcher(None, query.lower(), paragraph.lower()).ratio()
                if score > best_score:
                    best_score = score
                    best_paragraph = paragraph
        
        if best_paragraph:
            return f"**Informação do PPC:**\n\n{best_paragraph.strip()}"
        else:
            # Fallback para o início do chunk
            return f"**Informação do PPC:**\n\n{chunk_text[:500]}..."

# Instância global
ppc_search = PPCSearch()
