"""
automatizador.py
----------------
Playwright abre el sistema destino y llena el formulario
con los datos ya mapeados desde el catálogo.
Al final hace validación binaria: compara origen vs destino campo por campo.
"""

import asyncio
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

DESTINATION_URL = os.getenv("DESTINATION_URL", "http://127.0.0.1:5500/index.html")


async def llenar_formulario(datos: list[dict]) -> dict:
    """
    Recibe lista de productos ya mapeados con datos del catálogo.
    Llena el formulario destino por cada producto y valida.
    """
    resultados_validacion = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False, slow_mo=100)
        page = await browser.new_page()
        await page.goto(DESTINATION_URL)
        await page.wait_for_load_state("networkidle")

        for item in datos:
            print(f"\n[Automatizador] Procesando: {item['nombre_sku_solicitado']}")

            try:
                # ── ID Business Unit (dropdown) ───────────────────────────
                bu = item.get("id_businessunit", "")
                if bu:
                    await page.select_option(
                        "select[name='id_businessunit'], #id_businessunit",
                        value=str(bu),
                        timeout=3000
                    )

                # ── Nombre SKU Solicitado ─────────────────────────────────
                await page.fill(
                    "input[name='nombre_sku_solicitado'], #nombre_sku_solicitado",
                    item.get("nombre_sku_solicitado", "")
                )

                # ── SKU Solicitado ────────────────────────────────────────
                await page.fill(
                    "input[name='sku_solicitado'], #sku_solicitado",
                    str(item.get("sku_solicitado", ""))
                )

                # ── SKU Cambio ────────────────────────────────────────────
                await page.fill(
                    "input[name='sku_solicitado_cambio'], #sku_solicitado_cambio",
                    str(item.get("sku_solicitado_cambio", ""))
                )

                # ── Nombre SKU Cambio ─────────────────────────────────────
                await page.fill(
                    "input[name='nombre_sku_solicitado_cambio'], #nombre_sku_solicitado_cambio",
                    item.get("nombre_sku_solicitado_cambio", "")
                )

                # ── Cantidad ──────────────────────────────────────────────
                await page.fill(
                    "input[name='cantidad'], #cantidad",
                    str(item.get("cantidad", "1"))
                )

                await asyncio.sleep(0.5)

                # ── Validación binaria ────────────────────────────────────
                validacion = await _validar(page, item)
                resultados_validacion.append(validacion)
                print(f"  {'✅' if validacion['coincide'] else '❌'} Validación: {validacion}")

                # ── Submit ────────────────────────────────────────────────
                try:
                    await page.click(
                        "button[type='submit'], input[type='submit']",
                        timeout=2000
                    )
                    await page.wait_for_load_state("networkidle")
                    await page.goto(DESTINATION_URL)
                    await page.wait_for_load_state("networkidle")
                except Exception:
                    pass

            except Exception as e:
                print(f"  [Error] {e}")
                resultados_validacion.append({
                    "producto": item.get("nombre_sku_solicitado"),
                    "coincide": False,
                    "error": str(e)
                })

        await asyncio.sleep(2)
        await browser.close()

    return {
        "total": len(datos),
        "exitosos": sum(1 for r in resultados_validacion if r.get("coincide")),
        "fallidos": sum(1 for r in resultados_validacion if not r.get("coincide")),
        "detalle": resultados_validacion
    }


async def _validar(page, item_original: dict) -> dict:
    """
    Validación binaria: lee los valores del formulario en pantalla
    y los compara con los datos que debería tener.
    """
    try:
        nombre_en_form = await page.input_value(
            "input[name='nombre_sku_solicitado'], #nombre_sku_solicitado"
        )
        sku_en_form = await page.input_value(
            "input[name='sku_solicitado'], #sku_solicitado"
        )

        coincide = (
            nombre_en_form.strip() == item_original.get("nombre_sku_solicitado", "").strip()
            and sku_en_form.strip() == str(item_original.get("sku_solicitado", "")).strip()
        )

        return {
            "producto":     item_original.get("nombre_sku_solicitado"),
            "coincide":     coincide,
            "esperado_nombre": item_original.get("nombre_sku_solicitado"),
            "encontrado_nombre": nombre_en_form,
            "esperado_sku": str(item_original.get("sku_solicitado")),
            "encontrado_sku": sku_en_form,
        }
    except Exception as e:
        return {"producto": item_original.get("nombre_sku_solicitado"), "coincide": False, "error": str(e)}


def run(datos: list[dict]) -> dict:
    """Punto de entrada síncrono para llamar desde Flask."""
    return asyncio.run(llenar_formulario(datos))
