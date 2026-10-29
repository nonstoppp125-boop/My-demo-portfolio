/* ==========================================================================
   1. FILE INTRODUCTION
   --------------------------------------------------------------------------
   Data Analyst Learning Portfolio: interaction layer.
   Works with the supplied index.html and style.css. Plain ES6+, no build step,
   safe on a GitHub Pages project subpath (it only uses #hash links and
   relative behaviour, never absolute paths).

   HOW IT IS ORGANISED
   - One IIFE, so nothing leaks into the global scope.
   - One central `settings` object. Every CSS variable is written from it.
   - Every listener is registered through on(), which uses one AbortController,
     so listeners cannot be registered twice and can all be removed together.
   - Each feature runs inside safeRun(); one broken optional feature never
     stops the others.
   - One shared, requestAnimationFrame-coalesced pointer loop drives the
     ambient glow, parallax, mascot gaze, card tilt and magnetic buttons.

   CSS HOOKS USED (all exist in style.css / index.html)
   html[data-theme|data-light|data-reduced-motion], html.js, html.reveal-ready,
   [data-reveal="section"].is-visible, #mascot-stage[data-mascot-state],
   --look-x/--look-y, .elastic-card --mx/--my/--px/--py, .magnetic-control
   --tx/--ty, #primary-nav a[aria-current], --scroll-progress, [hidden].
   ========================================================================== */
