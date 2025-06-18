import os
import requests
from dotenv import load_dotenv

load_dotenv()

TOKEN = os.getenv("TELEGRAM_TOKEN")
WEBHOOK_URL = "https://esqxdchatbot.vercel.app/webhook"  # substitua pelo seu domínio

def set_webhook():
    url = f"https://api.telegram.org/bot{TOKEN}/setWebhook"
    data = {"url": WEBHOOK_URL}
    
    response = requests.post(url, data=data)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")

def get_webhook_info():
    url = f"https://api.telegram.org/bot{TOKEN}/getWebhookInfo"
    response = requests.get(url)
    print(f"Webhook Info: {response.json()}")

if __name__ == "__main__":
    print("Configurando webhook...")
    set_webhook()
    print("\nInfo do webhook:")
    get_webhook_info()
