"""
agente.py
---------
Llama a Claude API con el texto completo de la página.
Claude decide qué es producto y qué es cantidad — sin reglas hardcodeadas.
"""

import os
import json
import re
import anthropic
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPT_EXTRACCION = """Analiza el siguiente texto extraído de una página web de comercio (puede ser un carrito, orden, pedido o listado de productos).

Tu tarea es extraer TODOS los productos con sus cantidades.

Busca patrones como:
- Nombre de producto seguido de precio o cantidad
- "X artículos" o "cantidad: X"
- Números junto a nombres de productos
- Listas de items en carritos de compra

Si no ves cantidad explícita, asume 1.

Texto de la página:
{texto}

Responde ÚNICAMENTE con este JSON válido, sin texto adicional:
{{"productos": [{{"nombre": "nombre del producto", "cantidad": número}}]}}

Si no encuentras productos, responde: {{"productos": []}}"""


def extraer_productos(texto_pagina):
    texto_recortado = texto_pagina[:8000]
    mensaje = client.messages.create(
        model="claude-opus-4-5", max_tokens=1024,
        messages=[{"role": "user", "content": PROMPT_EXTRACCION.format(texto=texto_recortado)}]
    )
    raw = mensaje.content[0].text
    # Intentar extraer JSON de la respuesta
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            return []
        # Limpiar caracteres problemáticos
        json_str = match.group()
        json_str = re.sub(r'[\x00-\x1f\x7f]', ' ', json_str)
        return json.loads(json_str).get("productos", [])
    except json.JSONDecodeError:
        # Intentar extraer solo el array de productos
        try:
            arr = re.search(r'\[.*\]', raw, re.DOTALL)
            if arr:
                return json.loads(arr.group())
        except Exception:
            pass
        return []