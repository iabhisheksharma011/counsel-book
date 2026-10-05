/* CounselBook - setup, Today, Students, Case file, Sessions, Follow-ups, Search */
(function () {
  'use strict';
  const { esc, $, $$, icon, toast, openModal, closeModal, confirmBox, formData, isoDate, fmtDate, fmtTime, relDay, addDays, fmtHours, fmtBytes } = UI;
  const V = CB.views;

  // =============== FIRST-RUN SETUP ===============
  V.setup = function () {
    document.body.className = 'auth';
    document.body.innerHTML = `<div class="bg-logo" aria-hidden="true"></div>
    <div class="auth-wrap">
      <div class="auth-card wide">
        <img class="auth-logo" src="assets/logo.jpg" alt="School logo">
        <h1 class="auth-title">Welcome to CounselBook</h1>
        <p class="auth-sub">One-time setup. Everything stays on this computer, encrypted.</p>
        <form id="setup-f" autocomplete="off">
          <h3 class="sec">School</h3>
          <div class="grid2">
            <label class="fld"><span>Name of the school *</span><input class="input" name="school" required placeholder="e.g. Green Valley Public School"></label>
            <label class="fld"><span>Motto (optional)</span><input class="input" name="motto" placeholder="e.g. Learn, Grow, Serve"></label>
          </div>
          <h3 class="sec">Administrator login <small>can create logins and decide what each user sees</small></h3>
          <div class="grid3">
            <label class="fld"><span>Full name *</span><input class="input" name="aName" required value="Administrator"></label>
            <label class="fld"><span>Username *</span><input class="input" name="aUser" required value="admin" autocapitalize="off"></label>
            <label class="fld"><span>Password / PIN * <small>(min 4)</small></span><input class="input" type="password" name="aPass" required minlength="4"></label>
          </div>
          <h3 class="sec">Counsellor login</h3>
          <div class="grid3">
            <label class="fld"><span>Full name *</span><input class="input" name="cName" required placeholder="e.g. Ms. Sharma"></label>
            <label class="fld"><span>Username *</span><input class="input" name="cUser" required value="counsellor" autocapitalize="off"></label>
            <label class="fld"><span>Password / PIN * <small>(min 4)</small></span><input class="input" type="password" name="cPass" required minlength="4"></label>
          </div>
          <label class="check"><input type="checkbox" name="demo"> Add a few sample students and sessions so I can explore (they can be removed later in Settings)</label>
          <div class="err" id="setup-err"></div>
          <button class="btn primary block lg" id="setup-go">${icon('shield')} Create CounselBook</button>
        </form>
      </div>
    </div>`;
    $('#setup-f').onsubmit = async (e) => {
      e.preventDefault();
      const f = formData(e.target);
      const err = $('#setup-err');
      if (f.aUser.trim().toLowerCase() === f.cUser.trim().toLowerCase()) return (err.textContent = 'The two usernames must be different.');
      if (f.aPass.length < 4 || f.cPass.length < 4) return (err.textContent = 'Passwords must be at least 4 characters.');
      const btn = $('#setup-go'); btn.disabled = true; btn.textContent = 'Setting up encryption…';
      try {
        const dek = await Store.newDEK();
        const recovery = Store.makeRecoveryKey();
        const data = CB.defaultData(f.school.trim(), f.motto.trim());
        data.settings.counsellorName = f.cName.trim();
        const mk = async (name, user, pass, role) => {
          const id = Store.uid();
          const P = CB.PRESETS[role];
          data.users[id] = { id, username: user.trim(), displayName: name.trim(), role, perms: { ...P.perms }, confidential: P.confidential, anonymise: P.anonymise, active: true, created: Date.now() };
          return { id, username: user.trim(), ...(await Store.wrapDEK(dek, pass)) };
        };
        const meta = { v: 1, school: f.school.trim(), created: Date.now(), users: [] };
        meta.users.push(await mk(f.aName, f.aUser, f.aPass, 'admin'));
        meta.users.push(await mk(f.cName, f.cUser, f.cPass, 'counsellor'));
        meta.recovery = await Store.wrapDEK(dek, Store.normRecovery(recovery));
        data.audit.push({ t: Date.now(), u: f.aUser.trim(), a: 'CounselBook created' });
        if (f.demo) CB.addDemoData(data);
        await Store.kvSet('data', await Store.encryptJSON(dek, data));
        await Store.kvSet('vault', meta);
        CB.META = meta;
        showRecovery(recovery, () => CB.renderLogin('Setup complete. Sign in with either login.', f.cUser.trim()));
      } catch (ex) {
        err.textContent = 'Setup failed: ' + ex.message; btn.disabled = false; btn.textContent = 'Create CounselBook';
      }
    };
  };

  function showRecovery(key, then) {
    const m = openModal({
      title: 'Save your recovery key',
      body: `<p>If the administrator ever forgets their password, this key is the <b>only</b> way to get back in. Write it down and keep it somewhere safe (not on this computer).</p>
        <div class="recovery">${esc(key)}</div>
        <label class="check"><input type="checkbox" id="rk-ok"> I have written down the recovery key</label>`,
      footer: `<button class="btn" id="rk-print">${icon('print')} Print</button><button class="btn primary" id="rk-done" disabled>Continue</button>`,
      onClose: then,
    });
    m.querySelector('#rk-ok').onchange = (e) => { m.querySelector('#rk-done').disabled = !e.target.checked; };
    m.querySelector('#rk-done').onclick = () => closeModal();
    m.querySelector('#rk-print').onclick = () => {
      const w = window.open('', '_blank', 'width=600,height=400');
      if (!w) return toast('Pop-up blocked - please write the key down.', 'warn');
      w.document.write(`<title>CounselBook recovery key</title><body style="font-family:Segoe UI,sans-serif;padding:40px"><h2>CounselBook recovery key</h2><p>${esc(CB.META.school)}</p><p style="font:600 26px Consolas,monospace;letter-spacing:2px;border:2px dashed #333;padding:18px;text-align:center">${esc(key)}</p><p>Keep this safe. Anyone with this key and access to the computer can reset passwords.</p></body>`);
      w.document.close(); w.focus(); w.print();
    };
  }
  CB.showRecovery = showRecovery;

  // =============== TODAY ===============
  V.today = function (el) {
    const d = CB.D(), u = CB.S.user, today = isoDate();
    const hr = new Date().getHours();
    const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
    const active = d.students.filter((s) => !s.archived);
    const open = active.filter((s) => s.caseStatus !== 'closed');
    const high = open.filter((s) => s.priority === 'high');
    const monthKey = today.slice(0, 7);
    const mSess = d.sessions.filter((s) => s.date.startsWith(monthKey));
    const mMin = mSess.reduce((a, s) => a + (+s.duration || 0), 0);
    const fus = d.followups.filter((f) => !f.done);
    const due = fus.filter((f) => f.date === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'));
    const overdue = fus.filter((f) => f.date < today).sort((a, b) => a.date.localeCompare(b.date));
    const upcoming = fus.filter((f) => f.date > today && f.date <= addDays(today, 7)).sort((a, b) => a.date.localeCompare(b.date));
    const lb = d.settings.lastBackup;
    const backupWarn = CB.can('backup', 'edit') && (!lb || Date.now() - lb > 7 * 864e5) && (d.students.length > 0);
    const showS = CB.can('students'), showSess = CB.can('sessions'), showF = CB.can('followups');

    el.innerHTML = `
      <div class="page-h"><div><h1>${greet}, ${esc(firstName(u.displayName))}</h1><p class="muted">${fmtDate(today, true)} · Academic year ${esc(d.settings.academicYear)}</p></div>
        <div class="row">${CB.can('students', 'edit') ? `<button class="btn" id="t-add-s">${icon('plus')} Add student</button>` : ''}${CB.can('followups', 'edit') ? `<button class="btn" id="t-add-f">${icon('bell')} Add follow-up</button>` : ''}</div></div>
      ${backupWarn ? `<div class="banner warn">${icon('save')}<div><b>Time for a backup.</b> ${lb ? 'Last backup was ' + relDay(isoDate(new Date(lb))).toLowerCase() + '.' : 'No backup has been made yet.'} Save an encrypted copy to a USB drive or Google Drive folder.</div><a class="btn sm" href="#/backup">Back up now</a></div>` : ''}
      <div class="stats">
        ${showS ? stat('folder', open.length, 'Open cases', `${active.length} active students`) : ''}
        ${showS ? stat('flag', high.length, 'High priority', 'open cases', high.length ? 'crit' : '') : ''}
        ${showSess ? stat('note', mSess.length, 'Sessions this month', UI.MONTHS_FULL[new Date().getMonth()]) : ''}
        ${showSess ? stat('clock', fmtHours(mMin), 'Hours this month', `${mMin} minutes`) : ''}
        ${showF ? stat('bell', due.length + overdue.length, 'To do today', `${overdue.length} overdue`, overdue.length ? 'warn' : '') : ''}
      </div>
      <div class="cols">
        ${showF ? `<section class="card"><div class="card-h"><h2>${icon('calendar')} Today's meetings &amp; follow-ups</h2><a href="#/followups" class="link">All follow-ups</a></div>
          ${due.length ? `<ul class="list">${due.map(fuRow).join('')}</ul>` : '<p class="empty-sm">Nothing scheduled for today.</p>'}
          ${overdue.length ? `<h3 class="sub crit-t">${icon('bell')} Overdue (${overdue.length})</h3><ul class="list">${overdue.slice(0, 8).map(fuRow).join('')}</ul>` : ''}
        </section>` : ''}
        ${showF ? `<section class="card"><div class="card-h"><h2>${icon('clock')} Next 7 days</h2></div>
          ${upcoming.length ? `<ul class="list">${upcoming.slice(0, 10).map(fuRow).join('')}</ul>` : '<p class="empty-sm">No follow-ups in the next week.</p>'}</section>` : ''}
        ${showS ? `<section class="card"><div class="card-h"><h2>${icon('flag')} High-priority open cases</h2><a href="#/students" class="link">All students</a></div>
          ${high.length ? `<ul class="list">${high.map((s) => `<li class="li-click" data-go="#/student/${s.id}"><span class="avatar sm">${esc(CB.initials(s))}</span><div class="grow"><b>${esc(CB.sName(s))}</b> <span class="muted">${esc(CB.sClass(s))}</span><div>${CB.tagChips(s.tags)}</div></div>${lastSeen(s)}</li>`).join('')}</ul>` : '<p class="empty-sm">No high-priority cases. </p>'}</section>` : ''}
        ${showSess ? `<section class="card"><div class="card-h"><h2>${icon('note')} Recent sessions</h2><a href="#/sessions" class="link">All sessions</a></div>
          ${d.sessions.length ? `<ul class="list">${d.sessions.slice().sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || ''))).slice(0, 6).map((s) => `<li><div class="date-pill"><b>${UI.parseISO(s.date).getDate()}</b><small>${UI.MONTHS[UI.parseISO(s.date).getMonth()]}</small></div><div class="grow"><b>${sessTitle(s)}</b><div class="muted sm">${esc(s.type || '')} · ${s.duration || 0} min ${CB.tagChips(s.tags)}</div></div></li>`).join('')}</ul>` : '<p class="empty-sm">No sessions recorded yet.</p>'}</section>` : ''}
      </div>
      ${!showS && !showSess && !showF ? CB.emptyState('chart', 'Welcome', 'Use the menu on the left to open the sections you have access to.') : ''}`;
    bindFuRows(el);
    $$('[data-go]', el).forEach((x) => x.onclick = () => { location.hash = x.dataset.go; });
    const a = $('#t-add-s', el); if (a) a.onclick = () => openStudentForm();
    const b = $('#t-add-f', el); if (b) b.onclick = () => openFollowupForm({});
  };
  function firstName(n) {
    const w = String(n || '').split(/\s+/).filter(Boolean);
    return /^(mr|mrs|ms|miss|dr|prof)\.?$/i.test(w[0] || '') ? w.join(' ') : (w[0] || '');
  }
  function stat(ic, n, label, sub, tone = '') {
    return `<div class="stat ${tone}"><div class="stat-ic">${icon(ic)}</div><div><div class="stat-n">${n}</div><div class="stat-l">${esc(label)}</div><div class="stat-s">${esc(sub || '')}</div></div></div>`;
  }
  CB.stat = stat;
  function lastSeen(s) {
    const ss = CB.sessionsOf(s.id)[0];
    return `<span class="muted sm nowrap">${ss ? 'Seen ' + relDay(ss.date).toLowerCase() : 'Not seen yet'}</span>`;
  }
  function sessTitle(s) {
    const names = CB.studentsLabel(s.studentIds);
    return names ? names + (s.groupLabel ? ` <span class="muted">(${esc(s.groupLabel)})</span>` : '') : esc(s.groupLabel || 'Group session');
  }
  CB.sessTitle = sessTitle;

  // follow-up row (used in several places)
  function fuRow(f) {
    const s = CB.st(f.studentId);
    const today = isoDate();
    const cls = f.done ? 'done' : f.date < today ? 'over' : f.date === today ? 'today' : '';
    const canE = CB.can('followups', 'edit');
    return `<li class="fu ${cls}">
      ${canE ? `<button class="tick ${f.done ? 'on' : ''}" data-fu-done="${f.id}" title="${f.done ? 'Mark as not done' : 'Mark as done'}">${icon('check')}</button>` : ''}
      <div class="grow"><div><b>${s ? (CB.can('students') ? `<a href="#/student/${s.id}">${esc(CB.sName(s))}</a>` : esc(CB.sName(s))) : esc(f.title || 'General')}</b> <span class="muted">${esc(s ? CB.sClass(s) : '')}</span></div>
        <div class="muted sm">${esc(f.kind || 'Follow-up')}${f.note ? ' · ' + esc(f.note) : ''}</div></div>
      <div class="fu-when"><b>${relDay(f.date)}</b><small>${f.time ? fmtTime(f.time) : fmtDate(f.date)}</small></div>
      ${canE ? `<button class="icon-btn sm" data-fu-edit="${f.id}" title="Edit">${icon('edit')}</button>` : ''}
    </li>`;
  }
  CB.fuRow = fuRow;
  function bindFuRows(root) {
    $$('[data-fu-done]', root).forEach((b) => b.onclick = (e) => {
      e.stopPropagation();
      const f = CB.D().followups.find((x) => x.id === b.dataset.fuDone);
      f.done = !f.done; f.doneAt = f.done ? Date.now() : null;
      CB.commit(); toast(f.done ? 'Follow-up marked done' : 'Follow-up reopened'); CB.refresh();
    });
    $$('[data-fu-edit]', root).forEach((b) => b.onclick = (e) => { e.stopPropagation(); openFollowupForm({ fu: CB.D().followups.find((x) => x.id === b.dataset.fuEdit) }); });
  }
  CB.bindFuRows = bindFuRows;

  // =============== STUDENTS LIST ===============
  const SF = { q: '', cls: '', pri: '', status: 'active', tag: '', sort: 'name' };
  CB.SF = SF;
  V.students = function (el) {
    const d = CB.D(), set = d.settings;
    el.innerHTML = `<div class="page-h"><div><h1>Students &amp; case files</h1><p class="muted" id="st-count"></p></div>
      <div class="row">${CB.can('students', 'edit') ? `<button class="btn primary" id="st-add">${icon('plus')} Add student</button>` : ''}</div></div>
      <div class="filters card">
        <div class="search-in">${icon('search')}<input class="input" id="f-q" placeholder="Search name, admission no, parent…" value="${esc(SF.q)}"></div>
        <select class="input" id="f-cls"><option value="">All classes</option>${set.classes.map((c) => `<option ${SF.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
        <select class="input" id="f-pri"><option value="">Any priority</option>${['high', 'medium', 'low', 'none'].map((p) => `<option value="${p}" ${SF.pri === p ? 'selected' : ''}>${CB.PRI[p].l}</option>`).join('')}</select>
        <select class="input" id="f-tag"><option value="">Any issue</option>${set.tags.map((t) => `<option ${SF.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <select class="input" id="f-st"><option value="active" ${SF.status === 'active' ? 'selected' : ''}>Active (open + closed)</option><option value="open" ${SF.status === 'open' ? 'selected' : ''}>Open cases</option><option value="closed" ${SF.status === 'closed' ? 'selected' : ''}>Closed cases</option><option value="archived" ${SF.status === 'archived' ? 'selected' : ''}>Archived / passed out</option></select>
        <select class="input" id="f-sort"><option value="name">Sort: Name</option><option value="class" ${SF.sort === 'class' ? 'selected' : ''}>Sort: Class</option><option value="recent" ${SF.sort === 'recent' ? 'selected' : ''}>Sort: Last seen</option><option value="pri" ${SF.sort === 'pri' ? 'selected' : ''}>Sort: Priority</option></select>
      </div>
      <div class="card flush"><div class="table-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Priority</th><th>Case</th><th>Issues</th><th class="num">Sessions</th><th>Last seen</th><th>Next follow-up</th></tr></thead><tbody id="st-body"></tbody></table></div></div>`;
    const draw = () => {
      const q = SF.q.toLowerCase();
      const priRank = { high: 0, medium: 1, low: 2, none: 3 };
      let rows = d.students.filter((s) => {
        if (SF.status === 'archived' ? !s.archived : s.archived) return false;
        if (SF.status === 'open' && s.caseStatus === 'closed') return false;
        if (SF.status === 'closed' && s.caseStatus !== 'closed') return false;
        if (SF.cls && s.cls !== SF.cls) return false;
        if (SF.pri && (s.priority || 'none') !== SF.pri) return false;
        if (SF.tag && !(s.tags || []).includes(SF.tag)) return false;
        if (q) {
          const hay = CB.anon() ? CB.code(s) : [s.name, s.admNo, s.parentName, s.parentPhone, s.contact, s.cls, s.section].join(' ');
          if (!hay.toLowerCase().includes(q)) return false;
        }
        return true;
      }).map((s) => ({ s, ss: CB.sessionsOf(s.id), nf: CB.nextFU(s.id) }));
      const cmp = {
        name: (a, b) => CB.sName(a.s).localeCompare(CB.sName(b.s)),
        class: (a, b) => CB.classIdx(a.s.cls) - CB.classIdx(b.s.cls) || (a.s.section || '').localeCompare(b.s.section || '') || CB.sName(a.s).localeCompare(CB.sName(b.s)),
        recent: (a, b) => ((b.ss[0] || {}).date || '').localeCompare((a.ss[0] || {}).date || ''),
        pri: (a, b) => priRank[a.s.priority || 'none'] - priRank[b.s.priority || 'none'],
      };
      rows.sort(cmp[SF.sort] || cmp.name);
      $('#st-count', el).textContent = `${rows.length} student${rows.length === 1 ? '' : 's'} shown`;
      const today = isoDate();
      $('#st-body', el).innerHTML = rows.length ? rows.map(({ s, ss, nf }) => `<tr class="tr-click" data-id="${s.id}">
        <td><div class="cell-name"><span class="avatar sm">${esc(CB.initials(s))}</span><div><b>${esc(CB.sName(s))}</b>${s.admNo && !CB.anon() ? `<div class="muted sm">Adm. ${esc(s.admNo)}</div>` : ''}</div></div></td>
        <td>${esc([s.cls, s.section].filter(Boolean).join(' - '))}</td>
        <td>${CB.priBadge(s.priority) || '<span class="muted">—</span>'}</td>
        <td>${CB.caseBadge(s)}</td>
        <td class="tags-cell">${CB.tagChips(s.tags)}</td>
        <td class="num">${ss.length}</td>
        <td class="nowrap">${ss[0] ? relDay(ss[0].date) : '<span class="muted">—</span>'}</td>
        <td class="nowrap">${nf ? `<span class="${nf.date < today ? 'crit-t' : ''}">${relDay(nf.date)}</span>` : '<span class="muted">—</span>'}</td></tr>`).join('')
        : `<tr><td colspan="8">${CB.emptyState('users', d.students.length ? 'No students match' : 'No students yet', d.students.length ? 'Try clearing the filters.' : 'Add your first student to start a case file.')}</td></tr>`;
      $$('.tr-click', el).forEach((tr) => tr.onclick = () => { location.hash = '#/student/' + tr.dataset.id; });
    };
    $('#f-q', el).oninput = (e) => { SF.q = e.target.value; draw(); };
    [['#f-cls', 'cls'], ['#f-pri', 'pri'], ['#f-tag', 'tag'], ['#f-st', 'status'], ['#f-sort', 'sort']].forEach(([id, k]) => { $(id, el).onchange = (e) => { SF[k] = e.target.value; draw(); }; });
    const add = $('#st-add', el); if (add) add.onclick = () => openStudentForm();
    draw();
  };

  // =============== STUDENT FORM ===============
  function tagPicker(name, all, selected) {
    return `<div class="chips" data-tagpick="${name}">${all.map((t) => `<label class="chip"><input type="checkbox" name="${name}" value="${esc(t)}" ${(selected || []).includes(t) ? 'checked' : ''}><span>${esc(t)}</span></label>`).join('')}</div>`;
  }
  CB.tagPicker = tagPicker;
  function openStudentForm(s) {
    const set = CB.D().settings;
    const isNew = !s;
    s = s || { priority: 'none', caseStatus: 'open', tags: [] };
    const m = openModal({
      title: isNew ? 'Add student' : 'Edit student', size: 'lg',
      body: `<form id="sf">
        <div class="grid3">
          <label class="fld span2"><span>Full name *</span><input class="input" name="name" required value="${esc(s.name)}"></label>
          <label class="fld"><span>Admission no.</span><input class="input" name="admNo" value="${esc(s.admNo)}"></label>
          <label class="fld"><span>Class *</span><select class="input" name="cls" required><option value="">Select…</option>${set.classes.map((c) => `<option ${s.cls === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
          <label class="fld"><span>Section</span><input class="input" name="section" value="${esc(s.section)}" placeholder="A, B, C…"></label>
          <label class="fld"><span>Gender</span><select class="input" name="gender">${['', 'Female', 'Male', 'Other', 'Prefer not to say'].map((g) => `<option ${s.gender === g ? 'selected' : ''} value="${g}">${g || 'Select…'}</option>`).join('')}</select></label>
          <label class="fld"><span>Date of birth</span><input class="input" type="date" name="dob" value="${esc(s.dob)}"></label>
          <label class="fld"><span>Student contact</span><input class="input" name="contact" value="${esc(s.contact)}" inputmode="tel"></label>
          <label class="fld"><span>Referred by</span><select class="input" name="referral">${['', 'Self', 'Class teacher', 'Parent', 'Principal / coordinator', 'Peer', 'Other'].map((g) => `<option ${s.referral === g ? 'selected' : ''} value="${g}">${g || 'Select…'}</option>`).join('')}</select></label>
          <label class="fld"><span>Parent / guardian name</span><input class="input" name="parentName" value="${esc(s.parentName)}"></label>
          <label class="fld"><span>Parent phone number</span><input class="input" name="parentPhone" value="${esc(s.parentPhone)}" inputmode="tel"></label>
          <label class="fld"><span>Parent email</span><input class="input" type="email" name="email" value="${esc(s.email)}"></label>
          <label class="fld span3"><span>Address</span><input class="input" name="address" value="${esc(s.address)}"></label>
          <label class="fld"><span>Priority</span><select class="input" name="priority">${['none', 'low', 'medium', 'high'].map((p) => `<option value="${p}" ${s.priority === p ? 'selected' : ''}>${CB.PRI[p].l}</option>`).join('')}</select></label>
          <label class="fld"><span>Case status</span><select class="input" name="caseStatus"><option value="open">Open</option><option value="closed" ${s.caseStatus === 'closed' ? 'selected' : ''}>Closed</option></select></label>
        </div>
        <div class="fld"><span>Presenting issues (tags)</span>${tagPicker('tags', set.tags, s.tags)}</div>
        <label class="fld"><span>Background / case summary</span><div class="ta-wrap"><textarea class="input" name="notes" rows="3">${esc(s.notes)}</textarea>${CB.micBtn('notes')}</div></label>
      </form>`,
      footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="sf-save">${icon('check')} Save student</button>`,
    });
    CB.bindMics(m);
    m.querySelector('#sf-save').onclick = () => {
      const form = m.querySelector('#sf');
      if (!form.reportValidity()) return;
      const f = formData(form);
      f.tags = [].concat(f.tags || []);
      const d = CB.D();
      if (isNew) {
        const ns = { id: Store.uid(), created: Date.now(), archived: false, history: [{ t: Date.now(), a: 'Case opened' }], ...f };
        d.students.push(ns);
        CB.audit('Added student ' + ns.name);
        CB.commit(); closeModal(); toast('Student added');
        location.hash = '#/student/' + ns.id;
      } else {
        if (f.caseStatus !== s.caseStatus) (s.history = s.history || []).push({ t: Date.now(), a: f.caseStatus === 'closed' ? 'Case closed' : 'Case reopened' });
        if (f.priority !== s.priority) (s.history = s.history || []).push({ t: Date.now(), a: 'Priority set to ' + CB.PRI[f.priority].l });
        Object.assign(s, f, { updated: Date.now() });
        CB.commit(); closeModal(); toast('Student updated'); CB.refresh();
      }
    };
  }
  CB.openStudentForm = openStudentForm;

  // =============== CASE FILE ===============
  let caseTab = 'timeline';
  V.student = function (el, id) {
    const s = CB.st(id);
    if (!s) { el.innerHTML = CB.emptyState('users', 'Student not found', 'This student may have been deleted.'); return; }
    const canE = CB.can('students', 'edit');
    const sess = CB.can('sessions') ? CB.sessionsOf(id) : [];
    const fus = CB.can('followups') ? CB.fusOf(id).sort((a, b) => b.date.localeCompare(a.date)) : [];
    const atts = CB.can('attachments') ? CB.D().attachments.filter((a) => a.studentId === id) : [];
    const mins = sess.reduce((a, x) => a + (+x.duration || 0), 0);
    const anon = CB.anon();
    const tabs = [['timeline', 'Timeline', true], ['sessions', `Sessions (${sess.length})`, CB.can('sessions')], ['followups', `Follow-ups (${fus.filter((f) => !f.done).length})`, CB.can('followups')], ['files', `Attachments (${atts.length})`, CB.can('attachments')], ['profile', 'Profile', true]].filter((t) => t[2]);
    if (!tabs.some((t) => t[0] === caseTab)) caseTab = 'timeline';
    el.innerHTML = `
      <a href="#/students" class="back">${icon('chevl')} All students</a>
      <div class="case-h card">
        <span class="avatar lg">${esc(CB.initials(s))}</span>
        <div class="grow">
          <h1>${esc(CB.sName(s))}</h1>
          <div class="muted">${esc(CB.sClass(s))}${s.admNo && !anon ? ' · Adm. ' + esc(s.admNo) : ''}${s.gender ? ' · ' + esc(s.gender) : ''}${s.referral ? ' · Referred by ' + esc(s.referral) : ''}</div>
          <div class="row wrap mt">${CB.caseBadge(s)} ${CB.priBadge(s.priority)} ${CB.tagChips(s.tags)}</div>
          ${!anon && (s.parentPhone || s.contact) ? `<div class="contacts">${s.parentPhone ? `<span>${icon('phone')} ${esc(s.parentName || 'Parent')}: <b>${esc(s.parentPhone)}</b></span>` : ''}${s.contact ? `<span>${icon('phone')} Student: <b>${esc(s.contact)}</b></span>` : ''}</div>` : ''}
        </div>
        <div class="case-nums"><div><b>${sess.length}</b><small>sessions</small></div><div><b>${fmtHours(mins)}</b><small>hours</small></div></div>
      </div>
      <div class="toolbar">
        ${CB.can('sessions', 'edit') && !s.archived ? `<button class="btn primary" id="c-sess">${icon('plus')} New session</button>` : ''}
        ${CB.can('followups', 'edit') && !s.archived ? `<button class="btn" id="c-fu">${icon('bell')} Follow-up</button>` : ''}
        ${CB.can('attachments', 'edit') ? `<button class="btn" id="c-att">${icon('clip')} Attach file</button>` : ''}
        ${canE ? `<div class="menu-wrap"><button class="btn" id="c-pri">${icon('flag')} Priority</button></div>` : ''}
        ${canE && !s.archived ? `<button class="btn" id="c-status">${icon(s.caseStatus === 'closed' ? 'folder' : 'check')} ${s.caseStatus === 'closed' ? 'Reopen case' : 'Close case'}</button>` : ''}
        <button class="btn" id="c-pdf">${icon('print')} Export PDF</button>
        <span class="grow"></span>
        ${canE ? `<button class="btn ghost" id="c-edit">${icon('edit')} Edit</button><button class="btn ghost" id="c-arch">${icon('archive')} ${s.archived ? 'Restore' : 'Archive'}</button><button class="btn ghost danger-t" id="c-del" title="Delete student">${icon('trash')}</button>` : ''}
      </div>
      <div class="tabs">${tabs.map(([k, l]) => `<button class="${caseTab === k ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
      <div id="case-body"></div>`;

    const body = $('#case-body', el);
    const drawTab = () => {
      $$('.tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.tab === caseTab));
      if (caseTab === 'timeline') {
        const items = [
          ...sess.map((x) => ({ d: x.date + (x.time || ''), h: sessionCard(x, { compact: true }) })),
          ...fus.map((f) => ({ d: f.date + (f.time || ''), h: `<div class="tl-fu"><ul class="list">${fuRow(f)}</ul></div>` })),
          ...atts.map((a) => ({ d: isoDate(new Date(a.created)), h: `<div class="tl-misc">${icon('clip')} File attached: <b>${esc(a.name)}</b>${a.caption ? ' — ' + esc(a.caption) : ''}</div>` })),
          ...(s.history || []).map((h) => ({ d: isoDate(new Date(h.t)), h: `<div class="tl-misc">${icon('folder')} ${esc(h.a)}</div>` })),
        ].sort((a, b) => b.d.localeCompare(a.d));
        body.innerHTML = items.length ? `<div class="timeline">${items.map((i) => `<div class="tl-item"><div class="tl-date">${fmtDate(i.d.slice(0, 10))}</div><div class="tl-c">${i.h}</div></div>`).join('')}</div>` : CB.emptyState('note', 'Nothing yet', 'Sessions, follow-ups and files will appear here.');
      } else if (caseTab === 'sessions') {
        body.innerHTML = sess.length ? sess.map((x) => sessionCard(x)).join('') : CB.emptyState('note', 'No sessions yet', 'Record the first session with the “New session” button.');
      } else if (caseTab === 'followups') {
        body.innerHTML = fus.length ? `<div class="card"><ul class="list">${fus.map(fuRow).join('')}</ul></div>` : CB.emptyState('bell', 'No follow-ups', 'Schedule a reminder to meet again.');
      } else if (caseTab === 'files') {
        drawFiles(body, s);
      } else {
        body.innerHTML = profileHTML(s);
      }
      bindSessionCards(body); bindFuRows(body);
    };
    $$('.tabs button', el).forEach((b) => b.onclick = () => { caseTab = b.dataset.tab; drawTab(); });
    drawTab();

    const on = (id2, fn) => { const b = $(id2, el); if (b) b.onclick = fn; };
    on('#c-sess', () => CB.openSessionForm({ studentIds: [s.id] }));
    on('#c-fu', () => openFollowupForm({ studentId: s.id }));
    on('#c-att', () => CB.pickAttachments(s));
    on('#c-edit', () => openStudentForm(s));
    on('#c-pdf', () => CB.printStudent(s));
    on('#c-pri', () => {
      const m = openModal({
        title: 'Set priority', size: 'sm',
        body: `<div class="stack">${['high', 'medium', 'low', 'none'].map((p) => `<button class="btn block pri-opt ${s.priority === p ? 'on' : ''}" data-p="${p}">${p === 'none' ? 'No priority' : CB.priBadge(p)}</button>`).join('')}</div>`,
      });
      $$('[data-p]', m).forEach((b) => b.onclick = () => {
        if (s.priority !== b.dataset.p) { s.priority = b.dataset.p; (s.history = s.history || []).push({ t: Date.now(), a: 'Priority set to ' + CB.PRI[s.priority].l }); CB.commit(); }
        closeModal(); CB.refresh();
      });
    });
    on('#c-status', () => {
      s.caseStatus = s.caseStatus === 'closed' ? 'open' : 'closed';
      (s.history = s.history || []).push({ t: Date.now(), a: s.caseStatus === 'closed' ? 'Case closed' : 'Case reopened' });
      CB.commit(); toast(s.caseStatus === 'closed' ? 'Case closed' : 'Case reopened'); CB.refresh();
    });
    on('#c-arch', async () => {
      if (!s.archived && !(await confirmBox(`Archive <b>${esc(CB.sName(s))}</b>? Archived students are hidden from lists but their records are kept. You can restore them anytime.`, { ok: 'Archive' }))) return;
      s.archived = !s.archived;
      s.archivedReason = s.archived ? 'Archived manually' : '';
      (s.history = s.history || []).push({ t: Date.now(), a: s.archived ? 'Archived' : 'Restored from archive' });
      CB.commit(); toast(s.archived ? 'Student archived' : 'Student restored'); CB.refresh();
    });
    on('#c-del', async () => {
      if (!(await confirmBox(`Permanently delete <b>${esc(CB.sName(s))}</b> and all their sessions, follow-ups and attachments? This cannot be undone.<br><br>Tip: use <b>Archive</b> instead to keep records.`, { ok: 'Delete permanently', danger: true }))) return;
      const d = CB.D();
      d.sessions.forEach((x) => { x.studentIds = (x.studentIds || []).filter((i) => i !== s.id); });
      d.sessions = d.sessions.filter((x) => x.studentIds.length || x.groupLabel);
      d.followups = d.followups.filter((f) => f.studentId !== s.id);
      for (const a of d.attachments.filter((a) => a.studentId === s.id)) await Store.fileDel(a.id);
      d.attachments = d.attachments.filter((a) => a.studentId !== s.id);
      d.students = d.students.filter((x) => x.id !== s.id);
      CB.audit('Deleted student record ' + s.id);
      CB.commit(); toast('Student deleted'); location.hash = '#/students';
    });
  };

  function profileHTML(s) {
    const anon = CB.anon();
    const rows = [
      ['Name', CB.sName(s)], ['Admission no.', anon ? '—' : s.admNo], ['Class', CB.sClass(s)], ['Gender', s.gender],
      ['Date of birth', anon ? '—' : fmtDate(s.dob)], ['Referred by', s.referral],
      ['Parent / guardian', anon ? '—' : s.parentName], ['Parent phone', anon ? '—' : s.parentPhone], ['Parent email', anon ? '—' : s.email],
      ['Student contact', anon ? '—' : s.contact], ['Address', anon ? '—' : s.address],
      ['Case opened', fmtDate(isoDate(new Date(s.created)))], ['Status', s.archived ? 'Archived' + (s.archivedReason ? ' (' + s.archivedReason + ')' : '') : s.caseStatus === 'closed' ? 'Closed' : 'Open'],
    ];
    return `<div class="card"><dl class="dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v || '—')}</dd>`).join('')}</dl>
      ${s.notes && CB.canConf() ? `<h3 class="sub">Background / case summary</h3><p class="prose">${CB.mdText(s.notes)}</p>` : ''}</div>`;
  }

  // =============== SESSION CARD & FORM ===============
  function sessionCard(x, { compact = false, showStudent = false } = {}) {
    const canE = CB.can('sessions', 'edit');
    const hidden = x.confidential && !CB.canConf();
    const fields = x.fields || {};
    const keys = Object.keys(fields).filter((k) => (fields[k] || '').trim());
    return `<article class="sess card ${compact ? 'compact' : ''}">
      <header><div>
        ${showStudent ? `<div class="sess-who">${sessTitle(x)}</div>` : ''}
        <div class="sess-meta">${icon('calendar')} ${fmtDate(x.date, true)}${x.time ? ' · ' + fmtTime(x.time) : ''} · ${icon('clock')} ${x.duration || 0} min · ${esc(x.type || '')}${x.template ? ` · <span class="muted">${esc(x.templateName || '')}</span>` : ''} ${x.confidential ? `<span class="badge muted">${icon('lock')}Confidential</span>` : ''}</div>
        <div class="mt-s">${CB.tagChips(x.tags)}</div></div>
        <div class="row">${CB.can('sessions') ? `<button class="icon-btn sm" data-s-print="${x.id}" title="Print note">${icon('print')}</button>` : ''}${canE ? `<button class="icon-btn sm" data-s-edit="${x.id}" title="Edit">${icon('edit')}</button><button class="icon-btn sm" data-s-del="${x.id}" title="Delete">${icon('trash')}</button>` : ''}</div>
      </header>
      ${hidden ? `<p class="muted">${icon('lock')} Note content is confidential and hidden for your login.</p>` : `
      <div class="sess-body ${compact ? 'clamp' : ''}">${keys.map((k) => `<div class="sf"><h4>${esc(k)}</h4><p>${CB.mdText(fields[k])}</p></div>`).join('')}
      ${x.nextSteps ? `<div class="sf next"><h4>${icon('chevr')} Next steps</h4><p>${CB.mdText(x.nextSteps)}</p></div>` : ''}</div>`}
    </article>`;
  }
  CB.sessionCard = sessionCard;
  function bindSessionCards(root) {
    $$('[data-s-edit]', root).forEach((b) => b.onclick = () => CB.openSessionForm({ session: CB.D().sessions.find((x) => x.id === b.dataset.sEdit) }));
    $$('[data-s-print]', root).forEach((b) => b.onclick = () => CB.printSession(CB.D().sessions.find((x) => x.id === b.dataset.sPrint)));
    $$('[data-s-del]', root).forEach((b) => b.onclick = async () => {
      if (!(await confirmBox('Delete this session note? This cannot be undone.', { ok: 'Delete', danger: true }))) return;
      const d = CB.D();
      d.sessions = d.sessions.filter((x) => x.id !== b.dataset.sDel);
      CB.audit('Deleted a session note');
      CB.commit(); toast('Session deleted'); CB.refresh();
    });
  }
  CB.bindSessionCards = bindSessionCards;

  function studentPicker(host, selected) {
    let sel = (selected || []).slice();
    const all = CB.D().students.filter((s) => !s.archived);
    host.innerHTML = `<div class="picker"><div class="picker-chips"></div><input class="input picker-in" placeholder="Type a student name to add…" autocomplete="off"><div class="picker-dd" hidden></div></div>`;
    const chips = $('.picker-chips', host), inp = $('.picker-in', host), dd = $('.picker-dd', host);
    const drawChips = () => {
      chips.innerHTML = sel.map((id) => { const s = CB.st(id); return `<span class="pchip">${esc(CB.sName(s))} <small>${esc(s ? s.cls || '' : '')}</small><button type="button" data-rm="${id}">${icon('x')}</button></span>`; }).join('');
      $$('[data-rm]', chips).forEach((b) => b.onclick = () => { sel = sel.filter((x) => x !== b.dataset.rm); drawChips(); });
    };
    let hi = 0, opts = [];
    const drawDD = () => {
      const q = inp.value.trim().toLowerCase();
      opts = all.filter((s) => !sel.includes(s.id) && (!q || (CB.sName(s) + ' ' + (s.cls || '') + ' ' + (s.admNo || '')).toLowerCase().includes(q)))
        .sort((a, b) => CB.sName(a).localeCompare(CB.sName(b))).slice(0, 8);
      hi = Math.min(hi, Math.max(0, opts.length - 1));
      dd.hidden = !opts.length;
      dd.innerHTML = opts.map((s, i) => `<div class="pd-o ${i === hi ? 'hi' : ''}" data-id="${s.id}"><b>${esc(CB.sName(s))}</b> <span class="muted">${esc(CB.sClass(s))}</span></div>`).join('');
      $$('.pd-o', dd).forEach((o) => o.onmousedown = (e) => { e.preventDefault(); add(o.dataset.id); });
    };
    const add = (id) => { sel.push(id); inp.value = ''; drawChips(); drawDD(); };
    inp.onfocus = drawDD; inp.oninput = () => { hi = 0; drawDD(); };
    inp.onblur = () => setTimeout(() => { dd.hidden = true; }, 120);
    inp.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { hi = Math.min(hi + 1, opts.length - 1); drawDD(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { hi = Math.max(hi - 1, 0); drawDD(); e.preventDefault(); }
      else if (e.key === 'Enter') { e.preventDefault(); if (opts[hi]) add(opts[hi].id); }
      else if (e.key === 'Backspace' && !inp.value && sel.length) { sel.pop(); drawChips(); }
    };
    drawChips();
    return () => sel.slice();
  }
  CB.studentPicker = studentPicker;

  CB.openSessionForm = function ({ session, studentIds, prefill }) {
    const d = CB.D(), set = d.settings;
    const isNew = !session;
    const x = session || Object.assign({ date: isoDate(), time: new Date().toTimeString().slice(0, 5), duration: 30, type: 'Individual', tags: [], template: set.templates[0].id, fields: {}, studentIds: studentIds || [] }, prefill || {});
    if (isNew && !prefill && x.studentIds.length === 1) {
      const s0 = CB.st(x.studentIds[0]); if (s0) x.tags = (s0.tags || []).slice();
    }
    if (x.confidential && !CB.canConf()) { toast('This note is confidential and cannot be edited with your login.', 'warn'); return; }
    let values = Object.assign({}, x.fields);
    const m = openModal({
      title: isNew ? 'New session note' : 'Edit session note', size: 'lg',
      body: `<form id="ssf">
        <div class="fld"><span>Student(s) <small>— add more than one for a group session</small></span><div id="ss-pick"></div></div>
        <div class="grid4">
          <label class="fld"><span>Date *</span><input class="input" type="date" name="date" required value="${esc(x.date)}"></label>
          <label class="fld"><span>Time</span><input class="input" type="time" name="time" value="${esc(x.time)}"></label>
          <label class="fld"><span>Duration (minutes) *</span><input class="input" type="number" name="duration" min="1" max="600" required value="${esc(x.duration)}"></label>
          <label class="fld"><span>Type</span><select class="input" name="type">${set.sessionTypes.map((t) => `<option ${x.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></label>
        </div>
        <div class="dur-chips">${[15, 30, 45, 60, 90].map((n) => `<button type="button" class="chip sm" data-dur="${n}">${n} min</button>`).join('')}</div>
        <label class="fld"><span>Group / class label <small>(optional, e.g. “Class 8B workshop”)</small></span><input class="input" name="groupLabel" value="${esc(x.groupLabel)}"></label>
        <div class="fld"><span>Issues discussed</span>${tagPicker('tags', set.tags, x.tags)}</div>
        <div class="tmpl-row"><span class="lbl">Note template</span><div class="seg" id="ss-tmpl">${set.templates.map((t) => `<button type="button" data-t="${t.id}" class="${x.template === t.id ? 'on' : ''}">${esc(t.name)}</button>`).join('')}</div></div>
        <div id="ss-fields"></div>
        <div class="snips"><span class="lbl">Quick phrases:</span>${set.snippets.map((sn, i) => `<button type="button" class="chip sm" data-snip="${i}" title="Insert into the last note box you clicked">${esc(sn.length > 42 ? sn.slice(0, 40) + '…' : sn)}</button>`).join('')}</div>
        <label class="fld"><span>Next steps</span><div class="ta-wrap"><textarea class="input" name="nextSteps" rows="2">${esc(x.nextSteps)}</textarea>${CB.micBtn('nextSteps')}</div></label>
        <div class="grid2">
          <label class="check"><input type="checkbox" name="confidential" ${x.confidential ? 'checked' : ''}> ${icon('lock')} Mark as confidential (hidden from logins without confidential access)</label>
          ${isNew && CB.can('followups', 'edit') ? `<label class="check"><input type="checkbox" name="mkfu" id="mkfu"> ${icon('bell')} Schedule a follow-up</label>` : ''}
        </div>
        <div class="grid3" id="fu-box" hidden>
          <label class="fld"><span>Follow-up date</span><input class="input" type="date" name="fuDate" value="${addDays(isoDate(), 7)}"></label>
          <label class="fld"><span>Time</span><input class="input" type="time" name="fuTime"></label>
          <label class="fld"><span>Type</span><select class="input" name="fuKind">${set.fuKinds.map((k) => `<option>${esc(k)}</option>`).join('')}</select></label>
        </div>
        <p class="hint">${icon('mic')} Voice typing: click a mic button, or click inside any box and press <kbd>Windows</kbd> + <kbd>H</kbd> for Windows dictation.</p>
      </form>`,
      footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="ss-save">${icon('check')} Save session</button>`,
    });
    const getSel = studentPicker($('#ss-pick', m), x.studentIds);
    let tmpl = x.template, lastTA = null;
    const fieldsHost = $('#ss-fields', m);
    const collect = () => { $$('textarea[data-field]', fieldsHost).forEach((t) => { values[t.dataset.field] = t.value; }); };
    const drawFields = () => {
      const t = set.templates.find((q) => q.id === tmpl) || set.templates[0];
      const extra = Object.keys(values).filter((k) => !t.fields.includes(k) && (values[k] || '').trim());
      fieldsHost.innerHTML = [...t.fields, ...extra].map((f, i) => `<label class="fld"><span>${esc(f)}${extra.includes(f) ? ' <small>(from previous template)</small>' : ''}</span><div class="ta-wrap"><textarea class="input" name="f_${i}" data-field="${esc(f)}" rows="${t.fields.length === 1 ? 6 : 3}" placeholder="${esc(fieldHint(f))}">${esc(values[f] || '')}</textarea>${CB.micBtn('f_' + i)}</div></label>`).join('');
      CB.bindMics(fieldsHost);
      $$('textarea', fieldsHost).forEach((ta) => ta.addEventListener('focus', () => { lastTA = ta; }));
    };
    drawFields();
    CB.bindMics(m.querySelector('.ta-wrap textarea[name=nextSteps]').parentElement);
    m.querySelector('[name=nextSteps]').addEventListener('focus', (e) => { lastTA = e.target; });
    $('#ss-tmpl', m).onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      collect(); tmpl = b.dataset.t;
      $$('#ss-tmpl button', m).forEach((q) => q.classList.toggle('on', q === b));
      drawFields();
    };
    $$('[data-dur]', m).forEach((b) => b.onclick = () => { m.querySelector('[name=duration]').value = b.dataset.dur; });
    $$('[data-snip]', m).forEach((b) => b.onclick = () => {
      const ta = lastTA || fieldsHost.querySelector('textarea');
      const sn = set.snippets[+b.dataset.snip];
      ta.value = (ta.value && !/\s$/.test(ta.value) ? ta.value + ' ' : ta.value) + sn;
      ta.focus();
    });
    const mk = $('#mkfu', m); if (mk) mk.onchange = () => { $('#fu-box', m).hidden = !mk.checked; };
    $('#ss-save', m).onclick = () => {
      const form = $('#ssf', m);
      if (!form.reportValidity()) return;
      collect();
      const f = formData(form);
      const ids = getSel();
      if (!ids.length && !f.groupLabel.trim()) { toast('Choose at least one student, or enter a group / class label.', 'warn'); return; }
      const t = set.templates.find((q) => q.id === tmpl) || set.templates[0];
      const fields = {};
      Object.keys(values).forEach((k) => { if ((values[k] || '').trim()) fields[k] = values[k].trim(); });
      const rec = {
        studentIds: ids, date: f.date, time: f.time, duration: Math.max(1, +f.duration || 0), type: f.type,
        groupLabel: f.groupLabel.trim(), tags: [].concat(f.tags || []), template: t.id, templateName: t.name, fields,
        nextSteps: (f.nextSteps || '').trim(), confidential: !!f.confidential,
      };
      if (isNew) {
        const ns = { id: Store.uid(), created: Date.now(), createdBy: CB.S.user.username, ...rec };
        if (prefill && prefill.activityId) ns.activityId = prefill.activityId;
        d.sessions.push(ns);
        ids.forEach((id) => { const s = CB.st(id); if (s && s.caseStatus === 'closed') { s.caseStatus = 'open'; (s.history = s.history || []).push({ t: Date.now(), a: 'Case reopened (new session)' }); } });
        if (f.mkfu && f.fuDate) {
          (ids.length ? ids : [null]).forEach((sid) => d.followups.push({ id: Store.uid(), studentId: sid, title: sid ? '' : rec.groupLabel, date: f.fuDate, time: f.fuTime, kind: f.fuKind, note: rec.nextSteps.slice(0, 140), done: false, sessionId: ns.id, created: Date.now() }));
        }
        CB.audit('Added a session note');
      } else {
        Object.assign(session, rec, { updated: Date.now() });
        CB.audit('Edited a session note');
      }
      CB.commit(); closeModal(); toast('Session saved'); CB.refresh();
    };
  };
  function fieldHint(f) {
    return ({ Subjective: 'What the student said - feelings, concerns, in their words', Objective: 'What you observed - behaviour, mood, appearance', Assessment: 'Your understanding of the issue and progress', Plan: 'Interventions, homework, referrals, next meeting', Data: 'Facts and observations from the session', Notes: 'Write freely…', Goals: 'Goal(s) for this session', Intervention: 'What you did', Response: 'How the student responded' })[f] || '';
  }

  // =============== FOLLOW-UP FORM ===============
  function openFollowupForm({ fu, studentId }) {
    const d = CB.D(), set = d.settings;
    const isNew = !fu;
    const x = fu || { date: addDays(isoDate(), 1), time: '', kind: set.fuKinds[0], note: '', studentId: studentId || '' };
    const studs = d.students.filter((s) => !s.archived || s.id === x.studentId).sort((a, b) => CB.sName(a).localeCompare(CB.sName(b)));
    const m = openModal({
      title: isNew ? 'Add follow-up / reminder' : 'Edit follow-up',
      body: `<form id="fuf">
        <label class="fld"><span>Student</span><select class="input" name="studentId"><option value="">— General (no student) —</option>${studs.map((s) => `<option value="${s.id}" ${x.studentId === s.id ? 'selected' : ''}>${esc(CB.sName(s))} (${esc(CB.sClass(s))})</option>`).join('')}</select></label>
        <label class="fld"><span>Title (for general reminders)</span><input class="input" name="title" value="${esc(x.title)}" placeholder="e.g. Class 9 career talk"></label>
        <div class="grid3">
          <label class="fld"><span>Date *</span><input class="input" type="date" name="date" required value="${esc(x.date)}"></label>
          <label class="fld"><span>Time</span><input class="input" type="time" name="time" value="${esc(x.time)}"></label>
          <label class="fld"><span>Type</span><select class="input" name="kind">${set.fuKinds.map((k) => `<option ${x.kind === k ? 'selected' : ''}>${esc(k)}</option>`).join('')}</select></label>
        </div>
        <div class="dur-chips">${[['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7], ['In 2 weeks', 14], ['In a month', 30]].map(([l, n]) => `<button type="button" class="chip sm" data-in="${n}">${l}</button>`).join('')}</div>
        <label class="fld"><span>Note</span><textarea class="input" name="note" rows="2">${esc(x.note)}</textarea></label>
      </form>`,
      footer: `${!isNew ? `<button class="btn ghost danger-t" id="fu-del">${icon('trash')} Delete</button><span class="grow"></span>` : ''}<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="fu-save">${icon('check')} Save</button>`,
    });
    $$('[data-in]', m).forEach((b) => b.onclick = () => { m.querySelector('[name=date]').value = addDays(isoDate(), +b.dataset.in); });
    $('#fu-save', m).onclick = () => {
      const form = $('#fuf', m); if (!form.reportValidity()) return;
      const f = formData(form);
      if (!f.studentId && !f.title.trim()) { toast('Choose a student or enter a title.', 'warn'); return; }
      const rec = { studentId: f.studentId || null, title: f.title.trim(), date: f.date, time: f.time, kind: f.kind, note: f.note.trim() };
      if (isNew) d.followups.push({ id: Store.uid(), done: false, created: Date.now(), ...rec });
      else Object.assign(fu, rec);
      CB.commit(); closeModal(); toast('Follow-up saved'); CB.refresh();
    };
    const del = $('#fu-del', m);
    if (del) del.onclick = async () => {
      if (!(await confirmBox('Delete this follow-up?', { ok: 'Delete', danger: true }))) return;
      d.followups = d.followups.filter((q) => q.id !== fu.id);
      CB.commit(); closeModal(); toast('Follow-up deleted'); CB.refresh();
    };
  }
  CB.openFollowupForm = openFollowupForm;

  // =============== SESSIONS LIST ===============
  const SS = { from: '', to: '', type: '', tag: '', q: '' };
  V.sessions = function (el) {
    const d = CB.D(), set = d.settings;
    el.innerHTML = `<div class="page-h"><div><h1>Session notes</h1><p class="muted" id="ss-sum"></p></div>
      <div class="row">${CB.can('sessions', 'edit') ? `<button class="btn primary" id="ss-new">${icon('plus')} New session</button>` : ''}</div></div>
      <div class="filters card">
        <div class="search-in">${icon('search')}<input class="input" id="sq" placeholder="Search within notes…" value="${esc(SS.q)}"></div>
        <label class="inl">From <input class="input" type="date" id="sfrom" value="${SS.from}"></label>
        <label class="inl">To <input class="input" type="date" id="sto" value="${SS.to}"></label>
        <select class="input" id="stype"><option value="">All types</option>${set.sessionTypes.map((t) => `<option ${SS.type === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <select class="input" id="stag"><option value="">All issues</option>${set.tags.map((t) => `<option ${SS.tag === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      </div><div id="ss-list"></div>`;
    const draw = () => {
      const q = SS.q.toLowerCase();
      const rows = d.sessions.filter((x) => (!SS.from || x.date >= SS.from) && (!SS.to || x.date <= SS.to) && (!SS.type || x.type === SS.type) && (!SS.tag || (x.tags || []).includes(SS.tag))
        && (!q || sessText(x).toLowerCase().includes(q))).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
      const mins = rows.reduce((a, x) => a + (+x.duration || 0), 0);
      $('#ss-sum', el).textContent = `${rows.length} session${rows.length === 1 ? '' : 's'} · ${fmtHours(mins)} hours`;
      const list = $('#ss-list', el);
      list.innerHTML = rows.length ? rows.slice(0, 300).map((x) => sessionCard(x, { showStudent: true, compact: true })).join('') + (rows.length > 300 ? '<p class="muted center">Showing the latest 300. Use filters to narrow down.</p>' : '')
        : CB.emptyState('note', d.sessions.length ? 'No sessions match' : 'No sessions yet', d.sessions.length ? 'Try different filters.' : 'Record a session from a student’s case file or with “New session”.');
      bindSessionCards(list);
    };
    $('#sq', el).oninput = (e) => { SS.q = e.target.value; draw(); };
    [['#sfrom', 'from'], ['#sto', 'to'], ['#stype', 'type'], ['#stag', 'tag']].forEach(([i, k]) => { $(i, el).onchange = (e) => { SS[k] = e.target.value; draw(); }; });
    const n = $('#ss-new', el); if (n) n.onclick = () => CB.openSessionForm({});
    draw();
  };
  function sessText(x) {
    const hidden = x.confidential && !CB.canConf();
    return [CB.studentsLabel(x.studentIds, false), x.groupLabel, x.type, (x.tags || []).join(' '), hidden ? '' : Object.values(x.fields || {}).join(' '), hidden ? '' : x.nextSteps].join(' ');
  }

  // =============== FOLLOW-UPS ===============
  let fuTab = 'today';
  V.followups = function (el) {
    const d = CB.D(), today = isoDate();
    const groups = {
      overdue: d.followups.filter((f) => !f.done && f.date < today).sort((a, b) => a.date.localeCompare(b.date)),
      today: d.followups.filter((f) => !f.done && f.date === today).sort((a, b) => (a.time || '99').localeCompare(b.time || '99')),
      upcoming: d.followups.filter((f) => !f.done && f.date > today).sort((a, b) => a.date.localeCompare(b.date)),
      done: d.followups.filter((f) => f.done).sort((a, b) => b.date.localeCompare(a.date)),
    };
    const labels = { overdue: 'Overdue', today: 'Today', upcoming: 'Upcoming', done: 'Done' };
    el.innerHTML = `<div class="page-h"><div><h1>Follow-ups &amp; reminders</h1><p class="muted">Who to meet and what is pending</p></div>
      <div class="row"><button class="btn" id="fu-ics" title="Download a calendar file for Outlook / Google Calendar">${icon('calendar')} Export to calendar</button>${CB.can('followups', 'edit') ? `<button class="btn primary" id="fu-new">${icon('plus')} Add follow-up</button>` : ''}</div></div>
      <div class="tabs">${Object.keys(groups).map((k) => `<button data-tab="${k}" class="${fuTab === k ? 'on' : ''}">${labels[k]} <span class="count ${k === 'overdue' && groups[k].length ? 'crit' : ''}">${groups[k].length}</span></button>`).join('')}</div>
      <div class="card" id="fu-list"></div>`;
    const draw = () => {
      $$('.tabs button', el).forEach((b) => b.classList.toggle('on', b.dataset.tab === fuTab));
      const list = groups[fuTab].slice(0, 400);
      $('#fu-list', el).innerHTML = list.length ? `<ul class="list">${list.map(fuRow).join('')}</ul>` : `<p class="empty-sm">No ${labels[fuTab].toLowerCase()} follow-ups.</p>`;
      bindFuRows($('#fu-list', el));
    };
    $$('.tabs button', el).forEach((b) => b.onclick = () => { fuTab = b.dataset.tab; draw(); });
    const n = $('#fu-new', el); if (n) n.onclick = () => openFollowupForm({});
    $('#fu-ics', el).onclick = () => CB.exportICS();
    draw();
  };

  CB.exportICS = function () {
    const d = CB.D();
    const pending = d.followups.filter((f) => !f.done && f.date >= addDays(isoDate(), -1));
    if (!pending.length) return toast('No upcoming follow-ups to export.', 'warn');
    const dt = (s) => s.replace(/-/g, '');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const escI = (t) => String(t || '').replace(/\\/g, '\\\\').replace(/[,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CounselBook//EN', 'CALSCALE:GREGORIAN'];
    pending.forEach((f) => {
      const s = CB.st(f.studentId);
      // Privacy: calendar entries use initials + class only, never full names or notes.
      const who = s ? `${s.name.split(/\s+/).map((w) => w[0]).join('').toUpperCase()} (${CB.sClass(s)})` : (f.title || 'General');
      lines.push('BEGIN:VEVENT', `UID:${f.id}@counselbook`, `DTSTAMP:${stamp}`);
      if (f.time) {
        const [h, mi] = f.time.split(':').map(Number);
        const end = new Date(2000, 0, 1, h, mi + 30);
        lines.push(`DTSTART:${dt(f.date)}T${f.time.replace(':', '')}00`, `DTEND:${dt(f.date)}T${UI.pad(end.getHours())}${UI.pad(end.getMinutes())}00`);
      } else lines.push(`DTSTART;VALUE=DATE:${dt(f.date)}`, `DTEND;VALUE=DATE:${dt(addDays(f.date, 1))}`);
      lines.push(`SUMMARY:${escI((f.kind || 'Follow-up') + ': ' + who)}`, 'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Counselling follow-up', 'END:VALARM', 'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    UI.download(`CounselBook-followups-${isoDate()}.ics`, lines.join('\r\n'), 'text/calendar');
    toast(`${pending.length} follow-ups exported. Open the file to add them to Outlook or Google Calendar.`, 'ok', 5000);
  };

  // =============== SEARCH ===============
  V.search = function (el, _, params) {
    const q = (params.get('q') || '').trim();
    const gs = $('#gsearch'); if (gs) gs.value = q;
    const d = CB.D();
    const ql = q.toLowerCase();
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
    const hl = (t) => esc(t).replace(re, '<mark>$1</mark>');
    const snip = (t) => { const i = t.toLowerCase().indexOf(ql); if (i < 0) return null; const a = Math.max(0, i - 60); return (a ? '…' : '') + t.slice(a, i + q.length + 80) + (i + q.length + 80 < t.length ? '…' : ''); };
    const studs = CB.can('students') ? d.students.filter((s) => (CB.anon() ? CB.code(s) : [s.name, s.admNo, s.parentName, s.parentPhone, s.contact, s.notes, (s.tags || []).join(' ')].join(' ')).toLowerCase().includes(ql)) : [];
    const sess = CB.can('sessions') ? d.sessions.map((x) => ({ x, t: sessText(x) })).filter((r) => r.t.toLowerCase().includes(ql)) : [];
    const fus = CB.can('followups') ? d.followups.filter((f) => [f.note, f.kind, f.title, CB.sName(CB.st(f.studentId))].join(' ').toLowerCase().includes(ql)) : [];
    const atts = CB.can('attachments') ? d.attachments.filter((a) => [a.name, a.caption].join(' ').toLowerCase().includes(ql)) : [];
    const total = studs.length + sess.length + fus.length + atts.length;
    el.innerHTML = `<div class="page-h"><div><h1>Search results</h1><p class="muted">${total} result${total === 1 ? '' : 's'} for “${esc(q)}”</p></div></div>
      ${studs.length ? `<section class="card"><h2 class="card-t">${icon('users')} Students (${studs.length})</h2><ul class="list">${studs.map((s) => `<li class="li-click" data-go="#/student/${s.id}"><span class="avatar sm">${esc(CB.initials(s))}</span><div class="grow"><b>${hl(CB.sName(s))}</b> <span class="muted">${esc(CB.sClass(s))}</span>${!CB.anon() && s.notes && snip(s.notes) ? `<div class="muted sm">${hl(snip(s.notes))}</div>` : ''}</div>${CB.caseBadge(s)}</li>`).join('')}</ul></section>` : ''}
      ${sess.length ? `<section class="card"><h2 class="card-t">${icon('note')} Session notes (${sess.length})</h2><ul class="list">${sess.slice(0, 100).map(({ x, t }) => `<li class="li-click" data-go="${x.studentIds && x.studentIds[0] && CB.can('students') ? '#/student/' + x.studentIds[0] : '#/sessions'}"><div class="date-pill"><b>${UI.parseISO(x.date).getDate()}</b><small>${UI.MONTHS[UI.parseISO(x.date).getMonth()]}</small></div><div class="grow"><b>${sessTitle(x)}</b><div class="muted sm">${hl(snip(t) || '')}</div></div></li>`).join('')}</ul></section>` : ''}
      ${fus.length ? `<section class="card"><h2 class="card-t">${icon('bell')} Follow-ups (${fus.length})</h2><ul class="list">${fus.map(fuRow).join('')}</ul></section>` : ''}
      ${atts.length ? `<section class="card"><h2 class="card-t">${icon('clip')} Attachments (${atts.length})</h2><ul class="list">${atts.map((a) => `<li class="li-click" data-go="#/student/${a.studentId}">${icon('clip')}<div class="grow"><b>${hl(a.name)}</b> <span class="muted">${esc(CB.sName(CB.st(a.studentId)))}</span>${a.caption ? `<div class="muted sm">${hl(a.caption)}</div>` : ''}</div></li>`).join('')}</ul></section>` : ''}
      ${!total ? CB.emptyState('search', 'Nothing found', 'Try a different word, a student’s name, or an issue like “exam”.') : ''}`;
    $$('[data-go]', el).forEach((x) => x.onclick = () => { location.hash = x.dataset.go; });
    bindFuRows(el);
  };

  // =============== ATTACHMENTS ===============
  const MAX = 15 * 1024 * 1024;
  CB.pickAttachments = function (s) {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.multiple = true; inp.accept = 'image/*,application/pdf,.doc,.docx,.txt';
    inp.onchange = async () => {
      const files = Array.from(inp.files || []);
      if (!files.length) return;
      const caption = files.length === 1 ? await askCaption(files[0].name) : '';
      if (caption === null) return;
      let n = 0;
      for (const f of files) {
        if (f.size > MAX) { toast(`${f.name} is larger than 15 MB and was skipped.`, 'warn', 5000); continue; }
        const id = Store.uid();
        const buf = await f.arrayBuffer();
        await Store.fileSet(id, await Store.encryptBytes(CB.S.dek, buf));
        CB.D().attachments.push({ id, studentId: s.id, name: f.name, mime: f.type || 'application/octet-stream', size: f.size, caption, created: Date.now(), by: CB.S.user.username });
        n++;
      }
      if (n) { CB.audit(`Attached ${n} file(s)`); CB.commit(); toast(`${n} file${n > 1 ? 's' : ''} attached and encrypted`); caseTab = 'files'; CB.refresh(); }
    };
    inp.click();
  };
  function askCaption(name) {
    return new Promise((resolve) => {
      let done = false;
      const m = openModal({
        title: 'Describe this file', size: 'sm',
        body: `<p class="muted">${esc(name)}</p><label class="fld"><span>Caption (optional)</span><input class="input" id="cap" placeholder="e.g. Parent consent form, signed"></label>`,
        footer: `<button class="btn ghost" data-close>Cancel</button><button class="btn primary" id="cap-ok">Attach</button>`,
        onClose: () => { if (!done) resolve(null); },
      });
      const ok = () => { done = true; const v = m.querySelector('#cap').value.trim(); closeModal(); resolve(v); };
      m.querySelector('#cap-ok').onclick = ok;
      m.querySelector('#cap').onkeydown = (e) => { if (e.key === 'Enter') ok(); };
    });
  }
  async function blobOf(a) {
    const rec = await Store.fileGet(a.id);
    if (!rec) throw new Error('File data missing');
    return new Blob([await Store.decryptBytes(CB.S.dek, rec)], { type: a.mime });
  }
  CB.blobOf = blobOf;
  function drawFiles(body, s) {
    const atts = CB.D().attachments.filter((a) => a.studentId === s.id).sort((a, b) => b.created - a.created);
    const canE = CB.can('attachments', 'edit');
    if (!atts.length) { body.innerHTML = CB.emptyState('clip', 'No attachments', 'Attach photos of forms, letters or reports. Files are encrypted.', canE ? `<button class="btn primary" id="f-add">${icon('upload')} Attach file</button>` : ''); const b = $('#f-add', body); if (b) b.onclick = () => CB.pickAttachments(s); return; }
    body.innerHTML = `<div class="files">${atts.map((a) => `<div class="file card" data-id="${a.id}">
      <div class="thumb" data-open="${a.id}">${a.mime.startsWith('image/') ? '<div class="spin"></div>' : icon(a.mime === 'application/pdf' ? 'note' : 'clip', 'xl')}</div>
      <div class="file-i"><b title="${esc(a.name)}">${esc(a.name)}</b><small>${esc(a.caption || '')}</small><small class="muted">${fmtDate(isoDate(new Date(a.created)))} · ${fmtBytes(a.size)}</small></div>
      <div class="file-a"><button class="icon-btn sm" data-open="${a.id}" title="Open">${icon('eye')}</button><button class="icon-btn sm" data-dl="${a.id}" title="Save a copy">${icon('download')}</button>${canE ? `<button class="icon-btn sm" data-rm="${a.id}" title="Delete">${icon('trash')}</button>` : ''}</div></div>`).join('')}</div>`;
    const urls = [];
    atts.filter((a) => a.mime.startsWith('image/')).forEach(async (a) => {
      try { const u = URL.createObjectURL(await blobOf(a)); urls.push(u); const t = body.querySelector(`.file[data-id="${a.id}"] .thumb`); if (t) t.innerHTML = `<img src="${u}" alt="">`; } catch (e) { /* missing */ }
    });
    const find = (id) => atts.find((a) => a.id === id);
    $$('[data-open]', body).forEach((b) => b.onclick = async () => {
      const a = find(b.dataset.open);
      try {
        const blob = await blobOf(a); const u = URL.createObjectURL(blob);
        if (a.mime.startsWith('image/')) openModal({ title: a.name, size: 'xl', body: `<div class="img-view"><img src="${u}" alt=""></div>${a.caption ? `<p class="muted center">${esc(a.caption)}</p>` : ''}`, onClose: () => URL.revokeObjectURL(u) });
        else if (a.mime === 'application/pdf') openModal({ title: a.name, size: 'xl', body: `<iframe class="pdf-view" src="${u}"></iframe>`, onClose: () => URL.revokeObjectURL(u) });
        else { UI.download(a.name, blob); }
      } catch (e) { toast('Could not open file: ' + e.message, 'err'); }
    });
    $$('[data-dl]', body).forEach((b) => b.onclick = async () => { const a = find(b.dataset.dl); UI.download(a.name, await blobOf(a)); toast('Saved an unencrypted copy to your Downloads folder.', 'warn', 4000); });
    $$('[data-rm]', body).forEach((b) => b.onclick = async () => {
      const a = find(b.dataset.rm);
      if (!(await confirmBox(`Delete <b>${esc(a.name)}</b>?`, { ok: 'Delete', danger: true }))) return;
      await Store.fileDel(a.id);
      CB.D().attachments = CB.D().attachments.filter((x) => x.id !== a.id);
      CB.commit(); toast('File deleted'); CB.refresh();
    });
    CB.cleanup = () => urls.forEach((u) => URL.revokeObjectURL(u));
  }
})();
