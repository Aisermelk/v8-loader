/*!
 * V8 LOADER v4.2 — conecta landing pages, sites, catálogos e lojas virtuais ao V8 Admin Universal.
 * Preserva os recursos v4 + catálogo comercial, carrinho, entrega e checkout de pedidos.
 *
 * USO MÍNIMO (antes de </body>):
 *   <script src="js/v8-loader.js" data-project-id="ID_DO_PROJETO"></script>
 *
 * Também aceita data-v8-project / data-project-id no <html> ou <body>.
 * Opcional no <script>: data-api-url="https://outro-worker..." (ou data-api),
 * data-style="off" (não injeta o CSS do catálogo/avaliações),
 * data-v8-scripts="off" (NÃO injeta scripts.head/body/footer; por padrão injeta).
 *
 * COMPATÍVEL COM O LOADER ANTIGO: campo vazio some (display:none); <a data-v8>
 * só troca o href (texto do botão fica); <iframe data-v8-video hidden> recebe
 * o src; galeria usa .v8-gallery-item; <form data-v8-form> com Formspree
 * envia nativamente e copia o lead pro painel.
 *
 * TEXTO / LINKS
 *   data-v8="contact.whatsapp"      texto do campo; em <a> define o href (wa.me/mailto/tel/URL)
 *   data-v8-text="true"             (em <a>) troca também o texto do link pelo valor
 *   data-v8-href="social.instagram" define href
 *   data-v8-src="seo.ogImage"       define src
 *   data-v8-attr="content:seo.title" define qualquer atributo
 *   data-v8-show="contact.email"    esconde o elemento se o campo estiver vazio
 *   Caminhos: contact.* social.* content.* location.* seo.* media.* name siteUrl ...
 *
 * MÍDIA
 *   <div data-v8-gallery></div>      galeria (media.galleryImages)
 *   <div data-v8-video></div>        vídeo YouTube/Vimeo/mp4 (media.video)
 *   <div data-v8-maps-embed></div>   mapa (location.embed ou mapsUrl)
 *   <div data-v8-reviews></div>      avaliações do Google (data-limit="3")
 *
 * FORMULÁRIO → LEADS
 *   <form data-v8-form> com campos name, email, phone, message.
 *   Com Formspree no painel: envio nativo + cópia do lead (como antes).
 *   Sem Formspree (ou data-v8-ajax="true"): envia por AJAX e mostra mensagem.
 *   Eventos: v8:lead-sent / v8:lead-error. Atributos: data-success="Texto".
 *
 * CATÁLOGO (categorias, subcategorias e tags)
 *   <div data-v8-catalog></div>
 *   data-filters="true"        abas de categoria/subcategoria + filtro por tag
 *   data-category="Nome|id"    limita a uma categoria (inclui subcategorias)
 *   data-tag="Nome|id"  data-type="service"  data-featured="true"  data-limit="6"
 *   data-cta="whatsapp"        botão que abre o WhatsApp com o nome do item
 *   data-cta-label="Pedir orçamento"
 *
 * CONTA DO COMPRADOR (login no próprio site — ativar "Área do cliente" no projeto, no painel)
 *   <a href="#" data-v8-account>Entrar</a>   abre login; logado vira "Olá, Nome" e abre a conta
 *     data-label-in="Minha conta"  data-label-out="Entrar"  data-v8-keep-label (não mexe no texto)
 *     data-v8-view="register"      abre direto em outra tela (login | register | forgot | account)
 *   <button data-v8-logout>Sair</button>        aparece só logado
 *   <li data-v8-auth-show="in"> / ="out"       mostra só logado / só deslogado
 *   Opções no <script>: data-v8-account="float" (botão flutuante) | "off" (desliga),
 *     data-v8-accent="#c026d3" (cor), data-v8-theme="dark", data-v8-account-style="off".
 *   Tema do site: defina --v8-accent e --v8-radius no CSS da página.
 *   Links dos e-mails (confirmar e-mail / redefinir senha) abrem o modal certo sozinhos.
 *   JS: V8.account.open(view) .close() .logout() .isLoggedIn() .user() .token() .onChange(fn)
 *   Eventos: v8:login / v8:logout (detail = usuário)
 *
 * LOJA VIRTUAL (v4.2): <div data-v8-store></div> cria vitrine, carrinho e checkout.
 * Alternativa: <div data-v8-cart></div> mostra apenas o carrinho.
 * JS: window.V8 = { ready, config, catalog, field(path), formatMoney(n), reload(), delivery, store }
 * ENTREGA: V8.delivery.config() / .options() / .calculateShipping(weightKg, destinationState)
 * O servidor continua sendo a fonte definitiva de cálculo e validação no checkout.
 *     evento document "v8:ready" e "v8:catalog".
 */
