"""
catalogo.py
-----------
Busca productos en MongoDB Atlas en vez de leer CSVs locales.
"""

import os
import re
from pymongo import MongoClient
from dotenv import load_dotenv


load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["always_on_shelf"]
coleccion = db["catalogo_productos"]


def normalizar(texto: str) -> str:
    return str(texto).lower().strip()

def buscar_producto(nombre_buscado):
    nombre_norm = normalizar(nombre_buscado)
    
    # 1. Exacto
    resultado = coleccion.find_one({"nombre_sku_solicitado": {"$regex": f"^{re.escape(nombre_norm)}$", "$options": "i"}})
    if resultado:
        resultado.pop("_id", None)
        return resultado

    # 2. Palabras clave (ignora palabras cortas y genéricas)
    STOP = {"de", "la", "el", "en", "con", "sin", "para", "por", "los", "las", "refresco", "bebida", "agua", "jugo"}
    palabras = [p for p in nombre_norm.split() if len(p) > 2 and p not in STOP and not p.replace('.','').isdigit()]
    
    if not palabras:
        return None

    # 3. Buscar con subconjuntos de palabras (de más a menos específico)
    for i in range(len(palabras), 0, -1):
        for j in range(len(palabras) - i + 1):
            subconjunto = palabras[j:j+i]
            regex = ".*".join(re.escape(p) for p in subconjunto)
            resultado = coleccion.find_one({"nombre_sku_solicitado": {"$regex": regex, "$options": "i"}})
            if resultado:
                resultado.pop("_id", None)
                return resultado

    return None

def buscar_multiples(productos: list[dict]) -> list[dict]:
    resultados = []
    for item in productos:
        nombre = item.get("nombre", "")
        cantidad = item.get("cantidad", 1)
        match = buscar_producto(nombre)

        if match:
            resultados.append({
                "nombre_extraido":             nombre,
                "cantidad":                    cantidad,
                "id_businessunit":             match.get("id_businessunit", ""),
                "sku_solicitado":              match.get("sku_solicitado", ""),
                "nombre_sku_solicitado":       match.get("nombre_sku_solicitado", ""),
                "sku_solicitado_cambio":       match.get("sku_solicitado_cambio", ""),
                "nombre_sku_solicitado_cambio": match.get("nombre_sku_solicitado_cambio", ""),
            })

    return resultados