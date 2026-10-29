/* =====================================================
   BilloDesign — script.js
   Mascot · colour theme · lamp rope · liquid stretch
   Parallax · chat bot · contact form
   ===================================================== */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const body = document.body;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];

  /* ---------- Safe storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };

  /* =====================================================
     MASCOT
     ===================================================== */
  const mascot = $('#mascot');
  const eyes = $('#eyes');
  const bubble = $('.say', mascot);
  let talkTimer, lineIndex = 0, idleTimer, sleeping = false;

  const tapLines = [
    'Hehe, tickle!', 'Ouch… ba ki jeno!', 'Ami ekhane achi 👀',
    'Tap korle ami nachi!', 'Ei box gulo tene dekho!',
    'Lamp-er rosi tano 💡', 'Rong bodlao, bhalo lagbe!'
  ];
  const touchMeLines = ['Eii! Amake chhuye felle?', 'Hihi, shurshuri!', 'Ami bubble, phatiyo na 🫧'];

  function say(text, ms = 2600) {
    bubble.textContent = text;
    mascot.classList.add('talk');
    clearTimeout(talkTimer);
    talkTimer = setTimeout(() => mascot.classList.remove('talk'), ms);
  }

  function look(x, y) {
    const r = mascot.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a = Math.atan2(y - cy, x - cx);
    const d = Math.min(9, Math.hypot(x - cx, y - cy) / 30);
    eyes.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`;
  }

  function ripple(x, y) {
    const d = document.createElement('div');
    d.className = 'rip';
    d.style.left = x + 'px';
    d.style.top = y + 'px';
    body.append(d);
    setTimeout(() => d.remove(), 800);
  }

  function hop() {
    mascot.classList.remove('hop');
    void mascot.offsetWidth;
    mascot.classList.add('hop');
    setTimeout(() => mascot.classList.remove('hop'), 650);
  }

  function happy() {
    mascot.classList.add('happy');
    setTimeout(() => mascot.classList.remove('happy'), 500);
  }

  function wake() {
    if (sleeping) { sleeping = false; mascot.classList.remove('blink'); say('Uff, ghum bhenge gelo!'); }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      sleeping = true;
      mascot.classList.add('blink');
      say('Zzz…', 3500);
    }, 20000);
  }

  // Reaction to touch/click ANYWHERE on the screen
  addEventListener('pointerdown', e => {
    wake();
    look(e.clientX, e.clientY);
    ripple(e.clientX, e.clientY);
    hop(); happy();
    const r = mascot.getBoundingClientRect();
    const onMascot = e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom;
    say(onMascot ? rand(touchMeLines) : tapLines[lineIndex++ % tapLines.length]);
  });

  // Blinking
  setInterval(() => {
    if (sleeping) return;
    mascot.classList.add('blink');
    setTimeout(() => mascot.classList.remove('blink'), 150);
  }, 3600);

  // Comments when a section comes into view
  const hints = {
    services: 'Eta amar services.', process: 'Kaj ei dhape hoy.',
    work: 'Kichu kaj dekho.', skills: 'Ei tool-gulo diye banai.',
    words: 'Client-ra ki bole.', about: 'Billo-r golpo.',
    faq: 'Proshno thakle khule dekho.', contact: 'Ekta message pathao!'
  };
  const seen = new Set();
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      const id = en.target.id;
      if (en.isIntersecting && hints[id] && !seen.has(id)) { seen.add(id); say(hints[id]); }
    });
  }, { threshold: .5 });
  $$('section').forEach(s => io.observe(s));

  // Tilt with scroll speed
  let lastY = scrollY, tiltT;
  addEventListener('scroll', () => {
    root.style.setProperty('--sy', scrollY);
    const v = clamp((scrollY - lastY) * .4, -14, 14);
    lastY = scrollY;
    mascot.style.rotate = v + 'deg';
    clearTimeout(tiltT);
    tiltT = setTimeout(() => { mascot.style.rotate = '0deg'; }, 160);
    wake();
  }, { passive: true });

  wake();

  /* =====================================================
     PARALLAX (shapes follow the pointer)
     ===================================================== */
  addEventListener('pointermove', e => {
    root.style.setProperty('--px', (e.clientX / innerWidth - .5).toFixed(3));
    root.style.setProperty('--py', (e.clientY / innerHeight - .5).toFixed(3));
    look(e.clientX, e.clientY);
  }, { passive: true });

  /* =====================================================
     ONE-COLOUR THEME
     ===================================================== */
  const swatches = $$('.sw');
  const colourNames = { 190: 'Cyan', 265: 'Violet', 330: 'Pink', 150: 'Green', 28: 'Orange', 222: 'Blue' };

  function setHue(h, speak) {
    root.style.setProperty('--h', h);
    swatches.forEach(b => b.classList.toggle('on', b.dataset.h == h));
    store.set('hue', h);
    if (speak) say((colourNames[h] || 'Notun') + ' rong! 🎨');
  }
  swatches.forEach(b => b.addEventListener('click', () => setHue(b.dataset.h, true)));
  setHue(store.get('hue', '190'));

  /* =====================================================
     LAMP ROPE — the only way to switch the light
     ===================================================== */
  const lamp = $('#lamp');
  const pull = $('.pull', lamp);
  const cord = $('.cord', lamp);
  const metaTheme = $('meta[name="theme-color"]');
  let light = store.get('light', '0') === '1';
  let dragging = false, startY = 0, dy = 0;

  function setLight(on, speak) {
    light = on;
    body.classList.toggle('light', on);
    lamp.classList.toggle('on', on);
    root.dataset.theme = on ? 'light' : 'dark';
    if (metaTheme) metaTheme.setAttribute('content', on ? '#eaf0f5' : '#04060a');
    store.set('light', on ? '1' : '0');
    if (speak) say(on ? 'Alo jwolo! ✨' : 'Light off. Shanti 🌙');
  }
  setLight(light);

  pull.addEventListener('pointerdown', e => {
    dragging = true; startY = e.clientY; dy = 0;
    pull.setPointerCapture(e.pointerId);
    cord.style.transition = 'none';
  });
  pull.addEventListener('pointermove', e => {
    if (!dragging) return;
    dy = clamp(e.clientY - startY, 0, 70);
    cord.style.height = (60 + dy) + 'px';
  });
  const release = () => {
    if (!dragging) return;
    dragging = false;
    cord.style.transition = 'height .6s cubic-bezier(.2,2.2,.3,1)';
    cord.style.height = '60px';
    if (dy > 18 || dy < 4) setLight(!light, true); // pulled down, or a simple tap
  };
  pull.addEventListener('pointerup', release);
  pull.addEventListener('pointercancel', () => { dragging = false; cord.style.height = '60px'; });
  pull.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setLight(!light, true); }
  });

  /* =====================================================
     LIQUID STRETCH — the box and its text stretch together
     ===================================================== */
  const noStretch = '.dock, .say, .chat';
  $$('.glass').forEach(el => {
    if (el.matches(noStretch)) return;
    let down = false;

    const move = e => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      const k = down ? .24 : .07;
      el.style.transition = 'transform .12s ease-out, background 1s';
      el.style.transform =
        `perspective(900px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) ` +
        `translate(${x * 12}px,${y * 12}px) scale(${1 + Math.abs(x) * k},${1 + Math.abs(y) * k})`;
    };
    const reset = () => {
      down = false;
      el.style.transition = '';
      el.style.transform = '';
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerdown', e => { down = true; move(e); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => el.addEventListener(t, reset));
  });

  // FAQ comment
  $$('.faq details').forEach(d => d.addEventListener('toggle', () => {
    if (d.open) say('Bhalo proshno!');
  }));

  /* =====================================================
     CHAT BOT
     ===================================================== */
  const chat = $('#chat');
  const log = $('#log');
  const msg = $('#msg');

  $('#chatBtn').addEventListener('click', () => {
    chat.classList.toggle('open');
    if (chat.classList.contains('open')) { say('Chat khulo!'); setTimeout(() => msg.focus(), 300); }
  });

  function add(text, me) {
    const d = document.createElement('div');
    d.className = 'b' + (me ? ' me' : '');
    d.textContent = text;
    log.append(d);
    log.scrollTop = log.scrollHeight;
  }

  const kb = [
    [/service|build|kaj|what do/i, 'Web design, Webflow development, ar Performance & SEO.'],
    [/price|cost|rate|dam|taka|budget/i, 'Price project onujayi hoy. Contact form-e project-er kotha likho.'],
    [/time|din|week|koto lage|deadline/i, 'Choto site 1–2 shoptaho, boro project 4–6 shoptaho.'],
    [/contact|email|hire|pathao|message/i, 'Niche Contact form-e naam, email ar message likho.'],
    [/webflow|cms/i, 'Webflow-e CMS shoho clean, fast build kori.'],
    [/seo|speed|performance/i, 'Speed, Core Web Vitals ar SEO — sob launch-er age check kori.'],
    [/color|colour|rong/i, 'Niche dock theke 6-ta rong-er ekta choose koro. Puro site oi rong-e hobe.'],
    [/light|lamp|alo/i, 'Light shudhu upore daner lamp-er rosi tene on/off hoy.'],
    [/hi|hello|hey|salam|hola/i, 'Hello! 👋 Kemon achho?']
  ];

  function ask(q) {
    add(q, true);
    setTimeout(() => {
      const hit = kb.find(k => k[0].test(q));
      add(hit ? hit[1] : 'Eta ami bujhini. Services, Pricing, Timeline ba Contact try koro.');
    }, 450);
  }

  $('#chatForm').addEventListener('submit', e => {
    e.preventDefault();
    const v = msg.value.trim();
    if (v) { ask(v); msg.value = ''; }
  });
  $$('.chip').forEach(c => c.addEventListener('click', () => ask(c.textContent)));

  /* =====================================================
     CONTACT FORM (novalidate → we check it ourselves)
     ===================================================== */
  const toast = $('#toast');
  function showToast(text, ms = 2400) {
    toast.textContent = text;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), ms);
  }

  $('#cform').addEventListener('submit', e => {
    e.preventDefault();
    const f = e.target;
    const name = f.n.value.trim();
    const mail = f.e.value.trim();
    const text = f.m.value.trim();

    if (!name) { f.n.focus(); showToast('Naam likho'); say('Naam ta dao!'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { f.e.focus(); showToast('Thik email dao'); say('Email-ta thik na.'); return; }
    if (!text) { f.m.focus(); showToast('Message likho'); say('Message khali!'); return; }

    f.reset();
    showToast('Message sent ✔');
    say('Dhonnobad! 💙');
  });

})();
