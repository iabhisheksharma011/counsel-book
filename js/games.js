/* CounselBook - interactive games for children (offline, no data stored except high scores on this PC) */
(function () {
  'use strict';
  const { esc, icon } = UI;

  // ---------- shared helpers ----------
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } };
  const best = (id) => +lsGet('cb-best-' + id, 0);
  const setBest = (id, v) => { if (v > best(id)) { lsSet('cb-best-' + id, v); return true; } return false; };

  let AC = null;
  const muted = () => lsGet('cb-mute', '0') === '1';
  function tone(freq, dur = 0.12, type = 'sine', vol = 0.14, when = 0) {
    if (muted()) return;
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      const o = AC.createOscillator(), g = AC.createGain();
      o.type = type; o.frequency.value = freq; o.connect(g); g.connect(AC.destination);
      const t = AC.currentTime + when;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no audio */ }
  }
  const SFX = {
    good: () => { tone(660, 0.1); tone(880, 0.16, 'sine', 0.14, 0.08); },
    bad: () => tone(180, 0.25, 'square', 0.06),
    pop: () => { tone(900, 0.05, 'triangle', 0.2); tone(300, 0.08, 'triangle', 0.12, 0.03); },
    flip: () => tone(420, 0.05, 'triangle', 0.07),
    win: () => [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.22, 'sine', 0.13, i * 0.11)),
    step: () => tone(520, 0.04, 'triangle', 0.06),
  };

  function confetti(host, n = 80) {
    const colors = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#4a3aa7', '#e34948'];
    const box = document.createElement('div');
    box.className = 'confetti';
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = pick(colors);
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      box.appendChild(p);
    }
    host.appendChild(box);
    setTimeout(() => box.remove(), 3600);
  }
  const stars = (n, of = 3) => '⭐'.repeat(n) + '☆'.repeat(Math.max(0, of - n));
  function winPanel(title, sub, again = 'Play again') {
    return `<div class="g-win"><div class="g-win-emoji">🏆</div><h2>${title}</h2><p>${sub}</p><button class="btn primary lg" data-again>${icon('refresh')} ${again}</button></div>`;
  }

  // =====================================================================
  const GAMES = [
    { id: 'memory', name: 'Feelings Memory Match', emoji: '🃏', color: 'g-blue', age: '5-12', skill: 'Emotional vocabulary', desc: 'Flip the cards and find matching feelings. Talk about each one you find!' },
    { id: 'catcher', name: 'Calm Catcher', emoji: '🧺', color: 'g-teal', age: '5-14', skill: 'Coping strategies', desc: 'Catch the calm stars and hearts, dodge the storm clouds. How long can you last?' },
    { id: 'balloons', name: 'Worry Balloon Pop', emoji: '🎈', color: 'g-pink', age: '5-14', skill: 'Letting go of worries', desc: 'Write your worries on balloons, then pop them and get a helpful thought.' },
    { id: 'breath', name: 'Balloon Breath', emoji: '🌬️', color: 'g-sky', age: '4-14', skill: 'Slow breathing', desc: 'Hold to breathe in and fill the balloon slowly – not too much or it pops!' },
    { id: 'detective', name: 'Emotion Detective', emoji: '🕵️', color: 'g-purple', age: '6-14', skill: 'Reading situations', desc: 'Solve the case: how would someone feel in this situation?' },
    { id: 'sorter', name: 'Thought Sorter', emoji: '🧠', color: 'g-orange', age: '8-16', skill: 'Helpful self-talk', desc: 'Quick! Is this thought helpful or unhelpful? Build your streak.' },
    { id: 'board', name: 'Feelings Journey Board Game', emoji: '🎲', color: 'g-green', age: '6-14', skill: 'Group sharing', desc: '2-4 players roll the dice, climb kindness ladders and answer sharing questions.' },
    { id: 'garden', name: 'Gratitude Garden', emoji: '🌻', color: 'g-yellow', age: '4-14', skill: 'Gratitude', desc: 'Every thing you are thankful for grows a flower. Fill your garden!' },
    { id: 'hero', name: 'Superhero Me', emoji: '🦸', color: 'g-red', age: '5-14', skill: 'Self-esteem', desc: 'Design your own superhero using your real strengths. Print your hero card!' },
    { id: 'kindness', name: 'Kindness Quest', emoji: '💖', color: 'g-rose', age: '6-14', skill: 'Social choices', desc: 'Choose-your-path stories. Every kind choice earns hearts.' },
  ];

  const mounts = {};

  // ---------------------------------------------------------------- 1. Memory
  mounts.memory = function (el) {
    const F = [['😀', 'Happy'], ['😢', 'Sad'], ['😠', 'Angry'], ['😨', 'Scared'], ['😮', 'Surprised'], ['😌', 'Calm'], ['😳', 'Embarrassed'], ['🥰', 'Loved'], ['😴', 'Tired'], ['🤩', 'Excited']];
    const ASK = { Happy: 'When did you last feel happy?', Sad: 'What helps you when you feel sad?', Angry: 'What can you do to cool down when angry?', Scared: 'Who can you go to when you feel scared?', Surprised: 'Tell us about a nice surprise!', Calm: 'Where do you feel most calm?', Embarrassed: 'Everyone feels embarrassed sometimes. What helps?', Loved: 'Who makes you feel loved?', Tired: 'What helps you rest?', Excited: 'What are you excited about?' };
    let level = 6, timers = [];
    function start() {
      const cards = shuffle(shuffle(F).slice(0, level).flatMap((f) => [f, f]));
      let first = null, lock = false, moves = 0, found = 0;
      el.innerHTML = `<div class="g-top"><div class="seg" id="mm-l">${[[6, 'Easy'], [8, 'Medium'], [10, 'Hard']].map(([n, l]) => `<button data-n="${n}" class="${level === n ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="g-score">Moves <b id="mv">0</b> · Pairs <b id="pr">0</b>/${level} · Best <b>${best('memory' + level) ? best('memory' + level) + ' pts' : '—'}</b></div></div>
        <div class="mem-grid" style="--cols:${level === 10 ? 5 : 4}">${cards.map((c, i) => `<button class="mem-card" data-i="${i}" aria-label="card"><span class="mem-in"><span class="mem-back">?</span><span class="mem-front">${c[0]}<small>${c[1]}</small></span></span></button>`).join('')}</div>
        <div class="g-msg" id="msg">Find the matching feelings!</div>`;
      el.querySelector('#mm-l').onclick = (e) => { const b = e.target.closest('button'); if (b) { level = +b.dataset.n; start(); } };
      const msg = el.querySelector('#msg');
      el.querySelectorAll('.mem-card').forEach((b) => b.onclick = () => {
        const i = +b.dataset.i;
        if (lock || b.classList.contains('open')) return;
        b.classList.add('open'); SFX.flip();
        if (first === null) { first = i; return; }
        moves++; el.querySelector('#mv').textContent = moves;
        const a = el.querySelector(`.mem-card[data-i="${first}"]`);
        if (cards[first][1] === cards[i][1]) {
          a.classList.add('done'); b.classList.add('done'); found++;
          el.querySelector('#pr').textContent = found;
          SFX.good();
          msg.innerHTML = `<span class="big-e">${cards[i][0]}</span> <b>${cards[i][1]}!</b> ${ASK[cards[i][1]]}`;
          first = null;
          if (found === level) {
            const pts = Math.max(10, level * 30 - (moves - level) * 5);
            const rec = setBest('memory' + level, pts);
            timers.push(setTimeout(() => { SFX.win(); confetti(el); el.insertAdjacentHTML('beforeend', winPanel('All feelings found!', `${moves} moves · ${pts} points ${rec ? '· New best! 🎉' : ''}`)); el.querySelector('[data-again]').onclick = start; }, 600));
          }
        } else {
          lock = true;
          timers.push(setTimeout(() => { a.classList.remove('open'); b.classList.remove('open'); lock = false; }, 850));
          first = null;
        }
      });
    }
    start();
    return () => timers.forEach(clearTimeout);
  };

  // ---------------------------------------------------------------- 2. Calm catcher
  mounts.catcher = function (el) {
    const GOOD = ['⭐', '💖', '🌈', '🌸', '🎈', '☀️', '🍀', '🦋'];
    const BAD = ['⛈️', '🌩️'];
    const TIPS = ['Breathe in… 2… 3… 4… and out.', 'You are doing great!', 'Talk to someone you trust.', 'Drink a glass of water.', 'Name 3 things you can see.', 'Stretch your arms up high!', 'Think of your favourite place.', 'Say: "I can do hard things."'];
    el.innerHTML = `<div class="g-top"><div class="g-score">Score <b id="sc">0</b> · Lives <span id="lv">❤️❤️❤️</span> · Best <b>${best('catcher')}</b></div><button class="btn primary" id="go">${icon('play')} Start</button></div>
      <div class="cv-wrap"><canvas id="cv" width="800" height="480" class="g-canvas"></canvas><div class="cv-tip" id="tip"></div></div>
      <div class="g-msg">Move the basket with your mouse, finger or ← → keys. Catch calm things, dodge storm clouds!</div>`;
    const cv = el.querySelector('#cv'), ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    let bx = W / 2, items = [], score = 0, lives = 3, raf = 0, running = false, last = 0, spawnT = 0, keys = {}, tipT = 0;
    const tipEl = el.querySelector('#tip');
    function draw() {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#bfe3ff'); g.addColorStop(1, '#fff6e0');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#9ed49a'; ctx.fillRect(0, H - 24, W, 24);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '42px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      items.forEach((it) => ctx.fillText(it.e, it.x, it.y));
      ctx.font = '64px "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
      ctx.fillText('🧺', bx, H - 52);
      if (!running) {
        ctx.fillStyle = 'rgba(255,255,255,.75)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#24508f'; ctx.font = 'bold 34px Segoe UI, sans-serif';
        ctx.fillText(lives <= 0 ? `Game over! Score: ${score}` : 'Press Start to play', W / 2, H / 2 - 10);
        ctx.font = '20px Segoe UI, sans-serif';
        ctx.fillText(lives <= 0 ? 'Every star you caught is a calm idea. Try again?' : 'Catch ⭐💖🌈  ·  Avoid ⛈️', W / 2, H / 2 + 30);
      }
    }
    function loop(t) {
      const dt = Math.min(50, t - (last || t)); last = t;
      if (keys.ArrowLeft) bx -= 0.6 * dt;
      if (keys.ArrowRight) bx += 0.6 * dt;
      bx = Math.max(30, Math.min(W - 30, bx));
      spawnT -= dt;
      if (spawnT <= 0) {
        const bad = Math.random() < 0.22 + Math.min(0.13, score / 300);
        items.push({ x: 30 + Math.random() * (W - 60), y: -30, v: 0.12 + Math.random() * 0.08 + score * 0.004, e: bad ? pick(BAD) : pick(GOOD), bad });
        spawnT = Math.max(330, 900 - score * 12);
      }
      for (const it of items) it.y += it.v * dt;
      items = items.filter((it) => {
        if (it.y > H - 80 && it.y < H - 30 && Math.abs(it.x - bx) < 48) {
          if (it.bad) { lives--; SFX.bad(); cv.classList.add('shake'); setTimeout(() => cv.classList.remove('shake'), 300); }
          else { score++; SFX.good(); if (score % 5 === 0) showTip(); }
          return false;
        }
        return it.y < H + 30;
      });
      el.querySelector('#sc').textContent = score;
      el.querySelector('#lv').textContent = '❤️'.repeat(Math.max(0, lives)) + '🤍'.repeat(3 - Math.max(0, lives));
      if (lives <= 0) { running = false; if (setBest('catcher', score)) { SFX.win(); confetti(el.querySelector('.cv-wrap')); } el.querySelector('#go').innerHTML = icon('refresh') + ' Play again'; }
      draw();
      if (running) raf = requestAnimationFrame(loop);
    }
    function showTip() { tipEl.textContent = '💡 ' + pick(TIPS); tipEl.classList.add('show'); clearTimeout(tipT); tipT = setTimeout(() => tipEl.classList.remove('show'), 2200); }
    function startGame() { items = []; score = 0; lives = 3; last = 0; spawnT = 0; running = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); }
    el.querySelector('#go').onclick = startGame;
    const move = (cx) => { const r = cv.getBoundingClientRect(); bx = ((cx - r.left) / r.width) * W; };
    cv.addEventListener('mousemove', (e) => move(e.clientX));
    cv.addEventListener('touchmove', (e) => { e.preventDefault(); move(e.touches[0].clientX); }, { passive: false });
    const kd = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { keys[e.key] = true; e.preventDefault(); } };
    const ku = (e) => { keys[e.key] = false; };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    draw();
    return () => { running = false; cancelAnimationFrame(raf); clearTimeout(tipT); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
  };

  // ---------------------------------------------------------------- 3. Worry balloons
  mounts.balloons = function (el) {
    const SAMPLE = ['Tests', 'Making friends', 'Being left out', 'Homework', 'Arguments at home', 'Speaking in class', 'Being late', 'Sports day'];
    const HELP = ['You can talk to someone you trust about this.', 'Worries shrink when we share them.', 'Take a slow breath. You are safe right now.', 'What is one small step you can take?', 'You have handled hard things before!', 'It is okay to ask for help.', 'This feeling will pass.', 'Be kind to yourself, like you would to a friend.'];
    const COLORS = ['#ff6b8b', '#4aa3ff', '#ffc93c', '#7bd389', '#b18cff', '#ff9f43', '#3dd6d0'];
    let list = [], raf = 0, popped = 0;
    el.innerHTML = `<form class="g-top" id="bf"><input class="input" id="bin" placeholder="Type a worry and press Enter…" maxlength="40" autocomplete="off" style="max-width:380px"><button class="btn primary">${icon('plus')} Add balloon</button><button type="button" class="btn" id="bsample">Use sample worries</button><span class="g-score">Popped <b id="bp">0</b></span></form>
      <div class="sky" id="sky"><div class="sky-msg" id="skym">Add your worries. Then pop them one by one! 🎈</div></div>`;
    const sky = el.querySelector('#sky'), msg = el.querySelector('#skym');
    function add(text) {
      const d = document.createElement('button');
      d.className = 'balloon';
      d.style.setProperty('--c', pick(COLORS));
      d.innerHTML = `<span>${esc(text)}</span>`;
      sky.appendChild(d);
      const b = { d, x: 10 + ((list.length * 23 + Math.random() * 8) % 78), y: 45 + Math.random() * 35, v: 0.02 + Math.random() * 0.015, ph: Math.random() * 6 };
      list.push(b);
      d.onclick = () => {
        SFX.pop(); popped++; el.querySelector('#bp').textContent = popped;
        const r = d.getBoundingClientRect(), s = sky.getBoundingClientRect();
        const burst = document.createElement('div'); burst.className = 'burst'; burst.textContent = '💥';
        burst.style.left = (r.left - s.left + r.width / 2) + 'px'; burst.style.top = (r.top - s.top + r.height / 3) + 'px';
        sky.appendChild(burst); setTimeout(() => burst.remove(), 600);
        d.remove(); list = list.filter((x) => x !== b);
        msg.innerHTML = `💬 ${pick(HELP)}`;
        if (!list.length) { SFX.win(); confetti(sky); msg.innerHTML = '☀️ Your sky is clear! Which worry felt best to let go?'; }
      };
    }
    function frame(t) {
      for (const b of list) {
        b.y -= b.v; if (b.y < -25) b.y = 105;
        b.d.style.left = (b.x + Math.sin(t / 900 + b.ph) * 3) + '%';
        b.d.style.top = b.y + '%';
      }
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    el.querySelector('#bf').onsubmit = (e) => { e.preventDefault(); const v = el.querySelector('#bin').value.trim(); if (v) { add(v); el.querySelector('#bin').value = ''; msg.textContent = 'Tap a balloon to pop it!'; } };
    el.querySelector('#bsample').onclick = () => { shuffle(SAMPLE).slice(0, 5).forEach(add); msg.textContent = 'Tap a balloon to pop it!'; };
    return () => cancelAnimationFrame(raf);
  };

  // ---------------------------------------------------------------- 4. Balloon breath
  mounts.breath = function (el) {
    const GOAL = 5, ZLO = 0.68, ZHI = 0.9;
    let size = 0, holding = false, phase = 'ready', starsN = 0, raf = 0, last = 0;
    el.innerHTML = `<div class="g-top"><div class="g-score">Calm breaths <b id="bs">${stars(0, GOAL)}</b></div></div>
      <div class="breath-stage" id="bst"><div class="zone" style="--a:${40 + ZLO * 160}px;--b:${40 + ZHI * 160}px"></div><div class="bal" id="bal">🙂</div></div>
      <div class="g-msg big" id="bm">Press and HOLD the button (or space bar) to breathe in slowly. Let go when the balloon is in the green ring.</div>
      <div class="row-c"><button class="btn primary lg hold-btn" id="hold">Hold to breathe in 🌬️</button></div>`;
    const bal = el.querySelector('#bal'), bm = el.querySelector('#bm');
    const render = () => { const r = 40 + size * 160; bal.style.width = bal.style.height = r * 2 + 'px'; bal.style.fontSize = 20 + size * 60 + 'px'; bal.classList.toggle('in-zone', size >= ZLO && size <= ZHI); bal.classList.toggle('danger', size > ZHI); };
    function loop(t) {
      const dt = Math.min(50, t - (last || t)) / 1000; last = t;
      if (phase === 'in' && holding) {
        size += 0.2 * dt;
        if (size >= 1) { SFX.pop(); phase = 'reset'; bm.innerHTML = '💥 Pop! Too much air. Breathe in more <b>slowly</b> and let go in the green ring.'; size = 0; setTimeout(() => { phase = 'ready'; }, 900); }
      } else if (phase === 'out') {
        size -= 0.17 * dt;
        if (size <= 0) { size = 0; phase = 'ready'; if (starsN >= GOAL) finish(); else bm.textContent = 'Ready for the next breath. Hold to breathe in…'; }
      }
      render();
      raf = requestAnimationFrame(loop);
    }
    function down() { if (phase !== 'ready') return; holding = true; phase = 'in'; bm.textContent = 'Breathing in… slowly… 🌬️'; }
    function up() {
      if (!holding) return; holding = false;
      if (phase !== 'in') return;
      if (size >= ZLO && size <= ZHI) { starsN++; SFX.good(); el.querySelector('#bs').textContent = stars(starsN, GOAL); bm.textContent = 'Perfect! Now breathe OUT slowly as the balloon gets smaller… 😮‍💨'; }
      else bm.textContent = size < ZLO ? 'A little longer next time. Now breathe out slowly…' : 'Almost popped! Breathe out slowly…';
      phase = 'out';
    }
    function finish() { SFX.win(); confetti(el); bm.innerHTML = '🏆 Five calm breaths! How does your body feel now?'; starsN = 0; setTimeout(() => { el.querySelector('#bs').textContent = stars(0, GOAL); }, 2500); }
    const h = el.querySelector('#hold');
    h.addEventListener('pointerdown', (e) => { e.preventDefault(); down(); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => h.addEventListener(ev, up));
    const kd = (e) => { if (e.code === 'Space' && !e.repeat && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); down(); } };
    const ku = (e) => { if (e.code === 'Space') up(); };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); };
  };

  // ---------------------------------------------------------------- 5. Emotion detective
  const EMO = { Happy: '😀', Sad: '😢', Angry: '😠', Scared: '😨', Proud: '😎', Embarrassed: '😳', Excited: '🤩', Jealous: '😒', Lonely: '🥺', Nervous: '😬', Calm: '😌', Disappointed: '😞', Grateful: '🙏', Frustrated: '😤', Surprised: '😮', Guilty: '😔' };
  const CASES = [
    { s: 'Your best friend is moving to another city.', o: ['Sad', 'Excited', 'Proud', 'Calm'], a: ['Sad'] },
    { s: 'You practised hard and scored a goal in the match!', o: ['Proud', 'Lonely', 'Guilty', 'Scared'], a: ['Proud', 'Happy'] },
    { s: 'You tripped and fell in front of the whole class.', o: ['Embarrassed', 'Grateful', 'Proud', 'Calm'], a: ['Embarrassed'] },
    { s: 'Tomorrow is your first day at a new school.', o: ['Nervous', 'Bored', 'Guilty', 'Angry'], a: ['Nervous', 'Excited'] },
    { s: 'Someone took your pencil without asking and broke it.', o: ['Frustrated', 'Grateful', 'Proud', 'Calm'], a: ['Frustrated', 'Angry'] },
    { s: 'Everyone was invited to the party except you.', o: ['Lonely', 'Excited', 'Proud', 'Surprised'], a: ['Lonely', 'Sad'] },
    { s: 'Your grandmother made your favourite food to surprise you.', o: ['Grateful', 'Jealous', 'Scared', 'Guilty'], a: ['Grateful', 'Happy', 'Surprised'] },
    { s: 'Your sibling got a new bicycle and you did not.', o: ['Jealous', 'Calm', 'Proud', 'Scared'], a: ['Jealous'] },
    { s: 'You hear a loud noise outside at night.', o: ['Scared', 'Proud', 'Grateful', 'Bored'], a: ['Scared'] },
    { s: 'You hoped to be chosen for the play, but you were not.', o: ['Disappointed', 'Excited', 'Grateful', 'Calm'], a: ['Disappointed', 'Sad'] },
    { s: 'You broke a vase and did not tell anyone.', o: ['Guilty', 'Proud', 'Excited', 'Calm'], a: ['Guilty', 'Scared'] },
    { s: 'Tomorrow your family is going on holiday to the beach!', o: ['Excited', 'Lonely', 'Guilty', 'Angry'], a: ['Excited', 'Happy'] },
    { s: 'You are lying on the grass, listening to birds.', o: ['Calm', 'Angry', 'Nervous', 'Jealous'], a: ['Calm', 'Happy'] },
    { s: 'Your friend said sorry and gave back your favourite book.', o: ['Happy', 'Angry', 'Scared', 'Jealous'], a: ['Happy', 'Grateful'] },
  ];
  mounts.detective = function (el) {
    let order, i, score, streak;
    function start() { order = shuffle(CASES).slice(0, 10); i = 0; score = 0; streak = 0; show(); }
    function show() {
      if (i >= order.length) {
        const n = score >= 9 ? 3 : score >= 6 ? 2 : 1;
        setBest('detective', score); SFX.win(); confetti(el);
        el.innerHTML = winPanel(`Case closed! ${stars(n)}`, `You solved ${score} of ${order.length} cases. Remember: people can feel more than one feeling at once.`); el.querySelector('[data-again]').onclick = start; return;
      }
      const c = order[i];
      el.innerHTML = `<div class="g-top"><div class="g-score">Case <b>${i + 1}</b>/${order.length} · Solved <b>${score}</b> ${streak >= 2 ? `· 🔥 ${streak} streak` : ''}</div></div>
        <div class="det-card"><div class="det-badge">🕵️ CASE FILE #${i + 1}</div><p>${esc(c.s)}</p><div class="det-q">How would someone probably feel?</div></div>
        <div class="opt-grid">${shuffle(c.o).map((o) => `<button class="opt" data-o="${o}"><span>${EMO[o] || '🙂'}</span>${o}</button>`).join('')}</div><div class="g-msg" id="dm">&nbsp;</div>`;
      el.querySelectorAll('.opt').forEach((b) => b.onclick = () => {
        el.querySelectorAll('.opt').forEach((x) => { x.disabled = true; if (c.a.includes(x.dataset.o)) x.classList.add('right'); });
        const ok = c.a.includes(b.dataset.o);
        if (ok) { score++; streak++; SFX.good(); } else { streak = 0; SFX.bad(); b.classList.add('wrong'); }
        el.querySelector('#dm').innerHTML = (ok ? '✅ <b>Great detective work!</b> ' : `🤔 Many people would feel <b>${c.a.join(' or ').toLowerCase()}</b>. `) + 'Have you ever felt like this?' + ` <button class="btn primary sm" id="dn">Next case ${icon('chevr')}</button>`;
        el.querySelector('#dn').onclick = () => { i++; show(); };
      });
    }
    start();
  };

  // ---------------------------------------------------------------- 6. Thought sorter
  const THOUGHTS = [
    ['I can try again tomorrow.', 1], ['I always mess everything up.', 0, 'I made a mistake, and I can learn from it.'],
    ['Nobody likes me.', 0, 'Some people like me, and I can make new friends.'], ['Mistakes help my brain grow.', 1],
    ['I will never understand maths.', 0, 'Maths is hard for me right now. Practice helps.'], ['I can ask for help.', 1],
    ['If I am not perfect, I am a failure.', 0, 'Doing my best is enough.'], ['I am proud of how hard I worked.', 1],
    ['Everyone is looking at me and laughing.', 0, 'Most people are thinking about themselves, not me.'], ['It is okay to feel nervous.', 1],
    ['I am stupid.', 0, 'I am still learning, like everyone.'], ['One bad day does not make a bad week.', 1],
    ['Something bad is definitely going to happen.', 0, 'I do not know the future. I can handle what comes.'], ['I am a good friend.', 1],
    ['I should be good at everything.', 0, 'Everyone has things they are good at and things they are learning.'], ['I can take a deep breath and start again.', 1],
    ['There is no point trying.', 0, 'Trying gives me a chance. Not trying gives me none.'], ['My feelings matter.', 1],
    ['It is all my fault.', 0, 'Many things caused this. I can fix my part.'], ['I have people who care about me.', 1],
  ];
  mounts.sorter = function (el) {
    let deck, i, score, streak, t0, tm = 0, busy = false;
    function start() { deck = shuffle(THOUGHTS).slice(0, 14); i = 0; score = 0; streak = 0; t0 = Date.now(); show(); }
    function show() {
      if (i >= deck.length) {
        const secs = Math.round((Date.now() - t0) / 1000);
        const pts = score * 10 + Math.max(0, 60 - secs);
        const rec = setBest('sorter', pts); SFX.win(); confetti(el);
        el.innerHTML = winPanel(`${score}/${deck.length} sorted correctly!`, `${secs} seconds · ${pts} points ${rec ? '· New best! 🎉' : ''}<br>Which unhelpful thought do you sometimes have? How could you change it?`); el.querySelector('[data-again]').onclick = start; return;
      }
      const [t] = deck[i];
      el.innerHTML = `<div class="g-top"><div class="g-score">Card <b>${i + 1}</b>/${deck.length} · Score <b>${score}</b> ${streak >= 3 ? `· 🔥 ${streak}` : ''} · Best <b>${best('sorter')}</b></div></div>
        <div class="sort-zone"><button class="sort-btn bad" data-v="0">👎<b>Unhelpful</b><small>← key</small></button>
        <div class="thought" id="th">💭 ${esc(t)}</div>
        <button class="sort-btn good" data-v="1">👍<b>Helpful</b><small>→ key</small></button></div><div class="g-msg" id="sm">Is this thought helpful or unhelpful?</div>`;
      el.querySelectorAll('.sort-btn').forEach((b) => b.onclick = () => answer(+b.dataset.v));
      busy = false;
    }
    function answer(v) {
      if (busy || i >= deck.length) return; busy = true;
      const [, good, reframe] = deck[i];
      const ok = v === good;
      const th = el.querySelector('#th');
      th.classList.add(v ? 'fly-r' : 'fly-l');
      if (ok) { score++; streak++; SFX.good(); } else { streak = 0; SFX.bad(); }
      el.querySelector('#sm').innerHTML = ok ? (good ? '✅ Yes – a helpful thought!' : `✅ Right! Try instead: <b>“${esc(reframe)}”</b>`) : (good ? '❌ This one is actually helpful!' : `❌ This one is unhelpful. Try: <b>“${esc(reframe)}”</b>`);
      tm = setTimeout(() => { i++; show(); }, good && ok ? 700 : 2200);
    }
    const kd = (e) => { if (e.key === 'ArrowLeft') answer(0); if (e.key === 'ArrowRight') answer(1); };
    document.addEventListener('keydown', kd);
    start();
    return () => { clearTimeout(tm); document.removeEventListener('keydown', kd); };
  };

  // ---------------------------------------------------------------- 7. Board game
  mounts.board = function (el) {
    const N = 30;
    const LADDERS = { 3: [11, 'You helped a friend carry their books!'], 8: [16, 'You said sorry after an argument.'], 14: [22, 'You included someone who was alone.'], 19: [27, 'You told the truth even though it was hard.'] };
    const SLIDES = { 12: [5, 'You laughed at someone who made a mistake.'], 17: [9, 'You shouted when you were angry.'], 24: [15, 'You kept a worry bottled up.'], 28: [20, 'You grabbed a toy without asking.'] };
    const Q = ['Name something that makes you happy.', 'What do you do when you feel angry?', 'Tell us about a time you felt proud.', 'Who do you talk to when you are worried?', 'What is one thing you are good at?', 'What would you do if a friend was sad?', 'Name a time you were brave.', 'What makes a good friend?', 'What is your favourite way to relax?', 'Share something you are grateful for.', 'What is something new you want to learn?', 'How can you show kindness today?', 'What do you do when you make a mistake?', 'Act out a feeling – others guess it!', 'Give a compliment to the player on your right.'];
    const TOK = ['🦊', '🐼', '🐯', '🐸'];
    const QSQ = new Set([2, 5, 7, 10, 13, 15, 18, 21, 23, 25, 26, 29]);
    let players = 2, pos, turn, rolling = false, over = false;
    function setup() {
      el.innerHTML = `<div class="tool-center"><h2 class="tool-h">🎲 Feelings Journey</h2><p class="lead">Roll the dice and race to square 30. Land on ❓ to answer a question, climb 🪜 for kind acts, slide 🛝 for oops moments.</p>
        <div class="seg" id="np">${[2, 3, 4].map((n) => `<button data-n="${n}" class="${n === players ? 'on' : ''}">${n} players</button>`).join('')}</div>
        <button class="btn primary lg" id="bstart">${icon('play')} Start game</button></div>`;
      el.querySelector('#np').onclick = (e) => { const b = e.target.closest('button'); if (b) { players = +b.dataset.n; setup(); } };
      el.querySelector('#bstart').onclick = () => { pos = Array(players).fill(1); turn = 0; over = false; draw(); };
    }
    function cellOf(n) { const r = Math.floor((n - 1) / 6), c = (n - 1) % 6; return { row: 4 - r, col: r % 2 ? 5 - c : c }; }
    function draw(note = '') {
      let cells = '';
      for (let n = 1; n <= N; n++) {
        const { row, col } = cellOf(n);
        const mark = n === N ? '🏁' : LADDERS[n] ? '🪜' : SLIDES[n] ? '🛝' : QSQ.has(n) ? '❓' : n === 1 ? '🚩' : '';
        const cls = LADDERS[n] ? 'lad' : SLIDES[n] ? 'sli' : QSQ.has(n) ? 'q' : '';
        cells += `<div class="cell ${cls}" style="grid-row:${row + 1};grid-column:${col + 1}"><small>${n}</small><span class="mk">${mark}</span><span class="toks">${pos.map((p, k) => p === n ? `<i>${TOK[k]}</i>` : '').join('')}</span></div>`;
      }
      el.innerHTML = `<div class="board-wrap"><div class="board">${cells}</div>
        <div class="board-side"><div class="turn">${pos.map((p, k) => `<div class="pl ${k === turn && !over ? 'on' : ''}">${TOK[k]} Player ${k + 1} <b>${p}</b></div>`).join('')}</div>
        <div class="dice" id="dice">🎲</div><button class="btn primary lg" id="roll" ${over ? 'disabled' : ''}>Roll for ${TOK[turn]}</button>
        <div class="board-note" id="bn">${note || `${TOK[turn]} Player ${turn + 1}, your turn!`}</div>
        ${over ? `<button class="btn" id="bagain">${icon('refresh')} New game</button>` : ''}</div></div>`;
      const r = el.querySelector('#roll'); if (r) r.onclick = roll;
      const a = el.querySelector('#bagain'); if (a) a.onclick = setup;
    }
    function roll() {
      if (rolling || over) return; rolling = true;
      const dice = el.querySelector('#dice'), faces = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      let k = 0;
      const iv = setInterval(() => { dice.textContent = faces[Math.floor(Math.random() * 6)]; SFX.step(); if (++k > 9) { clearInterval(iv); go(); } }, 70);
      function go() {
        const v = 1 + Math.floor(Math.random() * 6);
        dice.textContent = faces[v - 1];
        let p = Math.min(N, pos[turn] + v), note = `${TOK[turn]} rolled a <b>${v}</b>. `;
        if (LADDERS[p]) { note += `🪜 ${LADDERS[p][1]} Climb to ${LADDERS[p][0]}!`; p = LADDERS[p][0]; SFX.good(); }
        else if (SLIDES[p]) { note += `🛝 Oops! ${SLIDES[p][1]} Slide to ${SLIDES[p][0]}. What could you do differently?`; p = SLIDES[p][0]; SFX.bad(); }
        pos[turn] = p;
        if (p === N) { over = true; note = `🏆 ${TOK[turn]} Player ${turn + 1} reached the finish! Everyone share one thing they learned.`; draw(note); SFX.win(); confetti(el); rolling = false; return; }
        const ask = QSQ.has(p);
        const cur = turn;
        turn = (turn + 1) % players;
        draw(note + (ask ? '' : ''));
        if (ask) {
          const m = UI.openModal({ title: `❓ Question for ${TOK[cur]} Player ${cur + 1}`, size: 'sm', body: `<p class="q-card">${esc(pick(Q))}</p>`, footer: `<button class="btn primary" data-close>Done – next player</button>` });
          m.classList.add('kid-modal');
        }
        rolling = false;
      }
    }
    setup();
  };

  // ---------------------------------------------------------------- 8. Gratitude garden
  mounts.garden = function (el) {
    const FL = ['🌷', '🌻', '🌼', '🌸', '🌹', '🌺', '💐', '🪻'];
    const items = [];
    el.innerHTML = `<form class="g-top" id="gf"><input class="input" id="gin" placeholder="I am grateful for…" maxlength="50" autocomplete="off" style="max-width:420px"><button class="btn primary">🌱 Plant it</button><span class="g-score">Flowers <b id="gc">0</b></span><button type="button" class="btn" id="gprint">${icon('print')} Print my garden</button></form>
      <div class="garden" id="gd"><div class="sun" id="sun">🌤️</div><div class="grass"></div><div class="g-hint" id="gh">Type something you are thankful for – a person, a place, a food, anything!</div></div>`;
    const gd = el.querySelector('#gd');
    el.querySelector('#gf').onsubmit = (e) => {
      e.preventDefault();
      const v = el.querySelector('#gin').value.trim(); if (!v) return;
      el.querySelector('#gin').value = '';
      const f = pick(FL);
      items.push([f, v]);
      const d = document.createElement('div');
      d.className = 'flower';
      d.style.left = (6 + ((items.length * 37) % 86) + Math.random() * 4) + '%';
      d.style.bottom = (4 + Math.random() * 22) + '%';
      d.innerHTML = `<span class="fl">${f}</span><span class="fl-l">${esc(v)}</span>`;
      gd.appendChild(d);
      SFX.good();
      el.querySelector('#gc').textContent = items.length;
      el.querySelector('#gh').style.display = 'none';
      if (items.length === 3) { const b = document.createElement('div'); b.className = 'bfly'; b.textContent = '🦋'; gd.appendChild(b); }
      if (items.length === 6) { el.querySelector('#sun').textContent = '☀️'; const b = document.createElement('div'); b.className = 'bfly b2'; b.textContent = '🐝'; gd.appendChild(b); }
      if (items.length === 10) { SFX.win(); confetti(gd); }
    };
    el.querySelector('#gprint').onclick = () => {
      if (!items.length) return UI.toast('Plant some flowers first!', 'warn');
      CB.printHTML(`<h1>🌻 My Gratitude Garden</h1><p>Name: ____________________ &nbsp; Date: ____________</p><div class="p-garden">${items.map(([f, v]) => `<div><span>${f}</span>${esc(v)}</div>`).join('')}</div>`, 'Gratitude Garden');
    };
  };

  // ---------------------------------------------------------------- 9. Superhero me
  mounts.hero = function (el) {
    const AV = ['🦸‍♀️', '🦸‍♂️', '🦸', '🧙‍♀️', '🧙‍♂️', '🥷', '🦄', '🐯', '🤖', '🐉'];
    const CAPES = ['#e34948', '#2a78d6', '#1baf7a', '#eda100', '#8e5bd8', '#e87ba4', '#ff7a1a', '#222'];
    const st = { name: '', av: AV[0], cape: CAPES[0], powers: [], phrase: '', use: '' };
    el.innerHTML = `<div class="hero-wrap"><div class="hero-form">
      <label class="fld"><span>1. Superhero name</span><input class="input" id="hn" placeholder="e.g. Captain Kindness" maxlength="28"></label>
      <div class="fld"><span>2. Choose your look</span><div class="av-row" id="hav">${AV.map((a, i) => `<button class="av ${i ? '' : 'on'}" data-a="${a}">${a}</button>`).join('')}</div></div>
      <div class="fld"><span>3. Cape colour</span><div class="av-row" id="hcape">${CAPES.map((c, i) => `<button class="cape ${i ? '' : 'on'}" data-c="${c}" style="background:${c}" aria-label="colour"></button>`).join('')}</div></div>
      <div class="fld"><span>4. Pick 3 superpowers (your real strengths!)</span><div class="chips" id="hpw">${window.STRENGTHS.map((s) => `<button class="chip sm" data-p="${s}">${s}</button>`).join('')}</div></div>
      <label class="fld"><span>5. Catchphrase</span><input class="input" id="hp" placeholder="e.g. Never give up!" maxlength="40"></label>
      <label class="fld"><span>6. I use my powers to…</span><input class="input" id="hu" placeholder="e.g. help friends who feel sad" maxlength="60"></label>
      </div><div class="hero-prev"><div id="hcard"></div><button class="btn primary lg" id="hprint">${icon('print')} Print hero card</button></div></div>`;
    const card = () => `<div class="hero-card" style="--cape:${st.cape}"><div class="hc-burst"></div><div class="hc-av">${st.av}</div><div class="hc-name">${esc(st.name || 'Your Hero Name')}</div>
      <div class="hc-pw">${(st.powers.length ? st.powers : ['?', '?', '?']).map((p) => `<span>⚡ ${esc(p)}</span>`).join('')}</div>
      <div class="hc-ph">“${esc(st.phrase || 'Your catchphrase')}”</div><div class="hc-use">I use my powers to ${esc(st.use || '…')}</div></div>`;
    const upd = () => { el.querySelector('#hcard').innerHTML = card(); };
    el.querySelector('#hn').oninput = (e) => { st.name = e.target.value; upd(); };
    el.querySelector('#hp').oninput = (e) => { st.phrase = e.target.value; upd(); };
    el.querySelector('#hu').oninput = (e) => { st.use = e.target.value; upd(); };
    el.querySelector('#hav').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; st.av = b.dataset.a; el.querySelectorAll('.av').forEach((x) => x.classList.toggle('on', x === b)); SFX.flip(); upd(); };
    el.querySelector('#hcape').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; st.cape = b.dataset.c; el.querySelectorAll('.cape').forEach((x) => x.classList.toggle('on', x === b)); SFX.flip(); upd(); };
    el.querySelector('#hpw').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const p = b.dataset.p;
      if (st.powers.includes(p)) st.powers = st.powers.filter((x) => x !== p);
      else if (st.powers.length < 3) { st.powers.push(p); SFX.good(); } else UI.toast('Only 3 powers – remove one first!', 'warn');
      el.querySelectorAll('#hpw .chip').forEach((x) => x.classList.toggle('on', st.powers.includes(x.dataset.p)));
      upd();
    };
    el.querySelector('#hprint').onclick = () => CB.printHTML(`<div class="p-hero">${card()}</div><p style="text-align:center">Name: ____________________ &nbsp; Class: ______ &nbsp; Date: ________</p>`, 'Superhero Me');
    upd();
  };

  // ---------------------------------------------------------------- 10. Kindness quest
  const STORIES = [
    { t: 'The New Kid', e: '🏫', scenes: [
      { q: 'A new student, Sam, is standing alone at lunch holding a tray.', c: [['Invite Sam to sit with you', 3, 'Sam smiles a big smile. You might have a new friend!'], ['Wave at Sam but keep eating', 1, 'Sam waves back, but still sits alone.'], ['Pretend you did not see', 0, 'Sam looks down at the floor and sits in a corner.']] },
      { q: 'In class, Sam cannot find the right page in the book.', c: [['Quietly show Sam the page', 3, 'Sam whispers "thank you!"'], ['Laugh with your friends', 0, 'Sam turns red. That felt bad for Sam.'], ['Tell the teacher Sam needs help', 2, 'The teacher helps Sam. Good thinking!']] },
      { q: 'At break, your friends are playing football. Sam is watching.', c: [['Ask Sam to join your team', 3, 'Sam scores a goal! Everyone cheers.'], ['Keep playing – the teams are full', 1, 'Sam keeps watching from the side.'], ['Say "you can be next time"', 2, 'Sam looks hopeful for tomorrow.']] },
    ] },
    { t: 'The Broken Toy', e: '🧸', scenes: [
      { q: 'You accidentally break your little brother\'s favourite toy.', c: [['Tell him and say sorry', 3, 'He is sad, but he hugs you for being honest.'], ['Hide the toy', 0, 'He searches everywhere and starts to cry.'], ['Blame the dog', 0, 'The dog gets told off. You feel uneasy inside.']] },
      { q: 'He is still upset about the toy.', c: [['Offer to fix it together', 3, 'You fix it with tape. It is not perfect, but he loves it.'], ['Say "it\'s just a toy"', 0, 'He feels nobody understands him.'], ['Share one of your toys', 2, 'He cheers up a little.']] },
      { q: 'Later, your mum asks what happened.', c: [['Tell the whole truth', 3, 'Mum is proud that you were honest and kind.'], ['Tell part of the story', 1, 'Mum knows something is missing.'], ['Say you don\'t know', 0, 'You feel a knot in your tummy.']] },
    ] },
    { t: 'The Group Chat', e: '📱', scenes: [
      { q: 'Someone posts a funny but mean photo of a classmate in the group chat.', c: [['Do not share it, and say "not cool"', 3, 'Others stop laughing. You stood up for someone.'], ['Add a laughing emoji', 0, 'The photo spreads further.'], ['Ignore it', 1, 'Nothing changes. The photo stays up.']] },
      { q: 'The classmate in the photo looks upset at school.', c: [['Check on them kindly', 3, 'They feel less alone. "Thanks for asking."'], ['Avoid them', 0, 'They sit alone all day.'], ['Tell a trusted adult', 3, 'The teacher helps sort it out.']] },
      { q: 'Your friend asks you to post something mean about someone else.', c: [['Say no and suggest something fun instead', 3, 'Your friend agrees. You both play a game instead.'], ['Post it to fit in', 0, 'Someone gets hurt, and you feel bad.'], ['Leave the chat', 2, 'You kept yourself out of trouble.']] },
    ] },
  ];
  mounts.kindness = function (el) {
    let s, k, hearts;
    function menu() {
      el.innerHTML = `<div class="tool-center"><h2 class="tool-h">💖 Choose a story</h2><div class="story-pick">${STORIES.map((x, i) => `<button class="story-btn" data-s="${i}"><span>${x.e}</span>${x.t}</button>`).join('')}</div></div>`;
      el.querySelectorAll('[data-s]').forEach((b) => b.onclick = () => { s = STORIES[+b.dataset.s]; k = 0; hearts = 0; scene(); });
    }
    function scene() {
      if (k >= s.scenes.length) {
        const max = s.scenes.length * 3;
        const title = hearts >= max - 1 ? 'Kindness Champion! 🏆' : hearts >= max / 2 ? 'Kind Helper! 🌟' : 'Kindness Learner 🌱';
        SFX.win(); confetti(el);
        el.innerHTML = winPanel(title, `You earned ${'💖'.repeat(hearts)}${'🤍'.repeat(max - hearts)}<br>What kind thing could you do in real life this week?`, 'Choose another story');
        el.querySelector('[data-again]').onclick = menu; return;
      }
      const sc = s.scenes[k];
      el.innerHTML = `<div class="g-top"><div class="g-score">${s.e} ${s.t} · Part ${k + 1}/${s.scenes.length} · ${'💖'.repeat(hearts) || '—'}</div></div>
        <div class="story"><p>${esc(sc.q)}</p><div class="det-q">What do you do?</div></div>
        <div class="choices">${sc.c.map((c, i) => `<button class="choice" data-i="${i}">${esc(c[0])}</button>`).join('')}</div><div class="g-msg" id="km">&nbsp;</div>`;
      el.querySelectorAll('.choice').forEach((b) => b.onclick = () => {
        const c = sc.c[+b.dataset.i];
        hearts += c[1];
        el.querySelectorAll('.choice').forEach((x) => { x.disabled = true; });
        b.classList.add(c[1] >= 2 ? 'right' : 'wrong');
        if (c[1] >= 2) SFX.good(); else SFX.flip();
        el.querySelector('#km').innerHTML = `${c[1] >= 2 ? '💖'.repeat(c[1]) : c[1] ? '🤍' : '💭'} ${esc(c[2])} <button class="btn primary sm" id="kn">Continue ${icon('chevr')}</button>`;
        el.querySelector('#kn').onclick = () => { k++; scene(); };
      });
    }
    menu();
  };

  function mount(id, el) {
    const fn = mounts[id];
    if (!fn) { el.innerHTML = '<p>Game not found.</p>'; return null; }
    return fn(el) || null;
  }

  window.Games = { GAMES, mount, muted, setMuted: (v) => lsSet('cb-mute', v ? '1' : '0'), confetti, SFX };
})();
