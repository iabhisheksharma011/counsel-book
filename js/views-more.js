/* CounselBook - Reports, Presentation, Printing, Activities, Users, Settings, Backup, Demo data */
(function () {
  'use strict';
  const { esc, $, $$, icon, toast, openModal, closeModal, confirmBox, formData, isoDate, fmtDate, fmtTime, addDays, fmtHours } = UI;
  const V = CB.views;

  // =============== REPORT DATA ===============
  function periodRange(p) {
    const set = CB.D().settings, today = isoDate();
    if (p.kind === 'ay') return CB.ayRange(set.academicYear, set.ayStartMonth);
    if (p.kind === 'lastay') return CB.ayRange(String(parseInt(set.academicYear, 10) - 1), set.ayStartMonth);
    if (p.kind === 'month') return { from: today.slice(0, 8) + '01', to: today };
    if (p.kind === '90') return { from: addDays(today, -89), to: today };
    return { from: p.from || today.slice(0, 4) + '-01-01', to: p.to || today };
  }
  function monthsBetween(from, to) {
    const out = [];
    let d = UI.parseISO(from.slice(0, 8) + '01');
    const end = UI.parseISO(to);
    while (d <= end && out.length < 36) { out.push(isoDate(d).slice(0, 7)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }
    return out;
  }
  function compute(range) {
    const d = CB.D();
    const sess = d.sessions.filter((x) => x.date >= range.from && x.date <= range.to);
    const mins = sess.reduce((a, x) => a + (+x.duration || 0), 0);
    const seen = new Set(); sess.forEach((x) => (x.studentIds || []).forEach((i) => seen.add(i)));
    const months = monthsBetween(range.from, range.to).map((mk) => {
      const ms = sess.filter((x) => x.date.startsWith(mk));
      const [y, m] = mk.split('-').map(Number);
      return { mk, label: UI.MONTHS[m - 1] + (m === 1 || mk === range.from.slice(0, 7) ? ' ' + String(y).slice(2) : ''), full: UI.MONTHS_FULL[m - 1] + ' ' + y, count: ms.length, mins: ms.reduce((a, x) => a + (+x.duration || 0), 0), students: new Set(ms.flatMap((x) => x.studentIds || [])).size };
    });
    const tagMap = {};
    sess.forEach((x) => (x.tags || []).forEach((t) => { tagMap[t] = tagMap[t] || { sessions: 0, students: new Set(), mins: 0 }; tagMap[t].sessions++; tagMap[t].mins += +x.duration || 0; (x.studentIds || []).forEach((i) => tagMap[t].students.add(i)); }));
    const tags = Object.entries(tagMap).map(([label, v]) => ({ label, sessions: v.sessions, students: v.students.size, mins: v.mins })).sort((a, b) => b.sessions - a.sessions);
    const clsMap = {};
    sess.forEach((x) => (x.studentIds || []).forEach((i) => { const s = CB.st(i); const c = s && s.cls ? s.cls : 'Unknown'; clsMap[c] = clsMap[c] || { sessions: 0, students: new Set() }; clsMap[c].sessions++; clsMap[c].students.add(i); }));
    const classes = Object.entries(clsMap).map(([label, v]) => ({ label, sessions: v.sessions, students: v.students.size })).sort((a, b) => CB.classIdx(a.label) - CB.classIdx(b.label));
    const typeMap = {}; sess.forEach((x) => { typeMap[x.type || 'Other'] = (typeMap[x.type || 'Other'] || 0) + 1; });
    const types = Object.entries(typeMap).map(([label, value]) => ({ label, value }));
    const genMap = {}; seen.forEach((i) => { const s = CB.st(i); const g = (s && s.gender) || 'Not recorded'; genMap[g] = (genMap[g] || 0) + 1; });
    const genders = Object.entries(genMap).map(([label, value]) => ({ label, value }));
    const refMap = {}; seen.forEach((i) => { const s = CB.st(i); const g = (s && s.referral) || 'Not recorded'; refMap[g] = (refMap[g] || 0) + 1; });
    const referrals = Object.entries(refMap).map(([label, value]) => ({ label, value }));
    const t0 = new Date(range.from).getTime(), t1 = new Date(range.to).getTime() + 864e5;
    const opened = d.students.filter((s) => s.created >= t0 && s.created < t1).length;
    const closed = d.students.reduce((a, s) => a + (s.history || []).filter((h) => h.a.startsWith('Case closed') && h.t >= t0 && h.t < t1).length, 0);
    const fuDone = d.followups.filter((f) => f.done && f.date >= range.from && f.date <= range.to).length;
    const fuAll = d.followups.filter((f) => f.date >= range.from && f.date <= range.to).length;
    const groupSess = sess.filter((x) => (x.studentIds || []).length > 1 || x.groupLabel).length;
    const activities = sess.filter((x) => x.activityId).length;
    const openNow = d.students.filter((s) => !s.archived && s.caseStatus !== 'closed');
    const pri = ['high', 'medium', 'low', 'none'].map((p) => ({ label: CB.PRI[p].l, value: openNow.filter((s) => (s.priority || 'none') === p).length }));
    // anonymised case highlights (top students by sessions)
    const perStudent = {};
    sess.forEach((x) => (x.studentIds || []).forEach((i) => { perStudent[i] = perStudent[i] || { n: 0, mins: 0, tags: new Set() }; perStudent[i].n++; perStudent[i].mins += +x.duration || 0; (x.tags || []).forEach((t) => perStudent[i].tags.add(t)); }));
    const highlights = Object.entries(perStudent).sort((a, b) => b[1].n - a[1].n).slice(0, 12).map(([id, v], k) => { const s = CB.st(id); return { alias: 'Student ' + String.fromCharCode(65 + k), cls: s ? s.cls : '', n: v.n, mins: v.mins, tags: [...v.tags], status: s ? (s.archived ? 'Archived' : s.caseStatus === 'closed' ? 'Closed' : 'Ongoing') : '' }; });
    return { range, sess, count: sess.length, mins, seen: seen.size, months, tags, classes, types, genders, referrals, opened, closed, fuDone, fuAll, groupSess, activities, pri, highlights, openNow: openNow.length };
  }
  CB.computeReport = compute;

  // =============== REPORTS VIEW ===============
  const RP = { kind: 'ay', from: '', to: '' };
  V.reports = function (el) {
    const set = CB.D().settings;
    const range = periodRange(RP);
    const R = compute(range);
    const periodLabel = RP.kind === 'ay' ? `Academic year ${set.academicYear}` : RP.kind === 'lastay' ? `Academic year ${parseInt(set.academicYear, 10) - 1}-${String(parseInt(set.academicYear, 10) % 100).padStart(2, '0')}` : `${fmtDate(range.from)} – ${fmtDate(range.to)}`;
    el.innerHTML = `<div class="page-h"><div><h1>Reports</h1><p class="muted">${esc(periodLabel)} · names are never shown in reports</p></div>
      <div class="row wrap">
        <button class="btn primary" id="r-present">${icon('present')} Present to seniors</button>
        <button class="btn" id="r-print">${icon('print')} Year-end report (PDF)</button>
        <button class="btn" id="r-csv">${icon('download')} Export CSV</button>
      </div></div>
      <div class="filters card">
        <div class="seg" id="r-kind">${[['ay', 'This academic year'], ['lastay', 'Last academic year'], ['month', 'This month'], ['90', 'Last 90 days'], ['custom', 'Custom']].map(([k, l]) => `<button data-k="${k}" class="${RP.kind === k ? 'on' : ''}">${l}</button>`).join('')}</div>
        ${RP.kind === 'custom' ? `<label class="inl">From <input class="input" type="date" id="r-from" value="${range.from}"></label><label class="inl">To <input class="input" type="date" id="r-to" value="${range.to}"></label>` : ''}
      </div>
      <div class="stats">
        ${CB.stat('note', R.count, 'Sessions', `${R.groupSess} group / workshop`)}
        ${CB.stat('clock', fmtHours(R.mins), 'Hours of counselling', `${R.mins} minutes`)}
        ${CB.stat('users', R.seen, 'Students supported', `${R.opened} new cases opened`)}
        ${CB.stat('check', R.closed, 'Cases closed', `${R.openNow} open right now`)}
        ${CB.stat('bell', R.fuDone, 'Follow-ups completed', `of ${R.fuAll} scheduled`)}
      </div>
      <div class="cols">
        <section class="card"><div class="card-h"><h2>Sessions per month</h2></div>${UI.barChart(R.months.map((m) => ({ label: m.label, value: m.count, tip: `${m.full}: ${m.count} sessions, ${m.students} students` })), { labelEvery: R.months.length > 14 ? 2 : 1 })}</section>
        <section class="card"><div class="card-h"><h2>Hours per month</h2></div>${UI.barChart(R.months.map((m) => ({ label: m.label, value: Math.round((m.mins / 60) * 10) / 10, tip: `${m.full}: ${fmtHours(m.mins)} hours` })), { color: 'var(--series-3)', labelEvery: R.months.length > 14 ? 2 : 1 })}</section>
        <section class="card"><div class="card-h"><h2>Issue-wise summary</h2><span class="muted sm">sessions per issue</span></div>${R.tags.length ? UI.hbarChart(R.tags.map((t) => ({ label: t.label, value: t.sessions, tip: `${t.label}: ${t.sessions} sessions · ${t.students} students · ${fmtHours(t.mins)} h` }))) : '<p class="empty-sm">No tagged sessions in this period.</p>'}</section>
        <section class="card"><div class="card-h"><h2>Class-wise</h2><span class="muted sm">students supported</span></div>${R.classes.length ? UI.hbarChart(R.classes.map((c) => ({ label: c.label === 'Unknown' ? 'Unknown' : 'Class ' + c.label, value: c.students, tip: `Class ${c.label}: ${c.students} students, ${c.sessions} sessions` })), { color: 'var(--series-7)' }) : '<p class="empty-sm">No data.</p>'}</section>
        <section class="card"><div class="card-h"><h2>Session types</h2></div>${UI.donutChart(R.types, { centerLabel: 'sessions' })}</section>
        <section class="card"><div class="card-h"><h2>Referral source</h2></div>${UI.donutChart(R.referrals, { centerLabel: 'students' })}</section>
        <section class="card"><div class="card-h"><h2>Gender of students supported</h2></div>${UI.donutChart(R.genders, { centerLabel: 'students' })}</section>
        <section class="card"><div class="card-h"><h2>Open cases by priority</h2><span class="muted sm">as of today</span></div>${UI.hbarChart(R.pri.map((p, i) => ({ label: p.label, value: p.value, color: ['var(--crit)', 'var(--warn)', 'var(--good)', 'var(--muted-ink)'][i] })))}</section>
      </div>
      <section class="card"><div class="card-h"><h2>Monthly table</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Month</th><th class="num">Sessions</th><th class="num">Hours</th><th class="num">Students</th></tr></thead><tbody>
        ${R.months.map((m) => `<tr><td>${m.full}</td><td class="num">${m.count}</td><td class="num">${fmtHours(m.mins)}</td><td class="num">${m.students}</td></tr>`).join('')}
        <tr class="total"><td>Total</td><td class="num">${R.count}</td><td class="num">${fmtHours(R.mins)}</td><td class="num">${R.seen}</td></tr></tbody></table></div></section>
      <section class="card"><div class="card-h"><h2>Issue table</h2></div><div class="table-wrap"><table class="tbl"><thead><tr><th>Issue</th><th class="num">Sessions</th><th class="num">Students</th><th class="num">Hours</th></tr></thead><tbody>
        ${R.tags.map((t) => `<tr><td>${esc(t.label)}</td><td class="num">${t.sessions}</td><td class="num">${t.students}</td><td class="num">${fmtHours(t.mins)}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">No data</td></tr>'}</tbody></table></div></section>`;
    $('#r-kind', el).onclick = (e) => { const b = e.target.closest('button'); if (b) { RP.kind = b.dataset.k; if (RP.kind === 'custom') { RP.from = range.from; RP.to = range.to; } CB.refresh(); } };
    const rf = $('#r-from', el), rt = $('#r-to', el);
    if (rf) { rf.onchange = () => { RP.from = rf.value; CB.refresh(); }; rt.onchange = () => { RP.to = rt.value; CB.refresh(); }; }
    $('#r-present', el).onclick = () => present(R, periodLabel);
    $('#r-print', el).onclick = () => printYearEnd(R, periodLabel);
    $('#r-csv', el).onclick = () => exportCSV(R, periodLabel);
  };

  function exportCSV(R, label) {
    const q = (v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
    const rows = [['CounselBook summary', CB.D().settings.schoolName], ['Period', label], [], ['Month', 'Sessions', 'Hours', 'Students']];
    R.months.forEach((m) => rows.push([m.full, m.count, (m.mins / 60).toFixed(1), m.students]));
    rows.push(['Total', R.count, (R.mins / 60).toFixed(1), R.seen], [], ['Issue', 'Sessions', 'Students', 'Hours']);
    R.tags.forEach((t) => rows.push([t.label, t.sessions, t.students, (t.mins / 60).toFixed(1)]));
    rows.push([], ['Class', 'Students', 'Sessions']);
    R.classes.forEach((c) => rows.push([c.label, c.students, c.sessions]));
    rows.push([], ['Session type', 'Count']);
    R.types.forEach((t) => rows.push([t.label, t.value]));
    UI.download(`CounselBook-summary-${isoDate()}.csv`, '﻿' + rows.map((r) => r.map(q).join(',')).join('\r\n'), 'text/csv');
    toast('Summary CSV saved (no student names). Open it in Excel.');
  }

  // =============== PRESENTATION MODE ===============
  function present(R, label) {
    const set = CB.D().settings;
    const top = R.tags[0];
    const busiest = R.months.slice().sort((a, b) => b.count - a.count)[0];
    const slides = [
      `<div class="sl-title"><img src="assets/logo.jpg" alt=""><h1>${esc(set.schoolName)}</h1><h2>Counselling Department Report</h2><p>${esc(label)}</p>${set.counsellorName ? `<p class="muted">Presented by ${esc(set.counsellorName)}</p>` : ''}</div>`,
      `<h2 class="sl-h">At a glance</h2><div class="sl-stats">
        <div><b>${R.count}</b><span>counselling sessions</span></div><div><b>${fmtHours(R.mins)}</b><span>hours with students</span></div>
        <div><b>${R.seen}</b><span>students supported</span></div><div><b>${R.closed}</b><span>cases closed</span></div>
        <div><b>${R.groupSess}</b><span>group sessions &amp; workshops</span></div><div><b>${R.fuDone}</b><span>follow-ups completed</span></div></div>`,
      `<h2 class="sl-h">Sessions each month</h2><div class="sl-chart">${UI.barChart(R.months.map((m) => ({ label: m.label, value: m.count, tip: `${m.full}: ${m.count}` })), { height: 300 })}</div>${busiest && busiest.count ? `<p class="sl-note">Busiest month: <b>${busiest.full}</b> with ${busiest.count} sessions.</p>` : ''}`,
      `<h2 class="sl-h">What students came to us about</h2><div class="sl-chart">${R.tags.length ? UI.hbarChart(R.tags.slice(0, 10).map((t) => ({ label: t.label, value: t.sessions }))) : '<p>No data</p>'}</div>${top ? `<p class="sl-note">Most common concern: <b>${esc(top.label)}</b> (${top.students} students).</p>` : ''}`,
      `<h2 class="sl-h">Students supported by class</h2><div class="sl-chart">${R.classes.length ? UI.hbarChart(R.classes.map((c) => ({ label: c.label === 'Unknown' ? 'Unknown' : 'Class ' + c.label, value: c.students })), { color: 'var(--series-7)' }) : '<p>No data</p>'}</div>`,
      `<h2 class="sl-h">How we worked</h2><div class="sl-two"><div><h3>Session types</h3>${UI.donutChart(R.types, { centerLabel: 'sessions' })}</div><div><h3>Who referred students</h3>${UI.donutChart(R.referrals, { centerLabel: 'students' })}</div></div>`,
      `<div class="sl-title"><img src="assets/logo.jpg" alt=""><h1>Thank you</h1><p>All figures are anonymised. Individual student records remain confidential with the counsellor.</p></div>`,
    ];
    let i = 0;
    const ov = document.createElement('div');
    ov.id = 'present';
    ov.innerHTML = `<div class="sl-stage"></div><div class="sl-bar"><button class="icon-btn" id="sl-prev" title="Previous (←)">${icon('chevl')}</button><span id="sl-n"></span><button class="icon-btn" id="sl-next" title="Next (→)">${icon('chevr')}</button><button class="icon-btn" id="sl-x" title="Exit (Esc)">${icon('x')}</button></div>`;
    document.body.appendChild(ov);
    const stage = ov.querySelector('.sl-stage');
    const draw = () => { stage.innerHTML = `<div class="slide">${slides[i]}</div>`; ov.querySelector('#sl-n').textContent = `${i + 1} / ${slides.length}`; };
    const go = (n) => { i = Math.max(0, Math.min(slides.length - 1, i + n)); draw(); };
    const close = () => { document.removeEventListener('keydown', key); if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); ov.remove(); };
    const key = (e) => {
      if (['ArrowRight', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); go(1); }
      else if (['ArrowLeft', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); go(-1); }
      else if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', key);
    ov.querySelector('#sl-prev').onclick = () => go(-1);
    ov.querySelector('#sl-next').onclick = () => go(1);
    ov.querySelector('#sl-x').onclick = close;
    stage.onclick = (e) => { if (!e.target.closest('button')) go(1); };
    draw();
    if (ov.requestFullscreen) ov.requestFullscreen().catch(() => {});
  }

  // =============== PRINTS ===============
  function printYearEnd(R, label) {
    const set = CB.D().settings;
    const html = `
      <h1>Counselling Department – Annual Report</h1>
      <p class="p-meta"><b>${esc(label)}</b>${set.counsellorName ? ' · School counsellor: ' + esc(set.counsellorName) : ''}</p>
      <p class="p-note">All information in this report is aggregated and anonymised. No student names or identifying details are included.</p>
      <div class="p-stats">
        <div><b>${R.count}</b><span>Sessions</span></div><div><b>${fmtHours(R.mins)}</b><span>Hours</span></div><div><b>${R.seen}</b><span>Students supported</span></div>
        <div><b>${R.opened}</b><span>New cases</span></div><div><b>${R.closed}</b><span>Cases closed</span></div><div><b>${R.groupSess}</b><span>Group sessions</span></div>
      </div>
      <h2>Monthly activity</h2>
      <div class="p-chart">${UI.barChart(R.months.map((m) => ({ label: m.label, value: m.count })), { height: 200 })}</div>
      <table class="p-table"><tr><th>Month</th><th>Sessions</th><th>Hours</th><th>Students</th></tr>${R.months.map((m) => `<tr><td>${m.full}</td><td>${m.count}</td><td>${fmtHours(m.mins)}</td><td>${m.students}</td></tr>`).join('')}<tr class="total"><td>Total</td><td>${R.count}</td><td>${fmtHours(R.mins)}</td><td>${R.seen}</td></tr></table>
      <h2>Issue-wise summary</h2>
      ${R.tags.length ? `<div class="p-chart">${UI.hbarChart(R.tags.map((t) => ({ label: t.label, value: t.sessions })))}</div><table class="p-table"><tr><th>Issue</th><th>Sessions</th><th>Students</th><th>Hours</th></tr>${R.tags.map((t) => `<tr><td>${esc(t.label)}</td><td>${t.sessions}</td><td>${t.students}</td><td>${fmtHours(t.mins)}</td></tr>`).join('')}</table>` : '<p>No data.</p>'}
      <h2>Class-wise summary</h2>
      <table class="p-table"><tr><th>Class</th><th>Students supported</th><th>Sessions</th></tr>${R.classes.map((c) => `<tr><td>${esc(c.label)}</td><td>${c.students}</td><td>${c.sessions}</td></tr>`).join('') || '<tr><td colspan="3">No data</td></tr>'}</table>
      <h2>Session types &amp; referrals</h2>
      <div class="p-two"><table class="p-table"><tr><th>Session type</th><th>Count</th></tr>${R.types.map((t) => `<tr><td>${esc(t.label)}</td><td>${t.value}</td></tr>`).join('')}</table>
      <table class="p-table"><tr><th>Referred by</th><th>Students</th></tr>${R.referrals.map((t) => `<tr><td>${esc(t.label)}</td><td>${t.value}</td></tr>`).join('')}</table></div>
      <h2>Anonymised case overview (most-supported students)</h2>
      <table class="p-table"><tr><th>Case</th><th>Class</th><th>Sessions</th><th>Hours</th><th>Main concerns</th><th>Status</th></tr>${R.highlights.map((h) => `<tr><td>${h.alias}</td><td>${esc(h.cls)}</td><td>${h.n}</td><td>${fmtHours(h.mins)}</td><td>${esc(h.tags.join(', '))}</td><td>${h.status}</td></tr>`).join('') || '<tr><td colspan="6">No data</td></tr>'}</table>
      <h2>Counsellor's remarks</h2><div class="p-lines">${'<div></div>'.repeat(6)}</div>
      <div class="p-sign"><div>School Counsellor</div><div>Principal</div></div>`;
    CB.printHTML(html, `Counselling report ${label}`);
  }

  CB.printStudent = function (s) {
    const anon = CB.anon();
    const sess = CB.can('sessions') ? CB.sessionsOf(s.id).slice().reverse() : [];
    const fus = CB.can('followups') ? CB.fusOf(s.id).sort((a, b) => a.date.localeCompare(b.date)) : [];
    const atts = CB.can('attachments') ? CB.D().attachments.filter((a) => a.studentId === s.id) : [];
    const mins = sess.reduce((a, x) => a + (+x.duration || 0), 0);
    const row = (k, v) => v ? `<tr><th>${k}</th><td>${esc(v)}</td></tr>` : '';
    const html = `<div class="p-conf">CONFIDENTIAL – Student counselling record</div>
      <h1>${esc(CB.sName(s))}</h1>
      <table class="p-kv">${row('Class', CB.sClass(s))}${anon ? '' : row('Admission no.', s.admNo) + row('Date of birth', fmtDate(s.dob)) + row('Parent / guardian', s.parentName) + row('Parent phone', s.parentPhone) + row('Student contact', s.contact)}${row('Gender', s.gender)}${row('Referred by', s.referral)}
        ${row('Case status', s.archived ? 'Archived' : s.caseStatus === 'closed' ? 'Closed' : 'Open')}${row('Priority', CB.PRI[s.priority || 'none'].l)}${row('Issues', (s.tags || []).join(', '))}${row('Case opened', fmtDate(isoDate(new Date(s.created))))}${row('Total sessions', `${sess.length} (${fmtHours(mins)} hours)`)}</table>
      ${s.notes && !anon && CB.canConf() ? `<h2>Background</h2><p>${CB.mdText(s.notes)}</p>` : ''}
      <h2>Session history</h2>
      ${sess.length ? sess.map((x) => sessPrint(x)).join('') : '<p>No sessions recorded.</p>'}
      ${fus.length ? `<h2>Follow-ups</h2><table class="p-table"><tr><th>Date</th><th>Type</th><th>Note</th><th>Status</th></tr>${fus.map((f) => `<tr><td>${fmtDate(f.date)} ${f.time ? fmtTime(f.time) : ''}</td><td>${esc(f.kind)}</td><td>${esc(f.note)}</td><td>${f.done ? 'Done' : f.date < isoDate() ? 'Overdue' : 'Pending'}</td></tr>`).join('')}</table>` : ''}
      ${atts.length ? `<h2>Attachments on file</h2><ul>${atts.map((a) => `<li>${esc(a.name)}${a.caption ? ' – ' + esc(a.caption) : ''} (${fmtDate(isoDate(new Date(a.created)))})</li>`).join('')}</ul>` : ''}
      <div class="p-sign"><div>School Counsellor</div></div>`;
    CB.audit('Exported student history ' + s.id);
    CB.commit();
    CB.printHTML(html, `Student history - ${CB.sName(s)}`);
  };
  function sessPrint(x) {
    const hidden = x.confidential && !CB.canConf();
    return `<div class="p-sess"><div class="p-sess-h"><b>${fmtDate(x.date, true)}</b>${x.time ? ' · ' + fmtTime(x.time) : ''} · ${x.duration} min · ${esc(x.type || '')}${(x.tags || []).length ? ' · ' + esc(x.tags.join(', ')) : ''}${(x.studentIds || []).length > 1 ? ' · Group session' : ''}</div>
      ${hidden ? '<p><i>Confidential – content withheld.</i></p>' : Object.entries(x.fields || {}).map(([k, v]) => `<p><b>${esc(k)}:</b> ${CB.mdText(v)}</p>`).join('') + (x.nextSteps ? `<p><b>Next steps:</b> ${CB.mdText(x.nextSteps)}</p>` : '')}</div>`;
  }
  CB.printSession = function (x) {
    CB.printHTML(`<div class="p-conf">CONFIDENTIAL – Session note</div><h1>${CB.studentsLabel(x.studentIds, false) || esc(x.groupLabel)}</h1>${sessPrint(x)}<div class="p-sign"><div>School Counsellor</div></div>`, 'Session note');
  };

  // =============== ACTIVITIES ===============
  const AF = { cat: '', q: '', mode: '' };
  V.activities = function (el) {
    const A = window.ACTIVITIES;
    const cats = [...new Set(A.map((a) => a.cat))];
    el.innerHTML = `<div class="page-h"><div><h1>Activities &amp; tools</h1><p class="muted">${A.length} ready-to-use activities and worksheets · ${Tools.TOOLS.length} interactive classroom tools</p></div></div>
      <h2 class="sec-h">${icon('sparkle')} Interactive tools <small>— project on a screen or smart board</small></h2>
      <div class="tool-grid">${Tools.TOOLS.map((t) => `<a class="tool-card" href="#/tool/${t.id}"><span class="tool-ic">${icon(t.icon)}</span><b>${t.name}</b><small>${t.desc}</small></a>`).join('')}</div>
      <h2 class="sec-h">${icon('puzzle')} Activity library</h2>
      <div class="filters card">
        <div class="search-in">${icon('search')}<input class="input" id="a-q" placeholder="Search activities…" value="${esc(AF.q)}"></div>
        <select class="input" id="a-mode"><option value="">All formats</option>${['Worksheet', 'Group', 'Interactive'].map((m) => `<option ${AF.mode === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
      </div>
      <div class="chips cat-chips" id="a-cats"><button class="chip ${!AF.cat ? 'on' : ''}" data-c="">All</button>${cats.map((c) => `<button class="chip ${AF.cat === c ? 'on' : ''}" data-c="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="act-grid" id="a-grid"></div>`;
    const draw = () => {
      const q = AF.q.toLowerCase();
      const rows = A.filter((a) => (!AF.cat || a.cat === AF.cat) && (!AF.mode || a.mode === AF.mode) && (!q || [a.title, a.goal, a.cat, a.steps.join(' ')].join(' ').toLowerCase().includes(q)));
      $('#a-grid', el).innerHTML = rows.map((a) => `<button class="act-card" data-a="${a.id}">
        <div class="act-top"><span class="act-cat">${esc(a.cat)}</span><span class="act-n">#${parseInt(a.id.slice(1), 10)}</span></div>
        <b>${esc(a.title)}</b><p>${esc(a.goal)}</p>
        <div class="act-meta"><span>${icon('clock')}${a.mins} min</span><span>${icon('users')}Class ${esc(a.grades)}</span><span class="mode m-${a.mode.toLowerCase()}">${esc(a.mode)}</span>${a.ws ? `<span title="Printable worksheet">${icon('print')}</span>` : ''}${a.tool ? `<span title="Has interactive tool">${icon('sparkle')}</span>` : ''}</div></button>`).join('') || CB.emptyState('puzzle', 'No activities match', '');
      $$('[data-a]', el).forEach((b) => b.onclick = () => openActivity(b.dataset.a));
    };
    $('#a-q', el).oninput = (e) => { AF.q = e.target.value; draw(); };
    $('#a-mode', el).onchange = (e) => { AF.mode = e.target.value; draw(); };
    $('#a-cats', el).onclick = (e) => { const b = e.target.closest('[data-c]'); if (!b) return; AF.cat = b.dataset.c; $$('#a-cats .chip', el).forEach((c) => c.classList.toggle('on', c === b)); draw(); };
    draw();
  };

  function openActivity(id) {
    const a = window.ACTIVITIES.find((x) => x.id === id);
    const tool = a.tool && Tools.TOOLS.find((t) => t.id === a.tool);
    const used = CB.can('sessions') ? CB.D().sessions.filter((s) => s.activityId === a.id).length : 0;
    const m = openModal({
      title: a.title, size: 'lg',
      body: `<div class="row wrap mb"><span class="act-cat">${esc(a.cat)}</span><span class="tag">${icon('clock')} ${a.mins} min</span><span class="tag">Class ${esc(a.grades)}</span><span class="tag">${esc(a.mode)}</span>${used ? `<span class="tag">Used ${used}×</span>` : ''}</div>
        <p class="lead">${esc(a.goal)}</p>
        <p><b>Materials:</b> ${esc(a.materials)}</p>
        <h3 class="sub">Steps</h3><ol class="steps">${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
        <h3 class="sub">Reflection / debrief questions</h3><ul class="steps">${a.debrief.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
        ${a.ws ? `<h3 class="sub">Worksheet preview</h3><div class="ws-preview">${worksheetHTML(a, true)}</div>` : ''}`,
      footer: `${tool ? `<a class="btn" href="#/tool/${tool.id}${a.toolArg ? '?t=' + a.toolArg : ''}" data-close>${icon('sparkle')} Open ${esc(tool.name)}</a>` : ''}
        <button class="btn" id="ac-guide">${icon('print')} Print guide</button>
        ${a.ws ? `<button class="btn" id="ac-ws">${icon('print')} Print worksheet</button>` : ''}
        ${CB.can('sessions', 'edit') ? `<button class="btn primary" id="ac-log">${icon('note')} Log as session</button>` : ''}`,
    });
    const ws = m.querySelector('#ac-ws'); if (ws) ws.onclick = () => CB.printHTML(worksheetHTML(a), a.title + ' worksheet');
    m.querySelector('#ac-guide').onclick = () => CB.printHTML(`<h1>${esc(a.title)}</h1><p class="p-meta">${esc(a.cat)} · ${a.mins} minutes · Class ${esc(a.grades)} · ${esc(a.mode)}</p><p><b>Objective:</b> ${esc(a.goal)}</p><p><b>Materials:</b> ${esc(a.materials)}</p><h2>Steps</h2><ol>${a.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol><h2>Debrief questions</h2><ul>${a.debrief.map((s) => `<li>${esc(s)}</li>`).join('')}</ul><h2>Facilitator notes</h2><div class="p-lines">${'<div></div>'.repeat(6)}</div>`, a.title + ' guide');
    const lg = m.querySelector('#ac-log');
    if (lg) lg.onclick = () => {
      closeModal();
      const tag = { 'Stress & Anxiety': 'Anxiety', 'Study Skills & Exams': 'Exam stress', 'Career Exploration': 'Career', 'Friendships & Peers': 'Peer', 'Family': 'Family', 'Self-Esteem': 'Self-esteem', 'Bullying & Safety': 'Bullying', 'Conflict Resolution': 'Behaviour', 'Art Therapy': 'Self-esteem' }[a.cat];
      CB.openSessionForm({ prefill: { activityId: a.id, type: a.mode === 'Group' || a.mode === 'Interactive' ? 'Group' : 'Individual', duration: a.mins, template: 'free', tags: tag && CB.D().settings.tags.includes(tag) ? [tag] : [], fields: { Notes: `Activity used: ${a.title} (#${parseInt(a.id.slice(1), 10)})\nObjective: ${a.goal}\n\nObservations: ` }, studentIds: [] } });
    };
  }

  function worksheetHTML(a, preview) {
    const lines = (n) => `<div class="ws-lines">${'<div></div>'.repeat(n)}</div>`;
    const parts = (a.ws || []).map((w) => {
      switch (w.t) {
        case 'text': return `<p class="ws-text">${esc(w.v)}</p>`;
        case 'lines': return `<div class="ws-q">${w.q ? `<b>${esc(w.q)}</b>` : ''}${lines(w.n || 2)}</div>`;
        case 'scale': return `<div class="ws-q"><b>${esc(w.q)}</b><div class="ws-scale"><span>${esc(w.min || '')}</span>${Array.from({ length: 10 }, (_, i) => `<i>${i + 1}</i>`).join('')}<span>${esc(w.max || '')}</span></div></div>`;
        case 'boxes': return `<div class="ws-boxes" style="grid-template-columns:repeat(${w.cols || 2},1fr)">${w.items.map((t) => `<div class="ws-box" style="min-height:${w.h || 100}px"><b>${esc(t)}</b></div>`).join('')}</div>`;
        case 'table': return `<table class="ws-table"><tr>${w.cols.map((c) => `<th>${esc(c)}</th>`).join('')}</tr>${Array.from({ length: w.rows }, () => `<tr>${w.cols.map(() => '<td></td>').join('')}</tr>`).join('')}</table>`;
        case 'check': return `<div class="ws-q"><b>${esc(w.q)}</b><div class="ws-check">${w.items.map((t) => `<span><i></i>${esc(t)}</span>`).join('')}</div></div>`;
        case 'draw': return `<div class="ws-q"><b>${esc(w.q)}</b><div class="ws-draw" style="height:${preview ? Math.min(w.h, 140) : w.h}px"></div></div>`;
        case 'faces': return `<div class="ws-q"><b>${esc(w.q)}</b><div class="ws-faces">${['😄', '🙂', '😐', '😟', '😢'].map((f) => `<span>${f}</span>`).join('')}</div></div>`;
        default: return '';
      }
    }).join('');
    return `<div class="ws">${preview ? '' : `<h1>${esc(a.title)}</h1><div class="ws-namebar"><span>Name: ____________________</span><span>Class: ________</span><span>Date: ____________</span></div>`}${parts}</div>`;
  }

  V.tool = function (el, id, params) {
    const t = Tools.TOOLS.find((x) => x.id === id);
    if (!t) { el.innerHTML = CB.emptyState('puzzle', 'Tool not found', ''); return; }
    const related = window.ACTIVITIES.filter((a) => a.tool === id);
    el.innerHTML = `${t.art ? `<a href="#/games" class="back">${icon('chevl')} Games &amp; art</a>` : `<a href="#/activities" class="back">${icon('chevl')} Activities &amp; tools</a>`}
      <div class="page-h"><div><h1>${icon(t.icon)} ${t.name}</h1><p class="muted">${t.desc}</p></div><button class="btn" id="tl-fs">${icon('present')} Full screen</button></div>
      <div class="card tool-stage" id="tool-stage"></div>
      ${related.length ? `<p class="muted">Used in activities: ${related.map((a) => `<b>${esc(a.title)}</b>`).join(', ')}</p>` : ''}`;
    const stage = $('#tool-stage', el);
    $('#tl-fs', el).onclick = () => { if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {}); };
    return Tools.mount(id, stage, params);
  };

  // =============== GAMES & ART (kid zone) ===============
  V.games = function (el) {
    const art = Tools.TOOLS.filter((t) => t.art);
    const artActs = window.ACTIVITIES.filter((a) => a.cat === 'Art Therapy');
    el.innerHTML = `<div class="page-h"><div><h1>🎮 Games &amp; art</h1><p class="muted">${Games.GAMES.length} games children love · art therapy studio · works on a smart board or touch screen</p></div>
      <button class="btn" id="g-mute">${Games.muted() ? '🔇 Sound off' : '🔊 Sound on'}</button></div>
      <div class="games-grid">${Games.GAMES.map((g) => `<a class="game-card ${g.color}" href="#/game/${g.id}"><span class="g-emoji">${g.emoji}</span><b>${esc(g.name)}</b><small>${esc(g.desc)}</small><span class="g-meta"><span>Age ${g.age}</span><span>${esc(g.skill)}</span></span><span class="g-play">${icon('play')} Play</span></a>`).join('')}</div>
      <h2 class="sec-h">🎨 Art therapy studio</h2>
      <div class="games-grid art">${art.map((t) => `<a class="game-card g-art" href="#/tool/${t.id}"><span class="g-emoji">${t.id === 'mandala' ? '🌀' : '🖌️'}</span><b>${esc(t.name)}</b><small>${esc(t.desc)}</small><span class="g-play">${icon('edit')} Open</span></a>`).join('')}</div>
      <h2 class="sec-h">🖍️ Art therapy activities &amp; worksheets <small>— ${artActs.length} printable</small></h2>
      <div class="act-grid">${artActs.map((a) => `<button class="act-card" data-a="${a.id}"><div class="act-top"><span class="act-cat">Art Therapy</span><span class="act-n">#${parseInt(a.id.slice(1), 10)}</span></div><b>${esc(a.title)}</b><p>${esc(a.goal)}</p><div class="act-meta"><span>${icon('clock')}${a.mins} min</span><span>${icon('users')}Class ${esc(a.grades)}</span>${a.tool ? `<span class="link" data-draw="#/tool/${a.tool}${a.toolArg ? '?t=' + a.toolArg : ''}">${icon('edit')} Draw on screen</span>` : ''}</div></button>`).join('')}</div>`;
    $$('[data-a]', el).forEach((b) => b.onclick = () => openActivity(b.dataset.a));
    $$('[data-draw]', el).forEach((s) => s.onclick = (e) => { e.stopPropagation(); location.hash = s.dataset.draw; });
    $('#g-mute', el).onclick = () => { Games.setMuted(!Games.muted()); CB.refresh(); };
  };
  V.game = function (el, id) {
    const g = Games.GAMES.find((x) => x.id === id);
    if (!g) { el.innerHTML = CB.emptyState('puzzle', 'Game not found', ''); return; }
    el.innerHTML = `<a href="#/games" class="back">${icon('chevl')} Games &amp; art</a>
      <div class="page-h"><div><h1>${g.emoji} ${esc(g.name)}</h1><p class="muted">${esc(g.desc)} · Skill: ${esc(g.skill)}</p></div>
      <div class="row"><button class="btn" id="g-mute">${Games.muted() ? '🔇' : '🔊'}</button><button class="btn" id="g-fs">${icon('present')} Full screen</button></div></div>
      <div class="card game-stage ${g.color}" id="game-stage"></div>`;
    const stage = $('#game-stage', el);
    $('#g-fs', el).onclick = () => { if (stage.requestFullscreen) stage.requestFullscreen().catch(() => {}); };
    $('#g-mute', el).onclick = (e) => { Games.setMuted(!Games.muted()); e.currentTarget.textContent = Games.muted() ? '🔇' : '🔊'; };
    return Games.mount(id, stage);
  };

  // =============== USERS & ACCESS (admin) ===============
  V.users = function (el) {
    const d = CB.D();
    const users = CB.META.users.map((m) => ({ m, p: d.users[m.id] || {} }));
    const lvl = (p) => CB.MODULES.filter((x) => (p.perms || {})[x.k] && p.perms[x.k] !== 'none').map((x) => x.label.split(' ')[0] + (p.perms[x.k] === 'view' ? ' (view)' : '')).join(', ') || 'No access';
    el.innerHTML = `<div class="page-h"><div><h1>Users &amp; access</h1><p class="muted">Create logins and choose exactly what each person can see or change.</p></div>
      <button class="btn primary" id="u-add">${icon('plus')} New login</button></div>
      <div class="card flush"><div class="table-wrap"><table class="tbl"><thead><tr><th>User</th><th>Role</th><th>Can access</th><th>Privacy</th><th>Last sign-in</th><th>Status</th><th></th></tr></thead><tbody>
      ${users.map(({ m, p }) => `<tr><td><div class="cell-name"><span class="avatar sm">${esc((p.displayName || m.username)[0].toUpperCase())}</span><div><b>${esc(p.displayName || m.username)}</b><div class="muted sm">@${esc(m.username)}</div></div></div></td>
        <td>${esc((CB.PRESETS[p.role] || CB.PRESETS.custom).label)}</td><td class="sm">${esc(p.role === 'admin' ? 'Everything + user management' : CB.MODULES.every((x) => (p.perms || {})[x.k] === 'edit') ? 'Everything (except user management)' : lvl(p))}</td>
        <td class="sm">${p.anonymise ? `<span class="badge info">${icon('eye')}Names hidden</span>` : ''} ${p.confidential ? `<span class="badge muted">${icon('lock')}Confidential notes</span>` : ''}</td>
        <td class="sm nowrap">${p.lastLogin ? fmtDate(isoDate(new Date(p.lastLogin))) : 'Never'}</td>
        <td>${p.active ? '<span class="badge good">Active</span>' : '<span class="badge muted">Deactivated</span>'}</td>
        <td class="nowrap"><button class="icon-btn sm" data-ue="${m.id}" title="Edit access">${icon('edit')}</button><button class="icon-btn sm" data-up="${m.id}" title="Reset password">${icon('key')}</button>${m.id !== CB.S.user.id ? `<button class="icon-btn sm" data-ud="${m.id}" title="Delete login">${icon('trash')}</button>` : ''}</td></tr>`).join('')}
      </tbody></table></div></div>
      <section class="card"><div class="card-h"><h2>${icon('shield')} Activity log</h2><span class="muted sm">latest 150 events</span></div>
        <div class="table-wrap audit"><table class="tbl"><thead><tr><th>When</th><th>User</th><th>Action</th></tr></thead><tbody>
        ${d.audit.slice(-150).reverse().map((a) => `<tr><td class="nowrap sm">${new Date(a.t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>@${esc(a.u)}</td><td>${esc(a.a)}</td></tr>`).join('')}
        </tbody></table></div></section>`;
    $('#u-add', el).onclick = () => userForm();
    $$('[data-ue]', el).forEach((b) => b.onclick = () => userForm(b.dataset.ue));
    $$('[data-up]', el).forEach((b) => b.onclick = () => resetPw(b.dataset.up));
    $$('[data-ud]', el).forEach((b) => b.onclick = () => delUser(b.dataset.ud));
  };

  function activeAdmins(exceptId) {
    const d = CB.D();
    return CB.META.users.filter((m) => m.id !== exceptId && d.users[m.id] && d.users[m.id].role === 'admin' && d.users[m.id].active).length;
  }

  function userForm(id) {
    const d = CB.D();
    const isNew = !id;
    const meta = id ? CB.META.users.find((m) => m.id === id) : null;
    const p = id ? d.users[id] : { role: 'senior', ...JSON.parse(JSON.stringify(CB.PRESETS.senior)), active: true, displayName: '', username: '' };
    const m = openModal({
      title: isNew ? 'New login' : 'Edit login – ' + p.displayName, size: 'lg',
      body: `<form id="uf" autocomplete="off">
        <div class="grid3">
          <label class="fld"><span>Full name *</span><input class="input" name="displayName" required value="${esc(p.displayName)}"></label>
          <label class="fld"><span>Username *</span><input class="input" name="username" required value="${esc(meta ? meta.username : '')}" autocapitalize="off"></label>
          <label class="fld"><span>Role (sets a starting point)</span><select class="input" name="role" id="uf-role">${Object.entries(CB.PRESETS).map(([k, v]) => `<option value="${k}" ${p.role === k ? 'selected' : ''}>${v.label}</option>`).join('')}</select></label>
        </div>
        ${isNew ? `<div class="grid2"><label class="fld"><span>Password / PIN * (min 4)</span><input class="input" type="password" name="p1" required minlength="4" autocomplete="new-password"></label><label class="fld"><span>Confirm password *</span><input class="input" type="password" name="p2" required></label></div>` : ''}
        <h3 class="sub">What can this person see and do?</h3>
        <div class="table-wrap"><table class="tbl perm"><thead><tr><th>Section</th><th>No access</th><th>View only</th><th>View &amp; edit</th></tr></thead><tbody id="uf-perm"></tbody></table></div>
        <div class="stack mt">
          <label class="check"><input type="checkbox" name="anonymise" id="uf-anon"> ${icon('eye')} <span><b>Hide student identities</b> – show codes (e.g. S-4F2A) instead of names, and hide phone numbers &amp; addresses. Recommended for principal / senior staff.</span></label>
          <label class="check"><input type="checkbox" name="confidential" id="uf-conf"> ${icon('lock')} <span><b>Can read confidential notes</b> – session notes marked confidential and background summaries.</span></label>
          <label class="check"><input type="checkbox" name="mustChange" ${p.mustChange || isNew ? 'checked' : ''}> ${icon('key')} Ask them to set their own password at first sign-in</label>
          ${!isNew ? `<label class="check"><input type="checkbox" name="active" ${p.active ? 'checked' : ''} ${id === CB.S.user.id ? 'disabled' : ''}> Login is active</label>` : ''}
        </div>
        <div class="err" id="uf-err"></div></form>`,
      footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="uf-save">${icon('check')} ${isNew ? 'Create login' : 'Save changes'}</button>`,
    });
    const permBody = $('#uf-perm', m);
    const drawPerm = (perms, locked) => {
      permBody.innerHTML = CB.MODULES.map((x) => `<tr><td>${icon(x.icon)} ${x.label}</td>${['none', 'view', 'edit'].map((l) => `<td><input type="radio" name="perm_${x.k}" value="${l}" ${(perms[x.k] || 'none') === l ? 'checked' : ''} ${locked ? 'disabled' : ''} aria-label="${x.label}: ${l}"></td>`).join('')}</tr>`).join('');
    };
    const applyPreset = (role, keepCurrent) => {
      const P = CB.PRESETS[role];
      const perms = keepCurrent ? p.perms : P.perms;
      drawPerm(perms, role === 'admin');
      $('#uf-anon', m).checked = keepCurrent ? !!p.anonymise : P.anonymise;
      $('#uf-conf', m).checked = keepCurrent ? !!p.confidential : P.confidential;
    };
    applyPreset(p.role, !isNew);
    $('#uf-role', m).onchange = (e) => applyPreset(e.target.value, false);
    $('#uf-save', m).onclick = async () => {
      const form = $('#uf', m); const err = $('#uf-err', m);
      if (!form.reportValidity()) return;
      const f = formData(form);
      const uname = f.username.trim();
      if (!/^[A-Za-z0-9._-]{2,32}$/.test(uname)) return (err.textContent = 'Username: 2-32 letters, numbers, dot, dash or underscore.');
      if (CB.META.users.some((x) => x.username.toLowerCase() === uname.toLowerCase() && x.id !== id)) return (err.textContent = 'That username is already taken.');
      const perms = f.role === 'admin' ? { ...CB.PRESETS.admin.perms } : Object.fromEntries(CB.MODULES.map((x) => [x.k, f['perm_' + x.k] || 'none']));
      const active = isNew ? true : (id === CB.S.user.id ? true : !!f.active);
      if (!isNew && p.role === 'admin' && (f.role !== 'admin' || !active) && activeAdmins(id) === 0) return (err.textContent = 'At least one active administrator is required.');
      const prof = { displayName: f.displayName.trim(), username: uname, role: f.role, perms, anonymise: !!f.anonymise, confidential: !!f.confidential, mustChange: !!f.mustChange, active };
      if (isNew) {
        if (f.p1.length < 4) return (err.textContent = 'Password must be at least 4 characters.');
        if (f.p1 !== f.p2) return (err.textContent = 'Passwords do not match.');
        const nid = Store.uid();
        CB.META.users.push({ id: nid, username: uname, ...(await Store.wrapDEK(CB.S.dek, f.p1)) });
        d.users[nid] = { id: nid, created: Date.now(), ...prof };
        CB.audit(`Created login @${uname} (${CB.PRESETS[f.role].label})`);
      } else {
        meta.username = uname;
        Object.assign(d.users[id], prof);
        if (id === CB.S.user.id) CB.S.user = d.users[id];
        CB.audit(`Updated access for @${uname}`);
      }
      await CB.saveMeta(); CB.commit();
      closeModal(); toast(isNew ? 'Login created' : 'Access updated');
      if (id === CB.S.user.id) { CB.renderShell(); }
      CB.refresh();
    };
  }

  function resetPw(id) {
    const meta = CB.META.users.find((x) => x.id === id);
    const m = openModal({
      title: 'Reset password – @' + meta.username, size: 'sm',
      body: `<form id="rp"><label class="fld"><span>New password / PIN</span><input class="input" type="password" name="p1" required minlength="4" autocomplete="new-password"></label>
        <label class="fld"><span>Confirm</span><input class="input" type="password" name="p2" required></label>
        <label class="check"><input type="checkbox" name="must" checked> Ask them to change it at next sign-in</label><div class="err" id="rp-err"></div></form>`,
      footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="rp-go">Reset</button>`,
    });
    $('#rp-go', m).onclick = async () => {
      const f = formData($('#rp', m)); const err = $('#rp-err', m);
      if ((f.p1 || '').length < 4) return (err.textContent = 'At least 4 characters.');
      if (f.p1 !== f.p2) return (err.textContent = 'Passwords do not match.');
      Object.assign(meta, await Store.wrapDEK(CB.S.dek, f.p1));
      CB.D().users[id].mustChange = !!f.must && id !== CB.S.user.id;
      CB.audit('Reset password for @' + meta.username);
      await CB.saveMeta(); CB.commit(); closeModal(); toast('Password reset');
    };
  }

  async function delUser(id) {
    const meta = CB.META.users.find((x) => x.id === id);
    const p = CB.D().users[id];
    if (p && p.role === 'admin' && activeAdmins(id) === 0) return toast('At least one active administrator is required.', 'err');
    if (!(await confirmBox(`Delete the login <b>@${esc(meta.username)}</b>? Their records stay; only the login is removed.`, { ok: 'Delete login', danger: true }))) return;
    CB.META.users = CB.META.users.filter((x) => x.id !== id);
    delete CB.D().users[id];
    CB.audit('Deleted login @' + meta.username);
    await CB.saveMeta(); CB.commit(); toast('Login deleted'); CB.refresh();
  }

  // =============== SETTINGS ===============
  V.settings = function (el) {
    const d = CB.D(), set = d.settings;
    const canE = CB.can('settings', 'edit');
    const dis = canE ? '' : 'disabled';
    const demoCount = d.students.filter((s) => s.demo).length;
    el.innerHTML = `<div class="page-h"><div><h1>Settings</h1><p class="muted">School details, lists, templates and year-end tasks</p></div></div>
      <div class="cols">
      <section class="card"><h2 class="card-t">${icon('home')} School</h2><form id="set-school">
        <label class="fld"><span>Name of the school</span><input class="input" name="schoolName" value="${esc(set.schoolName)}" required ${dis}></label>
        <label class="fld"><span>Motto</span><input class="input" name="motto" value="${esc(set.motto)}" ${dis}></label>
        <label class="fld"><span>Counsellor name (shown on reports)</span><input class="input" name="counsellorName" value="${esc(set.counsellorName)}" ${dis}></label>
        <div class="grid2">
          <label class="fld"><span>Current academic year</span><input class="input" name="academicYear" value="${esc(set.academicYear)}" pattern="\\d{4}-\\d{2}" ${dis}></label>
          <label class="fld"><span>Academic year starts in</span><select class="input" name="ayStartMonth" ${dis}>${UI.MONTHS_FULL.map((mn, i) => `<option value="${i + 1}" ${+set.ayStartMonth === i + 1 ? 'selected' : ''}>${mn}</option>`).join('')}</select></label>
        </div>
        <label class="fld"><span>Auto-lock after inactivity</span><select class="input" name="autoLockMin" ${dis}>${[[1, '1 minute'], [2, '2 minutes'], [5, '5 minutes'], [10, '10 minutes'], [15, '15 minutes'], [30, '30 minutes'], [0, 'Never (not recommended)']].map(([v, l]) => `<option value="${v}" ${+set.autoLockMin === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        ${canE ? `<button class="btn primary">${icon('check')} Save</button>` : ''}</form></section>

      <section class="card"><h2 class="card-t">${icon('tag')} Lists <small>one item per line</small></h2><form id="set-lists">
        <div class="grid2">
          <label class="fld"><span>Issue tags</span><textarea class="input" name="tags" rows="8" ${dis}>${esc(set.tags.join('\n'))}</textarea></label>
          <label class="fld"><span>Classes (lowest → highest, used for promotion)</span><textarea class="input" name="classes" rows="8" ${dis}>${esc(set.classes.join('\n'))}</textarea></label>
          <label class="fld"><span>Session types</span><textarea class="input" name="sessionTypes" rows="5" ${dis}>${esc(set.sessionTypes.join('\n'))}</textarea></label>
          <label class="fld"><span>Follow-up types</span><textarea class="input" name="fuKinds" rows="5" ${dis}>${esc(set.fuKinds.join('\n'))}</textarea></label>
        </div>${canE ? `<button class="btn primary">${icon('check')} Save lists</button>` : ''}</form></section>

      <section class="card"><h2 class="card-t">${icon('note')} Note templates &amp; quick phrases</h2><form id="set-tmpl">
        <label class="fld"><span>Templates – one per line as <code>Name: Field 1 | Field 2 | …</code></span><textarea class="input mono" name="templates" rows="5" ${dis}>${esc(set.templates.map((t) => `${t.name}: ${t.fields.join(' | ')}`).join('\n'))}</textarea></label>
        <label class="fld"><span>Quick phrases (one per line)</span><textarea class="input" name="snippets" rows="6" ${dis}>${esc(set.snippets.join('\n'))}</textarea></label>
        ${canE ? `<button class="btn primary">${icon('check')} Save templates</button>` : ''}</form></section>

      <section class="card"><h2 class="card-t">${icon('calendar')} Year-end</h2>
        <p>At the start of a new academic year, promote every active student to the next class. Students in the last class (${esc(set.classes[set.classes.length - 1] || '')}) are archived as <i>passed out</i>. Their records are kept.</p>
        ${canE ? `<button class="btn primary" id="set-roll">${icon('refresh')} Year rollover (promote classes)…</button>` : ''}
        <hr><p>Archive a whole class at once (e.g. students who left).</p>
        ${canE ? `<div class="row"><select class="input" id="arch-cls">${set.classes.map((c) => `<option>${esc(c)}</option>`).join('')}</select><button class="btn" id="arch-go">${icon('archive')} Archive class</button></div>` : ''}
        <hr><p>Archived / passed-out students: <b>${d.students.filter((s) => s.archived).length}</b>. <a href="#/students" id="see-arch">View archive</a></p>
      </section>

      ${canE && demoCount ? `<section class="card"><h2 class="card-t">${icon('sparkle')} Sample data</h2><p>${demoCount} sample students were added during setup.</p><button class="btn" id="demo-rm">${icon('trash')} Remove sample data</button></section>` : ''}
      ${CB.can('admin') ? `<section class="card danger-card"><h2 class="card-t">${icon('trash')} Danger zone</h2><p>Erase CounselBook and all data from this computer. Make a backup first.</p><button class="btn danger" id="erase">Erase everything…</button></section>` : ''}
      </div>`;
    if (!canE) return;
    const lines = (v) => String(v || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    $('#set-school', el).onsubmit = async (e) => {
      e.preventDefault();
      const f = formData(e.target);
      if (!/^\d{4}-\d{2}$/.test(f.academicYear)) return toast('Academic year should look like 2026-27', 'warn');
      Object.assign(set, { schoolName: f.schoolName.trim(), motto: f.motto.trim(), counsellorName: f.counsellorName.trim(), academicYear: f.academicYear, ayStartMonth: +f.ayStartMonth, autoLockMin: +f.autoLockMin });
      CB.META.school = set.schoolName; await CB.saveMeta();
      CB.audit('Updated school settings'); CB.commit(); toast('Settings saved'); CB.renderShell(); CB.refresh();
    };
    $('#set-lists', el).onsubmit = (e) => {
      e.preventDefault();
      const f = formData(e.target);
      const L = { tags: lines(f.tags), classes: lines(f.classes), sessionTypes: lines(f.sessionTypes), fuKinds: lines(f.fuKinds) };
      if (Object.values(L).some((x) => !x.length)) return toast('Each list needs at least one item.', 'warn');
      Object.assign(set, L); CB.commit(); toast('Lists saved');
    };
    $('#set-tmpl', el).onsubmit = (e) => {
      e.preventDefault();
      const f = formData(e.target);
      const t = lines(f.templates).map((ln) => {
        const [name, rest] = ln.includes(':') ? [ln.slice(0, ln.indexOf(':')), ln.slice(ln.indexOf(':') + 1)] : [ln, 'Notes'];
        const fields = rest.split('|').map((x) => x.trim()).filter(Boolean);
        const old = set.templates.find((q) => q.name === name.trim());
        return { id: old ? old.id : name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Store.uid().slice(-3), name: name.trim(), fields: fields.length ? fields : ['Notes'] };
      });
      if (!t.length) return toast('Keep at least one template.', 'warn');
      set.templates = t; set.snippets = lines(f.snippets); CB.commit(); toast('Templates saved');
    };
    $('#set-roll', el).onclick = rollover;
    $('#see-arch', el).onclick = () => { CB.SF.status = 'archived'; };
    $('#arch-go', el).onclick = async () => {
      const c = $('#arch-cls', el).value;
      const list = d.students.filter((s) => !s.archived && s.cls === c);
      if (!list.length) return toast('No active students in that class.', 'warn');
      if (!(await confirmBox(`Archive all <b>${list.length}</b> active students in class <b>${esc(c)}</b>?`, { ok: 'Archive' }))) return;
      list.forEach((s) => { s.archived = true; s.archivedReason = 'Class archived'; (s.history = s.history || []).push({ t: Date.now(), a: 'Archived with class ' + c }); });
      CB.audit(`Archived class ${c} (${list.length})`); CB.commit(); toast(`${list.length} students archived`); CB.refresh();
    };
    const dr = $('#demo-rm', el);
    if (dr) dr.onclick = async () => {
      if (!(await confirmBox('Remove all sample students and their sessions and follow-ups?', { ok: 'Remove', danger: true }))) return;
      const ids = new Set(d.students.filter((s) => s.demo).map((s) => s.id));
      d.students = d.students.filter((s) => !s.demo);
      d.sessions = d.sessions.filter((x) => !x.demo);
      d.followups = d.followups.filter((f) => !ids.has(f.studentId) && !f.demo);
      CB.audit('Removed sample data'); CB.commit(); toast('Sample data removed'); CB.refresh();
    };
    const er = $('#erase', el);
    if (er) er.onclick = () => {
      const m = openModal({
        title: 'Erase everything', size: 'sm',
        body: `<p>This permanently deletes all students, notes, files and logins from this computer.</p><label class="fld"><span>Type <b>ERASE</b> to confirm</span><input class="input" id="er-in"></label>`,
        footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="er-go">Erase</button>`,
      });
      $('#er-go', m).onclick = async () => {
        if ($('#er-in', m).value !== 'ERASE') return toast('Type ERASE in capitals.', 'warn');
        await Store.clearAll(); CB.S = null; location.hash = ''; location.reload();
      };
    };
  };

  function rollover() {
    const d = CB.D(), set = d.settings;
    const list = d.students.filter((s) => !s.archived).sort((a, b) => CB.classIdx(a.cls) - CB.classIdx(b.cls) || CB.sName(a).localeCompare(CB.sName(b)));
    const last = set.classes[set.classes.length - 1];
    const nextOf = (c) => { const i = set.classes.indexOf(c); return i < 0 ? c : i === set.classes.length - 1 ? null : set.classes[i + 1]; };
    const nextAY = (() => { const y = parseInt(set.academicYear, 10) + 1; return `${y}-${String((y + 1) % 100).padStart(2, '0')}`; })();
    if (!list.length) return toast('No active students to promote.', 'warn');
    const m = openModal({
      title: 'Year rollover – promote classes', size: 'lg',
      body: `<p>Academic year will change from <b>${esc(set.academicYear)}</b> to <b>${nextAY}</b>. Untick anyone who is <b>not</b> moving up (e.g. detained). Students in class <b>${esc(last)}</b> will be archived as passed out.</p>
        <p class="hint">Tip: make a backup first. Open / closed case status is kept.</p>
        <div class="table-wrap roll"><table class="tbl"><thead><tr><th><input type="checkbox" id="rl-all" checked></th><th>Student</th><th>Now</th><th>After</th></tr></thead><tbody>
        ${list.map((s) => { const n = nextOf(s.cls); return `<tr><td><input type="checkbox" class="rl" value="${s.id}" checked></td><td>${esc(CB.sName(s))}</td><td>${esc(s.cls || '—')}</td><td>${n === null ? `<span class="badge muted">${icon('archive')}Passed out</span>` : n === s.cls ? '<span class="muted">unchanged (class not in list)</span>' : esc(n)}</td></tr>`; }).join('')}
        </tbody></table></div>`,
      footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="rl-go">${icon('refresh')} Promote &amp; start ${nextAY}</button>`,
    });
    $('#rl-all', m).onchange = (e) => $$('.rl', m).forEach((c) => { c.checked = e.target.checked; });
    $('#rl-go', m).onclick = async () => {
      const ids = new Set($$('.rl', m).filter((c) => c.checked).map((c) => c.value));
      let promoted = 0, passed = 0;
      list.forEach((s) => {
        if (!ids.has(s.id)) return;
        const n = nextOf(s.cls);
        if (n === null) { s.archived = true; s.archivedReason = 'Passed out ' + set.academicYear; (s.history = s.history || []).push({ t: Date.now(), a: 'Passed out (' + set.academicYear + ')' }); passed++; }
        else if (n !== s.cls) { (s.history = s.history || []).push({ t: Date.now(), a: `Promoted from ${s.cls} to ${n}` }); s.cls = n; promoted++; }
      });
      set.academicYear = nextAY;
      CB.audit(`Year rollover to ${nextAY}: ${promoted} promoted, ${passed} passed out`);
      CB.commit(); closeModal(); toast(`${promoted} promoted, ${passed} archived as passed out. Welcome to ${nextAY}!`, 'ok', 5000); CB.refresh();
    };
  }

  // =============== BACKUP & RESTORE ===============
  V.backup = function (el) {
    const d = CB.D(), lb = d.settings.lastBackup;
    const canE = CB.can('backup', 'edit');
    el.innerHTML = `<div class="page-h"><div><h1>Backup &amp; restore</h1><p class="muted">Backups are encrypted – they can only be opened with a CounselBook login.</p></div></div>
      <div class="cols">
        <section class="card"><h2 class="card-t">${icon('save')} Create a backup</h2>
          <p>Last backup: <b>${lb ? new Date(lb).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : 'never'}</b></p>
          <ol class="steps"><li>Plug in your USB drive (or use your Google Drive folder if Google Drive for desktop is installed).</li><li>Click <b>Create encrypted backup</b> and choose the USB / Google Drive folder.</li><li>Keep at least one backup away from this computer.</li></ol>
          ${canE ? `<button class="btn primary lg" id="bk-go">${icon('download')} Create encrypted backup</button>` : '<p class="muted">Your login can view but not create backups.</p>'}
          <p class="hint">Includes all students, notes, follow-ups, attachments, logins and settings. The file is useless without a valid password.</p>
        </section>
        ${canE ? `<section class="card"><h2 class="card-t">${icon('upload')} Restore from a backup</h2>
          <p>Replace all data on this computer with a backup file. Useful when moving to a new computer.</p>
          <p class="banner warn sm-b">${icon('bell')} Everything currently on this computer will be replaced.</p>
          <button class="btn" id="rs-go">${icon('upload')} Choose backup file…</button></section>` : ''}
        ${CB.can('admin') ? `<section class="card"><h2 class="card-t">${icon('key')} Recovery key</h2><p>Lost the recovery key from setup? Create a new one. The old key will stop working.</p><button class="btn" id="rk-new">${icon('key')} Create new recovery key</button></section>` : ''}
        <section class="card"><h2 class="card-t">${icon('shield')} How your data is protected</h2>
          <ul class="steps"><li>All records are encrypted with AES-256 on this computer.</li><li>Each login has its own password; nobody (not even the admin) can read a password.</li><li>CounselBook never uses the internet. Nothing is uploaded.</li><li>The app locks itself after ${d.settings.autoLockMin || 0} minutes of inactivity.</li><li>Do not clear Microsoft Edge's “site data / cookies” for all time – that would remove the local copy. Keep regular backups.</li></ul></section>
      </div>`;
    const b = $('#bk-go', el); if (b) b.onclick = makeBackup;
    const r = $('#rs-go', el); if (r) r.onclick = restoreBackup;
    const k = $('#rk-new', el);
    if (k) k.onclick = async () => {
      if (!(await confirmBox('Create a new recovery key? The old one will stop working.', { ok: 'Create new key' }))) return;
      const key = Store.makeRecoveryKey();
      CB.META.recovery = await Store.wrapDEK(CB.S.dek, Store.normRecovery(key));
      await CB.saveMeta(); CB.audit('Created new recovery key'); CB.commit();
      CB.showRecovery(key, () => {});
    };
  };

  async function makeBackup() {
    toast('Preparing encrypted backup…', 'ok', 1500);
    await CB.commit();
    const files = await Store.fileAll();
    const payload = { app: 'CounselBook', format: 1, created: new Date().toISOString(), school: CB.META.school, meta: CB.META, data: await Store.kvGet('data'), files };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/octet-stream' });
    const name = `CounselBook-backup-${isoDate()}.cbk`;
    let saved = false;
    if (window.showSaveFilePicker) {
      try {
        const h = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'CounselBook backup', accept: { 'application/octet-stream': ['.cbk'] } }] });
        const w = await h.createWritable(); await w.write(blob); await w.close(); saved = true;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    if (!saved) UI.download(name, blob);
    CB.D().settings.lastBackup = Date.now();
    CB.audit('Created backup'); CB.commit();
    toast(saved ? 'Backup saved.' : 'Backup saved to your Downloads folder – copy it to your USB drive.', 'ok', 5000);
    CB.refresh();
  }

  function restoreBackup() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.cbk,application/json,application/octet-stream';
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      let bk;
      try { bk = JSON.parse(await file.text()); if (bk.app !== 'CounselBook' || !bk.meta || !bk.data) throw new Error(); } catch (e) { return toast('This is not a CounselBook backup file.', 'err'); }
      const m = openModal({
        title: 'Restore backup', size: 'sm',
        body: `<p>Backup from <b>${esc(bk.school || '')}</b>, created ${esc(new Date(bk.created).toLocaleString('en-GB'))}.</p><p>Sign in with a login <b>from the backup</b> to confirm:</p>
          <form id="rsf"><label class="fld"><span>Username</span><input class="input" name="u" required></label><label class="fld"><span>Password</span><input class="input" type="password" name="p" required></label><div class="err" id="rs-err"></div></form>`,
        footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn danger" id="rs-ok">Replace data &amp; restore</button>`,
      });
      $('#rs-ok', m).onclick = async () => {
        const f = formData($('#rsf', m)); const err = $('#rs-err', m);
        const rec = bk.meta.users.find((x) => x.username.toLowerCase() === f.u.trim().toLowerCase());
        try { if (!rec) throw new Error(); const dek = await Store.unwrapDEK(rec, f.p); await Store.decryptJSON(dek, bk.data); } catch (e) { return (err.textContent = 'Username or password is not valid for this backup.'); }
        $('#rs-ok', m).disabled = true; $('#rs-ok', m).textContent = 'Restoring…';
        await Store.clearAll();
        await Store.kvSet('vault', bk.meta);
        await Store.kvSet('data', bk.data);
        for (const x of bk.files || []) await Store.fileSet(x.id, x.rec);
        CB.META = bk.meta;
        closeModal();
        CB.S = null;
        location.hash = '';
        CB.renderLogin('Backup restored. Please sign in.', rec.username);
      };
    };
    inp.click();
  }

  // =============== DEMO DATA ===============
  CB.addDemoData = function (data) {
    const set = data.settings;
    const first = ['Aarav', 'Diya', 'Kabir', 'Ananya', 'Vihaan', 'Ishita', 'Arjun', 'Meera', 'Rohan', 'Saanvi', 'Aditya', 'Kavya', 'Reyansh', 'Tara', 'Neel', 'Zoya', 'Dev', 'Riya'];
    const last = ['Sharma', 'Gill', 'Singh', 'Verma', 'Bedi', 'Kapoor', 'Sandhu', 'Mehta', 'Grewal', 'Malhotra', 'Bajwa', 'Arora', 'Dhillon', 'Chawla', 'Khanna', 'Sidhu', 'Bansal', 'Joshi'];
    const classes = ['6', '7', '8', '9', '9', '10', '10', '11', '12', '8', '7', '11', '12', '10', '9', '6', '11', '12'];
    const R = (n) => Math.floor(Math.random() * n);
    const pick = (a) => a[R(a.length)];
    const ay = CB.ayRange(set.academicYear, set.ayStartMonth);
    const today = isoDate();
    const span = Math.max(30, UI.daysBetween(ay.from, today));
    first.forEach((fn, i) => {
      const tags = [...new Set([pick(set.tags.slice(0, 7)), ...(R(2) ? [pick(set.tags.slice(0, 9))] : [])])];
      const s = {
        id: Store.uid() + i, demo: true, name: `${fn} ${last[i]}`, admNo: String(4100 + i * 7), cls: classes[i], section: pick(['A', 'B', 'C']),
        gender: i % 2 ? 'Female' : 'Male', contact: '', parentName: `Mr./Mrs. ${last[i]}`, parentPhone: `98${String(10000000 + R(89999999))}`,
        referral: pick(['Self', 'Class teacher', 'Class teacher', 'Parent', 'Principal / coordinator']), priority: pick(['none', 'low', 'medium', 'medium', 'high']),
        caseStatus: R(4) ? 'open' : 'closed', tags, notes: 'Sample student created for exploring CounselBook.', archived: false,
        created: UI.parseISO(addDays(ay.from, R(Math.max(1, span - 20)))).getTime(), history: [{ t: Date.now(), a: 'Case opened' }],
      };
      data.students.push(s);
      const n = 1 + R(5);
      for (let k = 0; k < n; k++) {
        const date = addDays(ay.from, R(span));
        if (date > today) continue;
        data.sessions.push({
          id: Store.uid() + i + k, demo: true, studentIds: [s.id], date, time: `${UI.pad(9 + R(6))}:${pick(['00', '15', '30', '45'])}`, duration: pick([20, 30, 30, 45, 60]),
          type: pick(['Individual', 'Individual', 'Individual', 'Parent meeting', 'Phone call']), tags: s.tags.slice(0, 1 + R(2)), template: 'soap', templateName: 'SOAP',
          fields: { Subjective: `${fn} shared concerns related to ${s.tags[0].toLowerCase()}.`, Objective: 'Appeared calm, maintained eye contact.', Assessment: 'Mild difficulty; coping skills developing.', Plan: 'Practise breathing technique; review next week.' },
          nextSteps: 'Check in with class teacher.', confidential: false, created: Date.now(), createdBy: 'demo',
        });
      }
      if (s.caseStatus === 'open' && R(3)) data.followups.push({ id: Store.uid() + 'f' + i, demo: true, studentId: s.id, date: addDays(today, R(10) - 3), time: R(2) ? `${UI.pad(9 + R(6))}:00` : '', kind: pick(set.fuKinds.slice(0, 4)), note: 'Review progress', done: false, created: Date.now() });
    });
    data.sessions.push({ id: Store.uid() + 'g', demo: true, studentIds: [], groupLabel: 'Class 10 exam-stress workshop', date: addDays(today, -12), time: '11:00', duration: 40, type: 'Classroom workshop', tags: ['Exam stress'], template: 'free', templateName: 'Free text', fields: { Notes: 'Activity used: Exam Stress Toolkit (#11). Students engaged well.' }, activityId: 'a11', nextSteps: '', confidential: false, created: Date.now() });
  };
})();
