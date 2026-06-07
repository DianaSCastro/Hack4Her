import pandas as pd
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["always_on_shelf"]

# Cargar catálogo productos
df_catalogo = pd.read_csv("data/catalogo_productos.csv", dtype=str)
df_catalogo = df_catalogo.fillna("")
catalogo_docs = df_catalogo.to_dict(orient="records")
db["catalogo_productos"].drop()
db["catalogo_productos"].insert_many(catalogo_docs)
print(f"✅ Catálogo: {len(catalogo_docs)} productos subidos")

# Cargar pedidos
df_pedidos = pd.read_csv("data/pedidos.csv", dtype=str)
df_pedidos = df_pedidos.fillna("")
pedidos_docs = df_pedidos.to_dict(orient="records")
db["pedidos"].drop()
db["pedidos"].insert_many(pedidos_docs)
print(f"✅ Pedidos: {len(pedidos_docs)} registros subidos")

client.close()
print("\n✅ Base de datos lista en MongoDB Atlas")