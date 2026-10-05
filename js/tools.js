/* CounselBook - interactive classroom tools */
(function () {
  'use strict';
  const { esc, icon } = UI;

  const TOOLS = [
    { id: 'breathing', name: 'Breathing Bubble', icon: 'heart', desc: 'Guided box or 4-7-8 breathing with an animated bubble.' },
    { id: 'grounding', name: '5-4-3-2-1 Grounding', icon: 'eye', desc: 'Step-by-step senses exercise for anxious moments.' },
    { id: 'feelings', name: 'Feelings Wheel', icon: 'sparkle', desc: 'Click a core feeling to find more precise words.' },
    { id: 'moodmeter', name: 'Mood Meter Check-in', icon: 'chart', desc: 'Class check-in on energy and pleasantness with anonymous tally.' },
    { id: 'spinner', name: 'Question Spinner', icon: 'refresh', desc: 'Spin for icebreaker, feelings, reflection or career questions.' },
    { id: 'scenarios', name: 'Scenario Cards', icon: 'note', desc: 'Discussion cards on friendship, peer pressure, conflict and online life.' },
    { id: 'worry', name: 'Worry Sorter', icon: 'folder', desc: 'Type worries and sort into control / influence / let go.' },
    { id: 'strengths', name: 'Strengths Picker', icon: 'flag', desc: 'Choose top 5 character strengths and print them.' },
    { id: 'timer', name: 'Activity Timer', icon: 'clock', desc: 'Big countdown timer for group work and Pomodoro sprints.' },
    { id: 'mandala', name: 'Mandala Maker', icon: 'sparkle', desc: 'Art therapy: draw once, see it mirrored into a calming mandala.', art: true },
    { id: 'studio', name: 'Art Studio', icon: 'edit', desc: 'Art therapy canvas with templates: mask, heart, jar, body, bridge, comic…', art: true },
  ];

  function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  const mounts = {
    breathing(el) {
      const patterns = { 'Box 4-4-4-4': [['Breathe in', 4], ['Hold', 4], ['Breathe out', 4], ['Hold', 4]], '4-7-8 Relax': [['Breathe in', 4], ['Hold', 7], ['Breathe out', 8]], 'Simple 4-6': [['Breathe in', 4], ['Breathe out', 6]] };
      el.innerHTML = `<div class="tool-center">
        <div class="seg" id="br-pat">${Object.keys(patterns).map((k, i) => `<button class="${i === 0 ? 'on' : ''}" data-k="${esc(k)}">${esc(k)}</button>`).join('')}</div>
        <div class="bubble-stage"><div class="bubble" id="br-b"></div><div class="bubble-txt"><div id="br-phase">Ready?</div><div id="br-count" class="big-num"></div></div></div>
        <div class="row-c"><button class="btn primary lg" id="br-go">${icon('play')} Start</button><span class="muted" id="br-rounds"></span></div></div>`;
      let pat = Object.keys(patterns)[0], timer = null, running = false, rounds = 0;
      const b = el.querySelector('#br-b'), ph = el.querySelector('#br-phase'), ct = el.querySelector('#br-count');
      el.querySelector('#br-pat').onclick = (e) => {
        const k = e.target.closest('button'); if (!k) return;
        el.querySelectorAll('#br-pat button').forEach((x) => x.classList.toggle('on', x === k));
        pat = k.dataset.k; stop();
      };
      function stop() { running = false; clearTimeout(timer); ph.textContent = 'Ready?'; ct.textContent = ''; b.style.transition = 'transform 1s'; b.style.transform = 'scale(.55)'; el.querySelector('#br-go').innerHTML = icon('play') + ' Start'; }
      function run(i, n) {
        if (!running) return;
        const steps = patterns[pat];
        const [label, secs] = steps[i];
        if (n === secs) {
          ph.textContent = label;
          b.style.transition = `transform ${secs}s ease-in-out`;
          if (label === 'Breathe in') b.style.transform = 'scale(1)';
          if (label === 'Breathe out') b.style.transform = 'scale(.55)';
        }
        ct.textContent = n;
        timer = setTimeout(() => {
          if (n > 1) run(i, n - 1);
          else { const ni = (i + 1) % steps.length; if (ni === 0) { rounds++; el.querySelector('#br-rounds').textContent = `Rounds completed: ${rounds}`; } run(ni, steps[ni][1]); }
        }, 1000);
      }
      el.querySelector('#br-go').onclick = () => {
        if (running) return stop();
        running = true; rounds = 0; el.querySelector('#br-rounds').textContent = '';
        el.querySelector('#br-go').innerHTML = icon('pause') + ' Stop';
        run(0, patterns[pat][0][1]);
      };
      b.style.transform = 'scale(.55)';
      return () => { running = false; clearTimeout(timer); };
    },

    grounding(el) {
      const steps = [
        { n: 5, s: 'SEE', tip: 'Look around. Name five things you can see.' },
        { n: 4, s: 'TOUCH', tip: 'Notice four things you can feel - your feet, the chair, your clothes...' },
        { n: 3, s: 'HEAR', tip: 'Listen. What three sounds can you hear?' },
        { n: 2, s: 'SMELL', tip: 'Find two things you can smell (or two favourite smells).' },
        { n: 1, s: 'TASTE', tip: 'Notice one thing you can taste, or take a sip of water.' },
      ];
      let i = -1;
      function draw() {
        if (i < 0) el.innerHTML = `<div class="tool-center"><h2 class="tool-h">Let's come back to right now.</h2><p class="lead">Take one slow breath. We'll use our five senses.</p><button class="btn primary lg" id="g-next">Begin</button></div>`;
        else if (i >= steps.length) el.innerHTML = `<div class="tool-center"><div class="big-num">${icon('check', 'xl')}</div><h2 class="tool-h">Well done.</h2><p class="lead">Take one more slow breath. How do you feel now compared to before?</p><button class="btn lg" id="g-next">Start again</button></div>`;
        else {
          const st = steps[i];
          el.innerHTML = `<div class="tool-center"><div class="dots">${steps.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>
          <div class="ground-num">${st.n}</div><h2 class="tool-h">things you can ${st.s}</h2><p class="lead">${st.tip}</p>
          <div class="ground-boxes">${Array.from({ length: st.n }, (_, k) => `<input class="input" placeholder="${k + 1}">`).join('')}</div>
          <div class="row-c"><button class="btn ghost" id="g-back">Back</button><button class="btn primary lg" id="g-next">Next</button></div></div>`;
        }
        el.querySelector('#g-next').onclick = () => { i = i >= steps.length ? -1 : i + 1; draw(); };
        const bk = el.querySelector('#g-back'); if (bk) bk.onclick = () => { i--; draw(); };
      }
      draw();
    },

    feelings(el) {
      const W = window.FEELINGS_WHEEL;
      const N = W.length, C = 200, R = 190, r0 = 62;
      let g = '';
      W.forEach((f, i) => {
        const a0 = (i / N) * Math.PI * 2 - Math.PI / 2, a1 = ((i + 1) / N) * Math.PI * 2 - Math.PI / 2;
        const p = (rad, a) => `${C + rad * Math.cos(a)},${C + rad * Math.sin(a)}`;
        const mid = (a0 + a1) / 2;
        g += `<g class="fw-seg" data-i="${i}" tabindex="0" role="button" aria-label="${f.core}"><path d="M${p(r0, a0)}L${p(R, a0)}A${R},${R} 0 0,1 ${p(R, a1)}L${p(r0, a1)}A${r0},${r0} 0 0,0 ${p(r0, a0)}Z" fill="var(--fw-${i})" stroke="var(--surface)" stroke-width="3"/>
        <text x="${C + 128 * Math.cos(mid)}" y="${C + 128 * Math.sin(mid) + 6}" text-anchor="middle">${f.core}</text></g>`;
      });
      el.innerHTML = `<div class="fw-wrap"><svg viewBox="0 0 400 400" class="fw">${g}<circle cx="${C}" cy="${C}" r="${r0 - 4}" fill="var(--surface)"/><text x="${C}" y="${C + 5}" text-anchor="middle" class="fw-c">I feel...</text></svg>
        <div class="fw-side" id="fw-side"><h3>Click a feeling</h3><p class="muted">Start with the big feeling, then choose the word that fits best.</p></div></div>`;
      const side = el.querySelector('#fw-side');
      function pick(i) {
        const f = W[i];
        el.querySelectorAll('.fw-seg').forEach((s) => s.classList.toggle('dim', +s.dataset.i !== i));
        side.innerHTML = `<h3 style="color:var(--fw-${i}-ink)">${f.core}</h3><p class="muted">Which word fits best?</p><div class="chips big">${f.words.map((w) => `<button class="chip" data-w="${w}">${w}</button>`).join('')}</div><div id="fw-out" class="fw-out"></div>`;
        side.querySelectorAll('[data-w]').forEach((b) => b.onclick = () => {
          side.querySelectorAll('[data-w]').forEach((x) => x.classList.toggle('on', x === b));
          side.querySelector('#fw-out').innerHTML = `<p class="lead">"I feel <b>${b.dataset.w.toLowerCase()}</b> because ..."</p><p class="muted">What happened? What do you need right now?</p>`;
        });
      }
      el.querySelectorAll('.fw-seg').forEach((s) => { s.onclick = () => pick(+s.dataset.i); s.onkeydown = (e) => { if (e.key === 'Enter') pick(+s.dataset.i); }; });
    },

    moodmeter(el) {
      const Q = [
        { k: 'red', t: 'High energy, unpleasant', w: 'Angry, stressed, anxious, frustrated' },
        { k: 'yellow', t: 'High energy, pleasant', w: 'Excited, happy, energetic, proud' },
        { k: 'blue', t: 'Low energy, unpleasant', w: 'Sad, tired, bored, lonely' },
        { k: 'green', t: 'Low energy, pleasant', w: 'Calm, relaxed, content, peaceful' },
      ];
      const tally = { red: 0, yellow: 0, blue: 0, green: 0 };
      function draw() {
        const total = Object.values(tally).reduce((a, b) => a + b, 0);
        el.innerHTML = `<div class="mm-grid">
          <div class="mm-axis-y"><span>High energy</span><span>Low energy</span></div>
          <div class="mm-quads">${Q.map((q) => `<button class="mm-q mm-${q.k}" data-k="${q.k}"><b>${q.t}</b><span>${q.w}</span><em>${tally[q.k]}</em></button>`).join('')}</div>
          <div class="mm-axis-x"><span>Unpleasant</span><span>Pleasant</span></div></div>
          <div class="row-c"><span class="muted">Responses: <b>${total}</b> - tap a box to add your check-in.</span><button class="btn ghost sm" id="mm-reset">${icon('refresh')} Reset tally</button></div>`;
        el.querySelectorAll('.mm-q').forEach((b) => b.onclick = () => { tally[b.dataset.k]++; draw(); el.querySelector(`.mm-${b.dataset.k}`).classList.add('pulse'); });
        el.querySelector('#mm-reset').onclick = () => { Object.keys(tally).forEach((k) => tally[k] = 0); draw(); };
      }
      draw();
    },

    spinner(el) {
      const decks = window.SPINNER_DECKS;
      let deck = Object.keys(decks)[0], rot = 0, spinning = false;
      function draw() {
        const items = decks[deck];
        const n = items.length, C = 160, R = 150;
        let g = '';
        items.forEach((t, i) => {
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
          const p = (a) => `${C + R * Math.sin(a)},${C - R * Math.cos(a)}`;
          const mid = (a0 + a1) / 2;
          const tx = C + 100 * Math.sin(mid), ty = C - 100 * Math.cos(mid);
          g += `<path d="M${C},${C}L${p(a0)}A${R},${R} 0 0,1 ${p(a1)}Z" fill="var(--series-${(i % 8) + 1})" stroke="var(--surface)" stroke-width="2"/>
            <text x="${tx}" y="${ty}" transform="rotate(${(mid * 180) / Math.PI - 90} ${tx} ${ty})" text-anchor="middle" dominant-baseline="middle" class="sp-t">${i + 1}</text>`;
        });
        el.innerHTML = `<div class="tool-center"><div class="seg" id="sp-deck">${Object.keys(decks).map((k) => `<button class="${k === deck ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
          <div class="sp-wrap"><div class="sp-pointer"></div><svg viewBox="0 0 320 320" class="sp" id="sp-svg" style="transform:rotate(${rot}deg)">${g}<circle cx="${C}" cy="${C}" r="22" fill="var(--surface)" stroke="var(--line)"/></svg></div>
          <button class="btn primary lg" id="sp-go">${icon('refresh')} Spin</button>
          <div class="sp-result" id="sp-res">&nbsp;</div></div>`;
        el.querySelector('#sp-deck').onclick = (e) => { const b = e.target.closest('button'); if (b && !spinning) { deck = b.dataset.k; draw(); } };
        el.querySelector('#sp-go').onclick = () => {
          if (spinning) return;
          spinning = true;
          const pickI = Math.floor(Math.random() * n);
          const segDeg = 360 / n;
          const target = 360 - (pickI * segDeg + segDeg / 2);
          rot = rot - (rot % 360) + 360 * 5 + target;
          const svg = el.querySelector('#sp-svg');
          svg.style.transition = 'transform 3.2s cubic-bezier(.17,.67,.2,1)';
          svg.style.transform = `rotate(${rot}deg)`;
          el.querySelector('#sp-res').innerHTML = '&nbsp;';
          setTimeout(() => { spinning = false; el.querySelector('#sp-res').innerHTML = `<span class="sp-n">${pickI + 1}</span> ${esc(items[pickI])}`; }, 3300);
        };
      }
      draw();
    },

    scenarios(el) {
      const decks = window.SCENARIO_DECKS;
      let deck = Object.keys(decks)[0], order = shuffle(decks[deck]), i = 0;
      function draw() {
        el.innerHTML = `<div class="tool-center"><div class="seg" id="sc-deck">${Object.keys(decks).map((k) => `<button class="${k === deck ? 'on' : ''}" data-k="${k}">${k}</button>`).join('')}</div>
          <div class="sc-card"><div class="sc-n">Card ${i + 1} of ${order.length}</div><p>${esc(order[i])}</p></div>
          <div class="sc-q muted">Discuss: Is this healthy or unhealthy? How might each person feel? What is a respectful response?</div>
          <div class="row-c"><button class="btn ghost" id="sc-prev">${icon('chevl')} Previous</button><button class="btn primary" id="sc-next">Next card ${icon('chevr')}</button><button class="btn ghost" id="sc-sh">${icon('refresh')} Shuffle</button></div></div>`;
        el.querySelector('#sc-deck').onclick = (e) => { const b = e.target.closest('button'); if (b) { deck = b.dataset.k; order = shuffle(decks[deck]); i = 0; draw(); } };
        el.querySelector('#sc-next').onclick = () => { i = (i + 1) % order.length; draw(); };
        el.querySelector('#sc-prev').onclick = () => { i = (i - 1 + order.length) % order.length; draw(); };
        el.querySelector('#sc-sh').onclick = () => { order = shuffle(order); i = 0; draw(); };
      }
      draw();
    },

    worry(el) {
      const cols = [['control', 'I can control'], ['influence', 'I can influence'], ['letgo', "I can't control - let it go"]];
      const items = [];
      function draw() {
        el.innerHTML = `<form class="row-c" id="w-f"><input class="input" id="w-in" placeholder="Type a worry and press Enter..." style="max-width:440px" autocomplete="off"><button class="btn primary">${icon('plus')} Add</button></form>
          <div class="worry-cols">
            <div class="worry-col pool" data-col="pool"><h4>Unsorted worries</h4>${list('pool')}</div>
            ${cols.map(([k, t]) => `<div class="worry-col w-${k}" data-col="${k}"><h4>${t}</h4>${list(k)}</div>`).join('')}
          </div><p class="muted center">Drag each worry into a box. For worries you can control, plan one small step.</p>`;
        el.querySelector('#w-f').onsubmit = (e) => { e.preventDefault(); const v = el.querySelector('#w-in').value.trim(); if (v) { items.push({ t: v, col: 'pool' }); draw(); el.querySelector('#w-in').focus(); } };
        el.querySelectorAll('.worry-item').forEach((it) => it.ondragstart = (e) => e.dataTransfer.setData('text', it.dataset.i));
        el.querySelectorAll('.worry-col').forEach((c) => {
          c.ondragover = (e) => { e.preventDefault(); c.classList.add('over'); };
          c.ondragleave = () => c.classList.remove('over');
          c.ondrop = (e) => { e.preventDefault(); const i = +e.dataTransfer.getData('text'); if (items[i]) { items[i].col = c.dataset.col; draw(); } };
        });
        el.querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { items.splice(+b.dataset.del, 1); draw(); });
      }
      const list = (col) => items.map((it, i) => it.col === col ? `<div class="worry-item" draggable="true" data-i="${i}">${esc(it.t)}<button class="x" data-del="${i}" title="Remove">${icon('x')}</button></div>` : '').join('');
      draw();
    },

    strengths(el) {
      const picked = new Set();
      function draw() {
        el.innerHTML = `<p class="lead center">Choose your <b>top 5</b> strengths (${picked.size}/5).</p>
          <div class="str-grid">${window.STRENGTHS.map((s) => `<button class="str-card ${picked.has(s) ? 'on' : ''}" data-s="${s}">${s}</button>`).join('')}</div>
          <div class="row-c"><button class="btn ghost" id="st-clear">Clear</button><button class="btn primary" id="st-print" ${picked.size ? '' : 'disabled'}>${icon('print')} Print my strengths</button></div>`;
        el.querySelectorAll('.str-card').forEach((b) => b.onclick = () => {
          const s = b.dataset.s;
          if (picked.has(s)) picked.delete(s); else if (picked.size < 5) picked.add(s); else UI.toast('You already picked 5 - remove one first', 'warn');
          draw();
        });
        el.querySelector('#st-clear').onclick = () => { picked.clear(); draw(); };
        el.querySelector('#st-print').onclick = () => App.printHTML(`<h1>My Top 5 Strengths</h1><p>Name: ____________________ &nbsp; Class: ______ &nbsp; Date: ________</p>
          <table class="p-table"><tr><th>Strength</th><th>A time I used it</th></tr>${[...picked].map((s) => `<tr><td><b>${esc(s)}</b></td><td style="height:70px"></td></tr>`).join('')}</table>`, 'My Strengths');
      }
      draw();
    },

    timer(el) {
      let total = 300, left = 300, t = null;
      function fmt(s) { return `${Math.floor(s / 60)}:${UI.pad(s % 60)}`; }
      function draw() {
        el.innerHTML = `<div class="tool-center"><div class="seg" id="tm-p">${[1, 2, 5, 10, 15, 25].map((m) => `<button data-m="${m}" class="${total === m * 60 ? 'on' : ''}">${m} min</button>`).join('')}</div>
          <div class="timer-face ${left === 0 ? 'done' : ''}" id="tm-f">${fmt(left)}</div>
          <div class="timer-bar"><span style="width:${(left / total) * 100}%"></span></div>
          <div class="row-c"><button class="btn primary lg" id="tm-go">${t ? icon('pause') + ' Pause' : icon('play') + ' Start'}</button><button class="btn lg ghost" id="tm-r">${icon('refresh')} Reset</button></div></div>`;
        el.querySelector('#tm-p').onclick = (e) => { const b = e.target.closest('button'); if (b) { stop(); total = left = +b.dataset.m * 60; draw(); } };
        el.querySelector('#tm-go').onclick = () => { if (t) stop(); else if (left > 0) { t = setInterval(tick, 1000); } draw(); };
        el.querySelector('#tm-r').onclick = () => { stop(); left = total; draw(); };
      }
      function tick() {
        left = Math.max(0, left - 1);
        if (left === 0) { stop(); beep(); }
        const f = el.querySelector('#tm-f'); if (!f) return;
        if (left === 0) draw();
        else { f.textContent = fmt(left); el.querySelector('.timer-bar span').style.width = (left / total) * 100 + '%'; }
      }
      function stop() { clearInterval(t); t = null; }
      function beep() {
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          [0, 0.35, 0.7].forEach((d) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(ctx.destination); g.gain.setValueAtTime(0.2, ctx.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + d + 0.3); o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.3); });
        } catch (e) { /* audio not available */ }
      }
      draw();
      return stop;
    },
  };

  // ---------------- art therapy canvases ----------------
  const PALETTE = ['#111111', '#6b7280', '#ffffff', '#e34948', '#ff7a1a', '#f5c400', '#7ac943', '#1baf7a', '#3dd6d0', '#2a78d6', '#4a3aa7', '#b05cd6', '#ff8fb8', '#8b5a2b'];
  const TEMPLATES = {
    blank: { name: 'Blank page', draw() {} },
    mask: { name: 'Inside / outside mask', draw(c, W, H) { c.beginPath(); c.ellipse(W / 2, H / 2, 210, 270, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(W / 2 - 85, H / 2 - 50, 50, 28, 0, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.ellipse(W / 2 + 85, H / 2 - 50, 50, 28, 0, 0, Math.PI * 2); c.stroke(); label(c, 'Outside: what others see  ·  On paper inside: what I keep inside', W / 2, 22); } },
    heart: { name: 'Heart map', draw(c, W, H) { c.beginPath(); const x = W / 2, y = H / 2 - 120; c.moveTo(x, y + 60); c.bezierCurveTo(x - 20, y - 40, x - 300, y - 30, x - 260, y + 140); c.bezierCurveTo(x - 230, y + 260, x - 60, y + 320, x, y + 390); c.bezierCurveTo(x + 60, y + 320, x + 230, y + 260, x + 260, y + 140); c.bezierCurveTo(x + 300, y - 30, x + 20, y - 40, x, y + 60); c.stroke(); label(c, 'Fill your heart with the people, places and things that matter to you', W / 2, 22); } },
    jar: { name: 'Feelings jar', draw(c, W, H) { const x = W / 2 - 170, y = 110, w = 340, h = 440; c.strokeRect(x - 15, y - 50, w + 30, 40); c.beginPath(); c.moveTo(x, y - 10); c.lineTo(x, y + h - 30); c.quadraticCurveTo(x, y + h, x + 30, y + h); c.lineTo(x + w - 30, y + h); c.quadraticCurveTo(x + w, y + h, x + w, y + h - 30); c.lineTo(x + w, y - 10); c.stroke(); c.setLineDash([6, 8]); for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(x + 8, y + (h / 5) * i); c.lineTo(x + w - 8, y + (h / 5) * i); c.stroke(); } c.setLineDash([]); label(c, 'Colour a layer for each feeling. Bigger feeling = thicker layer', W / 2, 22); } },
    body: { name: 'Body map', draw(c, W, H) { const x = W / 2; c.beginPath(); c.arc(x, 105, 55, 0, Math.PI * 2); c.stroke(); c.beginPath(); c.moveTo(x - 30, 158); c.lineTo(x - 70, 175); c.lineTo(x - 175, 330); c.lineTo(x - 145, 345); c.lineTo(x - 70, 250); c.lineTo(x - 75, 380); c.lineTo(x - 95, 570); c.lineTo(x - 30, 570); c.lineTo(x, 400); c.lineTo(x + 30, 570); c.lineTo(x + 95, 570); c.lineTo(x + 75, 380); c.lineTo(x + 70, 250); c.lineTo(x + 145, 345); c.lineTo(x + 175, 330); c.lineTo(x + 70, 175); c.lineTo(x + 30, 158); c.stroke(); label(c, 'Colour where you feel each feeling in your body', W / 2, 22); } },
    weather: { name: 'Inner weather window', draw(c, W, H) { c.strokeRect(150, 70, W - 300, H - 130); c.beginPath(); c.moveTo(W / 2, 70); c.lineTo(W / 2, H - 60); c.moveTo(150, H / 2); c.lineTo(W - 150, H / 2); c.stroke(); label(c, 'Draw the weather inside you today: sunny, cloudy, stormy, rainbow…', W / 2, 30); } },
    bridge: { name: 'Bridge drawing', draw(c, W, H) { c.beginPath(); c.moveTo(0, 330); c.lineTo(230, 330); c.lineTo(260, H); c.moveTo(W, 330); c.lineTo(W - 230, 330); c.lineTo(W - 260, H); c.stroke(); label(c, 'Where I am now', 115, 360); label(c, 'Where I want to be', W - 115, 360); label(c, 'Draw a bridge, and what helps you cross it', W / 2, 30); } },
    comic: { name: 'Comic strip (6 panels)', draw(c, W, H) { const pw = (W - 80) / 3, ph = (H - 90) / 2; for (let r = 0; r < 2; r++) for (let k = 0; k < 3; k++) { c.strokeRect(20 + k * (pw + 20), 50 + r * (ph + 20), pw, ph); label(c, String(r * 3 + k + 1), 34 + k * (pw + 20), 68 + r * (ph + 20)); } label(c, 'The problem → what I felt → what I tried → what happened → what helped → the end', W / 2, 26); } },
    monster: { name: 'Worry monster', draw(c, W, H) { c.setLineDash([10, 10]); c.beginPath(); c.ellipse(W / 2, H / 2 + 30, 230, 220, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); label(c, 'Draw your worry as a monster. Give it a silly name! Then draw yourself bigger than it.', W / 2, 26); } },
    safe: { name: 'My safe place', draw(c, W, H) { c.strokeRect(40, 50, W - 80, H - 90); label(c, 'Draw a place where you feel safe and calm – real or imaginary', W / 2, 30); } },
  };
  function label(c, t, x, y) { c.save(); c.setLineDash([]); c.fillStyle = '#8a94a6'; c.font = '17px Segoe UI, sans-serif'; c.textAlign = 'center'; c.fillText(t, x, y); c.restore(); }

  function artTool(el, { mandala, template }) {
    const W = mandala ? 760 : 960, H = mandala ? 760 : 620, C = W / 2;
    let color = PALETTE[9], size = 8, mode = 'brush', seg = 8, mirror = true, rainbow = false, hue = 0, tpl = TEMPLATES[template] ? template : 'blank';
    const undo = [];
    el.innerHTML = `<div class="art-wrap"><div class="art-bar">
      <div class="art-group">${PALETTE.map((c, i) => `<button class="swatch ${i === 9 ? 'on' : ''}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('')}</div>
      <div class="art-group">${[4, 8, 16, 32].map((s) => `<button class="size ${s === size ? 'on' : ''}" data-s="${s}"><i style="width:${Math.max(4, s / 1.5)}px;height:${Math.max(4, s / 1.5)}px"></i></button>`).join('')}</div>
      <div class="art-group seg" id="am"><button data-m="brush" class="on">🖌️ Brush</button>${mandala ? '' : '<button data-m="fill">🪣 Fill</button>'}<button data-m="eraser">🧽 Eraser</button></div>
      ${mandala ? `<div class="art-group seg" id="aseg">${[6, 8, 12, 16].map((n) => `<button data-n="${n}" class="${n === seg ? 'on' : ''}">${n}</button>`).join('')}</div>
        <label class="check sm"><input type="checkbox" id="amir" checked> Mirror</label><label class="check sm"><input type="checkbox" id="arb"> 🌈 Rainbow</label>`
      : `<select class="input" id="atpl" style="width:auto">${Object.entries(TEMPLATES).map(([k, v]) => `<option value="${k}" ${k === tpl ? 'selected' : ''}>${v.name}</option>`).join('')}</select>`}
      <div class="art-group"><button class="btn sm" id="aundo">↶ Undo</button><button class="btn sm" id="aclear">${icon('trash')} Clear</button><button class="btn sm" id="asave">${icon('download')} Save</button><button class="btn sm primary" id="aprint">${icon('print')} Print</button></div>
      </div><div class="art-stage" style="aspect-ratio:${W}/${H}"><canvas class="art-bg" width="${W}" height="${H}"></canvas><canvas class="art-fg" width="${W}" height="${H}"></canvas></div></div>`;
    const bg = el.querySelector('.art-bg'), fg = el.querySelector('.art-fg');
    const bx = bg.getContext('2d'), fx = fg.getContext('2d', { willReadFrequently: true });
    fx.lineCap = 'round'; fx.lineJoin = 'round';
    function drawBg() {
      bx.fillStyle = '#fff'; bx.fillRect(0, 0, W, H);
      bx.strokeStyle = '#b9c2d0'; bx.lineWidth = 3;
      if (mandala) {
        bx.save(); bx.strokeStyle = '#e3e8ef'; bx.lineWidth = 1;
        for (let k = 0; k < seg; k++) { const a = (Math.PI * 2 * k) / seg; bx.beginPath(); bx.moveTo(C, C); bx.lineTo(C + Math.cos(a) * C, C + Math.sin(a) * C); bx.stroke(); }
        [0.25, 0.5, 0.75, 0.98].forEach((r) => { bx.beginPath(); bx.arc(C, C, C * r, 0, Math.PI * 2); bx.stroke(); });
        bx.restore();
      } else TEMPLATES[tpl].draw(bx, W, H);
    }
    drawBg();
    const snap = () => { undo.push(fx.getImageData(0, 0, W, H)); if (undo.length > 25) undo.shift(); };
    const pt = (e) => { const r = fg.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }; };
    let drawing = false, lp = null;
    function stroke(a, b) {
      fx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
      fx.lineWidth = size;
      if (rainbow) { hue = (hue + 3) % 360; fx.strokeStyle = `hsl(${hue},85%,55%)`; } else fx.strokeStyle = color;
      if (!mandala) { fx.beginPath(); fx.moveTo(a.x, a.y); fx.lineTo(b.x + 0.01, b.y); fx.stroke(); return; }
      for (let k = 0; k < seg; k++) {
        for (const m of mirror ? [1, -1] : [1]) {
          fx.save(); fx.translate(C, C); fx.rotate((Math.PI * 2 * k) / seg); fx.scale(1, m);
          fx.beginPath(); fx.moveTo(a.x - C, a.y - C); fx.lineTo(b.x - C + 0.01, b.y - C); fx.stroke(); fx.restore();
        }
      }
    }
    function flood(p) {
      const x0 = Math.floor(p.x), y0 = Math.floor(p.y);
      const comb = document.createElement('canvas'); comb.width = W; comb.height = H;
      const cx = comb.getContext('2d'); cx.drawImage(bg, 0, 0); cx.drawImage(fg, 0, 0);
      const src = cx.getImageData(0, 0, W, H).data;
      const out = fx.getImageData(0, 0, W, H), od = out.data;
      const i0 = (y0 * W + x0) * 4, tr = src[i0], tg = src[i0 + 1], tb = src[i0 + 2];
      const hex = color.replace('#', ''), fr = parseInt(hex.slice(0, 2), 16), fgc = parseInt(hex.slice(2, 4), 16), fb = parseInt(hex.slice(4, 6), 16);
      const seen = new Uint8Array(W * H), stack = [x0, y0];
      const same = (i) => Math.abs(src[i] - tr) + Math.abs(src[i + 1] - tg) + Math.abs(src[i + 2] - tb) < 60;
      let count = 0;
      while (stack.length && count < W * H) {
        const y = stack.pop(), x = stack.pop();
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const idx = y * W + x; if (seen[idx]) continue; seen[idx] = 1;
        const i = idx * 4; if (!same(i)) continue;
        od[i] = fr; od[i + 1] = fgc; od[i + 2] = fb; od[i + 3] = 255; count++;
        stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
      }
      fx.putImageData(out, 0, 0);
    }
    fg.addEventListener('pointerdown', (e) => {
      e.preventDefault(); snap();
      const p = pt(e);
      if (mode === 'fill') { flood(p); return; }
      drawing = true; lp = p; fg.setPointerCapture(e.pointerId); stroke(p, p);
    });
    fg.addEventListener('pointermove', (e) => { if (!drawing) return; const p = pt(e); stroke(lp, p); lp = p; });
    ['pointerup', 'pointercancel'].forEach((ev) => fg.addEventListener(ev, () => { drawing = false; }));
    const on = (sel, attr, fn) => el.querySelectorAll(sel).forEach((b) => b.onclick = () => { el.querySelectorAll(sel).forEach((x) => x.classList.toggle('on', x === b)); fn(b.dataset[attr]); });
    on('.swatch', 'c', (c) => { color = c; if (mode === 'eraser') { mode = 'brush'; el.querySelectorAll('#am button').forEach((x) => x.classList.toggle('on', x.dataset.m === 'brush')); } });
    on('.size', 's', (s) => { size = +s; });
    on('#am button', 'm', (m) => { mode = m; });
    if (mandala) {
      on('#aseg button', 'n', (n) => { seg = +n; drawBg(); });
      el.querySelector('#amir').onchange = (e) => { mirror = e.target.checked; };
      el.querySelector('#arb').onchange = (e) => { rainbow = e.target.checked; };
    } else el.querySelector('#atpl').onchange = (e) => { tpl = e.target.value; drawBg(); };
    el.querySelector('#aundo').onclick = () => { const s = undo.pop(); if (s) fx.putImageData(s, 0, 0); };
    el.querySelector('#aclear').onclick = () => { snap(); fx.clearRect(0, 0, W, H); };
    const composite = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.drawImage(bg, 0, 0); x.drawImage(fg, 0, 0); return c; };
    el.querySelector('#asave').onclick = () => composite().toBlob((b) => UI.download(`${mandala ? 'mandala' : 'artwork'}-${UI.isoDate()}.png`, b));
    el.querySelector('#aprint').onclick = () => CB.printHTML(`<h1>${mandala ? 'My Mandala' : esc(TEMPLATES[tpl].name)}</h1><p>Name: ____________________ &nbsp; Date: ____________</p><img class="p-art" src="${composite().toDataURL('image/png')}" alt=""><p><b>What I made and how I felt:</b></p><div class="p-lines"><div></div><div></div><div></div></div>`, mandala ? 'Mandala' : 'Artwork');
  }
  mounts.mandala = (el) => artTool(el, { mandala: true });
  mounts.studio = (el, params) => artTool(el, { template: params && params.get ? params.get('t') : '' });

  function mount(id, el, params) {
    const fn = mounts[id];
    if (!fn) { el.innerHTML = '<p>Tool not found.</p>'; return null; }
    return fn(el, params) || null;
  }

  window.Tools = { TOOLS, mount };
})();
