/* CounselBook - UI helpers: escaping, icons, modal, toast, charts, dates */
(function () {
  'use strict';

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- icons (stroke icons, 24x24) ----------
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8"/><path d="M18 14.3c2.1.7 3.5 2.8 3.5 5.7"/>',
    note: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5"/><path d="M8.5 13h7M8.5 17h5"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="7" width="3" height="10" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',
    puzzle: '<path d="M9 4h3.5a1.5 1.5 0 1 1 3 0H19v4.5a1.5 1.5 0 1 1 0 3V16h-3.5a1.5 1.5 0 1 0-3 0H9v-4.5a1.5 1.5 0 1 0 0-3z"/><path d="M5 9v11h11"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.2 7.5 9.5 4.3-1.3 7.5-4.9 7.5-9.5V6z"/><path d="m9 12 2 2 4-4"/>',
    save: '<path d="M5 3h11l3 3v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    print: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
    download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5"/><path d="M4 19h16"/>',
    upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5"/><path d="M4 19h16"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>',
    flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
    archive: '<rect x="3" y="4" width="18" height="4.5" rx="1"/><path d="M5 8.5V20h14V8.5M10 12.5h4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    clip: '<path d="m20 11.5-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4L15 7"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    present: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="m10 8 4 2-4 2z"/>',
    sparkle: '<path d="M12 3c.6 4.5 2.5 6.4 7 7-4.5.6-6.4 2.5-7 7-.6-4.5-2.5-6.4-7-7 4.5-.6 6.4-2.5 7-7z"/><path d="M19 15.5c.2 1.5.9 2.2 2.5 2.5-1.6.3-2.3 1-2.5 2.5-.3-1.5-1-2.2-2.5-2.5 1.5-.3 2.2-1 2.5-2.5z"/>',
    usercog: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20c0-3.6 2.9-6 6.5-6 1.2 0 2.3.3 3.2.7"/><circle cx="18" cy="17" r="2.2"/><path d="M18 13.3v1.5M18 19.2v1.5M14.3 17h1.5M20.2 17h1.5"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.5-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16"/><path d="M20 20v-4h-4"/>',
    logout: '<path d="M10 4H5v16h5"/><path d="M15 8l4 4-4 4M19 12H9"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    phone: '<path d="M5 3.5h3.5l1.5 4.5-2.2 1.4a11 11 0 0 0 6.8 6.8l1.4-2.2 4.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5A16.5 16.5 0 0 1 3.5 5 1.5 1.5 0 0 1 5 3.5z"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    tag: '<path d="M3.5 12.5V4a.5.5 0 0 1 .5-.5h8.5l8 8-9 9z"/><circle cx="8" cy="8" r="1.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.5 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    chevl: '<path d="m15 5-7 7 7 7"/>',
    chevr: '<path d="m9 5 7 7-7 7"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
  };
  const icon = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  // ---------- toast ----------
  function toast(msg, type = 'ok', ms = 2600) {
    let wrap = $('#toasts');
    if (!wrap) { wrap = document.createElement('div'); wrap.id = 'toasts'; document.body.appendChild(wrap); }
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    t.setAttribute('role', 'status');
    t.innerHTML = icon(type === 'err' ? 'x' : type === 'warn' ? 'bell' : 'check') + `<span>${esc(msg)}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, ms);
  }

  // ---------- modal ----------
  const stack = [];
  function openModal({ title, body, footer = '', size = '', onOpen, onClose }) {
    const ov = document.createElement('div');
    ov.className = 'modal-ov';
    ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-h"><h2>${esc(title)}</h2><button class="icon-btn" data-close title="Close (Esc)">${icon('x')}</button></div>
      <div class="modal-b">${body}</div>
      ${footer ? `<div class="modal-f">${footer}</div>` : ''}
    </div>`;
    document.body.appendChild(ov);
    const m = { el: ov, onClose };
    stack.push(m);
    ov.addEventListener('mousedown', (e) => { if (e.target === ov) ov._downOnOv = true; });
    ov.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]') || (e.target === ov && ov._downOnOv)) closeModal();
      ov._downOnOv = false;
    });
    requestAnimationFrame(() => ov.classList.add('in'));
    if (onOpen) onOpen(ov.querySelector('.modal'));
    const f = ov.querySelector('input:not([type=hidden]):not([type=checkbox]):not([readonly]), select, textarea');
    if (f) setTimeout(() => f.focus(), 30);
    return ov.querySelector('.modal');
  }
  function closeModal() {
    const m = stack.pop();
    if (!m) return;
    m.el.remove();
    if (m.onClose) m.onClose();
  }
  function closeAllModals() { while (stack.length) closeModal(); }
  const modalOpen = () => stack.length > 0;

  function confirmBox(message, { ok = 'Confirm', danger = false, title = 'Please confirm' } = {}) {
    return new Promise((resolve) => {
      let done = false;
      const m = openModal({
        title, size: 'sm',
        body: `<p class="confirm-msg">${message}</p>`,
        footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" id="cf-ok">${esc(ok)}</button>`,
        onClose: () => { if (!done) resolve(false); },
      });
      m.querySelector('#cf-ok').onclick = () => { done = true; closeModal(); resolve(true); };
      setTimeout(() => m.querySelector('#cf-ok').focus(), 40);
    });
  }

  function formData(form) {
    const o = {};
    new FormData(form).forEach((v, k) => {
      if (k in o) { if (!Array.isArray(o[k])) o[k] = [o[k]]; o[k].push(v); } else o[k] = v;
    });
    return o;
  }

  // ---------- dates ----------
  const pad = (n) => String(n).padStart(2, '0');
  const isoDate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parseISO = (s) => { const [y, m, d] = (s || '').split('-').map(Number); return new Date(y, (m || 1) - 1, d || 1); };
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function fmtDate(s, withDay) {
    if (!s) return '';
    const d = parseISO(s);
    const base = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    return withDay ? d.toLocaleDateString('en-GB', { weekday: 'short' }) + ', ' + base : base;
  }
  function fmtTime(t) {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    return `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`;
  }
  function addDays(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return isoDate(d); }
  function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
  function relDay(s) {
    const n = daysBetween(isoDate(), s);
    if (n === 0) return 'Today';
    if (n === 1) return 'Tomorrow';
    if (n === -1) return 'Yesterday';
    if (n < 0) return `${-n} days ago`;
    if (n < 7) return `In ${n} days`;
    return fmtDate(s);
  }
  const fmtHours = (min) => { const h = min / 60; return (Math.round(h * 10) / 10).toLocaleString('en-IN'); };
  const fmtBytes = (b) => b < 1024 ? b + ' B' : b < 1048576 ? (b / 1024).toFixed(0) + ' KB' : (b / 1048576).toFixed(1) + ' MB';

  // ---------- charts (SVG) ----------
  // Single-series charts use one hue (--series-1). Categorical charts use the fixed slot order.
  const SLOTS = 8;
  const seriesVar = (i) => `var(--series-${(i % SLOTS) + 1})`;

  function niceMax(v) {
    if (v <= 0) return 4;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * p;
  }
  function roundedTopBar(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    if (h <= 0) return '';
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  }
  function roundedRightBar(x, y, w, h, r) {
    r = Math.min(r, h / 2, w);
    if (w <= 0) return '';
    return `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  }

  /** Vertical column chart. data: [{label, value, tip}] */
  function barChart(data, { height = 240, unit = '', color = 'var(--series-1)', labelEvery = 1 } = {}) {
    const W = 640, H = height, L = 36, R = 8, T = 18, B = 28;
    const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
    const iw = W - L - R, ih = H - T - B;
    const slot = iw / Math.max(1, data.length);
    const bw = Math.max(4, Math.min(42, slot * 0.62));
    let g = '';
    for (let i = 0; i <= 4; i++) {
      const y = T + ih - (ih * i) / 4;
      const val = (max * i) / 4;
      g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid${i === 0 ? ' base' : ''}"/>`;
      g += `<text x="${L - 6}" y="${y + 4}" class="axis" text-anchor="end">${Math.round(val * 10) / 10}</text>`;
    }
    const peak = Math.max(...data.map((d) => d.value));
    data.forEach((d, i) => {
      const h = max ? (ih * d.value) / max : 0;
      const x = L + slot * i + (slot - bw) / 2;
      const y = T + ih - h;
      const tip = esc(d.tip || `${d.label}: ${d.value}${unit}`);
      g += `<g class="bar-g" data-tip="${tip}"><rect x="${L + slot * i}" y="${T}" width="${slot}" height="${ih}" fill="transparent"/>`;
      g += `<path d="${roundedTopBar(x, y, bw, h, 4)}" fill="${color}"/>`;
      if (d.value > 0 && (d.value === peak || data.length <= 12)) g += `<text x="${x + bw / 2}" y="${y - 5}" class="val" text-anchor="middle">${d.value}</text>`;
      g += '</g>';
      if (i % labelEvery === 0) g += `<text x="${L + slot * i + slot / 2}" y="${H - 8}" class="axis" text-anchor="middle">${esc(d.label)}</text>`;
    });
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Bar chart">${g}</svg>`;
  }

  /** Horizontal bar chart (ranked categories). data: [{label, value}] */
  function hbarChart(data, { unit = '', color = 'var(--series-1)', max: maxIn } = {}) {
    const row = 30, L = 130, R = 44, W = 640;
    const H = Math.max(row, data.length * row) + 6;
    const max = maxIn || Math.max(1, ...data.map((d) => d.value));
    let g = '';
    data.forEach((d, i) => {
      const y = i * row + 6;
      const w = ((W - L - R) * d.value) / max;
      const tip = esc(d.tip || `${d.label}: ${d.value}${unit}`);
      g += `<g class="bar-g" data-tip="${tip}"><rect x="0" y="${y - 3}" width="${W}" height="${row}" fill="transparent"/>`;
      g += `<text x="${L - 10}" y="${y + 15}" class="axis lbl" text-anchor="end">${esc(d.label.length > 18 ? d.label.slice(0, 17) + '…' : d.label)}</text>`;
      g += `<path d="${roundedRightBar(L, y + 2, Math.max(w, d.value ? 3 : 0), 18, 4)}" fill="${d.color || color}"/>`;
      g += `<text x="${L + w + 6}" y="${y + 15}" class="val">${d.value}${unit}</text></g>`;
    });
    g += `<line x1="${L}" x2="${L}" y1="0" y2="${H}" class="grid base"/>`;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Horizontal bar chart">${g}</svg>`;
  }

  /** Donut chart with legend. data: [{label, value}] - categorical, max 8 slices (rest folded into Other) */
  function donutChart(data, { centerLabel = 'Total' } = {}) {
    let items = data.filter((d) => d.value > 0).sort((a, b) => b.value - a.value);
    if (items.length > 6) {
      const rest = items.slice(5).reduce((s, d) => s + d.value, 0);
      items = items.slice(0, 5).concat([{ label: 'Other', value: rest }]);
    }
    const total = items.reduce((s, d) => s + d.value, 0);
    const R = 70, r = 46, C = 90;
    let a0 = -Math.PI / 2, g = '';
    if (!total) g = `<circle cx="${C}" cy="${C}" r="${(R + r) / 2}" fill="none" stroke="var(--line)" stroke-width="${R - r}"/>`;
    items.forEach((d, i) => {
      const frac = d.value / total;
      const a1 = a0 + frac * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad, ang) => `${C + rad * Math.cos(ang)},${C + rad * Math.sin(ang)}`;
      const path = frac >= 0.9999
        ? `M${C - R},${C}a${R},${R} 0 1,0 ${2 * R},0a${R},${R} 0 1,0 ${-2 * R},0M${C - r},${C}a${r},${r} 0 1,1 ${2 * r},0a${r},${r} 0 1,1 ${-2 * r},0Z`
        : `M${p(R, a0)}A${R},${R} 0 ${large},1 ${p(R, a1)}L${p(r, a1)}A${r},${r} 0 ${large},0 ${p(r, a0)}Z`;
      g += `<path d="${path}" fill="${seriesVar(i)}" class="slice" stroke="var(--surface)" stroke-width="2" data-tip="${esc(`${d.label}: ${d.value} (${Math.round(frac * 100)}%)`)}"/>`;
      a0 = a1;
    });
    g += `<text x="${C}" y="${C - 2}" text-anchor="middle" class="donut-num">${total}</text><text x="${C}" y="${C + 16}" text-anchor="middle" class="axis">${esc(centerLabel)}</text>`;
    const legend = items.map((d, i) => `<li><span class="sw" style="background:${seriesVar(i)}"></span><span class="lg-l">${esc(d.label)}</span><span class="lg-v">${d.value} · ${Math.round((d.value / total) * 100)}%</span></li>`).join('');
    return `<div class="donut-wrap"><svg class="chart donut" viewBox="0 0 180 180" role="img" aria-label="Donut chart">${g}</svg><ul class="legend">${legend || '<li class="muted">No data yet</li>'}</ul></div>`;
  }

  // Shared hover tooltip for any element with data-tip
  function initTooltips() {
    const tip = document.createElement('div');
    tip.id = 'chart-tip';
    document.body.appendChild(tip);
    document.addEventListener('mousemove', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (!t) { tip.style.opacity = 0; return; }
      tip.textContent = t.getAttribute('data-tip');
      tip.style.opacity = 1;
      const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
      tip.style.left = x + 'px';
      tip.style.top = (e.clientY - tip.offsetHeight - 10) + 'px';
    });
  }

  function download(filename, content, mime = 'application/octet-stream') {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  window.UI = {
    esc, $, $$, icon, toast, openModal, closeModal, closeAllModals, modalOpen, confirmBox, formData,
    isoDate, parseISO, fmtDate, fmtTime, addDays, daysBetween, relDay, fmtHours, fmtBytes, MONTHS, MONTHS_FULL, pad,
    barChart, hbarChart, donutChart, seriesVar, initTooltips, download,
  };
})();
