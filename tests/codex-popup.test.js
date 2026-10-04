'use strict';
// Execute the actual page-local closure with a small DOM/event/clock seam.
// Native hit testing, default button/link activation and tab order are separately
// witnessed in the real browser; these tests protect lifecycle and async races.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'table-talk/mana-base-codex/index.html'), 'utf8');
const start = html.indexOf('const cardPop = (function(){');
const source = html.slice(start, html.indexOf('\n})();', start) + 6).replace('const cardPop =', 'globalThis.cardPop =');
const flush = () => new Promise(resolve => setImmediate(resolve));

test('Codex popup: generated inline triggers preserve wrapping with button semantics and dialog association', () => {
  const declaration = html.match(/const cardName = [^\n]+/)[0];
  const markup = vm.runInNewContext(`const escAttr=s=>s.replace(/"/g,'&quot;');${declaration}\ncardName('Tundra')`);
  assert.match(markup, /^<span class="cardname" role="button" tabindex="0"/);
  assert.match(markup, /aria-label="Tundra card preview"/);
  assert.match(markup, /aria-haspopup="dialog" aria-controls="cardpop" aria-expanded="false"/);
  assert.match(markup, />Tundra<\/span>$/);
});

function harness() {
  let now = 0, sequence = 0;
  const timers = new Map(), frames = [], requests = [], listeners = new Map();
  function emit(type, target, props = {}) {
    const event = { target, relatedTarget: null, pointerType: 'mouse', detail: 1,
      preventDefault() { this.defaultPrevented = true; }, ...props };
    for (const fn of listeners.get(type) || []) fn(event);
    return event;
  }
  class Node {
    constructor(kind = 'div') {
      this.kind = kind; this.dataset = {}; this.attrs = {}; this.children = [];
      this.style = {}; this.isConnected = true; this.hover = false; this.scrollTop = 0;
      this.rect = { left: 20, right: 100, top: 100, height: 20, bottom: 120 };
      this.offsetWidth = 280; this.offsetHeight = 200;
      const classes = new Set();
      this.classList = { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) };
    }
    setAttribute(name, value) { this.attrs[name] = String(value); }
    getAttribute(name) { return this.attrs[name] ?? null; }
    appendChild(child) { this.children.push(child); child.parent = this; }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    closest(selector) { return selector === '.cardname' && this.dataset.card ? this : this.parent?.closest(selector) || null; }
    matches(selector) { return selector === ':hover' && this.hover; }
    getClientRects() { return this.isConnected ? [this.rect] : []; }
    getBoundingClientRect() { return this.rect; }
    querySelector(selector) { return this.children.find(child => child.kind === selector) || null; }
    set innerHTML(value) {
      this._html = value; this.children = [];
      if (/<a /.test(value)) {
        const a = new Node('a');
        for (const [, name, v] of value.matchAll(/(href|target|rel|aria-label)="([^"]*)"/g)) a.setAttribute(name, v);
        this.appendChild(a);
      }
      if (/<img /.test(value)) this.appendChild(new Node('img'));
    }
    get innerHTML() { return this._html || ''; }
    focus(options) {
      this.focusOptions = options; const old = document.activeElement;
      if (old === this) return;
      document.activeElement = this;
      emit('focusout', old, { relatedTarget: this }); emit('focusin', this, { relatedTarget: old });
    }
    blur() { body.focus(); }
  }
  const body = new Node('body');
  const document = { body, activeElement: body, createElement: kind => new Node(kind),
    addEventListener(type, fn) { listeners.set(type, [...(listeners.get(type) || []), fn]); } };
  const context = { document, innerWidth: 390, innerHeight: 900,
    CARD_INFO: {}, manaSymbol: () => '', escAttr: s => s.replace(/"/g, '&quot;'),
    Date: { now: () => now },
    setTimeout(fn, delay) { const id = ++sequence; timers.set(id, { at: now + delay, fn }); return id; },
    clearTimeout(id) { timers.delete(id); }, requestAnimationFrame(fn) { frames.push(fn); },
    addEventListener: document.addEventListener,
    fetch(url) { return new Promise((resolve, reject) => requests.push({ url, at: now, resolve, reject })); } };
  vm.runInNewContext(source, context); context.cardPop.init();
  const panel = body.children[0];
  const trigger = (name, left = 20) => { const el = new Node('button'); el.dataset.card = name; el.rect.left = left; el.rect.right = left + 80; body.appendChild(el); return el; };
  const tick = async ms => {
    const end = now + ms;
    while (true) {
      const due = [...timers].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      now = due[1].at; timers.delete(due[0]); due[1].fn(); await flush();
    }
    now = end; await flush();
  };
  const raf = () => { while (frames.length) frames.shift()(); };
  const reject = async index => { requests[index].reject(Error('API fixture')); await flush(); };
  const success = async index => { requests[index].resolve({ ok: true, json: async () => ({ image_uris: { normal: '/fixture.jpg' } }) }); await flush(); };
  const key = (key, target = document.activeElement, shiftKey = false) => emit('keydown', target, { key, shiftKey });
  return { panel, document, body, trigger, emit, tick, raf, requests, reject, success, key };
}