(function () {
  "use strict";
  if (window.V8 && window.V8.version && Number(String(window.V8.version).split(".")[1] || 0) >= 2 && Number(String(window.V8.version).split(".")[0] || 0) >= 4) return;

  var DEFAULT_API = "https://v8adminuniversal.aisermelk.workers.dev";
  var script = document.currentScript || document.querySelector("script[src*='v8-loader']");
  var root = document.documentElement, body = document.body;

  function attr(el, name) { return el && el.getAttribute ? (el.getAttribute(name) || "").trim() : ""; }
  var PROJECT_ID = attr(script, "data-project-id") || attr(script, "data-v8-project") ||
    attr(root, "data-project-id") || attr(root, "data-v8-project") ||
    attr(body, "data-project-id") || attr(body, "data-v8-project") ||
    ((document.querySelector("[data-project-id]") || {}).getAttribute ? attr(document.querySelector("[data-project-id]"), "data-project-id") : "");
  var API = (attr(script, "data-api-url") || attr(script, "data-api") || DEFAULT_API).replace(/\/+$/, "");
  var STYLE_ON = attr(script, "data-style") !== "off";
  var SCRIPTS_ON = ["off", "false"].indexOf(attr(script, "data-v8-scripts")) < 0;

  var state = { config: null, catalog: null, reviews: null, cart: [] };
  var STORE_KEY = "v8:cart:" + PROJECT_ID;
  try { state.cart = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); if (!Array.isArray(state.cart)) state.cart = []; } catch (e) { state.cart = []; }

  /* ---------- utilidades ---------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function get(obj, path) {
    return String(path || "").split(".").reduce(function (o, k) { return o != null ? o[k] : undefined; }, obj);
  }
  function field(path) { return get(state.config || {}, path); }
  function deliveryConfig() {
    var ec = (state.config && state.config.ecommerce) || {};
    return {
      storeEnabled: !!ec.enabled,
      shippingEnabled: ec.shippingEnabled !== false,
      originState: String(ec.originState || ""),
      shipping: Array.isArray(ec.shipping) ? ec.shipping.slice() : [],
      localDelivery: ec.localDelivery && typeof ec.localDelivery === "object" ? {
        enabled: !!ec.localDelivery.enabled,
        regions: Array.isArray(ec.localDelivery.regions) ? ec.localDelivery.regions.slice() : []
      } : { enabled: false, regions: [] },
      pickup: { enabled: !!(ec.pickup && ec.pickup.enabled) }
    };
  }
  function deliveryOptions() {
    var d = deliveryConfig();
    if (!d.storeEnabled) return [];
    var out = [];
    if (d.shippingEnabled && d.shipping.length) out.push({ id: "shipping", label: "Frete", enabled: true });
    if (d.localDelivery.enabled && d.localDelivery.regions.length) out.push({ id: "local", label: "Entrega local", enabled: true, regions: d.localDelivery.regions });
    if (d.pickup.enabled) out.push({ id: "pickup", label: "Retirada no local", enabled: true, fee: 0 });
    return out;
  }
  function calculateShipping(weightKg, destinationState) {
    var d = deliveryConfig(), weight = Math.max(0, Number(weightKg) || 0), uf = String(destinationState || "").trim().toUpperCase();
    if (!d.storeEnabled) return { success: false, error: "A loja está desativada." };
    if (!d.shippingEnabled) return { success: false, error: "O frete está desativado nesta loja." };
    if (!uf || !d.originState) return { success: false, error: "Informe o estado de origem e destino." };
    var rates = d.shipping.slice().sort(function (a, b) { return Number(a.maxWeight || 0) - Number(b.maxWeight || 0); });
    var rate = rates.find(function (r) { return Number(r.maxWeight || 0) >= weight; }) || rates[rates.length - 1];
    if (!rate) return { success: false, error: "Não há faixa de frete configurada para esse peso." };
    var fee = Number(uf === d.originState ? rate.sameState : rate.otherState) || 0;
    return { success: true, method: "shipping", carrier: rate.carrier || "correios", fee: Math.max(0, Math.round(fee * 100) / 100), originState: d.originState, destinationState: uf, maxWeight: Number(rate.maxWeight || 0) };
  }
  function qsa(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function formatMoney(n) {
    return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function digits(v) { return String(v || "").replace(/\D/g, ""); }
  function safeUrl(u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^(https?:|mailto:|tel:|\/|\.\/|\.\.\/|#)/i.test(u)) return u;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(u)) return "https://" + u;
    return "";
  }
  function waLink(number, text) {
    var d = digits(number);
    if (!d) return "";
    if (d.length <= 11) d = "55" + d;
    return "https://wa.me/" + d + (text ? "?text=" + encodeURIComponent(text) : "");
  }
  function request(path, options) {
    return fetch(API + path, options).then(function (r) {
      return r.json().catch(function () { return { success: false, error: "Erro " + r.status }; });
    });
  }
  function unwrapProject(data) {
    if (!data) return null;
    if (data.project && typeof data.project === "object") return data.project;
    if (data.data && data.data.project) return data.data.project;
    return data.id ? data : null;
  }
  function fire(name, detail) {
    try { document.dispatchEvent(new CustomEvent(name, { detail: detail })); } catch (e) {}
  }
  function injectStyle() {
    if (!STYLE_ON || document.getElementById("v8-loader-style")) return;
    var css = ".v8-reviews{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}.v8-review{border:1px solid rgba(128,128,128,.3);border-radius:12px;padding:16px}.v8-stars{color:#f5a623}" +
      ".v8-filters{display:flex;gap:8px;flex-wrap:wrap;margin:0 0 12px}.v8-filters button{border:1px solid rgba(128,128,128,.4);background:transparent;color:inherit;padding:7px 14px;border-radius:999px;cursor:pointer;font:inherit}.v8-filters button.active{background:currentColor}.v8-filters button.active span{color:#fff;mix-blend-mode:difference}" +
      ".v8-catalog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px}.v8-card{border:1px solid rgba(128,128,128,.3);border-radius:14px;overflow:hidden;display:flex;flex-direction:column}.v8-card-media{aspect-ratio:4/3;background:rgba(128,128,128,.12);display:grid;place-items:center}.v8-card-media img{width:100%;height:100%;object-fit:cover}" +
      ".v8-card-body{padding:14px;display:flex;flex-direction:column;gap:6px;flex:1}.v8-card-body h3{margin:0;font-size:1.05em}.v8-card-body p{margin:0;opacity:.75;font-size:.92em}.v8-price{font-weight:700}.v8-badge{font-size:.72em;padding:2px 8px;border-radius:999px;border:1px solid currentColor;margin-right:4px}.v8-tags{display:flex;gap:6px;flex-wrap:wrap}.v8-tag{font-size:.78em;opacity:.7}.v8-cta{margin-top:auto;display:inline-block;text-align:center;padding:10px 14px;border-radius:10px;border:1px solid currentColor;text-decoration:none;color:inherit}" +
      ".v8-form-msg{margin-top:10px;font-size:.92em}" +
      ".v8-store{display:grid;gap:22px}.v8-store-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}.v8-store-card{border:1px solid rgba(128,128,128,.3);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;min-width:0}.v8-store-card img{width:100%;aspect-ratio:4/3;object-fit:cover;background:rgba(128,128,128,.1)}.v8-store-card-body{padding:14px;display:flex;flex-direction:column;gap:8px;flex:1}.v8-store-card h3{margin:0;font-size:1.02em}.v8-store-card p{margin:0;opacity:.75;font-size:.92em}.v8-store-btn{font:inherit;cursor:pointer;border:1px solid currentColor;border-radius:9px;padding:10px 12px;background:transparent;color:inherit}.v8-store-btn-primary{background:var(--v8-accent,#2563eb);border-color:var(--v8-accent,#2563eb);color:#fff}.v8-store-panel{border:1px solid rgba(128,128,128,.3);border-radius:14px;padding:16px;min-width:0}.v8-store-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid rgba(128,128,128,.18)}.v8-store-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v8-store-fields label{display:grid;gap:5px;font-size:.9em}.v8-store-fields input,.v8-store-fields select,.v8-store-fields textarea{width:100%;min-width:0;box-sizing:border-box;padding:10px;border:1px solid rgba(128,128,128,.35);border-radius:8px;background:transparent;color:inherit;font:inherit}.v8-store-total{font-size:1.08em;font-weight:750}.v8-store-msg{margin:10px 0;padding:10px;border-radius:8px;background:rgba(128,128,128,.12)}.v8-store-qty{width:58px;padding:6px;border:1px solid rgba(128,128,128,.35);border-radius:7px;background:transparent;color:inherit}.v8-store-muted{opacity:.72;font-size:.9em}@media(max-width:600px){.v8-store-fields{grid-template-columns:1fr}.v8-store-panel{padding:12px}.v8-store-row{align-items:flex-start}}";
    var st = document.createElement("style"); st.id = "v8-loader-style"; st.textContent = css; document.head.appendChild(st);
  }

  /* ---------- config: texto, links, SEO, tracking ---------- */
  var SOCIAL_BASE = { instagram: "https://instagram.com/", tiktok: "https://tiktok.com/@", facebook: "https://facebook.com/" };
  function toHref(path, value) {
    var v = String(value || "").trim();
    if (!v) return "";
    if (/(^|\.)whatsapp$/.test(path)) return waLink(v);
    if (/(^|\.)email$/.test(path)) return "mailto:" + v;
    if (/(^|\.)phone$/.test(path)) return "tel:" + digits(v);
    var net = path.indexOf("social.") === 0 ? path.slice(7) : "";
    if (net && SOCIAL_BASE[net] && !/^(https?:)?\/\//i.test(v)) {
      if (/^(www\.|m\.)?(instagram|tiktok|facebook|fb)\.[a-z.]+\//i.test(v)) return "https://" + v;
      if (v.indexOf("/") < 0) return SOCIAL_BASE[net] + v.replace(/^@/, ""); // só o @usuario
    }
    return safeUrl(v);
  }
  function bindFields(cfg) {
    qsa("[data-v8]").forEach(function (el) {
      var path = attr(el, "data-v8"), val = get(cfg, path);
      // Igual ao loader antigo: campo vazio no painel some da tela.
      if (val == null || val === "" || val === false) { el.style.display = "none"; return; }
      if (typeof val === "object") return;
      el.style.display = el.style.display === "none" ? "" : el.style.display;
      if (el.tagName === "A") {
        var href = toHref(path, val); if (href) el.setAttribute("href", href);
        // O texto do link é preservado (ex.: "Falar no WhatsApp"). Use data-v8-text="true" para trocar pelo valor.
        if (attr(el, "data-v8-text") === "true") el.textContent = String(val);
      } else if (el.tagName === "IMG") {
        el.setAttribute("src", safeUrl(val));
      } else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.value = String(val);
      } else {
        el.textContent = String(val);
      }
    });
    qsa("[data-v8-href]").forEach(function (el) {
      var p = attr(el, "data-v8-href"), h = toHref(p, get(cfg, p)); if (h) el.setAttribute("href", h);
    });
    qsa("[data-v8-src]").forEach(function (el) {
      var u = safeUrl(get(cfg, attr(el, "data-v8-src"))); if (u) el.setAttribute("src", u);
    });
    qsa("[data-v8-attr]").forEach(function (el) {
      attr(el, "data-v8-attr").split(",").forEach(function (pair) {
        var i = pair.indexOf(":"); if (i < 1) return;
        var a = pair.slice(0, i).trim(), p = pair.slice(i + 1).trim(), v = get(cfg, p);
        if (v != null && v !== "" && typeof v !== "object" && !/^on/i.test(a)) el.setAttribute(a, String(v));
      });
    });
    qsa("[data-v8-show]").forEach(function (el) {
      var v = get(cfg, attr(el, "data-v8-show")), empty = v == null || v === "" || v === false || (Array.isArray(v) && !v.length);
      if (empty) el.hidden = true; else el.hidden = false;
    });
  }
  function setMeta(selector, create, value) {
    if (!value) return;
    var el = document.head.querySelector(selector);
    if (!el) { el = document.createElement(create.tag); Object.keys(create.attrs).forEach(function (k) { el.setAttribute(k, create.attrs[k]); }); document.head.appendChild(el); }
    el.setAttribute(create.valueAttr, value);
  }
  function applySeo(cfg) {
    var seo = cfg.seo || {};
    if (seo.title) document.title = seo.title;
    setMeta('meta[name="description"]', { tag: "meta", attrs: { name: "description" }, valueAttr: "content" }, seo.description);
    setMeta('meta[name="keywords"]', { tag: "meta", attrs: { name: "keywords" }, valueAttr: "content" }, seo.keywords);
    setMeta('meta[name="robots"]', { tag: "meta", attrs: { name: "robots" }, valueAttr: "content" }, seo.robots);
    setMeta('meta[property="og:title"]', { tag: "meta", attrs: { property: "og:title" }, valueAttr: "content" }, seo.title);
    setMeta('meta[property="og:description"]', { tag: "meta", attrs: { property: "og:description" }, valueAttr: "content" }, seo.description);
    setMeta('meta[property="og:image"]', { tag: "meta", attrs: { property: "og:image" }, valueAttr: "content" }, safeUrl(seo.ogImage));
    setMeta('link[rel="canonical"]', { tag: "link", attrs: { rel: "canonical" }, valueAttr: "href" }, safeUrl(seo.canonical));
  }
  function addScriptSrc(src, id) {
    if (id && document.getElementById(id)) return;
    var s = document.createElement("script"); s.async = true; s.src = src; if (id) s.id = id; document.head.appendChild(s);
  }
  function addInline(code, id) {
    if (id && document.getElementById(id)) return;
    var s = document.createElement("script"); if (id) s.id = id; s.text = code; document.head.appendChild(s);
  }
  function findId(value, regex) {
    var v = String(value || "").trim(), m = v.match(regex);
    if (m) return m[0];
    return v && !/[\s<>"']/.test(v) ? v : ""; // valor simples (já é o ID): usa como está
  }
  function applyTracking(cfg) {
    var t = cfg.tracking || {};
    var gtm = findId(t.tag, /GTM-[A-Z0-9]+/i);
    if (gtm) {
      addInline("(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','" + gtm.toUpperCase() + "');", "v8-gtm");
    }
    var ga = findId(t.analytics, /\b(G-[A-Z0-9]{4,}|UA-\d+-\d+)\b/i);
    if (ga) {
      addScriptSrc("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga), "v8-ga");
      addInline("window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','" + ga + "');", "v8-ga-init");
    }
    var px = findId(t.pixel, /\b\d{10,20}\b/);
    if (px) {
      addInline("!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','" + px + "');fbq('track','PageView');", "v8-pixel");
    }
  }
  function applyCustomScripts(cfg) {
    if (!SCRIPTS_ON) return;
    var sc = cfg.scripts || {};
    [["head", document.head], ["body", document.body], ["footer", document.body]].forEach(function (pair) {
      var code = sc[pair[0]]; if (!code) return;
      var tpl = document.createElement("template"); tpl.innerHTML = code;
      Array.prototype.slice.call(tpl.content.childNodes).forEach(function (node) {
        if (node.nodeName === "SCRIPT") {
          var s = document.createElement("script");
          Array.prototype.slice.call(node.attributes).forEach(function (a) { s.setAttribute(a.name, a.value); });
          s.text = node.textContent; pair[1].appendChild(s);
        } else pair[1].appendChild(node);
      });
    });
  }

  /* ---------- mídia ---------- */
  function renderGallery(cfg) {
    var imgs = (cfg.media && cfg.media.galleryEnabled !== false && Array.isArray(cfg.media.galleryImages)) ? cfg.media.galleryImages : [];
    qsa("[data-v8-gallery]").forEach(function (el) {
      var urls = imgs.map(function (i) { return safeUrl(typeof i === "string" ? i : (i && (i.url || i.src))); }).filter(Boolean);
      if (!urls.length) { el.style.display = "none"; return; }
      el.hidden = false; el.style.display = "";
      el.innerHTML = urls.map(function (u, i) { return '<img class="v8-gallery-item" src="' + esc(u) + '" alt="' + esc((cfg.name || "Imagem") + " " + (i + 1)) + '" loading="lazy">'; }).join("");
    });
  }
  function videoSrc(url) {
    url = safeUrl(url); if (!url) return "";
    var yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/i);
    if (yt) return "https://www.youtube.com/embed/" + yt[1];
    var vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    if (vm) return "https://player.vimeo.com/video/" + vm[1];
    return url;
  }
  function renderVideo(cfg) {
    qsa("[data-v8-video]").forEach(function (el) {
      var m = cfg.media || {}, src = m.videoEnabled !== false && m.video ? videoSrc(m.video) : "";
      if (!src) { el.hidden = true; return; }
      if (el.tagName === "IFRAME") { el.setAttribute("src", src); el.setAttribute("allowfullscreen", ""); if (!el.getAttribute("loading")) el.setAttribute("loading", "lazy"); el.hidden = false; return; }
      if (el.tagName === "VIDEO") { el.setAttribute("src", src); el.hidden = false; return; }
      el.hidden = false;
      el.innerHTML = /\.(mp4|webm|ogg)(\?.*)?$/i.test(src) ? '<video src="' + esc(src) + '" controls playsinline style="width:100%"></video>' : '<iframe src="' + esc(src) + '" title="Vídeo" allowfullscreen loading="lazy" style="width:100%;aspect-ratio:16/9;border:0"></iframe>';
    });
  }
  function mapsSrc(loc) {
    loc = loc || {};
    var raw = String(loc.embed || "").trim(), src = "";
    var m = raw.match(/src=["']([^"']+)["']/i); src = m ? m[1] : (/^https?:/i.test(raw) ? raw : "");
    if (!src && loc.mapsUrl) {
      var u = safeUrl(loc.mapsUrl);
      if (/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(u)) src = "https://www.google.com/maps?q=" + encodeURIComponent(loc.address || u) + "&output=embed";
    }
    if (!src && loc.address) src = "https://www.google.com/maps?q=" + encodeURIComponent(loc.address) + "&output=embed";
    return /^https:\/\//i.test(src) ? src : "";
  }
  function renderMaps(cfg) {
    qsa("[data-v8-maps-embed]").forEach(function (el) {
      var loc = cfg.location || {}, src = loc.enabled === false ? "" : mapsSrc(loc);
      if (!src) { el.style.display = "none"; return; }
      el.hidden = false; el.style.display = "";
      el.innerHTML = '<iframe src="' + esc(src) + '" title="Mapa" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen style="width:100%;min-height:320px;border:0"></iframe>';
    });
  }
  function renderReviews() {
    var boxes = qsa("[data-v8-reviews]"); if (!boxes.length) return Promise.resolve();
    return request("/api/public/reviews/" + encodeURIComponent(PROJECT_ID)).then(function (r) {
      state.reviews = r;
      boxes.forEach(function (el) {
        var list = (r && r.success && r.enabled !== false && r.reviews) || [], limit = parseInt(attr(el, "data-limit"), 10) || list.length;
        if (!list.length) { el.hidden = true; return; }
        el.hidden = false; el.classList.add("v8-reviews");
        el.innerHTML = list.slice(0, limit).map(function (rv) {
          var n = Math.max(0, Math.min(5, Math.round(rv.rating || 0)));
          return '<article class="v8-review"><div class="v8-stars" aria-label="' + n + ' de 5">' + "★".repeat(n) + "☆".repeat(5 - n) + "</div><p>" + esc(rv.text) + "</p><strong>" + esc(rv.author) + "</strong> <small>" + esc(rv.relativeTime) + "</small></article>";
        }).join("");
      });
    }).catch(function () { boxes.forEach(function (el) { el.hidden = true; }); });
  }

  /* ---------- formulário → leads ---------- */
  function leadPayload(form) {
    var fd = new FormData(form);
    var data = {
      name: String(fd.get("name") || fd.get("nome") || "").trim(),
      email: String(fd.get("email") || "").trim(),
      phone: String(fd.get("phone") || fd.get("telefone") || fd.get("whatsapp") || "").trim(),
      message: String(fd.get("message") || fd.get("mensagem") || "").trim()
    };
    var extras = [];
    fd.forEach(function (v, k) {
      if (["name", "nome", "email", "phone", "telefone", "whatsapp", "message", "mensagem", "_gotcha", "_subject", "_next", "_replyto"].indexOf(k) < 0 && typeof v === "string" && v.trim()) extras.push(k + ": " + v.trim());
    });
    if (extras.length) data.message = (data.message ? data.message + "\n\n" : "") + extras.join("\n");
    return { fd: fd, data: data };
  }
  function sendLead(data) {
    return fetch(API + "/api/public/leads/" + encodeURIComponent(PROJECT_ID), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), keepalive: true })
      .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); });
  }
  function bindForms(cfg) {
    var fs = cfg && /^https:\/\/formspree\.io\//i.test(cfg.formspree || "") ? cfg.formspree : "";
    qsa("form[data-v8-form]").forEach(function (form) {
      if (form.__v8) return; form.__v8 = true;
      // Modo Formspree (compatível com o loader antigo): o <form> envia nativamente e o lead é copiado pro painel.
      var native = !!fs && attr(form, "data-v8-ajax") !== "true";
      if (native) { form.setAttribute("action", fs); if (!form.getAttribute("method")) form.setAttribute("method", "POST"); }
      form.addEventListener("submit", function (e) {
        var p = leadPayload(form);
        if (p.fd.get("_gotcha")) { if (!native) e.preventDefault(); return; } // honeypot
        if (native) {
          sendLead(p.data).then(function (r) { fire("v8:lead-sent", { lead: r && r.lead, form: form }); }).catch(function () {});
          if (window.fbq) { try { window.fbq("track", "Lead"); } catch (x) {} }
          return; // sem preventDefault: o navegador segue para o Formspree
        }
        e.preventDefault();
        var btn = form.querySelector('[type="submit"]'), msg = form.querySelector(".v8-form-msg");
        if (!msg) { msg = document.createElement("div"); msg.className = "v8-form-msg"; msg.setAttribute("role", "status"); form.appendChild(msg); }
        if (btn) btn.disabled = true; msg.textContent = "Enviando...";
        sendLead(p.data)
          .then(function (r) {
            if (!r || r.success === false) throw new Error((r && r.error) || "Não foi possível enviar.");
            msg.textContent = attr(form, "data-success") || "Mensagem enviada! Em breve entraremos em contato.";
            form.reset(); fire("v8:lead-sent", { lead: r.lead, form: form });
            if (window.fbq) { try { window.fbq("track", "Lead"); } catch (x) {} }
            if (window.gtag) { try { window.gtag("event", "generate_lead"); } catch (x) {} }
          })
          .catch(function (err) { msg.textContent = err.message || "Erro ao enviar. Tente novamente."; fire("v8:lead-error", { error: err, form: form }); })
          .then(function () { if (btn) btn.disabled = false; });
      });
    });
  }

  /* ---------- catálogo ---------- */
  function catById(id) { return (state.catalog.categories || []).filter(function (c) { return c.id === id; })[0]; }
  function catKids(id) { return (state.catalog.categories || []).filter(function (c) { return c.parentId === id; }); }
  function resolveCat(v) {
    if (!v) return "";
    var low = v.toLowerCase();
    var c = (state.catalog.categories || []).filter(function (x) { return x.id === v || x.name.toLowerCase() === low; })[0];
    return c ? c.id : "__none__";
  }
  function resolveTag(v) {
    if (!v) return "";
    var low = v.toLowerCase();
    var t = (state.catalog.tags || []).filter(function (x) { return x.id === v || x.name.toLowerCase() === low; })[0];
    return t ? t.id : "__none__";
  }
  function catPath(id) { var c = catById(id); if (!c) return ""; var p = c.parentId ? catById(c.parentId) : null; return p ? p.name + " › " + c.name : c.name; }
  function renderCatalog() {
    var boxes = qsa("[data-v8-catalog]"); if (!boxes.length || !state.catalog) return;
    boxes.forEach(function (el) {
      var ui = el.__v8ui = el.__v8ui || { cat: "", sub: "", tag: "" };
      var baseCat = resolveCat(attr(el, "data-category")), baseTag = resolveTag(attr(el, "data-tag"));
      var type = attr(el, "data-type"), featured = attr(el, "data-featured") === "true", limit = parseInt(attr(el, "data-limit"), 10) || 0;
      var filters = attr(el, "data-filters") === "true", cta = attr(el, "data-cta"), ctaLabel = attr(el, "data-cta-label") || "Pedir orçamento";
      var activeCat = ui.sub || ui.cat || baseCat;
      var ids = null;
      if (activeCat) { ids = {}; ids[activeCat] = 1; catKids(activeCat).forEach(function (k) { ids[k.id] = 1; }); }
      var list = (state.catalog.products || []).filter(function (p) {
        return (!ids || ids[p.categoryId]) && (!(ui.tag || baseTag) || (p.tags || []).indexOf(ui.tag || baseTag) >= 0) && (!type || p.itemType === type) && (!featured || p.featured);
      });
      if (limit) list = list.slice(0, limit);
      var html = "";
      if (filters) {
        var roots = (state.catalog.categories || []).filter(function (c) { return !c.parentId && (!baseCat || c.id === baseCat || catKids(baseCat).some(function (k) { return k.id === c.id; })); });
        if (baseCat && catById(baseCat) && !catById(baseCat).parentId) roots = [];
        var btn = function (label, on, kind, id) { return '<button type="button" class="' + (on ? "active" : "") + '" data-v8-f="' + kind + '" data-id="' + esc(id) + '"><span>' + esc(label) + "</span></button>"; };
        var top = baseCat ? catKids(baseCat) : roots;
        if (top.length) {
          html += '<div class="v8-filters">' + btn("Todas", !(ui.cat || ui.sub), "cat", "") + top.map(function (c) { return btn(c.name, ui.cat === c.id, "cat", c.id); }).join("") + "</div>";
          var kids = ui.cat && !baseCat ? catKids(ui.cat) : [];
          if (kids.length) html += '<div class="v8-filters">' + btn("Todas", !ui.sub, "sub", "") + kids.map(function (c) { return btn(c.name, ui.sub === c.id, "sub", c.id); }).join("") + "</div>";
        }
        if ((state.catalog.tags || []).length) {
          html += '<div class="v8-filters">' + btn("Todas as tags", !ui.tag, "tag", "") + state.catalog.tags.map(function (t) { return btn("#" + t.name, ui.tag === t.id, "tag", t.id); }).join("") + "</div>";
        }
      }
      html += list.length ? '<div class="v8-catalog-grid">' + list.map(function (p) {
        var tags = (p.tags || []).map(function (id) { return (state.catalog.tags || []).filter(function (t) { return t.id === id; })[0]; }).filter(Boolean);
        var price = p.price == null ? "Sob consulta" : formatMoney(p.price);
        var link = cta === "whatsapp" ? waLink(field("contact.whatsapp"), "Olá! Tenho interesse em: " + p.name) : "";
        return '<article class="v8-card" data-id="' + esc(p.id) + '"><div class="v8-card-media">' + (p.image ? '<img src="' + esc(safeUrl(p.image)) + '" alt="' + esc(p.name) + '" loading="lazy">' : "") + '</div><div class="v8-card-body">' +
          ((p.featured || p.promotion) ? "<div>" + (p.featured ? '<span class="v8-badge">Destaque</span>' : "") + (p.promotion ? '<span class="v8-badge">Promoção</span>' : "") + "</div>" : "") +
          "<h3>" + esc(p.name) + "</h3>" + (catPath(p.categoryId) ? '<small class="v8-path">' + esc(catPath(p.categoryId)) + "</small>" : "") +
          (p.description ? "<p>" + esc(p.description) + "</p>" : "") +
          (tags.length ? '<div class="v8-tags">' + tags.map(function (t) { return '<span class="v8-tag">#' + esc(t.name) + "</span>"; }).join("") + "</div>" : "") +
          '<div class="v8-price">' + esc(price) + "</div>" + (link ? '<a class="v8-cta" href="' + esc(link) + '" target="_blank" rel="noopener">' + esc(ctaLabel) + "</a>" : "") + "</div></article>";
      }).join("") + "</div>" : '<p class="v8-empty">Nenhum item encontrado.</p>';
      el.innerHTML = html;
      if (filters && !el.__v8bound) {
        el.__v8bound = true;
        el.addEventListener("click", function (e) {
          var b = e.target.closest ? e.target.closest("[data-v8-f]") : null; if (!b) return;
          var kind = b.getAttribute("data-v8-f"), id = b.getAttribute("data-id");
          if (kind === "cat") { ui.cat = id; ui.sub = ""; } else if (kind === "sub") ui.sub = id; else ui.tag = id;
          renderCatalog();
        });
      }
    });
  }
  function loadCatalog() {
    if (!qsa("[data-v8-catalog]").length && !qsa("[data-v8-store]").length && !qsa("[data-v8-cart]").length) return Promise.resolve();
    return request("/api/public/catalog/" + encodeURIComponent(PROJECT_ID)).then(function (r) {
      if (!r || r.success === false) throw new Error((r && r.error) || "catálogo indisponível");
      state.catalog = { products: r.products || [], categories: r.categories || [], tags: r.tags || [] };
      window.V8.catalog = state.catalog; renderCatalog(); renderStore(); fire("v8:catalog", state.catalog);
    }).catch(function (err) {
      console.warn("[V8] Catálogo:", err.message); qsa("[data-v8-catalog]").forEach(function (el) { el.hidden = true; });
    });
  }


  /* ---------- LOJA VIRTUAL: vitrine, carrinho, entrega e checkout ---------- */
  function saveCart() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.cart)); } catch (e) {}
    fire("v8:cart", cartSummary());
  }
  function storeEnabled() { return !!(state.config && state.config.ecommerce && state.config.ecommerce.enabled); }
  function cartItems() {
    var products = state.catalog && state.catalog.products || [];
    return state.cart.map(function (line) {
      var p = products.filter(function (x) { return x.id === line.id; })[0];
      if (!p) return null;
      var qty = Math.max(1, Math.min(99, parseInt(line.quantity, 10) || 1));
      return { id: p.id, name: p.name, price: Number(p.price) || 0, quantity: qty, weight: Math.max(0, Number(p.weight) || 0), image: p.image || p.cover || "", soldOut: !!p.soldOut, item: p, lineTotal: Math.round((Number(p.price) || 0) * qty * 100) / 100 };
    }).filter(Boolean);
  }
  function cartSummary() {
    var items = cartItems(), subtotal = items.reduce(function (sum, x) { return sum + x.lineTotal; }, 0), weight = items.reduce(function (sum, x) { return sum + x.weight * x.quantity; }, 0);
    return { items: items, count: items.reduce(function (sum, x) { return sum + x.quantity; }, 0), subtotal: Math.round(subtotal * 100) / 100, weight: Math.round(weight * 1000) / 1000 };
  }
  function cartAdd(id) {
    var p = (state.catalog && state.catalog.products || []).filter(function (x) { return x.id === id; })[0];
    if (!p || p.soldOut || p.price == null || Number(p.price) < 0) return;
    var row = state.cart.filter(function (x) { return x.id === id; })[0];
    if (row) row.quantity = Math.min(99, (parseInt(row.quantity, 10) || 1) + 1); else state.cart.push({ id: id, quantity: 1 });
    saveCart(); renderStore();
  }
  function cartSetQty(id, value) {
    var q = parseInt(value, 10);
    if (!Number.isFinite(q) || q < 1) state.cart = state.cart.filter(function (x) { return x.id !== id; });
    else state.cart.forEach(function (x) { if (x.id === id) x.quantity = Math.min(99, q); });
    saveCart(); renderStore();
  }
  function currentDeliveryFee(method, regionId, destinationState) {
    if (method === "pickup") return { success: true, fee: 0, label: "Retirada no local" };
    if (method === "local") {
      var d = deliveryConfig(), r = d.localDelivery.regions.filter(function (x) { return x.id === regionId && x.enabled !== false; })[0];
      return r && d.localDelivery.enabled ? { success: true, fee: Math.max(0, Number(r.fee) || 0), label: "Entrega local — " + r.name } : { success: false, error: "Selecione uma região de entrega válida." };
    }
    if (method === "shipping") {
      var ship = calculateShipping(cartSummary().weight, destinationState);
      if (!ship.success) return ship;
      return { success: true, fee: ship.fee, label: "Frete estimado — " + String(destinationState || "").toUpperCase() };
    }
    return { success: false, error: "Selecione uma modalidade de recebimento." };
  }
  function storeCard(p) {
    var image = safeUrl(p.cover || p.image || ""), price = p.price == null ? "Sob consulta" : formatMoney(p.price);
    var canBuy = p.price != null && Number(p.price) >= 0 && !p.soldOut;
    return '<article class="v8-store-card">' + (image ? '<img src="' + esc(image) + '" alt="' + esc(p.name) + '" loading="lazy">' : '<div class="v8-card-media"></div>') +
      '<div class="v8-store-card-body"><h3>' + esc(p.name) + '</h3>' + (p.shortDescription || p.description ? '<p>' + esc(p.shortDescription || p.description) + '</p>' : '') + '<div class="v8-price">' + esc(price) + '</div>' +
      (p.soldOut ? '<span class="v8-store-muted">Indisponível</span>' : canBuy ? '<button class="v8-store-btn v8-store-btn-primary" type="button" data-v8-store-add="' + esc(p.id) + '">Adicionar ao carrinho</button>' : '<span class="v8-store-muted">Consulte disponibilidade</span>') + '</div></article>';
  }
  function storeCartMarkup() {
    var summary = cartSummary(), options = deliveryOptions(), html = '<section class="v8-store-panel"><h2 style="margin-top:0">Seu carrinho <small class="v8-store-muted">(' + summary.count + ' item(ns))</small></h2>';
    if (!summary.items.length) return html + '<p class="v8-store-muted">Seu carrinho está vazio.</p></section>';
    html += summary.items.map(function (x) { return '<div class="v8-store-row"><div style="display:flex;gap:10px;align-items:center;min-width:0">' + (x.image ? '<img src="' + esc(safeUrl(x.image)) + '" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:8px">' : '') + '<div><strong>' + esc(x.name) + '</strong><div class="v8-store-muted">' + formatMoney(x.price) + ' cada</div></div></div><div style="display:flex;align-items:center;gap:8px"><input class="v8-store-qty" aria-label="Quantidade de ' + esc(x.name) + '" type="number" min="0" max="99" value="' + x.quantity + '" data-v8-store-qty="' + esc(x.id) + '"><strong>' + formatMoney(x.lineTotal) + '</strong><button type="button" class="v8-store-btn" data-v8-store-remove="' + esc(x.id) + '" aria-label="Remover">×</button></div></div>'; }).join("");
    html += '<div class="v8-store-row"><span>Subtotal</span><strong>' + formatMoney(summary.subtotal) + '</strong></div>';
    if (!options.length) html += '<p class="v8-store-msg">A loja está ativa, mas não há modalidade de entrega ou retirada habilitada. Entre em contato com a loja.</p>';
    else {
      html += '<h3>Como deseja receber?</h3><div class="v8-store-fields"><label>Modalidade<select data-v8-store-method><option value="">Selecione</option>' + options.map(function (o) { return '<option value="' + esc(o.id) + '">' + esc(o.label) + '</option>'; }).join("") + '</select></label><label data-v8-store-state-wrap hidden>Estado de destino<select data-v8-store-state><option value="">Selecione o estado</option>' + ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(function (uf) { return '<option value="' + uf + '">' + uf + '</option>'; }).join("") + '</select></label><label data-v8-store-region-wrap hidden>Região de entrega<select data-v8-store-region><option value="">Selecione a região</option>' + deliveryConfig().localDelivery.regions.filter(function (r) { return r.enabled !== false; }).map(function (r) { return '<option value="' + esc(r.id) + '">' + esc(r.name) + ' — ' + formatMoney(r.fee) + '</option>'; }).join("") + '</select></label></div>';
      html += '<div class="v8-store-row"><span>Entrega</span><strong data-v8-store-fee>Selecione uma modalidade</strong></div>';
      html += '<h3>Seus dados</h3><form data-v8-store-checkout><div class="v8-store-fields"><label>Nome completo<input name="name" required maxlength="160" autocomplete="name"></label><label>Telefone/WhatsApp<input name="phone" required maxlength="40" autocomplete="tel"></label><label>E-mail (opcional)<input name="email" type="email" maxlength="180" autocomplete="email"></label><label>Endereço (opcional)<input name="address" maxlength="500" autocomplete="street-address"></label><label style="grid-column:1/-1">Observações<textarea name="notes" rows="2" maxlength="1000"></textarea></label></div><div class="v8-store-row"><span>Total</span><strong class="v8-store-total" data-v8-store-total>' + formatMoney(summary.subtotal) + '</strong></div><div data-v8-store-message role="status" aria-live="polite"></div>';
      var pay = (state.config && state.config.payments) || {}, mp = pay.mercadoPago && pay.mercadoPago.enabled, ip = pay.infinitePay && pay.infinitePay.enabled;
      html += '<button type="submit" class="v8-store-btn v8-store-btn-primary" style="width:100%;margin-top:12px" data-v8-store-submit>Finalizar pedido' + (mp || ip ? ' e pagar' : '') + '</button></form>';
    }
    return html + '</section>';
  }
  function renderStore() {
    var boxes = qsa("[data-v8-store]");
    boxes.forEach(function (el) {
      if (!storeEnabled()) { el.innerHTML = '<p class="v8-store-msg">A loja virtual está desativada para este projeto.</p>'; return; }
      var products = state.catalog && state.catalog.products || [];
      var filtered = products.filter(function (p) { return p.price != null || attr(el, "data-show-consultation") === "true"; });
      var limit = parseInt(attr(el, "data-limit"), 10) || 0; if (limit) filtered = filtered.slice(0, limit);
      el.classList.add("v8-store");
      el.innerHTML = '<div class="v8-store-grid">' + (filtered.length ? filtered.map(storeCard).join("") : '<p class="v8-store-msg">Nenhum produto disponível.</p>') + '</div>' + storeCartMarkup();
      bindStoreEvents(el);
    });
    qsa("[data-v8-cart]").forEach(function (el) { el.innerHTML = storeEnabled() ? storeCartMarkup() : '<p class="v8-store-msg">A loja virtual está desativada.</p>'; bindStoreEvents(el); });
  }
  function updateStoreTotals(el) {
    var method = el.querySelector("[data-v8-store-method]"), region = el.querySelector("[data-v8-store-region]"), uf = el.querySelector("[data-v8-store-state]"), feeEl = el.querySelector("[data-v8-store-fee]"), totalEl = el.querySelector("[data-v8-store-total]"), stateWrap = el.querySelector("[data-v8-store-state-wrap]"), regionWrap = el.querySelector("[data-v8-store-region-wrap]");
    if (!method) return;
    var m = method.value;
    if (stateWrap) stateWrap.hidden = m !== "shipping";
    if (regionWrap) regionWrap.hidden = m !== "local";
    var calc = currentDeliveryFee(m, region && region.value, uf && uf.value);
    if (feeEl) feeEl.textContent = calc.success ? formatMoney(calc.fee) : (m ? calc.error : "Selecione uma modalidade");
    if (totalEl) totalEl.textContent = formatMoney(cartSummary().subtotal + (calc.success ? calc.fee : 0));
  }
  function bindStoreEvents(el) {
    if (el.__v8StoreBound) return; el.__v8StoreBound = true;
    el.addEventListener("click", function (e) {
      var add = e.target.closest && e.target.closest("[data-v8-store-add]"), rem = e.target.closest && e.target.closest("[data-v8-store-remove]");
      if (add) { cartAdd(add.getAttribute("data-v8-store-add")); }
      else if (rem) { cartSetQty(rem.getAttribute("data-v8-store-remove"), 0); }
    });
    el.addEventListener("change", function (e) {
      var qty = e.target.closest && e.target.closest("[data-v8-store-qty]");
      if (qty) { cartSetQty(qty.getAttribute("data-v8-store-qty"), qty.value); return; }
      if (e.target.matches("[data-v8-store-method],[data-v8-store-region],[data-v8-store-state]")) updateStoreTotals(el);
    });
    el.addEventListener("submit", function (e) {
      var form = e.target.closest && e.target.closest("[data-v8-store-checkout]"); if (!form) return;
      e.preventDefault(); submitStoreOrder(el, form);
    });
  }
  function submitStoreOrder(el, form) {
    var summary = cartSummary(), methodEl = el.querySelector("[data-v8-store-method]"), regionEl = el.querySelector("[data-v8-store-region]"), stateEl = el.querySelector("[data-v8-store-state]"), method = methodEl && methodEl.value;
    var delivery = currentDeliveryFee(method, regionEl && regionEl.value, stateEl && stateEl.value), msg = el.querySelector("[data-v8-store-message]"), btn = el.querySelector("[data-v8-store-submit]");
    function message(t) { if (msg) msg.innerHTML = '<p class="v8-store-msg">' + esc(t) + '</p>'; }
    if (!summary.items.length) { message("Seu carrinho está vazio."); return; }
    if (!delivery.success) { message(delivery.error || "Selecione uma modalidade de recebimento válida."); return; }
    if (!form.reportValidity()) return;
    var fd = new FormData(form), payload = { name: fd.get("name"), phone: fd.get("phone"), email: fd.get("email"), address: fd.get("address"), notes: fd.get("notes"), items: summary.items.map(function (x) { return { id: x.id, quantity: x.quantity }; }), deliveryMethod: method, regionId: method === "local" ? regionEl.value : "", destinationState: method === "shipping" ? stateEl.value : "" };
    if (btn) { btn.disabled = true; btn.textContent = "Registrando pedido…"; }
    request("/api/public/orders/" + encodeURIComponent(PROJECT_ID), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then(function (orderRes) {
      if (!orderRes || !orderRes.success || !orderRes.order) throw new Error(orderRes && orderRes.error || "Não foi possível registrar o pedido.");
      var pay = (state.config && state.config.payments) || {}, providers = [];
      if (pay.mercadoPago && pay.mercadoPago.enabled) providers.push("mercadopago");
      if (pay.infinitePay && pay.infinitePay.enabled) providers.push("infinitepay");
      if (!providers.length) {
        state.cart = []; saveCart(); renderStore();
        var success = document.createElement("p"); success.className = "v8-store-msg"; success.textContent = "Pedido " + (orderRes.order.orderNumber || "") + " registrado com sucesso. A loja entrará em contato para confirmar o pagamento."; el.insertBefore(success, el.firstChild);
        fire("v8:order-created", orderRes.order); return;
      }
      var provider = providers[0];
      return request("/api/public/orders/" + encodeURIComponent(PROJECT_ID) + "/" + encodeURIComponent(orderRes.order.id) + "/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: provider, redirectUrl: location.href }) }).then(function (checkout) {
        if (!checkout || !checkout.success || !checkout.url) throw new Error(checkout && checkout.error || "Pedido registrado, mas não foi possível abrir o pagamento.");
        state.cart = []; saveCart();
        fire("v8:order-created", orderRes.order); location.href = checkout.url;
      });
    }).catch(function (err) { message(err.message || "Erro ao finalizar o pedido."); }).finally(function () { if (btn && document.contains(btn)) { btn.disabled = false; btn.textContent = "Finalizar pedido"; } });
  }
  function buildStoreApi() { return { enabled: storeEnabled, cart: cartSummary, add: cartAdd, setQuantity: cartSetQty, clear: function () { state.cart = []; saveCart(); renderStore(); }, render: renderStore }; }

  /* ---------- CONTA DO COMPRADOR (login no próprio site) ---------- */
  var ACCOUNT_MODE = attr(script, "data-v8-account"); // "off" | "float" | "" (usa os gatilhos da página)
  var ACCOUNT_STYLE_ON = attr(script, "data-v8-account-style") !== "off";
  var ACCENT = attr(script, "data-v8-accent");
  var THEME = attr(script, "data-v8-theme"); // "dark" | "light"(padrão)
  var SESSION_KEY = "v8:session:" + PROJECT_ID;
  var acct = { enabled: false, user: null, token: "", expiresAt: 0, listeners: [], modal: null, view: "login", pending: null, floatBtn: null };

  function aStoreGet() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch (e) { return null; } }
  function aStoreSet(v) { try { if (v) localStorage.setItem(SESSION_KEY, JSON.stringify(v)); else localStorage.removeItem(SESSION_KEY); } catch (e) {} }
  function aNotify(kind) {
    acct.listeners.forEach(function (fn) { try { fn(acct.user); } catch (e) {} });
    fire(kind, acct.user); paintAccountTriggers();
  }
  function aSetSession(res) {
    acct.token = res.token; acct.user = res.user || null; acct.expiresAt = res.expiresAt || (Date.now() + 864e5);
    aStoreSet({ token: acct.token, user: acct.user, expiresAt: acct.expiresAt });
    aNotify("v8:login");
  }
  function aClear(silent) {
    var was = !!acct.token; acct.token = ""; acct.user = null; acct.expiresAt = 0; aStoreSet(null);
    if (was && !silent) aNotify("v8:logout"); else paintAccountTriggers();
  }
  function aCall(action, method, body, auth) {
    var headers = { "Content-Type": "application/json" };
    if (auth && acct.token) headers.Authorization = "Bearer " + acct.token;
    return request("/api/public/customers/" + encodeURIComponent(PROJECT_ID) + "/" + action, {
      method: method, headers: headers, body: body ? JSON.stringify(body) : undefined
    }).then(function (res) {
      if (auth && res && res.success === false && /sess[ãa]o/i.test(res.error || "")) { aClear(); }
      return res || { success: false, error: "Sem resposta do servidor." };
    }, function () { return { success: false, error: "Falha de conexão. Tente novamente." }; });
  }

  function injectAccountStyle() {
    if (!ACCOUNT_STYLE_ON || document.getElementById("v8-account-style")) return;
    var dark = THEME === "dark";
    var css =
      ".v8a-overlay{position:fixed;inset:0;z-index:2147483000;background:rgba(10,12,16,.55);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;font-family:inherit}" +
      ".v8a-overlay[hidden]{display:none}" +
      ".v8a{--a:" + (ACCENT || "var(--v8-accent,#2563eb)") + ";--bg:" + (dark ? "#16181d" : "#fff") + ";--fg:" + (dark ? "#f2f3f5" : "#14161a") + ";--mut:" + (dark ? "#9a9ea8" : "#6a6f7a") + ";--bd:" + (dark ? "#2b2e36" : "#e3e5ea") + ";--in:" + (dark ? "#0f1115" : "#fff") + ";" +
      "width:100%;max-width:400px;max-height:92vh;overflow:auto;background:var(--bg);color:var(--fg);border:1px solid var(--bd);border-radius:var(--v8-radius,16px);box-shadow:0 24px 64px rgba(0,0,0,.35);padding:26px 24px 22px;position:relative;box-sizing:border-box;line-height:1.5;font-size:15px}" +
      ".v8a *{box-sizing:border-box;font-family:inherit}" +
      ".v8a h2{margin:0 0 4px;font-size:1.3em;font-weight:650;letter-spacing:-.01em;color:var(--fg)}" +
      ".v8a p.v8a-sub{margin:0 0 18px;color:var(--mut);font-size:.92em}" +
      ".v8a-x{position:absolute;top:12px;right:12px;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--mut);cursor:pointer;font-size:20px;line-height:1}.v8a-x:hover{background:rgba(128,128,128,.14);color:var(--fg)}" +
      ".v8a label{display:block;margin:0 0 12px;font-size:.84em;font-weight:500;color:var(--mut)}" +
      ".v8a input{display:block;width:100%;margin-top:5px;height:42px;padding:0 12px;border:1px solid var(--bd);border-radius:10px;background:var(--in);color:var(--fg);font-size:1em}" +
      ".v8a input:focus{outline:none;border-color:var(--a);box-shadow:0 0 0 3px color-mix(in srgb,var(--a) 22%,transparent)}" +
      ".v8a input[readonly]{opacity:.65}" +
      ".v8a-btn{display:flex;align-items:center;justify-content:center;width:100%;height:44px;margin-top:6px;border:0;border-radius:10px;background:var(--a);color:#fff;font-size:1em;font-weight:600;cursor:pointer}.v8a-btn:hover{filter:brightness(1.08)}.v8a-btn[disabled]{opacity:.6;cursor:wait}" +
      ".v8a-btn.ghost{background:transparent;color:var(--fg);border:1px solid var(--bd);font-weight:500}" +
      ".v8a-links{display:flex;justify-content:space-between;gap:10px;margin-top:14px;font-size:.88em;flex-wrap:wrap}" +
      ".v8a-link{background:none;border:0;padding:0;color:var(--a);cursor:pointer;font-size:inherit}.v8a-link:hover{text-decoration:underline}" +
      ".v8a-msg{margin:0 0 14px;padding:10px 12px;border-radius:10px;font-size:.9em;display:none}.v8a-msg.on{display:block}.v8a-msg.err{background:rgba(220,53,69,.12);color:#d6364a}.v8a-msg.ok{background:rgba(25,135,84,.13);color:#1f8f5f}" +
      ".v8a-tabs{display:flex;gap:2px;margin:0 -4px 16px;border-bottom:1px solid var(--bd)}.v8a-tabs button{flex:1;background:none;border:0;border-bottom:2px solid transparent;margin-bottom:-1px;padding:9px 6px;color:var(--mut);font-size:.9em;font-weight:500;cursor:pointer}.v8a-tabs button.on{color:var(--fg);border-bottom-color:var(--a)}" +
      ".v8a-order{display:flex;justify-content:space-between;gap:12px;padding:12px 0;border-bottom:1px solid var(--bd);font-size:.92em}.v8a-order:last-child{border-bottom:0}.v8a-order small{display:block;color:var(--mut)}" +
      ".v8a-badge{display:inline-block;margin-top:3px;padding:1px 8px;border-radius:999px;font-size:.78em;border:1px solid var(--bd);color:var(--mut)}.v8a-badge.paid{color:#1f8f5f;border-color:currentColor}" +
      ".v8a-empty{padding:22px 0;text-align:center;color:var(--mut);font-size:.92em}" +
      ".v8a-float{position:fixed;right:18px;bottom:18px;z-index:2147482000;height:44px;padding:0 18px;border:0;border-radius:999px;background:" + (ACCENT || "var(--v8-accent,#2563eb)") + ";color:#fff;font:inherit;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.28)}";
    var st = document.createElement("style"); st.id = "v8-account-style"; st.textContent = css; document.head.appendChild(st);
  }

  function fe(form, n) { return form.elements[n]; }
  function aFirstName() { var n = (acct.user && acct.user.name) || ""; return n.split(" ")[0] || "Minha conta"; }
  function paintAccountTriggers() {
    var inn = !!acct.token;
    qsa("[data-v8-account],[data-v8-login],[data-v8-account-open]").forEach(function (el) {
      if (!acct.enabled) { el.style.display = "none"; return; }
      if (el.__v8orig == null) el.__v8orig = el.textContent;
      if (el.hasAttribute("data-v8-keep-label")) return;
      el.textContent = inn ? (attr(el, "data-label-in") || "Olá, " + aFirstName()) : (attr(el, "data-label-out") || el.__v8orig);
    });
    qsa("[data-v8-auth-show]").forEach(function (el) {
      var want = attr(el, "data-v8-auth-show"), show = acct.enabled && ((want === "in") === inn);
      if (!acct.enabled) show = false; el.style.display = show ? "" : "none";
    });
    qsa("[data-v8-logout]").forEach(function (el) { el.style.display = (acct.enabled && inn) ? "" : "none"; });
    if (acct.floatBtn) acct.floatBtn.textContent = inn ? "Olá, " + aFirstName() : "Entrar";
  }

  function aModal() {
    if (acct.modal) return acct.modal;
    var ov = document.createElement("div");
    ov.className = "v8a-overlay"; ov.hidden = true;
    ov.innerHTML = '<div class="v8a" role="dialog" aria-modal="true" aria-live="polite"><button type="button" class="v8a-x" aria-label="Fechar">&times;</button><div class="v8a-body"></div></div>';
    ov.addEventListener("mousedown", function (e) { if (e.target === ov) aClose(); });
    ov.querySelector(".v8a-x").addEventListener("click", aClose);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !ov.hidden) aClose(); });
    document.body.appendChild(ov); acct.modal = ov; return ov;
  }
  function aClose() { if (acct.modal) acct.modal.hidden = true; document.documentElement.style.overflow = ""; }
  function aBody() { return aModal().querySelector(".v8a-body"); }
  function aMsg(text, kind) {
    var m = aBody().querySelector(".v8a-msg"); if (!m) return;
    m.className = "v8a-msg" + (text ? " on " + (kind || "err") : ""); m.textContent = text || "";
  }
  function aBusy(btn, on, label) { if (!btn) return; btn.disabled = !!on; if (label) btn.textContent = on ? "Aguarde…" : label; }
  function aSiteName() { return (state.config && state.config.name) || ""; }

  function aOpen(view, opts) {
    if (!acct.enabled) return;
    injectAccountStyle();
    var ov = aModal(); ov.hidden = false; document.documentElement.style.overflow = "hidden";
    acct.pending = (opts && opts.token) ? opts : null;
    if (!view) view = acct.token ? "account" : "login";
    if (view === "account" && !acct.token) view = "login";
    aRender(view, opts);
  }

  function aRender(view, opts) {
    acct.view = view; var b = aBody(), site = esc(aSiteName());
    var msgBox = '<div class="v8a-msg" role="alert"></div>';
    var f;
    if (view === "login") {
      b.innerHTML = "<h2>Entrar</h2><p class='v8a-sub'>" + (site ? "Acesse sua conta em " + site + "." : "Acesse sua conta.") + "</p>" + msgBox +
        '<form novalidate><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Senha<input name="password" type="password" autocomplete="current-password" required></label><button class="v8a-btn" type="submit">Entrar</button></form>' +
        '<div class="v8a-links"><button type="button" class="v8a-link" data-go="forgot">Esqueci minha senha</button><button type="button" class="v8a-link" data-go="register">Criar conta</button></div>';
      f = b.querySelector("form");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var btn = f.querySelector("button"); aBusy(btn, true, "Entrar"); aMsg("");
        aCall("login", "POST", { email: fe(f, "email").value.trim(), password: fe(f, "password").value }).then(function (res) {
          aBusy(btn, false, "Entrar");
          if (!res.success) return aMsg(res.error || "Não foi possível entrar.");
          aSetSession(res); aRender("account");
        });
      });
    } else if (view === "register") {
      b.innerHTML = "<h2>Criar conta</h2><p class='v8a-sub'>Você receberá um e-mail para confirmar o cadastro e criar sua senha.</p>" + msgBox +
        '<form novalidate><label>Nome<input name="name" autocomplete="name" required></label><label>E-mail<input name="email" type="email" autocomplete="email" required></label><label>Telefone (opcional)<input name="phone" type="tel" autocomplete="tel"></label><button class="v8a-btn" type="submit">Criar conta</button></form>' +
        '<div class="v8a-links"><span></span><button type="button" class="v8a-link" data-go="login">Já tenho conta</button></div>';
      f = b.querySelector("form");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var btn = f.querySelector("button"); aBusy(btn, true, "Criar conta"); aMsg("");
        aCall("register", "POST", { name: fe(f, "name").value.trim(), email: fe(f, "email").value.trim(), phone: fe(f, "phone").value.trim() }).then(function (res) {
          aBusy(btn, false, "Criar conta");
          if (!res.success) return aMsg(res.error || "Não foi possível criar a conta.");
          aRender("sent", { message: res.message });
        });
      });
    } else if (view === "forgot") {
      b.innerHTML = "<h2>Recuperar senha</h2><p class='v8a-sub'>Informe seu e-mail e enviaremos um link para criar uma nova senha.</p>" + msgBox +
        '<form novalidate><label>E-mail<input name="email" type="email" autocomplete="email" required></label><button class="v8a-btn" type="submit">Enviar link</button></form>' +
        '<div class="v8a-links"><span></span><button type="button" class="v8a-link" data-go="login">Voltar ao login</button></div>';
      f = b.querySelector("form");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var btn = f.querySelector("button"); aBusy(btn, true, "Enviar link"); aMsg("");
        aCall("forgot", "POST", { email: fe(f, "email").value.trim() }).then(function (res) {
          aBusy(btn, false, "Enviar link");
          if (res.success === false) return aMsg(res.error || "Não foi possível enviar agora.");
          aRender("sent", { message: res.message });
        });
      });
    } else if (view === "sent") {
      b.innerHTML = "<h2>Verifique seu e-mail</h2><p class='v8a-sub'>" + esc((opts && opts.message) || "Enviamos as instruções para o seu e-mail. Confira também a caixa de spam.") + "</p>" +
        '<button class="v8a-btn ghost" type="button" data-go="login">Voltar ao login</button>';
    } else if (view === "setpw") {
      var isVerify = acct.pending && acct.pending.kind === "verify";
      b.innerHTML = "<h2>" + (isVerify ? "Confirme e crie sua senha" : "Criar nova senha") + "</h2><p class='v8a-sub'>Escolha uma senha com pelo menos 8 caracteres.</p>" + msgBox +
        '<form novalidate><label>Nova senha<input name="password" type="password" autocomplete="new-password" minlength="8" required></label><label>Repita a senha<input name="again" type="password" autocomplete="new-password" required></label><button class="v8a-btn" type="submit">Salvar senha</button></form>';
      f = b.querySelector("form");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); aMsg("");
        if (fe(f, "password").value.length < 8) return aMsg("A senha deve ter pelo menos 8 caracteres.");
        if (fe(f, "password").value !== fe(f, "again").value) return aMsg("As senhas não conferem.");
        var btn = f.querySelector("button"); aBusy(btn, true, "Salvar senha");
        aCall("reset", "POST", { token: acct.pending && acct.pending.token, password: fe(f, "password").value }).then(function (res) {
          aBusy(btn, false, "Salvar senha");
          if (!res.success) return aMsg(res.error || "Link inválido ou expirado.");
          acct.pending = null; aSetSession(res); aRender("account", { welcome: true });
        });
      });
    } else if (view === "account") {
      var tab = (opts && opts.tab) || "data", name = esc((acct.user && acct.user.name) || "");
      b.innerHTML = "<h2>" + ((opts && opts.welcome) ? "Conta ativada!" : "Olá, " + esc(aFirstName())) + "</h2><p class='v8a-sub'>" + esc((acct.user && acct.user.email) || "") + "</p>" +
        '<div class="v8a-tabs"><button type="button" data-tab="data" class="' + (tab === "data" ? "on" : "") + '">Meus dados</button><button type="button" data-tab="orders" class="' + (tab === "orders" ? "on" : "") + '">Pedidos</button><button type="button" data-tab="pw" class="' + (tab === "pw" ? "on" : "") + '">Senha</button></div>' +
        msgBox + '<div class="v8a-pane"></div><button type="button" class="v8a-btn ghost" data-logout style="margin-top:14px">Sair</button>';
      aAccountPane(tab);
    }

    Array.prototype.slice.call(b.querySelectorAll("[data-go]")).forEach(function (el) { el.addEventListener("click", function () { aRender(el.getAttribute("data-go")); }); });
    var lo = b.querySelector("[data-logout]"); if (lo) lo.addEventListener("click", function () { aLogout(); aClose(); });
    Array.prototype.slice.call(b.querySelectorAll(".v8a-tabs [data-tab]")).forEach(function (el) { el.addEventListener("click", function () { aRender("account", { tab: el.getAttribute("data-tab") }); }); });
    var first = b.querySelector("input"); if (first && !first.readOnly) setTimeout(function () { try { first.focus(); } catch (e) {} }, 30);
  }

  function aAccountPane(tab) {
    var pane = aBody().querySelector(".v8a-pane"), u = acct.user || {}, f;
    if (tab === "data") {
      pane.innerHTML = '<form novalidate><label>Nome<input name="name" value="' + esc(u.name || "") + '" required></label><label>E-mail<input value="' + esc(u.email || "") + '" readonly></label><label>Telefone<input name="phone" type="tel" value="' + esc(u.phone || "") + '"></label><button class="v8a-btn" type="submit">Salvar</button></form>';
      f = pane.querySelector("form");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); var btn = f.querySelector("button"); aBusy(btn, true, "Salvar"); aMsg("");
        aCall("me", "PUT", { name: fe(f, "name").value.trim(), phone: fe(f, "phone").value.trim() }, true).then(function (res) {
          aBusy(btn, false, "Salvar");
          if (!res.success) return aMsg(res.error || "Não foi possível salvar.");
          acct.user = res.customer || acct.user; aStoreSet({ token: acct.token, user: acct.user, expiresAt: acct.expiresAt }); paintAccountTriggers(); aMsg("Dados atualizados.", "ok");
        });
      });
    } else if (tab === "pw") {
      pane.innerHTML = '<form novalidate><label>Senha atual<input name="cur" type="password" autocomplete="current-password" required></label><label>Nova senha<input name="next" type="password" autocomplete="new-password" minlength="8" required></label><button class="v8a-btn" type="submit">Alterar senha</button></form>';
      f = pane.querySelector("form");
      f.addEventListener("submit", function (e) {
        e.preventDefault(); aMsg("");
        if (fe(f, "next").value.length < 8) return aMsg("A nova senha deve ter pelo menos 8 caracteres.");
        var btn = f.querySelector("button"); aBusy(btn, true, "Alterar senha");
        aCall("password", "POST", { currentPassword: fe(f, "cur").value, newPassword: fe(f, "next").value }, true).then(function (res) {
          aBusy(btn, false, "Alterar senha");
          if (!res.success) return aMsg(res.error || "Não foi possível alterar a senha.");
          f.reset(); aMsg(res.message || "Senha alterada com sucesso.", "ok");
        });
      });
    } else {
      pane.innerHTML = '<div class="v8a-empty">Carregando pedidos…</div>';
      aCall("orders", "GET", null, true).then(function (res) {
        if (!res.success) { pane.innerHTML = ""; return aMsg(res.error || "Não foi possível carregar os pedidos."); }
        var list = res.orders || [];
        if (!list.length) { pane.innerHTML = '<div class="v8a-empty">Você ainda não tem pedidos.</div>'; return; }
        var L = { paid: "Pago", approved: "Pago", pending: "Pendente", cancelled: "Cancelado", canceled: "Cancelado", failed: "Falhou", refunded: "Reembolsado" };
        pane.innerHTML = list.map(function (o) {
          var d = o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : "", st = String(o.status || "pending").toLowerCase();
          return '<div class="v8a-order"><div><strong>' + esc(o.description || "Pedido") + "</strong><small>" + esc(d) + '</small><span class="v8a-badge ' + (L[st] === "Pago" ? "paid" : "") + '">' + esc(L[st] || o.status) + "</span></div><div><strong>" + esc(formatMoney(o.amount)) + "</strong></div></div>";
        }).join("");
      });
    }
  }

  function aLogout() { aClear(); }

  function cleanAccountParams() {
    try {
      var u = new URL(location.href), had = false;
      ["v8_verify", "v8_reset", "v8_account"].forEach(function (k) { if (u.searchParams.has(k)) { u.searchParams.delete(k); had = true; } });
      if (had) history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    } catch (e) {}
  }

  function initAccount(cfg) {
    var area = cfg && cfg.customerArea;
    acct.enabled = ACCOUNT_MODE !== "off" && !!(area && area.enabled);
    if (!acct.enabled) { paintAccountTriggers(); return; }
    injectAccountStyle();

    if (!acct.__bound) {
      acct.__bound = true;
      document.addEventListener("click", function (e) {
        var t = e.target.closest ? e.target.closest("[data-v8-account],[data-v8-login],[data-v8-account-open],[data-v8-logout]") : null;
        if (!t) return;
        e.preventDefault();
        if (t.hasAttribute("data-v8-logout")) { aLogout(); return; }
        var v = attr(t, "data-v8-view"); aOpen(v || (acct.token ? "account" : "login"));
      });
    }

    var s = aStoreGet();
    if (s && s.token && s.expiresAt > Date.now()) {
      acct.token = s.token; acct.user = s.user; acct.expiresAt = s.expiresAt;
      aCall("me", "GET", null, true).then(function (res) {
        if (res && res.success && res.customer) { acct.user = res.customer; aStoreSet({ token: acct.token, user: acct.user, expiresAt: acct.expiresAt }); }
        paintAccountTriggers();
      });
    } else aStoreSet(null);

    if (ACCOUNT_MODE === "float" && !acct.floatBtn) {
      var fb = document.createElement("button"); fb.type = "button"; fb.className = "v8a-float"; fb.textContent = "Entrar";
      fb.addEventListener("click", function () { aOpen(); }); document.body.appendChild(fb); acct.floatBtn = fb;
    }
    paintAccountTriggers();

    // Links dos e-mails: ?v8_verify=TOKEN (confirmar e-mail) | ?v8_reset=TOKEN (nova senha) | ?v8_account=login
    try {
      var q = new URL(location.href).searchParams, tv = q.get("v8_verify"), tr = q.get("v8_reset"), ta = q.get("v8_account");
      if (tv || tr) { aOpen("setpw", { token: tv || tr, kind: tv ? "verify" : "reset" }); cleanAccountParams(); }
      else if (ta) { aOpen(ta === "login" ? "login" : ta); cleanAccountParams(); }
    } catch (e) {}
  }

  function buildAccountApi() {
    return {
      open: function (view) { aOpen(view); },
      close: aClose,
      logout: aLogout,
      isLoggedIn: function () { return !!acct.token; },
      user: function () { return acct.user; },
      token: function () { return acct.token; },
      onChange: function (fn) { if (typeof fn === "function") acct.listeners.push(fn); }
    };
  }

  /* ---------- inicialização ---------- */
  function applyAll(cfg) {
    state.config = cfg; window.V8.config = cfg;
    bindFields(cfg); applySeo(cfg); applyTracking(cfg); applyCustomScripts(cfg);
    renderGallery(cfg); renderVideo(cfg); renderMaps(cfg); bindForms(cfg);
    initAccount(cfg);
    if (state.catalog) renderCatalog();
    renderStore();
  }
  function init() {
    if (!PROJECT_ID) { console.warn("[V8] Informe data-project-id no <script> do v8-loader."); return Promise.resolve(null); }
    injectStyle();
    return request("/api/public/config/" + encodeURIComponent(PROJECT_ID)).then(function (data) {
      var cfg = unwrapProject(data);
      if (!cfg) throw new Error((data && data.error) || "Projeto não encontrado.");
      applyAll(cfg);
      return Promise.all([loadCatalog(), renderReviews()]).then(function () { fire("v8:ready", cfg); return cfg; });
    }).catch(function (err) { console.warn("[V8] Falha ao carregar o projeto:", err.message); return null; });
  }

  window.V8 = { __v3: true, __v4: true, version: "4.2", account: buildAccountApi(), projectId: PROJECT_ID, api: API, config: null, catalog: null, field: field, formatMoney: formatMoney, delivery: { config: deliveryConfig, options: deliveryOptions, calculateShipping: calculateShipping }, store: buildStoreApi(), reload: function () { return init(); } };
  window.V8.ready = new Promise(function (resolve) {
    function go() { init().then(resolve); }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
  });
})();
