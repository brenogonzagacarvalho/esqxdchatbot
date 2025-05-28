from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

# Carregar modelo
model = SentenceTransformer('all-MiniLM-L6-v2')

# Perguntas exemplo
perguntas = [
    "Como faço a matrícula?",
    "Quais os critérios para estágio?",
    "O que é o Núcleo de Práticas?"
]

# Respostas correspondentes
respostas = [
    "Para matrícula, deve-se seguir o procedimento X.",
    "Os critérios para estágio são A, B, e C.",
    "O Núcleo de Práticas é uma unidade que oferece atividades práticas."
]

# Gerar embeddings das perguntas
embeddings = model.encode(perguntas)

def responder(pergunta_usuario):
    embedding_usuario = model.encode([pergunta_usuario])
    scores = cosine_similarity(embedding_usuario, embeddings)
    idx = np.argmax(scores)
    return respostas[idx]

# Teste
pergunta = "Quero saber sobre matrícula"
print("Pergunta:", pergunta)
print("Resposta:", responder(pergunta))
