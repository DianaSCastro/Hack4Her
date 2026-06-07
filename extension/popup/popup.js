// ============================================================
//  Always on Shelf — Popup JS
// ============================================================

const BACKEND = "http://localhost:8000";

const sdot    = document.getElementById("sdot");
const slabel  = document.getElementById("slabel");
const bping   = document.getElementById("bping");
const bObs    = document.getElementById("b-observe");
const bAuto   = document.getElementById("b-auto");
const bReset  = document.getElementById("b-reset");
const mapEl   = document.getElementById("map-entries");
const openBtn = document.getElementById("open-panel");

// ── Init ─────────────────────────────────────────────────────
pingBackend();
chrome.runtime.sendMessage({ type: "GET_STATE" }, (r) => r?.state && render(r.state));

// ── Ping backend ─────────────────────────────────────────────
async function pingBackend() {
  try {
    const r = await fetch(`${BACKEND}/api/health`, { signal: AbortSignal.timeout(2000) });
    bping.textContent = r.ok ? "backend ✓" : "backend ✗";
    bping.className   = r.ok ? "backend ok" : "backend err";
  } catch {
    bping.textContent = "backend ✗";
    bping.className   = "backend err";
  }
}

// ── Render estado ─────────────────────────────────────────────
function render(state) {
  const modes = { idle: "Inactivo", observing: "Observando...", automating: "Automatizando..." };
  sdot.className  = `status-dot ${state.mode}`;
  slabel.textContent = modes[state.mode] || state.mode;

  bObs.className  = `pbtn observe${state.mode === "observing"  ? " active-obs"  : ""}`;
  bAuto.className = `pbtn automate${state.mode === "automating" ? " active-auto" : ""}`;

  const entries = Object.entries(state.mapping || {});
  mapEl.innerHTML = entries.length
    ? entries.map(([k,v]) => `
        <div class="mrow">
          <span class="mo">${k}</span>
          <span class="ma">→</span>
          <span class="md">${v}</span>
        </div>`).join("")
    : '<span class="empty">Sin datos — usa Modo Observar primero.</span>';
}

// ── Botones ───────────────────────────────────────────────────
bObs.onclick = () => {
  chrome.runtime.sendMessage({ type: "SET_MODE", mode: "observing" });
  window.close();
};

bAuto.onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    chrome.runtime.sendMessage({ type: "RUN_AUTOMATION", targetUrl: tab?.url });
  });
  window.close();
};

bReset.onclick = () => {
  chrome.runtime.sendMessage({ type: "RESET" });
  render({ mode: "idle", mapping: {} });
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
