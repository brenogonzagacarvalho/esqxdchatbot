from http.server import BaseHTTPRequestHandler
import json
import sys
sys.path.append('..')
from vercel_storage import vercel_storage

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Extrai user_id da URL
            path_parts = self.path.split('/')
            if len(path_parts) >= 3 and path_parts[2].isdigit():
                user_id = int(path_parts[2])
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "user_id required"}).encode())
                return
            
            # Busca conversas do usuário
            conversations = vercel_storage.get_conversations(user_id) or []
            
            # Retorna histórico
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            response_data = {
                "user_id": user_id,
                "conversations": conversations,
                "total": len(conversations)
            }
            
            self.wfile.write(json.dumps(response_data, ensure_ascii=False, indent=2).encode())
            
        except Exception as e:
            print(f"Erro ao buscar histórico: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
    
    def do_DELETE(self):
        try:
            # Extrai user_id da URL
            path_parts = self.path.split('/')
            if len(path_parts) >= 3 and path_parts[2].isdigit():
                user_id = int(path_parts[2])
            else:
                self.send_response(400)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "user_id required"}).encode())
                return
            
            # Limpa histórico do usuário (armazena lista vazia)
            success = vercel_storage.store_conversation(user_id, "", "")
            
            if success:
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"message": "Histórico limpo com sucesso"}).encode())
            else:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Falha ao limpar histórico"}).encode())
                
        except Exception as e:
            print(f"Erro ao limpar histórico: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())
