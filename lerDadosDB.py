import requests

BLOB_TOKEN = "vercel_blob_rw_XrDa15Tnp8x5eHfP_QcgrEoYdyN27tyDhDqDmQvwsR4iGv5"

# 1. Listar arquivos
headers = {"Authorization": f"Bearer {BLOB_TOKEN}"}
response = requests.get("https://blob.vercel-storage.com/list", headers=headers)

if response.status_code == 200:
    blobs = response.json().get("blobs", [])
    for blob in blobs:
        print(f"Arquivo: {blob['pathname']}")
        print(f"URL: {blob['url']}")
        
        # 2. Ler o conteúdo
        file_response = requests.get(blob['url'])
        if file_response.status_code == 200:
            print("Conteúdo:", file_response.json())
        else:
            print("Erro ao acessar arquivo:", file_response.status_code)
else:
    print("Erro ao listar arquivos:", response.status_code)
