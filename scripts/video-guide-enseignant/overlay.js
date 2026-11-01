/* Couche visuelle injectée dans chaque page : curseur animé, onde de clic, projecteur (halo + assombrissement), infobulles,
   bandeau et zoom de caméra. Tout est piloté depuis capture.mjs via window.__kv. Aucune dépendance. */
(() => {
  if (window.__kv) return;
  const VERT = '#D7F26B';
  const css = `
  #kv-cursor{position:fixed;left:0;top:0;width:34px;height:34px;z-index:2147483647;pointer-events:none;will-change:transform;
    filter:drop-shadow(0 3px 5px rgba(0,0,0,.4));transition:scale .12s cubic-bezier(.34,1.56,.64,1)}
  #kv-cursor.down{scale:.82}
  .kv-ripple{position:fixed;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;border:3px solid ${VERT};
    background:rgba(215,242,107,.35);pointer-events:none;z-index:2147483646;animation:kvRipple .7s ease-out forwards}
  @keyframes kvRipple{from{transform:scale(.4);opacity:1}to{transform:scale(4.2);opacity:0}}
  #kv-spot{position:fixed;border-radius:18px;opacity:0;z-index:2147483000;pointer-events:none;
    transition:left .45s cubic-bezier(.34,1.3,.64,1),top .45s cubic-bezier(.34,1.3,.64,1),width .45s cubic-bezier(.34,1.3,.64,1),
      height .45s cubic-bezier(.34,1.3,.64,1),opacity .35s ease;
    box-shadow:0 0 0 4px ${VERT},0 0 25px rgba(215,242,107,.6),0 0 0 9999px rgba(4,26,21,.52)}
  #kv-spot.on{opacity:1;animation:kvPulse 1.6s ease-in-out infinite}
  @keyframes kvPulse{0%,100%{box-shadow:0 0 0 4px ${VERT},0 0 18px rgba(215,242,107,.45),0 0 0 9999px rgba(4,26,21,.52)}
    50%{box-shadow:0 0 0 6px ${VERT},0 0 38px rgba(215,242,107,.85),0 0 0 9999px rgba(4,26,21,.52)}}
  .kv-tip{position:fixed;display:flex;align-items:center;gap:10px;padding:11px 18px 11px 12px;border-radius:999px;background:#0e4b3c;color:#fff;
    font:800 19px/1.2 'Plus Jakarta Sans',system-ui,sans-serif;white-space:nowrap;border:2.5px solid ${VERT};z-index:2147483200;pointer-events:none;
    box-shadow:0 10px 28px rgba(0,0,0,.4);animation:kvPop .55s cubic-bezier(.34,1.56,.64,1) both}
  .kv-tip.out{animation:kvOut .25s ease-in forwards}
  .kv-tip i{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;background:${VERT};color:#0e4b3c}
  .kv-tip svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
  @keyframes kvPop{from{transform:scale(.3) translateY(14px);opacity:0}to{transform:none;opacity:1}}
  @keyframes kvOut{to{transform:scale(.8);opacity:0}}
  #kv-banner{position:fixed;left:50%;bottom:42px;transform:translate(-50%,30px);opacity:0;padding:16px 34px;border-radius:20px;background:rgba(14,75,60,.96);
    color:#fff;font:800 26px/1.2 'Plus Jakarta Sans',system-ui,sans-serif;border-left:8px solid ${VERT};z-index:2147483300;pointer-events:none;
    transition:all .5s cubic-bezier(.34,1.56,.64,1);box-shadow:0 14px 34px rgba(0,0,0,.4)}
  #kv-banner small{display:block;font-weight:600;font-size:16px;opacity:.85;margin-top:4px}
  #kv-banner.on{transform:translate(-50%,0);opacity:1}
  #kv-end{position:fixed;inset:0;display:grid;place-items:center;opacity:0;transition:opacity .8s ease;z-index:2147483400;pointer-events:none;
    background:radial-gradient(circle at 50% 40%,rgba(18,98,78,.96),rgba(6,38,31,.98));backdrop-filter:blur(8px)}
  #kv-end.on{opacity:1}
  #kv-end .box{display:grid;justify-items:center;gap:20px;text-align:center;color:#fff}
  #kv-end .logo{background:#fff;border-radius:26px;padding:16px 30px;animation:kvPop .9s .2s cubic-bezier(.34,1.56,.64,1) both}
  #kv-end .logo img{height:92px;display:block}
  #kv-end .palou{height:300px;animation:kvPop .9s .5s cubic-bezier(.34,1.56,.64,1) both,kvFloat 2.6s 1.4s ease-in-out infinite}
  @keyframes kvFloat{0%,100%{transform:translateY(0) rotate(-1.5deg)}50%{transform:translateY(-14px) rotate(1.5deg)}}
  #kv-end h1{margin:0;font:800 56px/1.1 'Plus Jakarta Sans',system-ui,sans-serif;animation:kvPop .8s 1s cubic-bezier(.34,1.56,.64,1) both}
  #kv-end h1 b{color:${VERT}}
  #kv-end p{margin:0;font:600 24px/1.3 'Plus Jakarta Sans',system-ui,sans-serif;opacity:.9;animation:kvPop .8s 1.25s cubic-bezier(.34,1.56,.64,1) both}
  .kv-zoom{transition:transform 1.1s cubic-bezier(.4,0,.2,1)}
  html.kv-clip{overflow-x:clip!important}
  `;
  const ICONS = {
    sparkles: '<path d="M12 3l1.8 4.6L18 9.5l-4.2 1.9L12 16l-1.8-4.6L6 9.5l4.2-1.9z"/><path d="M19 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
    alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 010 7M18.5 14.8c1.8.7 2.8 2.4 3 5.2"/>',
    print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
    trophy: '<path d="M8 4h8v6a4 4 0 01-8 0z"/><path d="M8 6H4v2a4 4 0 004 4M16 6h4v2a4 4 0 01-4 4M12 14v4M8 21h8"/>',
    check: '<path d="M4 12.5l5 5L20 6.5"/>',
    book: '<path d="M3 5.5C5 4 8.5 4 12 6c3.5-2 7-2 9-.5V19c-2-1.5-5.5-1.5-9 .5-3.5-2-7-2-9-.5z"/><path d="M12 6v13.5"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2.2 2.2L15.5 10"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
    send: '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
    star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
  };
  const svg = n => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ICONS.sparkles}</svg>`;

  let cur, spot, banner, endcard, zoomed = null, spotEl = null;
  function mount() {
    if (document.getElementById('kv-spot')) return;
    const st = document.createElement('style'); st.textContent = css; document.documentElement.appendChild(st);
    spot = document.createElement('div'); spot.id = 'kv-spot'; document.documentElement.appendChild(spot);
    banner = document.createElement('div'); banner.id = 'kv-banner'; document.documentElement.appendChild(banner);
    cur = document.createElement('div'); cur.id = 'kv-cursor';
    cur.innerHTML = '<svg viewBox="0 0 34 34" width="34" height="34"><path d="M5 3l22 12.5-9.6 2.2 5.6 9.8-4.4 2.5-5.6-9.8L5 25z" fill="#fff" stroke="#10201b" stroke-width="2.2" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cur);
    const p = window.__kvPos || { x: -60, y: -60 };
    cur.style.transform = `translate(${p.x}px,${p.y}px)`;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();

  window.addEventListener('mousemove', e => {
    window.__kvPos = { x: e.clientX, y: e.clientY };
    if (cur) cur.style.transform = `translate(${e.clientX}px,${e.clientY}px)`;
  }, true);
  window.addEventListener('mousedown', e => {
    if (cur) cur.classList.add('down');
    const r = document.createElement('div'); r.className = 'kv-ripple'; r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px';
    document.documentElement.appendChild(r); setTimeout(() => r.remove(), 800);
  }, true);
  window.addEventListener('mouseup', () => { if (cur) cur.classList.remove('down'); }, true);

  window.__kv = {
    cursorTo(x, y) { window.__kvPos = { x, y }; if (cur) cur.style.transform = `translate(${x}px,${y}px)`; },
    /** Projecteur sur un élément : halo pulsant, assombrissement autour, léger zoom de l'élément (rebond). Renvoie le cadre du halo. */
    spot(e, { pad = 10, scale = 1.03, radius = 18 } = {}) {
      mount(); this.unspot(true);
      spotEl = e;
      const r0 = e.getBoundingClientRect();
      const big = r0.width > 700 || r0.height > 420;
      const s = big ? 1 + (scale - 1) * 0.4 : scale;
      e.dataset.kvT = e.style.transform || ''; e.dataset.kvTr = e.style.transition || '';
      e.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)'; e.style.transform = `${e.dataset.kvT} scale(${s})`.trim();
      const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2, w = r0.width * s + pad * 2, h = r0.height * s + pad * 2;
      spot.style.borderRadius = radius + 'px';
      spot.style.left = cx - w / 2 + 'px'; spot.style.top = cy - h / 2 + 'px'; spot.style.width = w + 'px'; spot.style.height = h + 'px';
      spot.classList.add('on');
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    },
    unspot(keepGlow) {
      if (spotEl) { spotEl.style.transform = spotEl.dataset.kvT || ''; const t = spotEl.dataset.kvTr, x = spotEl; setTimeout(() => { x.style.transition = t || ''; }, 600); spotEl = null; }
      if (!keepGlow && spot) spot.classList.remove('on');
    },
    tip(rect, text, icon, side = 'bottom') {
      mount();
      const t = document.createElement('div'); t.className = 'kv-tip'; t.innerHTML = `<i>${svg(icon)}</i><span>${text}</span>`;
      document.documentElement.appendChild(t);
      const w = t.offsetWidth, h = t.offsetHeight, vw = innerWidth, vh = innerHeight, g = 18;
      let x, y;
      if (side === 'top') { x = rect.x + rect.w / 2 - w / 2; y = rect.y - h - g; }
      else if (side === 'right') { x = rect.x + rect.w + g; y = rect.y + rect.h / 2 - h / 2; }
      else if (side === 'left') { x = rect.x - w - g; y = rect.y + rect.h / 2 - h / 2; }
      else if (side === 'inside') { x = rect.x + rect.w / 2 - w / 2; y = rect.y + rect.h - h - 16; }
      else { x = rect.x + rect.w / 2 - w / 2; y = rect.y + rect.h + g; }
      if (side === 'bottom' && y + h > vh - 12) y = rect.y - h - g;
      if (side === 'top' && y < 12) y = rect.y + rect.h + g;
      t.style.left = Math.max(14, Math.min(vw - w - 14, x)) + 'px'; t.style.top = Math.max(12, Math.min(vh - h - 12, y)) + 'px';
    },
    clearTips() { document.querySelectorAll('.kv-tip').forEach(t => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }); },
    banner(html) { mount(); if (!html) { banner.classList.remove('on'); return; } banner.innerHTML = html; banner.classList.add('on'); },
    /** Zoom de caméra doux sur la zone principale (origine = centre de l'élément visé). */
    zoom(e, k = 1.1) {
      const m = document.querySelector('.ec-main'); if (!m) return;
      const mr = m.getBoundingClientRect(), r = e.getBoundingClientRect();
      m.classList.add('kv-zoom'); document.documentElement.classList.add('kv-clip');
      m.style.transformOrigin = `${r.left + r.width / 2 - mr.left}px ${r.top + r.height / 2 - mr.top}px`;
      m.style.transform = `scale(${k})`; zoomed = m;
    },
    unzoom() { if (zoomed) { zoomed.style.transform = ''; const m = zoomed; zoomed = null; setTimeout(() => { m.classList.remove('kv-zoom'); document.documentElement.classList.remove('kv-clip'); }, 1200); } },
    endCard(logoSrc, palouSrc) {
      mount(); endcard = document.createElement('div'); endcard.id = 'kv-end'; document.documentElement.appendChild(endcard);
      endcard.innerHTML = `<div class="box"><div class="logo"><img src="${logoSrc}" alt=""></div><img class="palou" src="${palouSrc}" alt=""><h1>À vous de <b>jouer</b> !</h1><p>Espace Enseignant · kEur IA</p></div>`;
      requestAnimationFrame(() => requestAnimationFrame(() => endcard.classList.add('on')));
    }
  };
})();
