/* CounselBook - core: state, auth, shell, router, shared helpers */
(function () {
  'use strict';
  const { esc, $, $$, icon, toast, openModal, closeModal, closeAllModals, confirmBox, formData, isoDate, fmtDate } = UI;

  const MODULES = [
    { k: 'today', label: 'Today', icon: 'home', route: 'today' },
    { k: 'students', label: 'Students & case files', icon: 'users', route: 'students' },
    { k: 'sessions', label: 'Session notes', icon: 'note', route: 'sessions' },
    { k: 'followups', label: 'Follow-ups', icon: 'bell', route: 'followups' },
    { k: 'attachments', label: 'Attachments', icon: 'clip', route: null },
    { k: 'reports', label: 'Reports', icon: 'chart', route: 'reports' },
    { k: 'activities', label: 'Activities & tools', icon: 'puzzle', route: 'activities' },
    { k: 'backup', label: 'Backup & restore', icon: 'save', route: 'backup' },
    { k: 'settings', label: 'Settings', icon: 'settings', route: 'settings' },
  ];
  const allPerms = (lvl) => Object.fromEntries(MODULES.map((m) => [m.k, lvl]));
  const PRESETS = {
    admin: { label: 'Administrator', perms: allPerms('edit'), confidential: true, anonymise: false },
    counsellor: { label: 'Counsellor', perms: allPerms('edit'), confidential: true, anonymise: false },
    senior: { label: 'Principal / Senior (reports only)', perms: { ...allPerms('none'), reports: 'view', activities: 'view' }, confidential: false, anonymise: true },
    assistant: { label: 'Assistant / Class teacher', perms: { ...allPerms('none'), today: 'view', students: 'view', followups: 'edit', activities: 'edit', reports: 'view' }, confidential: false, anonymise: false },
    custom: { label: 'Custom', perms: allPerms('none'), confidential: false, anonymise: true },
  };

  // ---------------- state ----------------
  const CB = {
    S: null, // { dek, data, user }
    META: null,
    views: {},
    cleanup: null,
    MODULES, PRESETS,
  };
  window.CB = CB;

  // ---------------- theme ----------------
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  function applyTheme(t) {
    t = t || lsGet('cb-theme', 'light');
    document.documentElement.setAttribute('data-theme', t);
    lsSet('cb-theme', t);
  }
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    if (CB.S) { renderShell(); route(); } else if (CB.META) renderLogin();
  }
  CB.toggleTheme = toggleTheme;

  // ---------------- academic year ----------------
  function ayLabelFor(date, startMonth) {
    const y = date.getFullYear(), m = date.getMonth() + 1;
    const sy = m >= startMonth ? y : y - 1;
    return `${sy}-${String((sy + 1) % 100).padStart(2, '0')}`;
  }
  function ayRange(label, startMonth) {
    const sy = parseInt(label, 10);
    const sm = startMonth || 4;
    const start = `${sy}-${UI.pad(sm)}-01`;
    const endD = new Date(sy + 1, sm - 1, 0);
    return { from: start, to: isoDate(endD) };
  }
  CB.ayLabelFor = ayLabelFor;
  CB.ayRange = ayRange;

  // ---------------- data defaults ----------------
  function defaultData(schoolName, motto) {
    return {
      v: 1, created: Date.now(),
      settings: {
        schoolName, motto: motto || '', counsellorName: '',
        academicYear: ayLabelFor(new Date(), 4), ayStartMonth: 4, autoLockMin: 5,
        tags: ['Exam stress', 'Family', 'Peer', 'Behaviour', 'Career', 'Anxiety', 'Academic', 'Bullying', 'Self-esteem', 'Health', 'Grief / loss', 'Attendance'],
        classes: ['Nursery', 'LKG', 'UKG', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
        sessionTypes: ['Individual', 'Group', 'Parent meeting', 'Teacher consultation', 'Phone call', 'Classroom workshop'],
        fuKinds: ['Meet student', 'Parent meeting', 'Teacher check-in', 'Phone call', 'Review progress', 'Other'],
        templates: [
          { id: 'soap', name: 'SOAP', fields: ['Subjective', 'Objective', 'Assessment', 'Plan'] },
          { id: 'free', name: 'Free text', fields: ['Notes'] },
          { id: 'dap', name: 'DAP', fields: ['Data', 'Assessment', 'Plan'] },
          { id: 'girp', name: 'GIRP', fields: ['Goals', 'Intervention', 'Response', 'Plan'] },
        ],
        snippets: [
          'Student was calm and cooperative throughout the session.',
          'Student appeared anxious but engaged as the session progressed.',
          'Rapport established; student shared openly.',
          'Discussed coping strategies (breathing, grounding).',
          'Parent informed and supportive.',
          'Class teacher to monitor and report back.',
          'No immediate safety concerns reported.',
          'Referred for further assessment.',
        ],
        lastBackup: null,
      },
      users: {}, students: [], sessions: [], followups: [], attachments: [], audit: [],
    };
  }

  // ---------------- persistence ----------------
  let saving = Promise.resolve();
  function commit() {
    const s = CB.S;
    if (!s) return saving;
    s.data.updated = Date.now();
    setSaveState('saving');
    saving = saving.then(async () => {
      const rec = await Store.encryptJSON(s.dek, s.data);
      await Store.kvSet('data', rec);
    }).then(() => setSaveState('saved')).catch((e) => { setSaveState('error'); toast('Could not save: ' + e.message, 'err', 6000); });
    return saving;
  }
  function setSaveState(st) {
    const el = $('#save-state');
    if (!el) return;
    el.className = 'save-state ' + st;
    el.innerHTML = st === 'saving' ? `${icon('clock')} Saving…` : st === 'error' ? `${icon('x')} Not saved` : `${icon('shield')} Encrypted & saved`;
  }
  const saveMeta = () => Store.kvSet('vault', CB.META);
  function audit(action) {
    const s = CB.S; if (!s) return;
    s.data.audit.push({ t: Date.now(), u: s.user.username, a: action });
    if (s.data.audit.length > 1500) s.data.audit.splice(0, s.data.audit.length - 1500);
  }
  CB.commit = commit; CB.saveMeta = saveMeta; CB.audit = audit; CB.defaultData = defaultData;

  // ---------------- permissions & helpers ----------------
  const LV = { none: 0, view: 1, edit: 2 };
  function can(mod, lvl = 'view') {
    const s = CB.S; if (!s) return false;
    if (mod === 'admin') return s.user.role === 'admin';
    return LV[(s.user.perms || {})[mod] || 'none'] >= LV[lvl];
  }
  const anon = () => !!(CB.S && CB.S.user.anonymise);
  const canConf = () => !!(CB.S && CB.S.user.confidential);
  const D = () => CB.S.data;
  const st = (id) => D().students.find((x) => x.id === id);
  const code = (s) => 'S-' + s.id.slice(-4).toUpperCase();
  function sName(s) {
    if (!s) return '(removed student)';
    return anon() ? code(s) : s.name;
  }
  function sClass(s) { return s ? [s.cls ? 'Class ' + s.cls : '', s.section].filter(Boolean).join(' ') : ''; }
  function initials(s) {
    if (!s) return '?';
    if (anon()) return '#';
    return s.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  }
  const classIdx = (c) => { const i = D().settings.classes.indexOf(c); return i < 0 ? 999 : i; };
  const sessionsOf = (id) => D().sessions.filter((x) => (x.studentIds || []).includes(id)).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
  const fusOf = (id) => D().followups.filter((x) => x.studentId === id);
  function nextFU(id) {
    const t = isoDate();
    return fusOf(id).filter((f) => !f.done).sort((a, b) => a.date.localeCompare(b.date))[0] || null;
  }
  const PRI = { high: { l: 'High', c: 'crit' }, medium: { l: 'Medium', c: 'warn' }, low: { l: 'Low', c: 'good' }, none: { l: 'None', c: 'muted' } };
  function priBadge(p) { p = p || 'none'; if (p === 'none') return ''; return `<span class="badge ${PRI[p].c}">${icon('flag')}${PRI[p].l}</span>`; }
  function caseBadge(s) { return s.archived ? `<span class="badge muted">${icon('archive')}Archived</span>` : s.caseStatus === 'closed' ? `<span class="badge muted">${icon('check')}Closed</span>` : `<span class="badge info">${icon('folder')}Open</span>`; }
  const tagChips = (tags) => (tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('');
  function studentLabel(s) { return s ? `${esc(sName(s))}${s.cls ? ` <span class="muted">· ${esc(sClass(s))}</span>` : ''}` : '<span class="muted">(removed)</span>'; }
  function studentsLabel(ids, link = true) {
    return (ids || []).map((id) => { const s = st(id); return link && s && can('students') ? `<a href="#/student/${s.id}">${esc(sName(s))}</a>` : esc(sName(s)); }).join(', ');
  }
  function mdText(t) { return esc(t || '').replace(/\n/g, '<br>'); }
  Object.assign(CB, { can, anon, canConf, D, st, code, sName, sClass, initials, classIdx, sessionsOf, fusOf, nextFU, priBadge, caseBadge, tagChips, studentLabel, studentsLabel, mdText, PRI, lsGet, lsSet });

  // ---------------- boot ----------------
  async function boot() {
    applyTheme();
    UI.initTooltips();
    if (!window.crypto || !crypto.subtle || !window.indexedDB) {
      document.body.innerHTML = `<div class="fatal"><h1>CounselBook cannot start here</h1><p>Please open CounselBook using <b>Start CounselBook.bat</b> (it opens in Microsoft Edge). This browser window does not allow secure encrypted storage.</p></div>`;
      return;
    }
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* optional */ }
    CB.META = await Store.kvGet('vault');
    if (!CB.META) CB.views.setup(); else renderLogin();
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', onKey);
    ['mousemove', 'keydown', 'mousedown', 'touchstart', 'wheel'].forEach((ev) => document.addEventListener(ev, () => { lastActive = Date.now(); }, { passive: true }));
    setInterval(idleCheck, 10000);
  }

  // ---------------- idle lock ----------------
  let lastActive = Date.now();
  function idleCheck() {
    if (!CB.S) return;
    const mins = +(CB.S.data.settings.autoLockMin || 0);
    if (mins > 0 && Date.now() - lastActive > mins * 60000) lock('Locked automatically after ' + mins + ' minutes of inactivity.');
  }
  function lock(msg) {
    if (!CB.S) return;
    saving.finally(() => {
      if (CB.cleanup) { try { CB.cleanup(); } catch (e) { /* ignore */ } CB.cleanup = null; }
      closeAllModals();
      const pres = $('#present'); if (pres) pres.remove();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      const lastUser = CB.S.user.username;
      CB.S = null;
      renderLogin(msg, lastUser);
    });
  }
  CB.lock = lock;

  function onKey(e) {
    if (e.key === 'Escape' && UI.modalOpen()) { closeModal(); return; }
    if (!CB.S) return;
    if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); const s = $('#gsearch'); if (s) { s.focus(); s.select(); } }
    if (e.ctrlKey && (e.key === 'l' || e.key === 'L')) { e.preventDefault(); lock('Locked.'); }
  }

  // ---------------- school logo ----------------
  // The logo is not sensitive, so it is kept (as a small data URL) in the plaintext
  // vault metadata: it can show on the login screen and travels with backups.
  const DEFAULT_LOGO = 'assets/counselbook-logo.svg';
  function logoSrc() { return (CB.META && CB.META.logo) || DEFAULT_LOGO; }
  function applyLogo() {
    const src = logoSrc();
    document.documentElement.style.setProperty('--logo-url', `url("${src}")`);
    let link = document.querySelector('link[rel="icon"]');
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = src;
  }
  /** Read an image file and shrink it to at most 360px so it stays small. */
  function readLogo(file) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) return reject(new Error('Please choose an image file (PNG, JPG, SVG).'));
      if (file.size > 8 * 1024 * 1024) return reject(new Error('The image is larger than 8 MB.'));
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const max = 360, w = img.naturalWidth || max, h = img.naturalHeight || max;
        const k = Math.min(1, max / Math.max(w, h));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * k)); c.height = Math.max(1, Math.round(h * k));
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(file.type === 'image/jpeg' ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png'));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('This image could not be read.')); };
      img.src = url;
    });
  }
  /** Logo chooser widget. onChange(dataUrl | null) */
  function logoPicker(host, current, onChange, disabled) {
    let val = current || null;
    const draw = () => {
      host.innerHTML = `<div class="logo-pick"><img src="${esc(val || DEFAULT_LOGO)}" alt="School logo preview">
        <div><div class="row wrap">${disabled ? '' : `<button type="button" class="btn" data-lp="pick">${icon('upload')} ${val ? 'Change logo' : 'Upload logo'}</button>${val ? `<button type="button" class="btn ghost" data-lp="clear">${icon('trash')} Remove</button>` : ''}`}</div>
        <p class="hint">${val ? 'Your school logo.' : 'No logo yet – the CounselBook emblem is used.'} PNG or JPG, ideally square. Shown on the login screen, as a faint background and on printed reports.</p></div></div>`;
      const pick = host.querySelector('[data-lp="pick"]');
      if (pick) pick.onclick = () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/svg+xml,image/webp,image/gif';
        inp.onchange = async () => {
          try { val = await readLogo(inp.files[0]); draw(); onChange(val); } catch (e) { toast(e.message, 'err', 5000); }
        };
        inp.click();
      };
      const clr = host.querySelector('[data-lp="clear"]');
      if (clr) clr.onclick = () => { val = null; draw(); onChange(null); };
    };
    draw();
  }
  Object.assign(CB, { logoSrc, applyLogo, logoPicker, readLogo, DEFAULT_LOGO });

  // ---------------- login ----------------
  function bgLayer() { return '<div class="bg-logo" aria-hidden="true"></div>'; }
  function renderLogin(msg, lastUser) {
    const M = CB.META;
    applyLogo();
    document.body.className = 'auth';
    document.body.innerHTML = `${bgLayer()}
    <div class="auth-wrap">
      <div class="auth-card">
        <img class="auth-logo" src="${esc(logoSrc())}" alt="School logo">
        <div class="auth-school">${esc(M.school || '')}</div>
        <h1 class="auth-title">CounselBook</h1>
        <p class="auth-sub">Student counselling record &amp; reports</p>
        ${msg ? `<div class="note-box">${icon('lock')} ${esc(msg)}</div>` : ''}
        <form id="login-f" autocomplete="off">
          <label class="fld"><span>Username</span><input class="input" name="u" required value="${esc(lastUser || lsGet('cb-last-user', ''))}" autocapitalize="off" spellcheck="false"></label>
          <label class="fld"><span>Password / PIN</span><div class="pw-wrap"><input class="input" type="password" name="p" required><button type="button" class="icon-btn pw-eye" title="Show password">${icon('eye')}</button></div></label>
          <div id="login-err" class="err" role="alert"></div>
          <button class="btn primary block lg" id="login-btn">${icon('lock')} Unlock</button>
        </form>
        <div class="auth-links"><a href="#" id="forgot">Forgot password?</a><button class="link" id="th">${icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon')} Theme</button></div>
      </div>
      <p class="auth-foot">${icon('shield')} Data stays on this computer, encrypted. No internet needed.</p>
    </div>`;
    const f = $('#login-f');
    const u = f.u, p = f.p;
    (u.value ? p : u).focus();
    $('.pw-eye').onclick = () => { p.type = p.type === 'password' ? 'text' : 'password'; };
    $('#th').onclick = toggleTheme;
    $('#forgot').onclick = (e) => { e.preventDefault(); forgotFlow(); };
    f.onsubmit = async (e) => {
      e.preventDefault();
      const err = $('#login-err');
      const lockUntil = +lsGet('cb-lock-until', 0);
      if (Date.now() < lockUntil) { err.textContent = `Too many attempts. Try again in ${Math.ceil((lockUntil - Date.now()) / 1000)} seconds.`; return; }
      const btn = $('#login-btn'); btn.disabled = true; btn.innerHTML = 'Checking…'; err.textContent = '';
      try {
        await login(u.value.trim(), p.value);
        lsSet('cb-fails', 0);
      } catch (ex) {
        const fails = +lsGet('cb-fails', 0) + 1;
        lsSet('cb-fails', fails);
        if (fails >= 5) { lsSet('cb-lock-until', Date.now() + 60000); lsSet('cb-fails', 0); }
        err.textContent = ex.message || 'Incorrect username or password.';
        btn.disabled = false; btn.innerHTML = icon('lock') + ' Unlock';
        p.select();
      }
    };
  }
  CB.renderLogin = renderLogin;

  async function login(username, password) {
    const M = CB.META;
    const rec = M.users.find((x) => x.username.toLowerCase() === username.toLowerCase());
    if (!rec) throw new Error('Incorrect username or password.');
    let dek;
    try { dek = await Store.unwrapDEK(rec, password); } catch (e) { throw new Error('Incorrect username or password.'); }
    const blob = await Store.kvGet('data');
    const data = await Store.decryptJSON(dek, blob);
    const prof = data.users[rec.id];
    if (!prof) throw new Error('This login has been removed.');
    if (!prof.active) throw new Error('This login has been deactivated. Please contact the administrator.');
    migrate(data);
    CB.S = { dek, data, user: prof };
    prof.lastLogin = Date.now();
    lsSet('cb-last-user', rec.username);
    audit('Signed in');
    commit();
    lastActive = Date.now();
    renderShell();
    const cur = (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0]) || '';
    const curMod = ROUTE_MOD.hasOwnProperty(cur) ? ROUTE_MOD[cur] : undefined;
    if (!cur || curMod === undefined || (curMod && !can(curMod))) location.hash = '#/' + firstRoute();
    else route();
    if (prof.mustChange) setTimeout(() => changePasswordModal(true), 300);
  }
  CB.login = login;

  function migrate(data) {
    data.settings = Object.assign(defaultData('').settings, data.settings);
    ['students', 'sessions', 'followups', 'attachments', 'audit'].forEach((k) => { if (!Array.isArray(data[k])) data[k] = []; });
  }

  function firstRoute() {
    const m = MODULES.find((x) => x.route && can(x.k));
    return m ? m.route : 'account';
  }

  async function forgotFlow() {
    const m = openModal({
      title: 'Reset password with recovery key', size: 'sm',
      body: `<p class="muted">The recovery key was shown when CounselBook was first set up (format XXXXX-XXXXX-XXXXX-XXXXX). Other users can ask the administrator to reset their password.</p>
      <form id="rk-f"><label class="fld"><span>Username to reset</span><input class="input" name="u" required></label>
      <label class="fld"><span>Recovery key</span><input class="input mono" name="k" required placeholder="XXXXX-XXXXX-XXXXX-XXXXX"></label>
      <label class="fld"><span>New password / PIN</span><input class="input" type="password" name="p1" required minlength="4"></label>
      <label class="fld"><span>Confirm new password</span><input class="input" type="password" name="p2" required></label>
      <div class="err" id="rk-err"></div></form>`,
      footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="rk-go">Reset password</button>`,
    });
    m.querySelector('#rk-go').onclick = async () => {
      const f = formData(m.querySelector('#rk-f'));
      const err = m.querySelector('#rk-err');
      if (f.p1.length < 4) return (err.textContent = 'Password must be at least 4 characters.');
      if (f.p1 !== f.p2) return (err.textContent = 'Passwords do not match.');
      const rec = CB.META.users.find((x) => x.username.toLowerCase() === f.u.trim().toLowerCase());
      if (!rec) return (err.textContent = 'No such username.');
      try {
        const dek = await Store.unwrapDEK(CB.META.recovery, Store.normRecovery(f.k));
        Object.assign(rec, await Store.wrapDEK(dek, f.p1));
        await saveMeta();
        const data = await Store.decryptJSON(dek, await Store.kvGet('data'));
        if (data.users[rec.id]) { data.users[rec.id].mustChange = false; data.users[rec.id].active = true; }
        data.audit.push({ t: Date.now(), u: rec.username, a: 'Password reset with recovery key' });
        await Store.kvSet('data', await Store.encryptJSON(dek, data));
        closeModal(); toast('Password reset. You can sign in now.');
      } catch (e) { err.textContent = 'Recovery key is not correct.'; }
    };
  }

  async function changePasswordModal(forced) {
    const m = openModal({
      title: forced ? 'Please set a new password' : 'Change my password', size: 'sm',
      body: `${forced ? '<p class="muted">The administrator asked you to choose your own password.</p>' : ''}<form id="cp-f">
        ${forced ? '' : '<label class="fld"><span>Current password</span><input class="input" type="password" name="old" required></label>'}
        <label class="fld"><span>New password / PIN</span><input class="input" type="password" name="p1" required minlength="4"></label>
        <label class="fld"><span>Confirm new password</span><input class="input" type="password" name="p2" required></label>
        <p class="hint">Tip: use at least 8 characters, or a 6-digit PIN that is not your birthday.</p>
        <div class="err" id="cp-err"></div></form>`,
      footer: `${forced ? '' : '<button class="btn ghost" data-close>Cancel</button>'}<button class="btn primary" id="cp-go">Save password</button>`,
    });
    m.querySelector('#cp-go').onclick = async () => {
      const f = formData(m.querySelector('#cp-f'));
      const err = m.querySelector('#cp-err');
      const rec = CB.META.users.find((x) => x.id === CB.S.user.id);
      if (!forced) { try { await Store.unwrapDEK(rec, f.old); } catch (e) { return (err.textContent = 'Current password is not correct.'); } }
      if ((f.p1 || '').length < 4) return (err.textContent = 'Password must be at least 4 characters.');
      if (f.p1 !== f.p2) return (err.textContent = 'Passwords do not match.');
      Object.assign(rec, await Store.wrapDEK(CB.S.dek, f.p1));
      await saveMeta();
      CB.S.user.mustChange = false;
      audit('Changed own password');
      commit();
      closeModal(); toast('Password changed.');
    };
  }
  CB.changePasswordModal = changePasswordModal;

  // ---------------- shell ----------------
  function renderShell() {
    const s = CB.S, set = s.data.settings;
    applyLogo();
    document.body.className = 'in-app';
    const nav = MODULES.filter((m) => m.route && can(m.k)).map((m) => `<a href="#/${m.route}" data-r="${m.route}">${icon(m.icon)}<span>${m.label}</span></a>` + (m.k === 'activities' ? `<a href="#/games" data-r="games">${icon('heart')}<span>Games &amp; art</span></a>` : '')).join('')
      + (can('admin') ? `<a href="#/users" data-r="users">${icon('usercog')}<span>Users &amp; access</span></a>` : '');
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    document.body.innerHTML = `${bgLayer()}
    <div class="app">
      <aside class="side" id="side">
        <div class="brand"><img src="${esc(logoSrc())}" alt=""><div><b>CounselBook</b><small title="${esc(set.schoolName)}">${esc(set.schoolName)}</small></div></div>
        <nav class="nav">${nav}</nav>
        <div class="side-foot">
          <button class="user-chip" id="me-btn" title="My account"><span class="avatar sm">${esc((s.user.displayName || s.user.username).slice(0, 1).toUpperCase())}</span><span><b>${esc(s.user.displayName || s.user.username)}</b><small>${esc((PRESETS[s.user.role] || PRESETS.custom).label)}</small></span></button>
          <div class="side-btns">
            <button class="icon-btn" id="theme-btn" title="Dark / light mode">${icon(dark ? 'sun' : 'moon')}</button>
            <button class="icon-btn" id="lock-btn" title="Lock now (Ctrl+L)">${icon('lock')}</button>
          </div>
        </div>
      </aside>
      <div class="side-ov" id="side-ov"></div>
      <main class="main">
        <header class="topbar">
          <button class="icon-btn menu-btn" id="menu-btn" title="Menu">${icon('menu')}</button>
          ${(can('students') || can('sessions') || can('followups')) ? `<form class="gsearch" id="gs-f">${icon('search')}<input id="gsearch" placeholder="Search students, notes, follow-ups…  (Ctrl+K)" autocomplete="off"></form>` : '<div class="grow"></div>'}
          <div class="top-actions">
            ${can('sessions', 'edit') ? `<button class="btn primary" id="new-sess">${icon('plus')}<span>New session</span></button>` : ''}
            <span class="save-state saved" id="save-state">${icon('shield')} Encrypted &amp; saved</span>
          </div>
        </header>
        <div id="view" class="view"></div>
      </main>
    </div>
    <div id="print-root"></div>`;
    $('#lock-btn').onclick = () => lock('Locked.');
    $('#theme-btn').onclick = toggleTheme;
    $('#me-btn').onclick = accountModal;
    $('#menu-btn').onclick = () => document.body.classList.toggle('nav-open');
    $('#side-ov').onclick = () => document.body.classList.remove('nav-open');
    const gs = $('#gs-f');
    if (gs) gs.onsubmit = (e) => { e.preventDefault(); const q = $('#gsearch').value.trim(); if (q) location.hash = '#/search?q=' + encodeURIComponent(q); };
    const ns = $('#new-sess'); if (ns) ns.onclick = () => CB.openSessionForm({});
  }
  CB.renderShell = renderShell;

  function accountModal() {
    const u = CB.S.user;
    const m = openModal({
      title: 'My account', size: 'sm',
      body: `<div class="acct"><span class="avatar">${esc((u.displayName || u.username)[0].toUpperCase())}</span><div><b>${esc(u.displayName)}</b><div class="muted">@${esc(u.username)} · ${esc((PRESETS[u.role] || PRESETS.custom).label)}</div></div></div>
        <div class="stack">
          <button class="btn block" id="ac-pw">${icon('key')} Change my password</button>
          <button class="btn block" id="ac-th">${icon('moon')} Toggle dark mode</button>
          <button class="btn block" id="ac-lock">${icon('lock')} Lock now</button>
        </div>
        <p class="hint">Auto-lock after ${CB.S.data.settings.autoLockMin || 0} minutes of inactivity. ${u.anonymise ? 'Your view hides student identities.' : ''}</p>`,
    });
    m.querySelector('#ac-pw').onclick = () => { closeModal(); changePasswordModal(false); };
    m.querySelector('#ac-th').onclick = () => { closeModal(); toggleTheme(); };
    m.querySelector('#ac-lock').onclick = () => { closeModal(); lock('Locked.'); };
  }

  // ---------------- router ----------------
  const ROUTE_MOD = { today: 'today', students: 'students', student: 'students', sessions: 'sessions', followups: 'followups', reports: 'reports', activities: 'activities', tool: 'activities', games: 'activities', game: 'activities', users: 'admin', settings: 'settings', backup: 'backup', search: null, account: null };
  function route() {
    if (!CB.S) return;
    if (CB.cleanup) { try { CB.cleanup(); } catch (e) { /* ignore */ } CB.cleanup = null; }
    document.body.classList.remove('nav-open');
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const [name, arg] = (path || '').split('/');
    const params = new URLSearchParams(qs || '');
    const r = ROUTE_MOD.hasOwnProperty(name) ? name : firstRoute();
    const mod = ROUTE_MOD[r];
    const view = $('#view');
    $$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r || (r === 'student' && a.dataset.r === 'students') || (r === 'tool' && a.dataset.r === 'activities') || (r === 'game' && a.dataset.r === 'games')));
    if (mod && !can(mod)) { view.innerHTML = emptyState('lock', 'No access', 'Your login does not include this section. Ask the administrator if you need it.'); return; }
    if (r === 'account') { view.innerHTML = emptyState('shield', 'Welcome', 'Your login has no sections assigned yet. Please contact the administrator.'); return; }
    const fn = CB.views[r];
    view.scrollTop = 0; window.scrollTo(0, 0);
    if (fn) { const c = fn(view, arg, params); if (typeof c === 'function') CB.cleanup = c; }
    else view.innerHTML = emptyState('x', 'Not found', '');
    const gs = $('#gsearch'); if (gs && r !== 'search') gs.value = '';
  }
  CB.route = route;
  CB.refresh = route;

  function emptyState(ic, title, text, action = '') {
    return `<div class="empty">${icon(ic, 'xl')}<h3>${esc(title)}</h3><p>${esc(text)}</p>${action}</div>`;
  }
  CB.emptyState = emptyState;

  // ---------------- printing ----------------
  function printHTML(html, title) {
    const set = CB.S ? CB.S.data.settings : { schoolName: CB.META.school };
    const root = $('#print-root');
    root.innerHTML = `<div class="p-head"><img src="${esc(logoSrc())}" alt=""><div><div class="p-school">${esc(set.schoolName)}</div>${set.motto ? `<div class="p-motto">${esc(set.motto)}</div>` : ''}<div class="p-sub">Counselling Department · CounselBook</div></div></div>${html}
      <div class="p-foot">Printed ${fmtDate(isoDate())} by ${esc(CB.S ? CB.S.user.displayName : '')}</div>`;
    const old = document.title;
    document.title = title || 'CounselBook';
    document.body.classList.add('printing');
    const img = root.querySelector('img');
    const go = () => { window.print(); };
    const done = () => { document.body.classList.remove('printing'); document.title = old; root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    if (img && !img.complete) img.onload = go; else setTimeout(go, 60);
  }
  CB.printHTML = printHTML;
  window.App = { printHTML };

  // ---------------- voice dictation ----------------
  let rec = null;
  function dictate(btn, ta) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (rec) { rec.stop(); return; }
    if (!SR) { toast('Voice typing is not available here. Tip: click in the box and press Windows key + H to use Windows dictation.', 'warn', 7000); return; }
    rec = new SR();
    rec.lang = 'en-IN'; rec.continuous = true; rec.interimResults = false;
    btn.classList.add('rec');
    rec.onresult = (e) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) t += e.results[i][0].transcript;
      if (t) { ta.value = (ta.value && !/\s$/.test(ta.value) ? ta.value + ' ' : ta.value) + t.trim(); ta.dispatchEvent(new Event('input')); }
    };
    rec.onerror = (e) => {
      if (e.error === 'network' || e.error === 'service-not-allowed' || e.error === 'not-allowed') toast('Browser voice typing needs internet or microphone permission. Offline tip: click in the box and press Windows key + H.', 'warn', 8000);
    };
    rec.onend = () => { btn.classList.remove('rec'); rec = null; };
    try { rec.start(); toast('Listening… click the mic again to stop.', 'ok', 2000); } catch (e) { rec = null; btn.classList.remove('rec'); }
  }
  CB.dictate = dictate;
  CB.micBtn = (target) => `<button type="button" class="icon-btn mic" data-mic="${target}" title="Voice typing (or press Windows key + H)">${icon('mic')}</button>`;
  CB.bindMics = (root) => $$('[data-mic]', root).forEach((b) => { b.onclick = () => dictate(b, root.querySelector(`[name="${b.dataset.mic}"]`)); });

  document.addEventListener('DOMContentLoaded', boot);
})();
