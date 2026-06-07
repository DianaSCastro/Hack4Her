"""
app.py
------
Servidor Flask con 2 endpoints:
  POST /mapear      → recibe texto de la página, extrae productos, busca en catálogo
  POST /automatizar → recibe productos mapeados, Playwright llena el formulario destino
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from agente import extraer_productos
from catalogo import buscar_multiples
from automatizador import run as automatizar

app = Flask(__name__)
CORS(app)  # Permite llamadas desde la extensión de Chrome


@app.route("/mapear", methods=["POST"])
def mapear():
    """
    Recibe: { "texto": "...texto completo de la página..." }
    Retorna: { "productos": [...productos mapeados con datos del catálogo...] }
    """
    body = request.get_json()
    if not body or "texto" not in body:
        return jsonify({"error": "Se requiere el campo 'texto'"}), 400

    texto_pagina = body["texto"]

    # 1. Claude extrae productos y cantidades
    print("[/mapear] Extrayendo productos con Claude...")
    productos_extraidos = extraer_productos(texto_pagina)
    print(f"[/mapear] Claude encontró {len(productos_extraidos)} productos")

    if not productos_extraidos:
        return jsonify({"productos": [], "mensaje": "No se encontraron productos en la página"})

    # 2. Buscar cada producto en el catálogo CSV
    print("[/mapear] Buscando en catálogo...")
    productos_mapeados = buscar_multiples(productos_extraidos)
    print(f"[/mapear] {len(productos_mapeados)} productos con match en catálogo")

    return jsonify({
        "productos": productos_mapeados,
        "total_extraidos": len(productos_extraidos),
        "total_mapeados": len(productos_mapeados),
        "sin_match": len(productos_extraidos) - len(productos_mapeados)
    })


@app.route("/automatizar", methods=["POST"])
def automatizar_endpoint():
    """
    Recibe: { "productos": [...lista de productos ya mapeados...] }
    Retorna: { "total", "exitosos", "fallidos", "detalle": [...validación binaria...] }
    """
    body = request.get_json()
    if not body or "productos" not in body:
        return jsonify({"error": "Se requiere el campo 'productos'"}), 400

    productos = body["productos"]
    if not productos:
        return jsonify({"error": "Lista de productos vacía"}), 400

    print(f"[/automatizar] Iniciando Playwright con {len(productos)} productos...")
    resultado = automatizar(productos)
    print(f"[/automatizar] Completado: {resultado['exitosos']}/{resultado['total']} exitosos")

    return jsonify(resultado)


@app.route("/ping", methods=["GET"])
def ping():
    """Health check — la extensión lo usa para saber si el servidor está corriendo."""
    return jsonify({"status": "ok", "mensaje": "AOS Backend activo"})


if __name__ == "__main__":
    print("=" * 45)
    print("  AOS Backend corriendo en localhost:5000")
    print("=" * 45)
    app.run(debug=True, port=5000, use_reloader=False)