(() => {
  'use strict';

  const root = document.documentElement;
  if (root.hasAttribute('data-portfolio-init')) return; // avoid double init
  root.setAttribute('data-portfolio-init', '');

  /* ========================================================================
     2. CONSTANTS AND DEFAULT SETTINGS
     ====================================================================== */
  const STORAGE_KEY = 'daPortfolio.settings.v1';
  const VISIT_KEY = 'daPortfolio.visited.v1';
  const THEME_COLOR = { on: '#dbe9ff', off: '#0e1426' };
  const MENU_QUERY = '(max-width: 900px)';
  const SHEET_QUERY = '(max-width: 640px)';
  const HEX_RE = /^#[0-9a-f]{6}$/i;
  const DEFAULT_HAIR_INPUT = '#a9c7ff';
  const DEFAULT_AMBIENT_INPUT = '#cfe2ff';

  // Accent colours match the swatches in style.css (section 3).
  const PRESETS = {
    'ice-blue': { label: 'Ice Blue', accent: '#7fb0ff' },
    'lavender-mist': { label: 'Lavender Mist', accent: '#a898ff' },
    'sage': { label: 'Sage', accent: '#8cc0a0' },
    'warm-pearl': { label: 'Warm Pearl', accent: '#e6b693' }
  };

  const px = (v) => `${v}px`;
  const pct = (v) => `${v}%`;
  const ratio = (v) => String(+(v / 100).toFixed(2));
  const plain = (v) => String(v);

  // Slider table. ids, ranges and defaults match the inputs in index.html.
  // `css: null` means the value is applied by a special function instead.
  const RANGE_CONTROLS = [
    { key: 'blur', id: 'set-blur', group: 'glass', min: 0, max: 40, step: 1, css: '--glass-blur', toCss: px, fmt: px },
    { key: 'opacity', id: 'set-opacity', group: 'glass', min: 10, max: 90, step: 1, css: '--glass-opacity', toCss: ratio, fmt: pct },
    { key: 'borderWidth', id: 'set-border-width', group: 'glass', min: 0, max: 4, step: 0.5, css: '--border-width', toCss: px, fmt: px },
    { key: 'borderOpacity', id: 'set-border-opacity', group: 'glass', min: 0, max: 100, step: 1, css: '--border-opacity', toCss: ratio, fmt: pct },
    { key: 'radius', id: 'set-radius', group: 'glass', min: 0, max: 40, step: 1, css: '--radius-base', toCss: px, fmt: px },
    { key: 'shadow', id: 'set-shadow', group: 'glass', min: 0, max: 100, step: 1, css: '--shadow-strength', toCss: ratio, fmt: pct },
    { key: 'shapeCount', id: 'set-shape-count', group: 'ambient', min: 0, max: 4, step: 1, css: null, toCss: plain, fmt: plain },
    { key: 'shapeSize', id: 'set-shape-size', group: 'ambient', min: 50, max: 150, step: 1, css: '--shape-scale', toCss: ratio, fmt: pct },
    { key: 'shapeBlur', id: 'set-shape-blur', group: 'ambient', min: 0, max: 60, step: 1, css: '--shape-blur', toCss: px, fmt: px },
    { key: 'drift', id: 'set-drift', group: 'ambient', min: 0, max: 200, step: 1, css: '--drift-speed', toCss: ratio, fmt: pct },
    { key: 'lightIntensity', id: 'set-light', group: 'ambient', min: 0, max: 100, step: 1, css: '--light-intensity', toCss: ratio, fmt: pct },
    { key: 'particles', id: 'set-particles', group: 'ambient', min: 0, max: 100, step: 1, css: '--particle-level', toCss: ratio, fmt: pct },
    { key: 'speed', id: 'set-speed', group: 'motion', min: 25, max: 200, step: 1, css: '--anim-speed', toCss: ratio, fmt: pct },
    { key: 'motion', id: 'set-motion', group: 'motion', min: 0, max: 100, step: 1, css: '--motion-intensity', toCss: ratio, fmt: pct },
    { key: 'mascotMotion', id: 'set-mascot-motion', group: 'motion', min: 0, max: 100, step: 1, css: '--mascot-motion', toCss: ratio, fmt: pct }
  ];
  const RANGE_BY_ID = new Map(RANGE_CONTROLS.map((c) => [c.id, c]));

  const DEFAULTS = Object.freeze({
    preset: 'ice-blue',
    accent: '#7fb0ff',
    hair: null,
    ambientTint: null,
    blur: 22, opacity: 45, borderWidth: 1, borderOpacity: 55, radius: 22, shadow: 40,
    shapeCount: 4, shapeSize: 100, shapeBlur: 12, drift: 100, lightIntensity: 60, particles: 20,
    speed: 100, motion: 60, mascotMotion: 60,
    reducedMotion: false,
    light: true,
    remember: true
  });

  // Selector map (every selector exists in index.html).
  const S = {
    ambientField: '#ambient-field',
    shapes: '.ambient-shape',
    cursorGlow: '#cursor-glow',
    progressBar: '#scroll-progress-bar',
    header: '#site-header',
    menuToggle: '#menu-toggle',
    nav: '#primary-nav',
    settingsToggle: '#settings-toggle',
    panel: '#settings-panel',
    backdrop: '#settings-backdrop',
    closeBtn: '#settings-close',
    form: '#settings-form',
    save: '#settings-save',
    lightToggle: '#light-toggle',
    stage: '#mascot-stage',
    mascotButton: '#mascot-button',
    bubble: '#mascot-bubble',
    sections: '[data-section]',
    reveal: '[data-reveal="section"]',
    caseStudy: '.case-study',
    themeMeta: 'meta[name="theme-color"]'
  };

  /* ========================================================================
     3. DOM UTILITIES
     ====================================================================== */
  const $ = (sel, scope = document) => scope.querySelector(sel);
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const el = {}; // cached element references, filled in cacheElements()

  const ac = new AbortController();
  const signal = ac.signal;
  const observers = [];
  const timers = new Set();

  /** addEventListener wrapper: ignores missing targets, auto-removable. */
  function on(target, type, handler, options) {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener(type, handler, Object.assign({}, options, { signal }));
  }

  /** Media-query listener that also works on old Safari. */
  function onMedia(mq, handler) {
    if (!mq) return;
    if (typeof mq.addEventListener === 'function') on(mq, 'change', handler);
    else if (typeof mq.addListener === 'function') mq.addListener(handler);
  }

  const noMedia = { matches: false };
  const media = (q) => (typeof window.matchMedia === 'function' ? window.matchMedia(q) : noMedia);
  const mqReduce = media('(prefers-reduced-motion: reduce)');
  const mqFine = media('(hover: hover) and (pointer: fine)');
  const mqMenu = media(MENU_QUERY);
  const mqSheet = media(SHEET_QUERY);

  /** setTimeout that is tracked so cleanup() can cancel it. */
  function later(fn, ms) {
    const id = window.setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  }
  function cancel(id) { if (id) { window.clearTimeout(id); timers.delete(id); } }

  const warned = new Set();
  function warn(scope, err) {
    if (warned.has(scope)) return; // one message per feature, no flooding
    warned.add(scope);
    console.warn(`[portfolio] ${scope}:`, err);
  }
  /** Runs a feature; returns its result, or false if it threw. */
  function safeRun(name, fn) {
    try { return fn(); } catch (err) { warn(name, err); return false; }
  }

  const isHex = (v) => typeof v === 'string' && HEX_RE.test(v);

  // Colour helpers: used to keep user colours readable (see tuneColor).
  function hexToHsl(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2, d = max - min;
    let h = 0, s = 0;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
      if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function hslToHex(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rgb;
    if (h < 60) rgb = [c, x, 0];
    else if (h < 120) rgb = [x, c, 0];
    else if (h < 180) rgb = [0, c, x];
    else if (h < 240) rgb = [0, x, c];
    else if (h < 300) rgb = [x, 0, c];
    else rgb = [c, 0, x];
    const part = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${part(rgb[0])}${part(rgb[1])}${part(rgb[2])}`;
  }
  /** Keeps lightness inside a readable range so text on accent stays legible. */
  function tuneColor(hex, minL, maxL) {
    const hsl = hexToHsl(hex);
    return hslToHex(hsl[0], hsl[1], clamp(hsl[2], minL, maxL));
  }
  function snap(v, c) {
    const stepped = Math.round((v - c.min) / c.step) * c.step + c.min;
    return clamp(+stepped.toFixed(2), c.min, c.max);
  }

  /* ========================================================================
     4. STORAGE HELPERS (localStorage may be blocked or full)
     ====================================================================== */
  function storageGet(key) {
    try { return window.localStorage.getItem(key); } catch (err) { warn('storage', err); return null; }
  }
  function storageSet(key, value) {
    try { window.localStorage.setItem(key, value); return true; } catch (err) { warn('storage', err); return false; }
  }
  function storageRemove(key) {
    try { window.localStorage.removeItem(key); } catch (err) { warn('storage', err); }
  }

  /* ========================================================================
     6. SETTINGS STATE AND SYNCHRONISATION
     (section 5, theme presets, is the PRESETS table above plus applyTheme)
     ====================================================================== */
  let settings = Object.assign({}, DEFAULTS);
  let saveTimer = 0;

  /** Turns untrusted stored data into a safe settings object. */
  function sanitizeSettings(raw) {
    const out = Object.assign({}, DEFAULTS);
    if (!raw || typeof raw !== 'object') return out;
    RANGE_CONTROLS.forEach((c) => {
      const v = Number(raw[c.key]);
      if (raw[c.key] !== null && raw[c.key] !== '' && Number.isFinite(v)) out[c.key] = snap(v, c);
    });
    if (typeof raw.preset === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, raw.preset)) {
      out.preset = raw.preset;
      out.accent = PRESETS[raw.preset].accent;
    } else if (raw.preset === 'custom' && isHex(raw.accent)) {
      out.preset = 'custom';
      out.accent = tuneColor(raw.accent, 0.5, 0.86);
    }
    out.hair = isHex(raw.hair) ? tuneColor(raw.hair, 0.45, 0.9) : null;
    out.ambientTint = isHex(raw.ambientTint) ? tuneColor(raw.ambientTint, 0.45, 0.9) : null;
    if (typeof raw.reducedMotion === 'boolean') out.reducedMotion = raw.reducedMotion;
    if (typeof raw.light === 'boolean') out.light = raw.light;
    return out;
  }

  function loadSettings() {
    const text = storageGet(STORAGE_KEY);
    if (!text) return;
    try {
      settings = sanitizeSettings(JSON.parse(text));
      settings.remember = true; // data exists, so the user opted in earlier
    } catch (err) {
      warn('settings-parse', err);
      storageRemove(STORAGE_KEY); // malformed data: start clean
      settings = Object.assign({}, DEFAULTS);
    }
  }

  function persistNow() {
    cancel(saveTimer);
    saveTimer = 0;
    const data = Object.assign({}, settings);
    delete data.remember; // only existence of the data means "remember"
    return storageSet(STORAGE_KEY, JSON.stringify(data));
  }
  /** Debounced autosave: one write shortly after the last change. */
  function scheduleSave() {
    if (!settings.remember) return;
    cancel(saveTimer);
    saveTimer = later(persistNow, 500);
  }
  function flushSave() {
    if (saveTimer && settings.remember) persistNow();
  }

  const isReducedMotion = () => settings.reducedMotion || mqReduce.matches;
  /** 0..1 multiplier for JS-driven movement (tilt, parallax, magnetic). */
  const motionFactor = () => (isReducedMotion() ? 0 : clamp(settings.motion / 60, 0, 1));

  function setOptionalVar(name, value) {
    if (value) root.style.setProperty(name, value);
    else root.style.removeProperty(name);
  }

  /** Applies theme state: preset attribute + accent + optional tints. */
  function applyTheme() {
    root.dataset.theme = settings.preset; // "custom" has no CSS rule; inline --accent wins
    root.style.setProperty('--accent', settings.accent);
    setOptionalVar('--hair-tint', settings.hair);
    setOptionalVar('--ambient-tint', settings.ambientTint);
  }

  function applyLight() {
    root.dataset.light = settings.light ? 'on' : 'off';
    if (el.lightToggle) el.lightToggle.setAttribute('aria-pressed', String(settings.light));
    if (el.themeMeta) el.themeMeta.setAttribute('content', settings.light ? THEME_COLOR.on : THEME_COLOR.off);
  }

  function updateOutput(c) {
    const out = el.outputs && el.outputs[c.id];
    if (out) out.value = c.fmt(settings[c.key]);
  }

  /** Applies one slider's value to the page (CSS variable or special case). */
  function applyRange(c) {
    if (c.key === 'shapeCount') applyShapeCount();
    else root.style.setProperty(c.css, c.toCss(settings[c.key]));
    updateOutput(c);
  }

  function applyAllSettings() {
    applyTheme();
    applyLight();
    RANGE_CONTROLS.forEach((c) => safeRun(`apply-${c.key}`, () => applyRange(c)));
    applyReducedMotion();
  }

  /** Writes settings back into the form controls. */
  function syncControls() {
    if (!el.form) return;
    $$('input[name="preset"]', el.form).forEach((r) => { r.checked = r.value === settings.preset; });
    const set = (id, value) => { const i = $('#' + id, el.form); if (i) i.value = value; };
    set('set-accent', settings.accent);
    set('set-hair', settings.hair || DEFAULT_HAIR_INPUT);
    set('set-ambient-tint', settings.ambientTint || DEFAULT_AMBIENT_INPUT);
    RANGE_CONTROLS.forEach((c) => { set(c.id, settings[c.key]); updateOutput(c); });
    syncReducedControl();
    const remember = $('#set-remember', el.form);
    if (remember) remember.checked = settings.remember;
  }

  /* ========================================================================
     8, 9, 10. GLASS, AMBIENT AND ANIMATION CONTROLS
     They share the RANGE_CONTROLS table above (grouped as glass / ambient /
     motion). One input handler updates the setting, applies it live and
     schedules an autosave.
     ====================================================================== */
  /** Ambient shape count: show the first N shapes, hide the rest ([hidden]). */
  function applyShapeCount() {
    $$(S.shapes).forEach((shape, i) => { shape.hidden = i >= settings.shapeCount; });
  }

  function handleRangeInput(input) {
    const c = RANGE_BY_ID.get(input.id);
    if (!c) return false;
    const value = Number(input.value);
    if (!Number.isFinite(value)) return true;
    settings[c.key] = snap(value, c);
    applyRange(c);
    scheduleSave();
    return true;
  }

  /* ========================================================================
     25. REDUCED-MOTION MANAGEMENT
     The OS preference always wins; the checkbox can only add to it.
     ====================================================================== */
  function applyReducedMotion() {
    const reduced = isReducedMotion();
    root.dataset.reducedMotion = String(reduced);
    syncReducedControl();
    if (reduced) clearPointerEffects();
  }
  function syncReducedControl() {
    const box = el.form && $('#set-reduced-motion', el.form);
    if (!box) return;
    box.checked = settings.reducedMotion || mqReduce.matches;
    box.disabled = mqReduce.matches; // "follows your device setting"
    box.title = mqReduce.matches ? 'Your device already requests reduced motion' : '';
  }

  /* ========================================================================
     7. CUSTOMISATION PANEL (open, close, focus, Escape, outside click)
     ====================================================================== */
  let lastFocus = null;
  const panelIsOpen = () => !!el.panel && !el.panel.hidden;

  function getFocusable(container) {
    const sel = 'a[href],button:not([disabled]),input:not([disabled]),select,textarea,summary,[tabindex]:not([tabindex="-1"])';
    return $$(sel, container).filter((n) => n.getClientRects().length > 0);
  }

  function openPanel() {
    if (!el.panel || panelIsOpen()) return;
    closeMenu();
    lastFocus = document.activeElement;
    el.panel.hidden = false;
    if (el.backdrop) el.backdrop.hidden = false;
    el.panel.setAttribute('role', 'dialog');
    el.panel.setAttribute('aria-modal', 'true');
    el.settingsToggle.setAttribute('aria-expanded', 'true');
    if (el.closeBtn) el.closeBtn.focus({ preventScroll: true });
    mascotReact('panel');
  }

  function closePanel(restoreFocus) {
    if (!panelIsOpen()) return;
    el.panel.hidden = true;
    if (el.backdrop) el.backdrop.hidden = true;
    el.settingsToggle.setAttribute('aria-expanded', 'false');
    flushSave();
    if (restoreFocus) {
      const target = lastFocus && document.contains(lastFocus) ? lastFocus : el.settingsToggle;
      target.focus({ preventScroll: true });
    }
    lastFocus = null;
  }

  function initSettingsPanel() {
    if (!el.settingsToggle || !el.panel) return false;
    on(el.settingsToggle, 'click', () => (panelIsOpen() ? closePanel(true) : openPanel()));
    on(el.closeBtn, 'click', () => closePanel(true));

    // Close only when the press AND the release both happen on the backdrop,
    // so dragging a slider out of the panel never closes it by accident.
    let pressedBackdrop = false;
    on(el.backdrop, 'pointerdown', () => { pressedBackdrop = true; });
    on(el.backdrop, 'click', (e) => {
      if (pressedBackdrop || e.detail === 0) closePanel(true);
      pressedBackdrop = false;
    });

    // Mobile: swipe down on the sheet header to close.
    const head = $('.drawer-head', el.panel);
    if (head) {
      let startY = null;
      head.style.touchAction = 'none';
      on(head, 'pointerdown', (e) => { startY = e.target.closest('button') ? null : e.clientY; });
      on(head, 'pointerup', (e) => {
        if (startY !== null && mqSheet.matches && e.clientY - startY > 70) closePanel(true);
        startY = null;
      });
      on(head, 'pointercancel', () => { startY = null; });
    }
    // The hint says controls need the script; the script is running now.
    const hint = $('.hint', el.panel);
    if (hint) hint.hidden = true;
    return true;
  }

  /* ========================================================================
     SETTINGS FORM: inputs, presets, colours, save, reset
     ====================================================================== */
  function selectPreset(name) {
    if (!Object.prototype.hasOwnProperty.call(PRESETS, name)) return;
    settings.preset = name;
    settings.accent = PRESETS[name].accent;
    settings.hair = null; // presets clear secondary overrides
    settings.ambientTint = null;
    applyTheme();
    syncControls();
    scheduleSave();
    mascotReact('theme');
  }

  /** Colour inputs: validate, keep readable, apply live. `final` = picker closed. */
  function handleColorInput(input, final) {
    if (!isHex(input.value)) return; // ignore anything that is not #rrggbb
    if (input.id === 'set-accent') {
      settings.accent = tuneColor(input.value, 0.5, 0.86);
      settings.preset = 'custom';
      $$('input[name="preset"]', el.form).forEach((r) => { r.checked = false; });
      if (final) input.value = settings.accent;
    } else if (input.id === 'set-hair') {
      settings.hair = tuneColor(input.value, 0.45, 0.9);
      if (final) input.value = settings.hair;
    } else if (input.id === 'set-ambient-tint') {
      settings.ambientTint = tuneColor(input.value, 0.45, 0.9);
      if (final) input.value = settings.ambientTint;
    } else return;
    applyTheme();
    scheduleSave();
    if (final) mascotReact('theme');
  }

  function flashButton(btn, text) {
    if (!btn) return;
    if (!btn.dataset.label) btn.dataset.label = btn.textContent;
    btn.setAttribute('aria-live', 'polite');
    btn.textContent = text;
    cancel(Number(btn.dataset.flashTimer));
    btn.dataset.flashTimer = String(later(() => { btn.textContent = btn.dataset.label; }, 1800));
  }

  function saveNow() {
    settings.remember = true;
    syncControls();
    const ok = persistNow();
    flashButton(el.save, ok ? 'Saved \u2713' : 'Not saved');
    mascotSay(ok ? 'Settings saved on this device.' : 'Storage is blocked, so settings last for this visit only.');
  }

  function resetSettings() {
    settings = Object.assign({}, DEFAULTS);
    cancel(saveTimer);
    saveTimer = 0;
    storageRemove(STORAGE_KEY);
    applyAllSettings();
    syncControls();
    flashButton($('#settings-reset', el.form), 'Reset \u2713');
    mascotSay('Back to the default look.');
  }

  function initSettingsForm() {
    if (!el.form) return false;
    el.outputs = {};
    RANGE_CONTROLS.forEach((c) => { el.outputs[c.id] = $(`output[for="${c.id}"]`, el.form); });

    on(el.form, 'input', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type === 'range') handleRangeInput(t);
      else if (t.type === 'color') handleColorInput(t, false);
    });
    on(el.form, 'change', (e) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement)) return;
      if (t.type === 'radio' && t.name === 'preset') selectPreset(t.value);
      else if (t.type === 'color') handleColorInput(t, true);
      else if (t.id === 'set-reduced-motion') {
        settings.reducedMotion = t.checked;
        applyReducedMotion();
        scheduleSave();
      } else if (t.id === 'set-remember') {
        settings.remember = t.checked;
        if (t.checked) persistNow();
        else { cancel(saveTimer); saveTimer = 0; storageRemove(STORAGE_KEY); }
      }
    });
    on(el.form, 'submit', (e) => e.preventDefault());
    on(el.form, 'reset', (e) => { e.preventDefault(); resetSettings(); });
    on(el.save, 'click', saveNow);
    syncControls();
    return true;
  }

  /* ========================================================================
     11. MASCOT BEHAVIOUR
     States come from style.css: idle | happy | curious | surprised | click.
     ====================================================================== */
  const mascot = { visible: true, ready: false, lastReact: 0, clicks: [] };
  let moodTimer = 0;
  let moodPriority = 0;
  let bubbleTimer = 0;
  let blinkTimer = 0;

  const REACTIONS = {
    theme: { steps: [{ mood: 'happy', hold: 1100 }], gap: 1500, priority: 1 },
    panel: { steps: [{ mood: 'curious', hold: 1200 }], gap: 1500, priority: 1 },
    project: { steps: [{ mood: 'curious', hold: 1400 }], gap: 1500, priority: 1 },
    scroll: { steps: [{ mood: 'curious', hold: 1300 }], gap: 7000, priority: 1 },
    lightOn: { steps: [{ mood: 'happy', hold: 1400 }], gap: 400, priority: 2 },
    lightOff: { steps: [{ mood: 'surprised', hold: 700 }, { mood: 'curious', hold: 900 }], gap: 400, priority: 2 }
  };
  const CHATTER = [
    'Hi! I\u2019m the portfolio mascot.',
    'Try the gear icon to change the look.',
    'The hanging light changes the mood of the room.',
    'Scroll down for projects and case studies.'
  ];
  let chatterIndex = 0;

  /** Plays a list of expressions in order, then returns to idle. */
  function playMood(steps, priority) {
    if (!el.stage) return;
    if (moodTimer && priority < moodPriority) return; // never interrupt a stronger reaction
    cancel(moodTimer);
    moodPriority = priority;
    let i = 0;
    const next = () => {
      if (i >= steps.length) {
        el.stage.dataset.mascotState = 'idle';
        moodTimer = 0;
        moodPriority = 0;
        return;
      }
      const step = steps[i++];
      el.stage.dataset.mascotState = step.mood;
      moodTimer = later(next, step.hold);
    };
    next();
  }

  function mascotReact(kind) {
    const r = REACTIONS[kind];
    if (!r || !el.stage || !mascot.ready || !mascot.visible) return;
    const now = performance.now();
    if (now - mascot.lastReact < r.gap) return; // restrained cooldown
    mascot.lastReact = now;
    playMood(r.steps, r.priority);
  }

  /** Shows a short message in the existing status bubble. */
  function mascotSay(text, ms) {
    if (!el.bubble) return;
    el.bubble.textContent = text;
    el.bubble.hidden = false;
    cancel(bubbleTimer);
    bubbleTimer = later(() => { el.bubble.hidden = true; }, ms || 3800);
  }

  function onMascotClick() {
    const now = performance.now();
    mascot.clicks = mascot.clicks.filter((t) => now - t < 2000);
    mascot.clicks.push(now);
    if (mascot.clicks.length > 4) { // poked a lot: one surprised reaction
      mascot.clicks.length = 0;
      playMood([{ mood: 'surprised', hold: 900 }], 3);
      mascotSay('Whoa, easy there!', 2200);
      return;
    }
    playMood([{ mood: 'click', hold: 600 }, { mood: 'happy', hold: 1600 }], 3);
    if (now - mascot.lastReact > 1200) {
      mascot.lastReact = now;
      mascotSay(CHATTER[chatterIndex++ % CHATTER.length]);
    }
  }

  /** Scripted blink for non-idle states (idle blinks via CSS already). */
  function scheduleBlink() {
    blinkTimer = later(() => {
      const state = el.stage.dataset.mascotState;
      if (!document.hidden && mascot.visible && !isReducedMotion() && state !== 'idle') {
        el.stage.classList.add('is-blinking');
        later(() => el.stage.classList.remove('is-blinking'), 240);
      }
      scheduleBlink();
    }, 2800 + Math.random() * 3400);
  }

  function initMascot() {
    if (!el.stage) return false;
    on(el.mascotButton, 'click', onMascotClick);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        mascot.visible = entries[entries.length - 1].isIntersecting;
      });
      io.observe(el.stage);
      observers.push(io);
    }
    scheduleBlink();
    return true;
  }

  /* ========================================================================
     12. POINTER-RESPONSIVE GAZE
     Writes --look-x / --look-y (-1..1) on the stage. style.css moves the
     eyes, head and hair by a few pixels from those values.
     ====================================================================== */
  const gaze = { x: 0, y: 0 };
  function updateGaze(rect, x, y) {
    if (!rect || !el.stage) return;
    const lx = clamp((x - (rect.left + rect.width / 2)) / (window.innerWidth * 0.45), -1, 1);
    const ly = clamp((y - (rect.top + rect.height / 2)) / (window.innerHeight * 0.45), -1, 1);
    if (Math.abs(lx - gaze.x) < 0.02 && Math.abs(ly - gaze.y) < 0.02) return;
    gaze.x = lx;
    gaze.y = ly;
    el.stage.style.setProperty('--look-x', lx.toFixed(2));
    el.stage.style.setProperty('--look-y', ly.toFixed(2));
  }
  function resetGaze() {
    gaze.x = 0;
    gaze.y = 0;
    if (el.stage) { el.stage.style.removeProperty('--look-x'); el.stage.style.removeProperty('--look-y'); }
  }

  /* ========================================================================
     13. ELASTIC CARD INTERACTIONS
     Only CSS variables are written on the .elastic-card. style.css moves the
     .elastic-surface layer; text in .elastic-content is never transformed.
     Press compression is handled by CSS :active.
     ====================================================================== */
  let activeCard = null;
  function resetCard() {
    if (!activeCard) return;
    ['--px', '--py', '--mx', '--my'].forEach((p) => activeCard.style.removeProperty(p));
    activeCard = null;
  }
  function updateCard(card, rect, x, y, f) {
    if (card !== activeCard) resetCard();
    if (!card || !rect || !rect.width || !rect.height) return;
    activeCard = card;
    const nx = clamp((x - rect.left) / rect.width, 0, 1);
    const ny = clamp((y - rect.top) / rect.height, 0, 1);
    card.style.setProperty('--mx', `${(nx * 100).toFixed(1)}%`);
    card.style.setProperty('--my', `${(ny * 100).toFixed(1)}%`);
    card.style.setProperty('--px', (clamp((nx - 0.5) * 2, -1, 1) * f).toFixed(3));
    card.style.setProperty('--py', (clamp((ny - 0.5) * 2, -1, 1) * f).toFixed(3));
  }

  /* ========================================================================
     14. MAGNETIC CONTROLS
     Pure translation (--tx / --ty in px), limited to a few pixels.
     #light-toggle is skipped: its own CSS transition would make it jitter.
     ====================================================================== */
  const MAGNET_MAX = 6;
  let activeMagnet = null;
  function resetMagnetic() {
    if (!activeMagnet) return;
    activeMagnet.style.removeProperty('--tx');
    activeMagnet.style.removeProperty('--ty');
    activeMagnet = null;
  }
  function updateMagnetic(node, rect, x, y, f) {
    if (node !== activeMagnet) resetMagnetic();
    if (!node || !rect) return;
    activeMagnet = node;
    const tx = clamp((x - (rect.left + rect.width / 2)) * 0.22, -MAGNET_MAX, MAGNET_MAX) * f;
    const ty = clamp((y - (rect.top + rect.height / 2)) * 0.22, -MAGNET_MAX, MAGNET_MAX) * f;
    node.style.setProperty('--tx', tx.toFixed(2));
    node.style.setProperty('--ty', ty.toFixed(2));
  }

  /* ========================================================================
     11b. AMBIENT ENVIRONMENT (cursor glow + restrained parallax)
     Vars are written on #ambient-field (not <html>) so only the ambient
     layers recalculate. CSS-only drift animation is NOT duplicated here.
     ====================================================================== */
  function updateAmbientPointer(x, y, f) {
    if (!el.ambientField) return;
    const s = el.ambientField.style;
    s.setProperty('--cursor-x', `${Math.round(x)}px`);
    s.setProperty('--cursor-y', `${Math.round(y)}px`);
    const nx = clamp((x / window.innerWidth - 0.5) * 2, -1, 1) * f;
    const ny = clamp((y / window.innerHeight - 0.5) * 2, -1, 1) * f;
    s.setProperty('--parallax-x', nx.toFixed(3));
    s.setProperty('--parallax-y', ny.toFixed(3));
  }
  function resetAmbientPointer() {
    if (!el.ambientField) return;
    ['--cursor-x', '--cursor-y', '--parallax-x', '--parallax-y'].forEach((p) => el.ambientField.style.removeProperty(p));
  }

  /* ========================================================================
     26. EVENT INITIALISATION: shared pointer loop
     One passive pointermove listener; heavy work happens once per frame.
     Touch input is ignored (no hover on phones).
     ====================================================================== */
  const pointer = { x: 0, y: 0, target: null, pending: false, active: false };

  function clearPointerEffects() {
    pointer.active = false;
    resetCard();
    resetMagnetic();
    resetGaze();
    resetAmbientPointer();
  }

  function onPointerMove(e) {
    if (e.pointerType === 'touch' || !mqFine.matches || isReducedMotion()) return;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.target = e.target;
    pointer.active = true;
    if (!pointer.pending) {
      pointer.pending = true;
      window.requestAnimationFrame(pointerFrame);
    }
  }

  function pointerFrame() {
    pointer.pending = false;
    if (!pointer.active || isReducedMotion()) return;
    const { x, y } = pointer;
    const target = pointer.target instanceof Element ? pointer.target : null;
    const f = motionFactor();

    // 1) read layout once
    const card = target ? target.closest('.elastic-card') : null;
    let magnet = target ? target.closest('.magnetic-control') : null;
    if (magnet && magnet === el.lightToggle) magnet = null;
    const cardRect = card ? card.getBoundingClientRect() : null;
    const magnetRect = magnet ? magnet.getBoundingClientRect() : null;
    const gazeOn = mascot.visible && el.stage && settings.mascotMotion > 0;
    const stageRect = gazeOn ? el.stage.getBoundingClientRect() : null;

    // 2) then write
    updateAmbientPointer(x, y, f);
    updateCard(card, cardRect, x, y, f);
    updateMagnetic(magnet, magnetRect, x, y, f);
    if (gazeOn) updateGaze(stageRect, x, y);
    else if (gaze.x || gaze.y) resetGaze();
  }

  function initPointerTracking() {
    on(document, 'pointermove', onPointerMove, { passive: true });
    // Pointer left the window: relax everything.
    on(document, 'mouseout', (e) => { if (!e.relatedTarget) clearPointerEffects(); });
    on(window, 'blur', clearPointerEffects);
    on(document, 'visibilitychange', () => { if (document.hidden) clearPointerEffects(); });
    // Lets :active press feedback work on iOS Safari (no other effect).
    on(document, 'touchstart', () => {}, { passive: true });
    onMedia(mqFine, () => { if (!mqFine.matches) clearPointerEffects(); });
    return true;
  }

  /* ========================================================================
     15. SUSPENDED LIGHT
     ====================================================================== */
  function toggleLight() {
    settings.light = !settings.light;
    applyLight();
    scheduleSave();
    mascotReact(settings.light ? 'lightOn' : 'lightOff');
  }
  function initLight() {
    if (!el.lightToggle) return false;
    on(el.lightToggle, 'click', toggleLight); // one listener: Enter, Space and touch all end in "click"
    return true;
  }

  /* ========================================================================
     16. WELCOME SEQUENCE
     1-3 (restore + theme) already happened in applyAllSettings().
     4 reveal-ready is added by initReveal(). 5-6 are CSS animations on the
     hero. 7 is the timer below. Nothing is ever hidden by script alone.
     ====================================================================== */
  function runWelcome() {
    const speed = clamp(settings.speed / 100, 0.25, 2);
    const delay = isReducedMotion() ? 0 : Math.round(1100 / speed);
    later(() => {
      mascot.ready = true;
      const first = storageGet(VISIT_KEY) === null;
      if (first) {
        storageSet(VISIT_KEY, '1');
        playMood([{ mood: 'happy', hold: 1800 }], 2);
        mascotSay('Hi, welcome! Tap me, or open the gear to customize the look.', 5500);
      } else {
        playMood([{ mood: 'happy', hold: 900 }], 1); // quiet hello for returning visitors
      }
    }, delay);
  }

  /* ========================================================================
     18. MOBILE MENU
     ====================================================================== */
  const menuIsOpen = () => !!el.menuToggle && el.menuToggle.getAttribute('aria-expanded') === 'true';
  function openMenu() {
    if (!el.menuToggle || !mqMenu.matches) return;
    closePanel(false);
    el.menuToggle.setAttribute('aria-expanded', 'true');
  }
  function closeMenu() {
    if (el.menuToggle) el.menuToggle.setAttribute('aria-expanded', 'false');
  }
  function initMobileMenu() {
    if (!el.menuToggle || !el.nav) return false;
    on(el.menuToggle, 'click', () => (menuIsOpen() ? closeMenu() : openMenu()));
    // choosing a link closes the menu (the link itself still works natively)
    on(el.nav, 'click', (e) => { if (e.target.closest('a')) closeMenu(); });
    // tapping outside the header closes it
    on(document, 'pointerdown', (e) => {
      if (menuIsOpen() && el.header && !el.header.contains(e.target)) closeMenu();
    });
    // leaving mobile layout resets the state
    onMedia(mqMenu, () => { if (!mqMenu.matches) closeMenu(); });
    return true;
  }

  /* ========================================================================
     24. ACCESSIBILITY HELPERS: keyboard (Escape, focus containment)
     ====================================================================== */
  function initKeyboard() {
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') {
        if (panelIsOpen()) { closePanel(true); e.preventDefault(); return; }
        if (menuIsOpen()) { closeMenu(); el.menuToggle.focus({ preventScroll: true }); e.preventDefault(); }
        return;
      }
      // While the modal panel is open, Tab cycles inside it. Escape always exits.
      if (e.key === 'Tab' && panelIsOpen()) {
        const items = getFocusable(el.panel);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (!el.panel.contains(document.activeElement)) { first.focus(); e.preventDefault(); }
        else if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });
    return true;
  }

  /** External links: safe rel, new tab, and a screen-reader hint. */
  function initExternalLinks() {
    $$('a[href]').forEach((a) => {
      if (a.dataset.extChecked) return;
      a.dataset.extChecked = '1';
      let url;
      try { url = new URL(a.getAttribute('href'), window.location.href); } catch (err) { return; }
      if (!/^https?:$/.test(url.protocol) || url.origin === window.location.origin) return;
      const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      a.setAttribute('rel', Array.from(rel).join(' '));
      a.setAttribute('target', '_blank');
      const hint = document.createElement('span');
      hint.className = 'sr-only';
      hint.textContent = ' (opens in a new tab)';
      a.appendChild(hint);
    });
    return true;
  }

  /* ========================================================================
     19. SCROLL PROGRESS (+ scroll reaction, bottom-of-page nav state)
     style.css already draws the bar with a scroll timeline where supported;
     the script only fills --scroll-progress as a fallback.
     ====================================================================== */
  const cssScrollTimeline = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()'));
  let scrollQueued = false;
  let lastProgress = -1;

  function onScroll() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScroll);
  }
  function updateScroll() {
    scrollQueued = false;
    if (el.progressBar && !cssScrollTimeline) {
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      if (Math.abs(p - lastProgress) > 0.002) {
        lastProgress = p;
        el.progressBar.style.setProperty('--scroll-progress', p.toFixed(3));
      }
    }
    // At the very bottom, the last linked section may never reach the
    // detection band, so mark it directly.
    if (window.innerHeight + window.scrollY >= root.scrollHeight - 4) setActiveLink(lastNavId());
    mascotReact('scroll');
  }
  function initScroll() {
    on(window, 'scroll', onScroll, { passive: true });
    on(window, 'resize', onScroll, { passive: true });
    updateScroll();
    return true;
  }

  /* ========================================================================
     17. NAVIGATION: active section, hash handling
     Anchor links stay native (CSS handles smooth scroll and offset).
     ====================================================================== */
  let navLinks = [];
  let activeId = null;
  const linkId = (a) => decodeSafe((a.getAttribute('href') || '').slice(1));
  function decodeSafe(s) { try { return decodeURIComponent(s); } catch (err) { return s; } }
  function lastNavId() { return navLinks.length ? linkId(navLinks[navLinks.length - 1]) : null; }

  function setActiveLink(id) {
    if (id === activeId) return;
    activeId = id;
    navLinks.forEach((a) => {
      if (id && linkId(a) === id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }

  function initNavigation() {
    navLinks = $$('a[href^="#"]', el.nav || document.createElement('div'));
    const sections = $$(S.sections).filter((s) => s.id);
    if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
      const inBand = new Set();
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) inBand.add(en.target.id);
          else inBand.delete(en.target.id);
        });
        const current = sections.find((s) => inBand.has(s.id));
        // sections without a menu link (home, certifications...) clear the highlight
        const hasLink = current && navLinks.some((a) => linkId(a) === current.id);
        setActiveLink(hasLink ? current.id : null);
      }, { rootMargin: '-35% 0px -60% 0px', threshold: 0 });
      sections.forEach((s) => io.observe(s));
      observers.push(io);
    }
    openFromHash();
    on(window, 'hashchange', openFromHash);
    return true;
  }

  /* ========================================================================
     21 + 22. PROJECT AND CASE-STUDY INTERACTIONS
     The "Case study" buttons on project cards point at <details> panels.
     Opening them before the browser scrolls makes the link actually useful.
     There are no filter controls, charts or forms in index.html, so none
     are implemented (see the integration notes after the file).
     ====================================================================== */
  function openDetailsFor(target) {
    if (!target) return;
    const details = target.tagName === 'DETAILS' ? target : target.closest('details');
    if (details && !details.open) details.open = true;
  }
  function openFromHash() {
    if (!window.location.hash) return;
    openDetailsFor(document.getElementById(decodeSafe(window.location.hash.slice(1))));
  }
  function initProjectInteractions() {
    // Delegated: any in-page link to a details panel opens it. Never prevents default.
    on(document, 'click', (e) => {
      const a = e.target instanceof Element ? e.target.closest('a[href^="#"]') : null;
      if (!a || a.getAttribute('href').length < 2) return;
      openDetailsFor(document.getElementById(linkId(a)));
    });
    $$(S.caseStudy).forEach((d) => {
      // `toggle` does not bubble, so each panel gets its own (few) listener
      on(d, 'toggle', () => { if (d.open) mascotReact('project'); });
    });
    return true;
  }

  /* ========================================================================
     23. OPTIONAL CHART INTERACTIONS
     index.html has no chart elements, so nothing is attached here on purpose.
     ====================================================================== */

  /* ========================================================================
     20. SECTION REVEAL
     ====================================================================== */
  function initReveal() {
    const items = $$(S.reveal);
    if (!items.length) return true;
    const showAll = () => items.forEach((i) => i.classList.add('is-visible'));
    if (!('IntersectionObserver' in window)) { showAll(); return true; } // content stays visible
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-visible');
        io.unobserve(en.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    items.forEach((i) => io.observe(i));
    observers.push(io);
    root.classList.add('reveal-ready');
    on(window, 'beforeprint', showAll); // printed pages must show everything
    return true;
  }

  /* ========================================================================
     28. ERROR HANDLING AND CLEANUP
     ====================================================================== */
  function cleanup() {
    ac.abort(); // removes every listener registered through on()
    observers.forEach((o) => o.disconnect());
    timers.forEach((t) => window.clearTimeout(t));
    timers.clear();
  }

  /* ========================================================================
     27. MAIN INITIALISATION
     ====================================================================== */
  function cacheElements() {
    el.ambientField = $(S.ambientField);
    el.progressBar = $(S.progressBar);
    el.header = $(S.header);
    el.menuToggle = $(S.menuToggle);
    el.nav = $(S.nav);
    el.settingsToggle = $(S.settingsToggle);
    el.panel = $(S.panel);
    el.backdrop = $(S.backdrop);
    el.closeBtn = $(S.closeBtn);
    el.form = $(S.form);
    el.save = $(S.save);
    el.lightToggle = $(S.lightToggle);
    el.stage = $(S.stage);
    el.mascotButton = $(S.mascotButton);
    el.bubble = $(S.bubble);
    el.themeMeta = $(S.themeMeta);
  }

  function init() {
    cacheElements();
    loadSettings();                                  // restore valid saved preferences
    safeRun('apply-settings', applyAllSettings);     // apply theme + every control
    safeRun('settings-form', initSettingsForm);
    safeRun('keyboard', initKeyboard);

    // JS-only UI (menu button, gear button) is switched on only if it works.
    const menuOk = safeRun('mobile-menu', initMobileMenu);
    const panelOk = safeRun('settings-panel', initSettingsPanel);
    if (!panelOk && el.settingsToggle) el.settingsToggle.hidden = true; // never show a dead button
    if (menuOk) root.classList.add('js');

    safeRun('light', initLight);
    safeRun('mascot', initMascot);
    safeRun('pointer', initPointerTracking);
    safeRun('scroll', initScroll);
    safeRun('navigation', initNavigation);
    safeRun('projects', initProjectInteractions);
    safeRun('external-links', initExternalLinks);
    safeRun('reveal', initReveal);

    // System motion preference can change while the page is open.
    onMedia(mqReduce, applyReducedMotion);
    // Save pending changes when the page is hidden or left.
    on(document, 'visibilitychange', () => { if (document.hidden) flushSave(); });
    on(window, 'pagehide', (e) => { flushSave(); if (!e.persisted) cleanup(); });

    safeRun('welcome', runWelcome);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
