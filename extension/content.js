// ============================================================
//  Always on Shelf — Content Script
//  Agarra TODO el DOM, lo convierte a JSON y lo loguea
//  en consola + manda al backend via background.js
// ============================================================

(function () {
  if (window.__AOS__) return;
  window.__AOS__ = true;

  // ── Botón flotante ────────────────────────────────────────

  const fab = document.createElement("div");
  fab.id = "aos-fab";
  fab.title = "Always on Shelf";
  fab.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M2 17l10 5 10-5" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M2 12l10 5 10-5" stroke="white" stroke-width="1.8" stroke-linejoin="round"/>
  </svg>`;
  document.body.appendChild(fab);
  fab.addEventListener("click", () => panel.classList.toggle("aos-open"));

  // ── Panel lateral ─────────────────────────────────────────

  const panel = document.createElement("div");
  panel.id = "aos-panel";
  panel.innerHTML = `
    <div class="aos-header">
      <div class="aos-header-left">
        <div class="aos-logo-mark"></div>
        <span class="aos-title">Always on Shelf</span>
      </div>
      <button class="aos-x" id="aos-close">✕</button>
    </div>
    <div class="aos-badge" id="aos-badge">LISTO</div>
    <div class="aos-block">
      <div class="aos-url" id="aos-url"></div>
      <button class="aos-btn aos-capture" id="aos-capture">
        <span>📋</span> Capturar página → Consola + Backend
      </button>
      <button class="aos-btn aos-reset" id="aos-reset">
        <span>🔄</span> Limpiar log
      </button>
    </div>
    <div class="aos-block">
      <div class="aos-label">Log</div>
      <div id="aos-log"></div>
    </div>
  `;
  document.body.appendChild(panel);
  document.getElementById("aos-url").textContent = window.location.hostname;

  // ── Eventos ───────────────────────────────────────────────

  document.getElementById("aos-close").onclick  = () => panel.classList.remove("aos-open");
  document.getElementById("aos-capture").onclick = capturarYEnviar;
  document.getElementById("aos-reset").onclick   = () => {
    document.getElementById("aos-log").innerHTML = "";
  };

  // ── NÚCLEO ────────────────────────────────────────────────

  function capturarYEnviar() {
    log("⏳ Extrayendo DOM completo...");

    const payload = {
  ...extraerTodo(),
  texto: document.body.innerText.slice(0, 8000)
};

    // ✅ LOG COMPLETO EN CONSOLA DEL NAVEGADOR
    console.group("🛒 [AoS] Captura de página");
    console.log("URL:", payload.meta.url);
    console.log("Título:", payload.meta.titulo);
    console.log("Productos encontrados:", payload.productos.length);
    console.log("Formularios encontrados:", payload.formularios.length);
    console.log("Tablas encontradas:", payload.tablas.length);
    console.log("Textos encontrados:", payload.textos.length);
    console.log("Listas encontradas:", payload.listas.length);
    console.log("Links encontrados:", payload.links.length);
    console.log("--- PAYLOAD COMPLETO ---");
    console.log(JSON.stringify(payload, null, 2));
    console.groupEnd();

    log(`📦 ${payload.productos.length} productos | ${payload.formularios.length} forms | ${payload.tablas.length} tablas`);
    log("📡 Enviando al backend...");

    chrome.runtime.sendMessage({ type: "FETCH_MAPEAR", payload }, (res) => {
      if (chrome.runtime.lastError) {
        log(`❌ ${chrome.runtime.lastError.message}`);
        return;
      }
      if (res?.ok) {
        console.log("🤖 [AoS] Respuesta de Claude:", res.data);
        log("✅ Claude respondió — ver consola");
      } else {
        log(`❌ Error backend: ${res?.error}`);
      }
    });
  }

  // ── Extractor completo del DOM ────────────────────────────

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
    const productos = [];
    const vistos = new Set();

    // Selectores retail MX
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
            nombre:      texto.split("\n")[0].trim().slice(0, 150),
            precio:      precioMatch ? precioMatch[0] : null,
            sku:         skuMatch ? skuMatch[0] : null,
            texto_completo: texto.slice(0, 400),
            selector:    sel
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
          tag:          el.tagName.toLowerCase(),
          tipo:         el.type || "",
          nombre:       el.name || el.id || "",
          label:        getLabel(el),
          valor:        el.value || el.innerText || "",
          placeholder:  el.placeholder || "",
          requerido:    el.required || false,
          aria_label:   el.getAttribute("aria-label") || ""
        });
      });
      if (campos.length) {
        forms.push({ id: form.id || "", action: form.action || "", campos });
      }
    });

    // Inputs sueltos fuera de forms
    if (!forms.length) {
      const campos = [];
      document.querySelectorAll("input:not([type=hidden]), select, textarea").forEach(el => {
        campos.push({
          tag:         el.tagName.toLowerCase(),
          tipo:        el.type || "",
          nombre:      el.name || el.id || "",
          label:       getLabel(el),
          valor:       el.value || "",
          placeholder: el.placeholder || ""
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
      .map(el => ({ tag: el.tagName, clase: el.className?.toString?.().slice(0, 60) || "", texto: el.innerText?.trim().slice(0, 200) || "" }))
      .filter(x => x.texto.length > 2)
      .slice(0, 100);
  }

  function extraerListas() {
    return [...document.querySelectorAll("ul, ol")].map(ul => ({
      tipo: ul.tagName,
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

  function log(msg) {
    const el = document.getElementById("aos-log");
    if (!el) return;
    const row = document.createElement("div");
    row.className = "aos-log-row";
    row.innerHTML = `<span class="aos-time">${new Date().toLocaleTimeString()}</span> ${msg}`;
    el.prepend(row);
    while (el.children.length > 30) el.lastChild.remove();
  }

})();
