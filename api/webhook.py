from http.server import BaseHTTPRequestHandler
import json
import os
import requests
import sys
sys.path.append('..')
from vercel_storage import vercel_storage

# Carrega as funções do chatbot
def load_qa_data():
    try:
        with open("public/perguntas_respostas_melhorado.json", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []

def advanced_similarity(query, item):
    query_lower = query.lower()
    score = 0
    
    # Verifica pergunta principal
    if query_lower in item["pergunta"].lower():
        score += 100
    
    # Verifica variações
    for variacao in item.get("variacoes", []):
        if query_lower in variacao.lower():
            score += 80
    
    # Verifica tags
    for tag in item.get("tags", []):
        if tag.lower() in query_lower:
            score += 60
    
    return score

def handle_message(message_text, user_id):
    qa_data = load_qa_data()
    
    best_match = None
    best_score = 0
    
    for item in qa_data:
        score = advanced_similarity(message_text, item)
        if score > best_score and score >= 50:
            best_score = score
            best_match = item
    
    if best_match:
        response = best_match["resposta"]
    else:
        response = "Desculpe, não entendi sua pergunta. Pode reformular?"
    
    # Salva a conversa no Vercel Blob Storage
    try:
        vercel_storage.store_conversation(user_id, message_text, response)
        
        # Salva analytics de uso
        vercel_storage.store_analytics("message_received", {
            "user_id": user_id,
            "message_length": len(message_text),
            "response_type": "qa_match" if best_match else "fallback",
            "match_score": best_score if best_match else 0
        })
    except Exception as e:
        print(f"Erro ao salvar conversa: {e}")
    
    return response

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            update_data = json.loads(post_data.decode('utf-8'))
            
            # Processa update do Telegram
            if 'message' in update_data and 'text' in update_data['message']:
                chat_id = update_data['message']['chat']['id']
                message_text = update_data['message']['text']
                user_id = update_data['message']['from']['id']
                
                # Gera resposta
                response_text = handle_message(message_text, user_id)
                
                # Envia resposta via Telegram Bot API
                bot_token = os.environ.get('TELEGRAM_TOKEN')
                if bot_token:
                    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
                    data = {
                        "chat_id": chat_id,
                        "text": response_text
                    }
                    requests.post(url, json=data)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
            
        except Exception as e:
            print(f"Erro: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
