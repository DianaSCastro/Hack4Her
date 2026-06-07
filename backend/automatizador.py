"""
automatizador.py
----------------
Playwright abre el sistema destino y llena el formulario
con los datos ya mapeados desde el catálogo.

Notas importantes del formulario destino:
- Todos los campos usan ID (no name): #id_businessunit, #sku_solicitado, etc.
- id_linea e id_pedido son readonly y se generan automáticamente por el JS de la página.
- sku_solicitado_hash y sku_solicitado_cambio_hash se calculan automáticamente
  via evento 'input' al escribir en los campos SKU — no se llenan manualmente.
- El botón es type="submit" dentro del form#form-requisicion.
- Al hacer submit, el JS resetea el form y genera nuevos id_linea/id_pedido automáticamente.
- El último registro se deja con el formulario abierto (sin submit).
"""

import asyncio
import os
from playwright.async_api import async_playwright
from dotenv import load_dotenv

load_dotenv()

DESTINATION_URL = os.getenv("DESTINATION_URL", "https://arca-continental-hack4-her.vercel.app/")


async def llenar_formulario(datos: list[dict]) -> dict:
    """
    Recibe lista de productos ya mapeados con datos del catálogo.
    Llena el formulario destino por cada producto y valida.
    """
    resultados_validacion = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=False, slow_mo=80)
        page = await browser.new_page()
        await page.goto(DESTINATION_URL)
        await page.wait_for_load_state("networkidle")

        for idx, item in enumerate(datos):
            es_ultimo = (idx == len(datos) - 1)
            print(f"\n[Automatizador] Procesando ({idx+1}/{len(datos)}): {item.get('nombre_sku_solicitado', '')}")

            try:
                # ── ID Business Unit (dropdown) ───────────────────────────
                bu = item.get("id_businessunit", "")
                if bu:
                    await page.select_option("#id_businessunit", value=str(bu), timeout=5000)
                    print(f"  BU seleccionada: {bu}")

                # ── SKU Solicitado ────────────────────────────────────────
                # Usar fill + dispatch 'input' para que el JS calcule el hash automáticamente
                sku_sol = str(item.get("sku_solicitado", ""))
                await page.fill("#sku_solicitado", sku_sol)
                await page.dispatch_event("#sku_solicitado", "input")
                await asyncio.sleep(0.3)  # Esperar que el hash SHA-256 se calcule

                # ── Nombre SKU Solicitado ─────────────────────────────────
                await page.fill("#nombre_sku_solicitado", item.get("nombre_sku_solicitado", ""))

                # ── SKU Cambio ────────────────────────────────────────────
                sku_cam = str(item.get("sku_solicitado_cambio", ""))
                if sku_cam and sku_cam not in ("None", "nan", ""):
                    await page.fill("#sku_solicitado_cambio", sku_cam)
                    await page.dispatch_event("#sku_solicitado_cambio", "input")
                    await asyncio.sleep(0.3)  # Esperar hash
                else:
                    await page.fill("#sku_solicitado_cambio", "")

                # ── Nombre SKU Cambio ─────────────────────────────────────
                nombre_cam = item.get("nombre_sku_solicitado_cambio", "")
                if nombre_cam and nombre_cam not in ("None", "nan"):
                    await page.fill("#nombre_sku_solicitado_cambio", nombre_cam)
                else:
                    await page.fill("#nombre_sku_solicitado_cambio", "")

                await asyncio.sleep(0.4)

                # ── Validación binaria ────────────────────────────────────
                validacion = await _validar(page, item)
                resultados_validacion.append(validacion)
                print(f"  {'✅' if validacion['coincide'] else '❌'} Validación: {validacion}")

                # ── CAPTURAR REGISTRO o dejar abierto ─────────────────────
                if not es_ultimo:
                    # Click en el botón submit del formulario
                    await page.click("button[type='submit']", timeout=5000)
                    # El JS de la página resetea el form y genera nuevo id_linea/id_pedido
                    await asyncio.sleep(0.8)
                    print(f"  ✅ CAPTURAR REGISTRO presionado — formulario reiniciado para siguiente registro")
                else:
                    print(f"  🏁 Último registro llenado — ventana queda abierta para revisión")
                    await page.click("button[type='submit']", timeout=5000)
                    await asyncio.sleep(120)


            except Exception as e:
                print(f"  [Error] {e}")
                resultados_validacion.append({
                    "producto": item.get("nombre_sku_solicitado"),
                    "coincide": False,
                    "error": str(e)
                })

        # Mantener el browser abierto: el último registro queda visible
        # El context manager cerrará el browser solo si se produce una excepción no controlada
        print(f"\n[Automatizador] Proceso completo. Browser queda abierto con el último registro.")
        await asyncio.sleep(2)

    return {
        "total": len(datos),
        "exitosos": sum(1 for r in resultados_validacion if r.get("coincide")),
        "fallidos": sum(1 for r in resultados_validacion if not r.get("coincide")),
        "detalle": resultados_validacion
    }
    


async def _validar(page, item_original: dict) -> dict:
    """
    Validación binaria: lee los valores actuales del formulario
    y los compara con los datos que deberían estar.
    """
    try:
        nombre_en_form = await page.input_value("#nombre_sku_solicitado")
        sku_en_form    = await page.input_value("#sku_solicitado")

        coincide = (
            nombre_en_form.strip() == item_original.get("nombre_sku_solicitado", "").strip()
            and sku_en_form.strip() == str(item_original.get("sku_solicitado", "")).strip()
        )

        return {
            "producto":          item_original.get("nombre_sku_solicitado"),
            "coincide":          coincide,
            "esperado_nombre":   item_original.get("nombre_sku_solicitado"),
            "encontrado_nombre": nombre_en_form,
            "esperado_sku":      str(item_original.get("sku_solicitado")),
            "encontrado_sku":    sku_en_form,
        }
    except Exception as e:
        return {
            "producto": item_original.get("nombre_sku_solicitado"),
            "coincide": False,
            "error": str(e)
        }


def run(datos: list[dict]) -> dict:
    """Punto de entrada síncrono para llamar desde Flask."""
    return asyncio.run(llenar_formulario(datos))