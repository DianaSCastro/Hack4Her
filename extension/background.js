// ============================================================
//  Always on Shelf — Background Service Worker
//  Adaptado para backend Flask en localhost:5000
// ============================================================
const BACKEND = "http://localhost:5000";

let state = {
  mode: "idle",       // "idle" | "capturing" | "automating"
  productos: [],      // productos mapeados por Claude + MongoDB
  log: []
};

// ── Escuchar mensajes ────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case "GET_STATE":
      sendResponse({ state });
      break;
    case "RESET":
      state = { mode: "idle", productos: [], log: [] };
      broadcast({ type: "STATE_UPDATE", state });
      sendResponse({ ok: true });
      break;
    case "RUN_AUTOMATION":
      runAutomation(sendResponse);
      return true;
    case "FETCH_MAPEAR":
      fetchMapear(msg.payload, sendResponse);
      return true;
  }
});

// ── Capturar y mapear ────────────────────────────────────────
async function fetchMapear(payload, sendResponse) {
  try {
    state.mode = "capturing";
    broadcast({ type: "STATE_UPDATE", state });

    // Extraer texto del payload del content script
    const texto = payload.texto || extraerTextoPayload(payload);

    const res = await fetch(`${BACKEND}/mapear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto })
    });
    const data = await res.json();

    state.productos = data.productos || [];
    state.mode = "idle";
    broadcast({ type: "STATE_UPDATE", state });
    sendResponse({ ok: true, data });
  } catch (err) {
    state.mode = "idle";
    broadcast({ type: "STATE_UPDATE", state });
    sendResponse({ ok: false, error: err.message });
  }
}

// ── Automatizar ──────────────────────────────────────────────
async function runAutomation(sendResponse) {
  // /automatizar ahora retorna inmediatamente (Playwright corre en hilo background)
  // El content.js hace polling a /progreso para recibir los logs en tiempo real
  try {
    state.mode = "automating";
    broadcast({ type: "STATE_UPDATE", state });

    const res = await fetch(`${BACKEND}/automatizar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productos: state.productos })
    });
    const data = await res.json();

    state.mode = "idle";
    broadcast({ type: "STATE_UPDATE", state });
    // ok:true indica que se inició correctamente; los resultados llegan via /progreso
    sendResponse({ ok: data.ok !== false, error: data.error });
  } catch (err) {
    state.mode = "idle";
    broadcast({ type: "STATE_UPDATE", state });
    sendResponse({ ok: false, error: err.message });
  }
}

// ── Reconstruir texto desde payload DOM ──────────────────────
function extraerTextoPayload(payload) {
  const partes = [];
  if (payload.meta?.titulo) partes.push(payload.meta.titulo);
  (payload.productos || []).forEach(p => p.texto_completo && partes.push(p.texto_completo));
  (payload.textos || []).forEach(t => t.texto && partes.push(t.texto));
  (payload.tablas || []).forEach(t => {
    if (t.headers.length) partes.push(t.headers.join(" | "));
    t.filas.forEach(f => partes.push(f.join(" | ")));
  });
  return partes.join("\n").slice(0, 8000);
}

// ── Broadcast ────────────────────────────────────────────────
function broadcast(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => chrome.tabs.sendMessage(tab.id, msg).catch(() => {}));
  });
}