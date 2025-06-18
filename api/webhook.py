from http.server import BaseHTTPRequestHandler
import json
import os
from telegram import Bot, Update
from telegram.ext import Application

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            update_data = json.loads(post_data.decode('utf-8'))
            
            # Processa o update do Telegram aqui
            # (você pode importar e usar suas funções do bot.py)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
            
        except Exception as e:
            print(f"Erro: {e}")
            self.send_response(500)
            self.end_headers()
