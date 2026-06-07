"""
catalogo.py
-----------
Busca productos en MongoDB Atlas en vez de leer CSVs locales.
"""

import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

client = MongoClient(os.getenv("MONGO_URI"))
db = client["always_on_shelf"]
coleccion = db["catalogo_productos"]


def normalizar(texto: str) -> str:
    return str(texto).lower().strip()


def buscar_producto(nombre_buscado: str) -> dict | None:
    nombre_norm = normalizar(nombre_buscado)

    # 1. Coincidencia exacta (case insensitive)
    resultado = coleccion.find_one({
        "nombre_sku_solicitado": {"$regex": f"^{nombre_norm}$", "$options": "i"}
    })
    if resultado:
        resultado.pop("_id", None)
        return resultado

    # 2. Coincidencia parcial por palabras clave
    palabras = [p for p in nombre_norm.split() if len(p) > 3]
    if not palabras:
        return None

    regex = ".*".join(palabras)
    resultado = coleccion.find_one({
        "nombre_sku_solicitado": {"$regex": regex, "$options": "i"}
    })
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