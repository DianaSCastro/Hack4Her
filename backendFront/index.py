import os, json
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import anthropic
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

ANTHROPIC_API_KEY = "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"
CATALOGO_PATH     = os.path.join(os.path.dirname(__file__), "data", "Catalogo_SKUS.csv")

app = Flask(__name__)
CORS(app)

client      = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
catalogo_df = pd.read_csv(CATALOGO_PATH) if os.path.exists(CATALOGO_PATH) else pd.DataFrame()

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "catalogo_rows": len(catalogo_df),
        "claude_ready": bool(ANTHROPIC_API_KEY)
    })

@app.route("/mapear", methods=["POST"])
def mapear():
    data = request.json or {}

    catalogo_sample = ""
    if not catalogo_df.empty:
        catalogo_sample = catalogo_df.head(30).to_json(orient="records", force_ascii=False)

    prompt = f"""Eres un agente de Arca Continental. Analiza esta captura de página web y extrae los productos con su SKU, nombre y precio.

DATOS CAPTURADOS:
{json.dumps(data, ensure_ascii=False, indent=2)[:3000]}

CATÁLOGO DE SKUs (para mapear):
{catalogo_sample[:2000]}

Devuelve SOLO un JSON con esta estructura:
{{
  "productos_detectados": [
    {{"sku_cliente": "...", "nombre_cliente": "...", "precio": "...", "sku_interno": "...", "nombre_interno": "..."}}
  ],
  "resumen": "texto breve de lo que encontraste"
}}
Sin markdown, solo JSON."""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        raw    = response.content[0].text.strip().replace("```json","").replace("```","").strip()
        result = json.loads(raw)
    except Exception as e:
        result = {"error": str(e), "raw": locals().get("raw", "")}

    return jsonify(result)

if __name__ == "__main__":
    print(f"✅ Catálogo: {len(catalogo_df)} filas")
    print(f"✅ Claude: {'listo' if ANTHROPIC_API_KEY else 'SIN API KEY'}")
    print("🚀 Backend en http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)