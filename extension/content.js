// ============================================================
//  O-Trace — Content Script
//  Agente de IA para lectura y automatización de portales web
// ============================================================

(function () {
  if (window.__OTRACE__) return;
  window.__OTRACE__ = true;

  const EXT = chrome.runtime.getURL("");

  // ── FAB animado ───────────────────────────────────────────

  const fab = document.createElement("div");
  fab.id = "ot-fab";
  fab.title = "O-Trace Agente";
  fab.innerHTML = `
    <div class="ot-fab-ring"></div>
    <video
      id="ot-fab-video"
      src="${EXT}icons/Logoanimado.mp4"
      autoplay
      loop
      muted
      playsinline
    ></video>
  `;
  document.body.appendChild(fab);
  fab.addEventListener("click", () => panel.classList.toggle("ot-open"));

  // ── Panel ─────────────────────────────────────────────────

  const panel = document.createElement("div");
  panel.id = "ot-panel";
  panel.innerHTML = `

    <!-- HEADER -->
    <div class="ot-header">
      <div class="ot-brand">
        <div class="ot-brand-icon">
          <img src="${EXT}icons/LogoBlanco.jpg" style="width:30px;height:30px;object-fit:contain;border-radius:4px;" alt="O-Trace"/>
        </div>
        <div>
          <div class="ot-name">O-Trace AI</div>
          <div class="ot-sub"></div>
        </div>
      </div>
      <button class="ot-close" id="ot-close">✕</button>
    </div>

    <!-- STATUS -->
    <div class="ot-status" id="ot-status">
      <span class="ot-dot" id="ot-dot"></span>
      <span id="ot-status-text">EN ESPERA</span>
    </div>

    <!-- URL CONTEXT -->
    <div class="ot-context">
      <div class="ot-context-label">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.8"/>
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" stroke="currentColor" stroke-width="1.8"/>
        </svg>
        Fuente activa
      </div>
      <div class="ot-context-url" id="ot-url">—</div>
    </div>

    <!-- BOTONES -->
    <div class="ot-buttons">

      <button class="ot-btn ot-btn-analizar" id="ot-analizar">
        <img id="ot-img-analizar" class="ot-btn-img" src="" alt=""/>
        <div class="ot-btn-text">
          <span class="ot-btn-label">ANALIZAR PÁGINA</span>
          <span class="ot-btn-desc">Extrae datos y mapea con catálogo</span>
        </div>
      </button>

      <button class="ot-btn ot-btn-auto" id="ot-auto">
        <img id="ot-img-auto" class="ot-btn-img" src="" alt=""/>
        <div class="ot-btn-text">
          <span class="ot-btn-label">LLENAR FORMULARIO</span>
          <span class="ot-btn-desc">Automatiza el llenado con Playwright</span>
        </div>
      </button>

    </div>

    <!-- LOG HEADER -->
    <div class="ot-log-header">
      <div class="ot-log-title-txt">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        Actividad del agente
      </div>
      <button class="ot-clear-btn" id="ot-clear">LIMPIAR</button>
    </div>

    <!-- LOGS -->
    <div class="ot-logs" id="ot-logs">
      <div class="ot-log-empty">El agente está listo. Presiona Analizar para comenzar.</div>
    </div>

  `;
  document.body.appendChild(panel);

  // Setear URL y logos
  document.getElementById("ot-url").textContent = window.location.href.slice(0, 60) + (window.location.href.length > 60 ? "…" : "");
  document.getElementById("ot-img-analizar").src = EXT + "icons/Analisisoff.png";
  document.getElementById("ot-img-auto").src     = EXT + "icons/Autooff.png";

  // ── Eventos ───────────────────────────────────────────────

  document.getElementById("ot-close").onclick    = () => panel.classList.remove("ot-open");
  document.getElementById("ot-clear").onclick    = clearLogs;
  document.getElementById("ot-analizar").onclick = () => analizar();
  document.getElementById("ot-auto").onclick     = () => llenarFormulario();

  // Hover: cambiar imagen botón analizar
  const btnA = document.getElementById("ot-analizar");
  const imgA = document.getElementById("ot-img-analizar");
  btnA.addEventListener("mouseenter", () => imgA.src = EXT + "icons/Analisison.png");
  btnA.addEventListener("mouseleave", () => imgA.src = EXT + "icons/Analisisoff.png");

  const btnAu = document.getElementById("ot-auto");
  const imgAu = document.getElementById("ot-img-auto");
  btnAu.addEventListener("mouseenter", () => imgAu.src = EXT + "icons/Autoon.png");
  btnAu.addEventListener("mouseleave", () => imgAu.src = EXT + "icons/Autooff.png");

  // ── ANALIZAR PÁGINA (antes capturarYEnviar) ───────────────

  function analizar() {
    setStatus("INICIALIZANDO", "thinking");
    clearLogs();

    agentLog("O-Trace inicializando análisis de contexto web...", "think");
    agentLog("Escaneando estructura del DOM...", "info");

    setTimeout(() => {
      const payload = {
        ...extraerTodo(),
        texto: document.body.innerText.slice(0, 8000)
      };

      agentLog(`Arquitectura detectada: ${document.querySelectorAll("*").length} nodos`, "info");
      agentLog(`Productos identificados: ${payload.productos.length}`, "data");
      agentLog(`Formularios encontrados: ${payload.formularios.length}`, "data");
      agentLog(`Tablas estructuradas: ${payload.tablas.length}`, "data");
      agentLog(`Hipervínculos mapeados: ${payload.links.length}`, "data");

      setStatus("PROCESANDO CON AGENTE", "processing");
      agentLog("Serializando payload para modelo semántico...", "think");
      agentLog("Enviando contexto a backend Claude Sonnet...", "info");

      console.group("🔍 [O-Trace] Captura completa");
      console.log("URL:", payload.meta.url);
      console.log("Título:", payload.meta.titulo);
      console.log("Productos encontrados:", payload.productos.length);
      console.log("Formularios encontrados:", payload.formularios.length);
      console.log("Tablas encontradas:", payload.tablas.length);
      console.log("--- PAYLOAD COMPLETO ---");
      console.log(JSON.stringify(payload, null, 2));
      console.groupEnd();

      chrome.runtime.sendMessage({ type: "FETCH_MAPEAR", payload }, (res) => {
        if (chrome.runtime.lastError) {
          agentLog(`Error de conexión: ${chrome.runtime.lastError.message}`, "error");
          setStatus("ERROR", "error");
          return;
        }
        if (res?.ok) {
          const d = res.data;
          agentLog("Respuesta recibida del modelo", "success");
          agentLog(`Productos mapeados: ${d.total_mapeados ?? d.productos?.length ?? 0}`, "success");
          if (d.productos?.length) {
            d.productos.forEach(p => {
              agentLog(`   └ ${p.nombre_sku_solicitado} → SKU ${p.sku_solicitado}`, "data");
            });
          }
          if (d.resumen) agentLog(`💬 ${d.resumen}`, "think");
          setStatus("ANÁLISIS COMPLETO", "done");
          console.log("🤖 [O-Trace] Claude:", d);
        } else {
          agentLog(`Backend: ${res?.error}`, "error");
          setStatus("ERROR", "error");
        }
      });
    }, 300);
  }

  // ── LLENAR FORMULARIO (via Playwright + backend) ──────────

  function llenarFormulario() {
    setStatus("VERIFICANDO DATOS", "thinking");

    chrome.runtime.sendMessage({ type: "GET_STATE" }, (res) => {
      if (chrome.runtime.lastError) {
        agentLog(`Error de conexión: ${chrome.runtime.lastError.message}`, "error");
        setStatus("ERROR", "error");
        return;
      }

      const productos = res?.state?.productos || [];
      if (!productos.length) {
        agentLog("No hay productos capturados. Usa 'Analizar Página' primero.", "warn");
        setStatus("EN ESPERA", "thinking");
        return;
      }

      agentLog(`${productos.length} producto(s) listos para automatizar`, "success");
      agentLog("Iniciando Playwright en el sistema destino...", "info");
      setStatus("AUTOMATIZANDO", "processing");

      // 1. Disparar automatización (backend responde de inmediato)
      chrome.runtime.sendMessage({ type: "RUN_AUTOMATION" }, (resp) => {
        if (chrome.runtime.lastError || !resp?.ok) {
          agentLog(`Error al iniciar: ${chrome.runtime.lastError?.message || resp?.error}`, "error");
          setStatus("ERROR", "error");
          return;
        }
        // 2. Polling a /progreso para mostrar logs en tiempo real
        _iniciarPolling();
      });
    });
  }

  function _iniciarPolling() {
    const BACKEND = "http://localhost:5000";
    let offset = 0;
    let activo = true;
    let intentos = 0;
    const MAX_INTENTOS = 300; // 5 min máx

    const intervalo = setInterval(async () => {
      // Guardia: si ya se detuvo no hacer nada más
      if (!activo) {
        clearInterval(intervalo);
        return;
      }

      intentos++;
      if (intentos > MAX_INTENTOS) {
        activo = false;
        clearInterval(intervalo);
        agentLog("Tiempo máximo de espera alcanzado", "warn");
        setStatus("TIEMPO AGOTADO", "error");
        return;
      }

      try {
        const res = await fetch(`${BACKEND}/progreso?offset=${offset}`);
        const data = await res.json();

        // Mostrar logs nuevos en el panel
        (data.logs || []).forEach(entry => {
          agentLog(entry.msg, entry.type || "info");
          // Detener en cuanto se llene el último registro
          if (entry.msg.includes("Último registro llenado")) {
            activo = false;
          }
        });
        offset = data.offset;

        // Detener en cuanto llegue done — sin esperar siguiente tick
        if (data.done) {
          activo = false;
          clearInterval(intervalo);
          setStatus("AUTOMATIZACIÓN COMPLETA", "done");
          console.log("[O-Trace] Resultado final:", data.resultado);
        }
      } catch (e) {
        // Ignorar errores de red transitorios
      }
    }, 1000);
  }

  // ── Helpers de UI ─────────────────────────────────────────

  function setStatus(text, type) {
    const dot   = document.getElementById("ot-dot");
    const label = document.getElementById("ot-status-text");
    label.textContent = text;
    dot.className = "ot-dot ot-dot-" + type;
  }

  function clearLogs() {
    document.getElementById("ot-logs").innerHTML = "";
    setStatus("EN ESPERA", "thinking");
  }

  function agentLog(msg, type = "info") {
    const container = document.getElementById("ot-logs");
    const row = document.createElement("div");
    row.className = `ot-log ot-log-${type}`;
    const time = new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    row.innerHTML = `<span class="ot-log-time">${time}</span><span class="ot-log-msg">${msg}</span>`;
    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
  }

  // ── Extractores ───────────────────────────────────────────

  function extraerTodo() {
    return {
      meta:        extraerMeta(),
      productos:   extraerProductos(),
      formularios: extraerFormularios(),
      tablas:      extraerTablas(),
      textos:      extraerTextos(),
      listas:      extraerListas(),
      links:       extraerLinks(),
      imagenes:    extraerImagenes(),
    };
  }

  function extraerMeta() {
    const metas = {};
    document.querySelectorAll("meta[name], meta[property]").forEach(m => {
      const key = m.getAttribute("name") || m.getAttribute("property");
      const val = m.getAttribute("content");
      if (key && val) metas[key] = val;
    });
    return {
      url:       window.location.href,
      dominio:   window.location.hostname,
      titulo:    document.title,
      timestamp: new Date().toISOString(),
      meta_tags: metas
    };
  }

  function extraerProductos() {
    const productos = [], vistos = new Set();
    const sels = [
      '[data-testid="product-title"]', '[data-testid="allotment-product-tile"]',
      '[class*="product-title"]', '[class*="ProductTitle"]',
      '[class*="product-card"]', '[class*="ProductCard"]',
      '[class*="product-name"]', '[class*="item-name"]',
      '[class*="sc-product"]', '[class*="item-card"]',
      '[class*="product-item"]', '[class*="producto"]',
      'article[class*="product"]', '[data-product]',
      '[itemprop="product"]', '[itemtype*="Product"]'
    ];
    sels.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (vistos.has(el)) return;
          vistos.add(el);
          const texto = el.innerText?.trim() || "";
          if (!texto || texto.length < 5) return;
          const precioMatch = texto.match(/\$[\d,]+\.?\d*/);
          const skuMatch    = texto.match(/\b\d{4,10}\b/);
          productos.push({
            nombre:         texto.split("\n")[0].trim().slice(0, 150),
            precio:         precioMatch?.[0] || null,
            sku:            skuMatch?.[0] || null,
            texto_completo: texto.slice(0, 400),
            selector:       sel
          });
        });
      } catch(e) {}
    });
    return productos.slice(0, 100);
  }

  function extraerFormularios() {
    const forms = [];
    document.querySelectorAll("form, [role='form']").forEach(form => {
      const campos = [];
      form.querySelectorAll("input, select, textarea, [contenteditable]").forEach(el => {
        if (el.type === "hidden") return;
        campos.push({
          tag:         el.tagName.toLowerCase(),
          tipo:        el.type || "",
          nombre:      el.name || el.id || "",
          label:       getLabel(el),
          valor:       el.value || el.innerText || "",
          placeholder: el.placeholder || "",
          requerido:   el.required || false,
          aria_label:  el.getAttribute("aria-label") || ""
        });
      });
      if (campos.length) forms.push({ id: form.id || "", action: form.action || "", campos });
    });
    if (!forms.length) {
      const campos = [];
      document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach(el => {
        campos.push({
          tag:         el.tagName.toLowerCase(),
          tipo:        el.type || "",
          nombre:      el.name || el.id || "",
          label:       getLabel(el),
          valor:       el.value || "",
          placeholder: el.placeholder || "",
          requerido:   el.required || false,
          aria_label:  el.getAttribute("aria-label") || ""
        });
      });
      if (campos.length) forms.push({ id: "sueltos", action: "", campos });
    }
    return forms;
  }

  function extraerTablas() {
    return [...document.querySelectorAll("table")].map(t => ({
      caption: t.querySelector("caption")?.innerText?.trim() || "",
      headers: [...t.querySelectorAll("th")].map(th => th.innerText.trim()).filter(Boolean),
      filas:   [...t.querySelectorAll("tbody tr")].slice(0, 30).map(tr =>
        [...tr.querySelectorAll("td")].map(td => td.innerText.trim())
      ).filter(f => f.some(Boolean))
    })).filter(t => t.headers.length || t.filas.length);
  }

  function extraerTextos() {
    return [...document.querySelectorAll("h1,h2,h3,h4,p,span[class*='price'],span[class*='precio'],span[class*='name'],div[class*='description']")]
      .map(el => ({
        tag:   el.tagName,
        clase: el.className?.toString?.().slice(0, 60) || "",
        texto: el.innerText?.trim().slice(0, 200) || ""
      }))
      .filter(x => x.texto.length > 2)
      .slice(0, 100);
  }

  function extraerListas() {
    return [...document.querySelectorAll("ul, ol")].map(ul => ({
      tipo:  ul.tagName,
      items: [...ul.querySelectorAll("li")].map(li => li.innerText?.trim().slice(0, 150)).filter(Boolean)
    })).filter(l => l.items.length > 0).slice(0, 20);
  }

  function extraerLinks() {
    return [...document.querySelectorAll("a[href]")]
      .map(a => ({ texto: a.innerText?.trim().slice(0, 80), href: a.href }))
      .filter(l => l.texto.length > 1)
      .slice(0, 50);
  }

  function extraerImagenes() {
    return [...document.querySelectorAll("img[src], img[data-src]")]
      .map(img => ({ alt: img.alt?.slice(0, 80), src: (img.src || img.dataset.src || "").slice(0, 200) }))
      .filter(i => i.src)
      .slice(0, 30);
  }

  function getLabel(el) {
    if (el.id) {
      const lbl = document.querySelector(`label[for="${el.id}"]`);
      if (lbl) return lbl.innerText.trim();
    }
    return el.placeholder || el.getAttribute("aria-label") || el.name || el.id || "";
  }

})();