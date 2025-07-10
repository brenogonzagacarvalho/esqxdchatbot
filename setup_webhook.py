import requests
import os
from dotenv import load_dotenv

load_dotenv()

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
WEBHOOK_URL = "https://esqxdchatbot-4zq5gbsyx-brenogonzagacarvalhos-projects.vercel.app/api/webhook"

if not TELEGRAM_TOKEN:
    print("TELEGRAM_TOKEN não encontrado no .env")
    exit(1)

# Configurar webhook
response = requests.post(
    f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/setWebhook",
    json={"url": WEBHOOK_URL}
)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")

# Verificar webhook
response = requests.get(
    f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/getWebhookInfo"
)

print(f"Webhook Info: {response.text}")
