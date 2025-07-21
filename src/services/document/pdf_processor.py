import fitz  # PyMuPDF
import json
import re
from typing import List, Dict, Any
from difflib import SequenceMatcher

class PDFProcessor:
    def __init__(self, pdf_path: str):
        self.pdf_path = pdf_path
        self.chunks = []
        self.metadata = {}
        
    def extract_text_with_chunks(self, chunk_size: int = 1000, overlap: int = 200) -> List[Dict[str, Any]]:
        """Extrai texto do PDF e divide em chunks menores"""
        print(f"Extraindo texto de {self.pdf_path}...")
        
        try:
            doc = fitz.open(self.pdf_path)
            full_text = ""
            
            # Extrai texto de todas as páginas
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text()
                full_text += f"\n--- Página {page_num + 1} ---\n{text}"
            
            doc.close()
            
            # Limpa o texto
            full_text = self._clean_text(full_text)
            
            # Divide em chunks
            chunks = self._create_chunks(full_text, chunk_size, overlap)
            
            print(f"Extraido {len(chunks)} chunks do PDF")
            return chunks
            
        except Exception as e:
            print(f"Erro ao processar PDF: {e}")
            return []
    
    def _clean_text(self, text: str) -> str:
        """Limpa e normaliza o texto"""
        # Remove quebras de linha excessivas
        text = re.sub(r'\n+', '\n', text)
        # Remove espaços em excesso
        text = re.sub(r' +', ' ', text)
        # Remove caracteres especiais problemáticos
        text = re.sub(r'[^\w\s\-.,;:!?()[\]{}/"\'@#$%&+=*]', '', text)
        return text.strip()
    
    def _create_chunks(self, text: str, chunk_size: int, overlap: int) -> List[Dict[str, Any]]:
        """Divide o texto em chunks com sobreposição"""
        chunks = []
        words = text.split()
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk_words = words[i:i + chunk_size]
            chunk_text = ' '.join(chunk_words)
            
            # Extrai informações relevantes do chunk
            chunk_data = {
                'id': f"chunk_{len(chunks) + 1}",
                'text': chunk_text,
                'word_count': len(chunk_words),
                'keywords': self._extract_keywords(chunk_text),
                'section': self._identify_section(chunk_text)
            }
            
            chunks.append(chunk_data)
        
        return chunks
    
    def _extract_keywords(self, text: str) -> List[str]:
        """Extrai palavras-chave do texto"""
        # Palavras-chave relevantes para o curso
        keywords = [
            'estágio', 'matrícula', 'disciplina', 'crédito', 'semestre',
            'engenharia', 'software', 'graduação', 'curso', 'ppc',
            'projeto', 'pedagógico', 'competência', 'habilidade',
            'carga horária', 'pré-requisito', 'optativa', 'obrigatória',
            'coordenação', 'professor', 'aluno', 'avaliação'
        ]
        
        found_keywords = []
        text_lower = text.lower()
        
        for keyword in keywords:
            if keyword in text_lower:
                found_keywords.append(keyword)
        
        return found_keywords
    
    def _identify_section(self, text: str) -> str:
        """Identifica a seção do documento"""
        text_lower = text.lower()
        
        if 'estágio' in text_lower:
            return 'estágio'
        elif 'matrícula' in text_lower:
            return 'matrícula'
        elif 'disciplina' in text_lower:
            return 'disciplinas'
        elif 'competência' in text_lower or 'habilidade' in text_lower:
            return 'competências'
        elif 'projeto pedagógico' in text_lower or 'ppc' in text_lower:
            return 'projeto_pedagógico'
        else:
            return 'geral'
    
    def save_chunks_to_json(self, chunks: List[Dict[str, Any]], output_path: str):
        """Salva os chunks em um arquivo JSON"""
        data = {
            'source': self.pdf_path,
            'total_chunks': len(chunks),
            'chunks': chunks
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        print(f"Chunks salvos em {output_path}")
    
    def search_chunks(self, query: str, chunks: List[Dict[str, Any]], top_k: int = 3) -> List[Dict[str, Any]]:
        """Busca nos chunks usando similaridade de texto"""
        query_lower = query.lower()
        scored_chunks = []
        
        for chunk in chunks:
            # Calcula similaridade baseada em palavras-chave
            keyword_score = sum(1 for keyword in chunk['keywords'] if keyword in query_lower)
            
            # Calcula similaridade de texto
            text_similarity = SequenceMatcher(None, query_lower, chunk['text'].lower()).ratio()
            
            # Score combinado
            total_score = (keyword_score * 0.4) + (text_similarity * 0.6)
            
            if total_score > 0.1:  # Threshold mínimo
                scored_chunks.append({
                    'chunk': chunk,
                    'score': total_score
                })
        
        # Ordena por score e retorna os top_k
        scored_chunks.sort(key=lambda x: x['score'], reverse=True)
        return [item['chunk'] for item in scored_chunks[:top_k]]

if __name__ == "__main__":
    processor = PDFProcessor("data/raw/PPC-ES-2023.pdf")
    chunks = processor.extract_text_with_chunks(chunk_size=800, overlap=150)
    processor.save_chunks_to_json(chunks, "data/qa/ppc_chunks.json")
