"""
app.py
------
Servidor Flask con endpoints:
  POST /mapear       → extrae productos, busca en catálogo
  POST /automatizar  → lanza Playwright en hilo background, retorna inmediatamente
  GET  /progreso     → polling de logs en tiempo real
  GET  /ping         → health check
"""

import threading
from collections import deque
from flask import Flask, request, jsonify
from flask_cors import CORS
from agente import extraer_productos
from catalogo import buscar_multiples
from automatizador import run as automatizar

app = Flask(__name__)
CORS(app)

# ── Cola de progreso compartida ──────────────────────────────
# Cada entrada: { "msg": str, "type": str, "done": bool }
_progreso: deque = deque(maxlen=200)
_automatizando = False
_resultado_final = None


def _limpiar_progreso():
    global _progreso, _automatizando, _resultado_final
    _progreso.clear()
    _automatizando = False
    _resultado_final = None


def _correr_automatizador(productos):
    """Corre en hilo separado; va empujando logs a _progreso."""
    global _automatizando, _resultado_final
    try:
        resultado = automatizar(productos, log_callback=_push_log)
        _resultado_final = resultado
        _push_log(
            f"── Resumen: {resultado['exitosos']}/{resultado['total']} exitosos"
            + (f" | {resultado['fallidos']} fallo(s)" if resultado['fallidos'] > 0 else ""),
            "success" if resultado['fallidos'] == 0 else "warn",
            done=True
        )
    except Exception as e:
        _push_log(f"Error crítico en automatizador: {e}", "error", done=True)
    finally:
        _automatizando = False


def _push_log(msg, tipo="info", done=False):
    _progreso.append({"msg": msg, "type": tipo, "done": done})


# ── Endpoints ────────────────────────────────────────────────

@app.route("/mapear", methods=["POST"])
def mapear():
    body = request.get_json()
    if not body or "texto" not in body:
        return jsonify({"error": "Se requiere el campo 'texto'"}), 400

    print("[/mapear] Extrayendo productos con Claude...")
    productos_extraidos = extraer_productos(body["texto"])
    print(f"[/mapear] Claude encontró {len(productos_extraidos)} productos")

    if not productos_extraidos:
        return jsonify({"productos": [], "mensaje": "No se encontraron productos en la página"})

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
    global _automatizando
    body = request.get_json()
    if not body or "productos" not in body:
        return jsonify({"error": "Se requiere el campo 'productos'"}), 400

    productos = body["productos"]
    if not productos:
        return jsonify({"error": "Lista de productos vacía"}), 400

    if _automatizando:
        return jsonify({"error": "Ya hay una automatización en curso"}), 409

    _limpiar_progreso()
    _automatizando = True

    print(f"[/automatizar] Lanzando Playwright con {len(productos)} productos...")
    _push_log(f"Playwright iniciado con {len(productos)} producto(s)", "info")

    hilo = threading.Thread(target=_correr_automatizador, args=(productos,), daemon=True)
    hilo.start()

    return jsonify({"ok": True, "mensaje": "Automatización iniciada — usa /progreso para seguimiento"})


@app.route("/progreso", methods=["GET"])
def progreso():
    """Retorna todos los logs pendientes desde el offset dado."""
    offset = int(request.args.get("offset", 0))
    logs = list(_progreso)
    nuevos = logs[offset:]
    return jsonify({
        "logs": nuevos,
        "offset": offset + len(nuevos),
        "done": any(e.get("done") for e in nuevos),
        "resultado": _resultado_final if not _automatizando else None
    })


@app.route("/ping", methods=["GET"])
def ping():
    return jsonify({"status": "ok", "mensaje": "AOS Backend activo"})


if __name__ == "__main__":
    print("=" * 45)
    print("  AOS Backend corriendo en localhost:5000")
    print("=" * 45)
    app.run(debug=True, port=5000, use_reloader=False, threaded=True)