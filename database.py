import os
import ssl
import pymysql.cursors
from dotenv import load_dotenv

load_dotenv()

# caminho para o root CA que você acabou de baixar
CA_PATH = os.getenv("DB_SSL_CA", "certs/BaltimoreCyberTrustRoot.crt.pem")

# monta os params de SSL para o wrap_socket do Python
ssl_params = {
    "ca_certs": CA_PATH,
    "cert_reqs": ssl.CERT_REQUIRED,
    "ssl_version": ssl.PROTOCOL_TLSv1_2
}

pool = pymysql.connect(
    host=os.getenv("DB_HOST"),
    port=int(os.getenv("DB_PORT", 3306)),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    charset="utf8mb4",
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True,
    ssl=ssl_params
)

def query(sql, params=None):
    with pool.cursor() as cur:
        cur.execute(sql, params or ())
        return cur.fetchall()