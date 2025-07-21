import json
import os
import requests
from typing import Dict, List, Optional, Any
from datetime import datetime
import hashlib

class VercelBlobStorage:
    def __init__(self):
        self.blob_token = os.getenv("BLOB_READ_WRITE_TOKEN")
        self.base_url = "https://blob.vercel-storage.com"
        
    def _generate_filename(self, data_type: str, identifier: str = None) -> str:
        """Gera nome único para o arquivo"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        if identifier:
            return f"{data_type}_{identifier}_{timestamp}.json"
        return f"{data_type}_{timestamp}.json"
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Faz requisição para a API do Vercel Blob"""
        headers = {
            "Authorization": f"Bearer {self.blob_token}",
            "Content-Type": "application/json"
        }
        
        url = f"{self.base_url}{endpoint}"
        return requests.request(method, url, headers=headers, **kwargs)
    
    def store_user_data(self, user_id: int, data: Dict[str, Any]) -> bool:
        """Armazena dados do usuário"""
        try:
            filename = f"user_data_{user_id}.json"
            
            # Adiciona timestamp aos dados
            data["last_updated"] = datetime.now().isoformat()
            data["user_id"] = user_id
            
            # Converte para JSON
            json_data = json.dumps(data, ensure_ascii=False, indent=2)
            
            # Faz upload para o Vercel Blob
            response = self._upload_blob(filename, json_data)
            return response.status_code == 200
            
        except Exception as e:
            print(f"Erro ao armazenar dados do usuário {user_id}: {e}")
            return False
    
    def get_user_data(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Recupera dados do usuário"""
        try:
            filename = f"user_data_{user_id}.json"
            data = self._download_blob(filename)
            
            if data:
                return json.loads(data)
            return None
            
        except Exception as e:
            print(f"Erro ao recuperar dados do usuário {user_id}: {e}")
            return None
    
    def store_conversation(self, user_id: int, message: str, response: str) -> bool:
        """Armazena conversa do usuário"""
        try:
            # Tenta recuperar conversas existentes
            conversations = self.get_conversations(user_id) or []
            
            # Adiciona nova conversa
            new_conversation = {
                "timestamp": datetime.now().isoformat(),
                "message": message,
                "response": response
            }
            
            conversations.append(new_conversation)
            
            # Mantém apenas as últimas 50 conversas
            if len(conversations) > 50:
                conversations = conversations[-50:]
            
            filename = f"conversations_{user_id}.json"
            json_data = json.dumps({
                "user_id": user_id,
                "conversations": conversations,
                "last_updated": datetime.now().isoformat()
            }, ensure_ascii=False, indent=2)
            
            response = self._upload_blob(filename, json_data)
            return response.status_code == 200
            
        except Exception as e:
            print(f"Erro ao armazenar conversa do usuário {user_id}: {e}")
            return False
    
    def get_conversations(self, user_id: int) -> Optional[List[Dict[str, Any]]]:
        """Recupera conversas do usuário"""
        try:
            filename = f"conversations_{user_id}.json"
            data = self._download_blob(filename)
            
            if data:
                parsed_data = json.loads(data)
                return parsed_data.get("conversations", [])
            return []
            
        except Exception as e:
            print(f"Erro ao recuperar conversas do usuário {user_id}: {e}")
            return []
    
    def store_analytics(self, event_type: str, data: Dict[str, Any]) -> bool:
        """Armazena dados de analytics"""
        try:
            # Gera ID único para o evento
            event_id = hashlib.md5(f"{datetime.now().isoformat()}_{event_type}".encode()).hexdigest()[:8]
            filename = f"analytics_{event_type}_{event_id}.json"
            
            analytics_data = {
                "event_type": event_type,
                "timestamp": datetime.now().isoformat(),
                "data": data
            }
            
            json_data = json.dumps(analytics_data, ensure_ascii=False, indent=2)
            response = self._upload_blob(filename, json_data)
            return response.status_code == 200
            
        except Exception as e:
            print(f"Erro ao armazenar analytics: {e}")
            return False
    
    def _upload_blob(self, filename: str, content: str) -> requests.Response:
        """Upload de conteúdo para o Vercel Blob"""
        url = f"https://blob.vercel-storage.com/put"
        
        headers = {
            "Authorization": f"Bearer {self.blob_token}",
            "X-Filename": filename,
            "Content-Type": "application/json"
        }
        
        response = requests.put(url, data=content.encode('utf-8'), headers=headers)
        return response
    
    def _download_blob(self, filename: str) -> Optional[str]:
        """Download de conteúdo do Vercel Blob"""
        try:
            # Primeiro, lista os blobs para encontrar a URL
            list_url = f"https://blob.vercel-storage.com/list"
            headers = {"Authorization": f"Bearer {self.blob_token}"}
            
            response = requests.get(list_url, headers=headers)
            if response.status_code == 200:
                blobs = response.json()
                
                # Procura pelo arquivo
                for blob in blobs.get("blobs", []):
                    if blob["pathname"] == filename:
                        # Faz download do conteúdo
                        download_response = requests.get(blob["url"])
                        if download_response.status_code == 200:
                            return download_response.text
            
            return None
            
        except Exception as e:
            print(f"Erro ao fazer download do blob {filename}: {e}")
            return None

# Instância global
vercel_storage = VercelBlobStorage()