test('Codex popup: passive focus, first/repeat activation, contained link and loading-panel Tab route', async () => {
  const h = harness(), t = h.trigger('Tundra'); t.focus(); await flush(); h.raf();
  assert.equal(h.document.activeElement, t, 'passive focus must stay on the name');
  assert.equal(h.panel.getAttribute('role'), 'dialog');
  assert.equal(h.panel.getAttribute('aria-label'), 'Tundra card preview');
  assert.equal(h.panel.getAttribute('aria-hidden'), 'false');
  assert.equal(t.getAttribute('aria-expanded'), 'true');
  h.emit('click', t); h.emit('click', t); assert.equal(h.requests.length, 1);
  assert.equal(h.panel.getAttribute('aria-hidden'), 'false', 'focus-before-click cannot toggle closed');
  assert.equal(h.key('Enter', t).defaultPrevented, true); assert.equal(h.document.activeElement, h.panel);
  await h.reject(0); assert.equal(h.document.activeElement, h.panel, 'async fallback must not steal focus');
  const action = h.panel.querySelector('a'); h.key('Tab'); assert.equal(h.document.activeElement, action);
  assert.equal(action.getAttribute('target'), '_blank'); assert.match(action.getAttribute('rel'), /noopener/);
  assert.equal(action.getAttribute('href'), 'https://scryfall.com/search?q=!%22Tundra%22');
  h.emit('click', action); assert.equal(h.panel.getAttribute('aria-hidden'), 'false', 'descendants are inside');
  h.key('Tab', action, true); assert.equal(h.document.activeElement, t);
  assert.equal(h.panel.inert, true); assert.equal(h.panel.style.display, 'none');
  await h.tick(400); h.raf(); assert.equal(h.panel.getAttribute('aria-hidden'), 'true');
  assert.equal(h.key(' ', t).defaultPrevented, true); await flush();
  assert.equal(h.panel.getAttribute('aria-hidden'), 'false');
});

test('Codex popup: hover gap persistence, focus persistence, Escape suppression and outside focus ownership', async () => {
  const h = harness(), t = h.trigger('Tundra'), other = h.trigger('Other');
  t.hover = true; h.emit('pointerover', t); await h.tick(120); h.raf();
  t.hover = false; h.emit('pointerout', t); await h.tick(100); h.emit('pointerover', h.panel);
  await h.tick(300); assert.equal(h.panel.getAttribute('aria-hidden'), 'false');
  await h.reject(0); const action = h.panel.querySelector('a'); action.focus();
  h.emit('pointerout', h.panel); await h.tick(300); assert.equal(h.panel.getAttribute('aria-hidden'), 'false');
  h.key('Escape'); assert.equal(h.document.activeElement, t); assert.equal(t.focusOptions.preventScroll, true);
  h.emit('pointerover', t); await h.tick(400); h.raf(); assert.equal(h.panel.getAttribute('aria-hidden'), 'true');
  h.emit('click', t); await flush(); h.raf(); other.focus(); h.emit('click', h.body);
  assert.equal(h.document.activeElement, other, 'outside close must not restore old focus');
  assert.equal(h.panel.getAttribute('aria-hidden'), 'true'); assert.equal(t.getAttribute('aria-expanded'), 'false');
});

