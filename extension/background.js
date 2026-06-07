// ============================================================
//  Always on Shelf — Background Service Worker
//  Gestiona el estado global y la comunicación con el backend
// ============================================================

const BACKEND = "http://localhost:8000";

// Estado compartido del agente
let state = {
  mode: "idle",          // "idle" | "observing" | "automating"
  mapping: {},           // { campo_origen: campo_destino }
  log: []
};

// ── Escuchar mensajes del popup y content script ─────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {

    case "GET_STATE":
      sendResponse({ state });
      break;

    case "SET_MODE":
      state.mode = msg.mode;
      broadcast({ type: "MODE_CHANGED", mode: msg.mode });
      sendResponse({ ok: true });
      break;

    case "CAPTURE_FIELDS":
      captureFields(msg.fields, msg.url, sendResponse);
      return true; // async

    case "RUN_AUTOMATION":
      runAutomation(msg.targetUrl, sendResponse);
      return true; // async

    case "RESET":
      state = { mode: "idle", mapping: {}, log: [] };
      broadcast({ type: "MODE_CHANGED", mode: "idle" });
      sendResponse({ ok: true });
      break;

    case "ADD_LOG":
      state.log.unshift({ ts: Date.now(), msg: msg.msg });
      if (state.log.length > 50) state.log.pop();
      sendResponse({ ok: true });
      break;
  }
});

// ── Enviar captura al backend ─────────────────────────────────

async function captureFields(fields, url, sendResponse) {
  try {
    const res  = await fetch(`${BACKEND}/api/mapear`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ fields, source_url: url })
    });
    const data = await res.json();

    if (data.mapping) {
      state.mapping = { ...state.mapping, ...data.mapping };
      broadcast({ type: "MAPPING_UPDATE", mapping: state.mapping });
    }

    sendResponse({ ok: true, mapping: data.mapping });
  } catch (err) {
    sendResponse({ ok: false, error: err.message });
  }
}

// ── Disparar automatización en el backend ────────────────────

async function runAutomation(targetUrl, sendResponse) {
  try {
    state.mode = "automating";
    broadcast({ type: "MODE_CHANGED", mode: "automating" });

    const res  = await fetch(`${BACKEND}/api/automatizar`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ mapping: state.mapping, target_url: targetUrl })
    });
    const data = await res.json();

    state.mode = "idle";
    broadcast({ type: "MODE_CHANGED", mode: "idle" });
    sendResponse({ ok: true, result: data });
  } catch (err) {
    state.mode = "idle";
    sendResponse({ ok: false, error: err.message });
  }
}

// ── Broadcast a todos los content scripts ────────────────────

function broadcast(msg) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    });
  });
}

// ── Handler directo para fetch desde content scripts ─────────
// Necesario porque Walmart/Soriana bloquean fetch a localhost via CSP

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "FETCH_MAPEAR") return;

  fetch("http://localhost:5000/mapear", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(msg.payload)
  })
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }));

  return true; // async
});
