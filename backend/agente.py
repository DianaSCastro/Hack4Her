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

PROMPT_EXTRACCION = """Analiza el siguiente texto extraído de una página web de comercio (puede ser Walmart, Soriana, Sam's Club, o cualquier otra tienda).

Tu tarea: identificar TODOS los productos y sus cantidades.

REGLAS:
- Extrae cualquier cosa que parezca un producto (alimento, bebida, artículo)
- La cantidad puede aparecer como: "2 pzas", "qty: 3", "x4", "cantidad: 2", "12 unidades", etc.
- Si no hay cantidad visible, usa 1 como default
- No importa el formato de la página ni cómo se llamen los campos
- Si no hay productos claros en el texto, retorna lista vacía

TEXTO DE LA PÁGINA:
{texto}

Responde ÚNICAMENTE con JSON válido, sin texto adicional:
{{
  "productos": [
    {{"nombre": "nombre completo del producto", "cantidad": número}},
    ...
  ]
}}"""


def extraer_productos(texto_pagina: str) -> list[dict]:
    """
    Manda el texto de la página a Claude y retorna lista de productos con cantidades.
    """
    # Limitar texto para no exceder tokens (máx ~8000 caracteres)
    texto_recortado = texto_pagina[:8000]

    mensaje = client.messages.create(
        model="claude-opus-4-5",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": PROMPT_EXTRACCION.format(texto=texto_recortado)
        }]
    )

    respuesta = mensaje.content[0].text

    # Extraer JSON de la respuesta
    match = re.search(r'\{.*\}', respuesta, re.DOTALL)
    if not match:
        return []

    data = json.loads(match.group())
    return data.get("productos", [])