test('Codex popup: dismissal cancels hover/rAF, responses and stale same-name image callbacks', async () => {
  const h = harness(), a = h.trigger('Tundra'), b = h.trigger('Tundra', 180);
  h.emit('pointerover', a); h.key('Escape', a); await h.tick(200); assert.equal(h.requests.length, 0);
  h.emit('click', a); await flush(); h.key('Escape', a); h.raf(); await h.success(0);
  assert.equal(h.panel.getAttribute('aria-hidden'), 'true'); assert.equal(h.panel.classList.contains('on'), false);
  assert.ok(!h.panel.querySelector('img'), 'dismissed response cannot render');
  h.emit('click', a); await flush(); h.raf(); const oldImage = h.panel.querySelector('img');
  h.key('Escape', a); h.emit('click', b); await flush(); h.raf();
  assert.equal(h.requests.length, 1, 'same-name reopen shares cached lookup');
  const newImage = h.panel.querySelector('img'), content = h.panel.innerHTML, left = h.panel.style.left;
  oldImage.onerror(); oldImage.onload();
  assert.equal(h.panel.innerHTML, content); assert.equal(h.panel.style.left, left);
  assert.equal(a.getAttribute('aria-expanded'), 'false'); assert.equal(b.getAttribute('aria-expanded'), 'true');
  newImage.onerror(); assert.ok(h.panel.querySelector('a'), 'current image failure keeps usable fallback');
  h.key('Escape', b); h.emit('click', b); await flush(); b.isConnected = false;
  const image = h.panel.querySelector('img'); image.onload(); image.onerror();
  assert.ok(h.panel.querySelector('img'), 'disconnected callbacks cannot replace content');
});

test('Codex popup: delayed A to B preserves serialized 150ms spacing, error handling and base-name cache', async () => {
  const h = harness(), a = h.trigger('A / alternate'), b = h.trigger('B');
  a.focus(); await flush(); b.focus(); await flush(); assert.equal(h.requests.length, 1);
  assert.ok(h.requests[0].url.endsWith('exact=A'), 'base name is lookup authority');
  await h.reject(0); assert.equal(h.panel.getAttribute('aria-label'), 'B card preview');
  assert.match(h.panel.innerHTML, /Summoning/); await h.tick(149); assert.equal(h.requests.length, 1);
  await h.tick(1); assert.equal(h.requests.length, 2); assert.equal(h.requests[1].at - h.requests[0].at, 150);
  await h.success(1); assert.ok(h.panel.querySelector('img'));
  h.key('Escape', b); h.emit('click', a); await flush(); assert.ok(h.panel.querySelector('a'));
  assert.equal(h.requests.length, 2, 'failed lookups are cached, never retried');
});

test('Codex popup: document scroll/resize close while panel scroll stays usable and forward Tab is untrapped', async () => {
  const h = harness(), t = h.trigger('Tundra'); t.focus(); await flush(); await h.reject(0);
  h.key('Tab'); const action = h.document.activeElement;
  h.emit('scroll', h.panel); assert.equal(h.panel.getAttribute('aria-hidden'), 'false');
  const tab = h.key('Tab', action); assert.equal(tab.defaultPrevented, undefined);
  assert.equal(h.document.activeElement, t, 'native default continues after origin');
  assert.equal(h.panel.getAttribute('aria-hidden'), 'true');
  h.emit('click', t); await flush(); h.emit('scroll', h.document); h.raf();
  assert.equal(h.panel.inert, true); assert.equal(h.panel.getAttribute('aria-hidden'), 'true');
  h.emit('click', t); await flush(); h.emit('resize', h.document); h.raf();
  assert.equal(h.panel.style.display, 'none');
});
