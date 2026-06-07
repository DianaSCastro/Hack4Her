// ============================================================
//  Always on Shelf — Popup JS (adaptado para Flask backend)
// ============================================================
const BACKEND = "http://localhost:5000";
const sdot     = document.getElementById("sdot");
const slabel   = document.getElementById("slabel");
const bping    = document.getElementById("bping");
const bCapture = document.getElementById("b-capture");
const bAuto    = document.getElementById("b-auto");
const bReset   = document.getElementById("b-reset");
const mapEl    = document.getElementById("map-entries");
const openBtn  = document.getElementById("open-panel");

// ── Init ─────────────────────────────────────────────────────
pingBackend();
chrome.runtime.sendMessage({ type: "GET_STATE" }, (r) => r?.state && render(r.state));

// Escuchar actualizaciones del background
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "STATE_UPDATE") render(msg.state);
});

// ── Ping ─────────────────────────────────────────────────────
async function pingBackend() {
  try {
    const r = await fetch(`${BACKEND}/ping`, { signal: AbortSignal.timeout(2000) });
    bping.textContent = r.ok ? "backend ✓" : "backend ✗";
    bping.className   = r.ok ? "backend ok" : "backend err";
  } catch {
    bping.textContent = "backend ✗";
    bping.className   = "backend err";
  }
}

// ── Render ───────────────────────────────────────────────────
function render(state) {
  const modes = { idle: "Inactivo", capturing: "Capturando...", automating: "Automatizando..." };
  sdot.className     = `status-dot ${state.mode}`;
  slabel.textContent = modes[state.mode] || state.mode;

  const productos = state.productos || [];
  if (productos.length === 0) {
    mapEl.innerHTML = '<span class="empty">Captura una página para ver productos.</span>';
    return;
  }
  mapEl.innerHTML = productos.map(p => `
    <div class="mrow">
      <span class="mo">${p.nombre_extraido || p.nombre_sku_solicitado}</span>
      <span class="ma">→</span>
      <span class="md">SKU: ${p.sku_solicitado} | BU: ${p.id_businessunit} | Cant: ${p.cantidad}</span>
    </div>
  `).join("");
}

// ── Botones ──────────────────────────────────────────────────
bCapture.onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.getElementById("aos-capture")?.click()
    });
  });
  slabel.textContent = "Capturando...";
  window.close();
};

bAuto.onclick = () => {
  chrome.runtime.sendMessage({ type: "RUN_AUTOMATION" }, (res) => {
    if (res?.ok) {
      alert("✅ Automatización completada");
    } else {
      alert("❌ Error: " + (res?.error || "desconocido"));
    }
  });
  window.close();
};

bReset.onclick = () => {
  chrome.runtime.sendMessage({ type: "RESET" });
  render({ mode: "idle", productos: [] });
};

openBtn.onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => document.getElementById("aos-panel")?.classList.add("aos-open")
    });
  });
  window.close();
};
