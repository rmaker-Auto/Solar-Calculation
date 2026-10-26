/* core.js — স্টোরেজ, লগইন/প্রোফাইল, সিঙ্ক ইঞ্জিন, সাইডবার/রাউটার, পপআপ */
(function () {
  'use strict';
  const { num, esc, uid, now } = SL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const App = window.App = {};
  let DEV = null, D = null, CUR = 'dash';
  const PAGE = {};

  /* ===== পেজ তালিকা: [key, আইকন, ডিফল্ট নাম, ব্যাকগ্রাউন্ড, অ্যাকসেন্ট] ===== */
  const META = [
    ['dash', '🏠', 'ড্যাশবোর্ড', '#e6f8fc', '#19a7c4'],
    ['loads', '💡', 'লোড টেবিল', '#eceefd', '#4338ca'],
    ['system', '⚡', 'সিস্টেম সাইজ', '#f6ecfb', '#9c27b0'],
    ['cable', '🔌', 'ক্যাবল ও ফিউজ', '#fde9f1', '#d81b60'],
    ['sun', '☀️', 'সূর্যালোক ও পে-ব্যাক', '#fcf0e7', '#e0701b'],
    ['backup', '🔋', 'ব্যাকআপ সময়', '#fbfde5', '#a4b320'],
    ['report', '📊', 'চার্ট ও রিপোর্ট', '#eafbe9', '#3bb54a'],
    ['conv', '🔁', 'কনভার্টার', '#e6fbf3', '#19b37f'],
    ['buy', '🛒', 'প্রোডাক্ট ক্রয়', '#e6f7ee', '#12a150'],
    ['notes', '📝', 'নোটপ্যাড', '#efe9fb', '#6d46d6'],
    ['settings', '⚙️', 'সেটিং ও ব্যাকআপ', '#fdeafb', '#d632c8']
  ];
  App.META = META;
  App.reg = (k, fn) => { PAGE[k] = fn; };

  /* ===== ছোট সহায়ক ===== */
  function toast(m, ms = 2800) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), ms); }
  function dl(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500); }
  function imgToData(file, max = 900, q = 0.75) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onerror = () => rej(new Error('ফাইল পড়া যায়নি'));
      r.onload = () => {
        const im = new Image();
        im.onerror = () => rej(new Error('ছবি খোলা যায়নি'));
        im.onload = () => {
          const k = Math.min(1, max / Math.max(im.width, im.height)), w = Math.round(im.width * k), h = Math.round(im.height * k);
          const c = document.createElement('canvas'); c.width = w; c.height = h;
          const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(im, 0, 0, w, h);
          res(c.toDataURL('image/jpeg', q));
        };
        im.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  function squarePic(file, size = 160) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => {
        const im = new Image();
        im.onerror = () => rej(new Error('ছবি খোলা যায়নি'));
        im.onload = () => {
          const c = document.createElement('canvas'); c.width = c.height = size;
          const x = c.getContext('2d'), s = Math.min(im.width, im.height);
          x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
          res(c.toDataURL('image/jpeg', 0.8));
        };
        im.src = r.result;
      };
      r.onerror = () => rej(new Error('ফাইল পড়া যায়নি'));
      r.readAsDataURL(file);
    });
  }

  /* ===== সরানো যায় এমন পপআপ ===== */
  let zc = 100;
  function dlg(o) {
    const ov = document.createElement('div'); ov.className = 'ov'; ov.style.zIndex = ++zc;
    ov.innerHTML = `<div class="dlg" role="dialog"><div class="dh"><b>${o.title || ''}</b>${o.noclose ? '' : '<button class="x" title="বন্ধ">✕</button>'}</div><div class="db">${o.html || ''}</div><div class="df"></div></div>`;
    document.body.appendChild(ov);
    const d = $('.dlg', ov), h = $('.dh', ov), df = $('.df', ov);
    d.style.width = Math.min(o.w || 520, innerWidth - 12) + 'px';
    const r0 = d.getBoundingClientRect();
    d.style.left = Math.max(6, (innerWidth - r0.width) / 2) + 'px';
    d.style.top = Math.max(6, Math.min((innerHeight - r0.height) / 3, innerHeight - r0.height - 6)) + 'px';
    const api = { el: d, body: $('.db', ov), ov, close() { if (!ov.isConnected) return; ov.remove(); o.onClose && o.onClose(); } };
    (o.buttons || []).forEach(b => {
      const x = document.createElement('button'); x.className = 'btn ' + (b.cls || ''); x.innerHTML = b.t;
      x.onclick = async () => { const r = b.fn ? await b.fn(api) : undefined; if (r !== false && b.close !== false) api.close(); };
      df.appendChild(x); b.el = x;
    });
    if (!(o.buttons || []).length) df.remove();
    const cx = $('.x', ov); if (cx) cx.onclick = api.close;
    h.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) return;
      const r = d.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
      h.setPointerCapture(e.pointerId);
      const mv = ev => { d.style.left = Math.min(innerWidth - 70, Math.max(70 - r.width, ev.clientX - ox)) + 'px'; d.style.top = Math.min(innerHeight - 44, Math.max(0, ev.clientY - oy)) + 'px'; };
      const up = () => { h.removeEventListener('pointermove', mv); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up); };
      h.addEventListener('pointermove', mv); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
    o.onMount && o.onMount(api);
    return api;
  }
  function ask(msg, o = {}) {
    return new Promise(res => {
      let done = false; const fin = v => { if (!done) { done = true; res(v); } };
      dlg({ title: o.title || 'নিশ্চিত করুন', html: `<div style="white-space:pre-line">${esc(msg)}</div>`, w: 420, onClose: () => fin(false),
        buttons: [{ t: o.ok || 'হ্যাঁ', cls: o.danger ? 'bad' : 'pri', fn: () => { fin(true); } }, { t: 'না', fn: () => { fin(false); } }] });
    });
  }
  function askText(title, label, val = '', o = {}) {
    return new Promise(res => {
      let done = false; const fin = v => { if (!done) { done = true; res(v); } };
      dlg({ title, html: `<label>${esc(label)}</label><input id="__at" value="${esc(val)}" ${o.type ? 'type="' + o.type + '"' : ''}>`, w: 420, onClose: () => fin(null),
        onMount: a => { const i = $('#__at', a.el); i.focus(); i.select(); i.onkeydown = e => { if (e.key === 'Enter') { fin(i.value); a.close(); } }; },
        buttons: [{ t: 'ঠিক আছে', cls: 'pri', fn: a => { fin($('#__at', a.el).value); } }, { t: 'বাতিল', fn: () => { fin(null); } }] });
    });
  }

  /* ===== স্টোরেজ (IndexedDB, না পেলে localStorage) ===== */
  const DB = (() => {
    let db = null, idb = true; const mem = new Map(), pend = new Set(); let tm = null;
    const fallback = res => { idb = false; db = null; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('sl2:')) { try { mem.set(k.slice(4), JSON.parse(localStorage.getItem(k))); } catch (e) { } } } res(); };
    const init = () => new Promise(res => {
      try {
        const r = indexedDB.open('solar2', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onerror = () => fallback(res); r.onblocked = () => fallback(res);
        r.onsuccess = () => {
          db = r.result;
          const c = db.transaction('kv').objectStore('kv').openCursor();
          c.onsuccess = e => { const cur = e.target.result; if (cur) { mem.set(cur.key, cur.value); cur.continue(); } else res(); };
          c.onerror = () => fallback(res);
        };
      } catch (e) { fallback(res); }
    });
    const flush = () => {
      clearTimeout(tm); tm = null;
      const keys = [...pend]; pend.clear(); if (!keys.length) return;
      if (idb && db) {
        try {
          const tx = db.transaction('kv', 'readwrite'), st = tx.objectStore('kv');
          keys.forEach(k => mem.has(k) ? st.put(mem.get(k), k) : st.delete(k));
          tx.onerror = () => toast('⚠ স্টোরেজে সেভ করা যায়নি (জায়গা পূর্ণ?)');
        } catch (e) { toast('⚠ স্টোরেজ ত্রুটি'); }
      } else {
        keys.forEach(k => { try { mem.has(k) ? localStorage.setItem('sl2:' + k, JSON.stringify(mem.get(k))) : localStorage.removeItem('sl2:' + k); } catch (e) { toast('⚠ স্টোরেজ পূর্ণ — ব্যাকআপ ডাউনলোড করুন'); } });
      }
    };
    const q = k => { pend.add(k); if (!tm) tm = setTimeout(flush, 250); };
    return { init, flush, get: k => mem.get(k), set(k, v) { mem.set(k, v); q(k); }, del(k) { mem.delete(k); q(k); }, keys: () => [...mem.keys()], isIdb: () => idb };
  })();
  App.DB = DB;

  /* ===== থিম ===== */
  function applyTheme(i) {
    const t = SL.THEMES[i] || SL.THEMES[0], r = document.documentElement.style;
    r.setProperty('--ac', t[0]); r.setProperty('--sb', t[1]);
    r.setProperty('--bg', SL.mix(t[0], '#ffffff', .93)); r.setProperty('--inp', SL.mix(t[0], '#ffffff', .9)); r.setProperty('--ln', SL.mix(t[0], '#ffffff', .78));
    const m = $('meta[name=theme-color]'); if (m) m.content = t[1];
    if (DEV) DEV.theme = i;
  }

  App.applyTheme = applyTheme;
  /* ===== স্টেট সহায়ক ===== */
  const metaOf = id => DEV.meta[id] || (DEV.meta[id] = {});
  const M = () => metaOf(D ? D.profile.id : '_');
  const P = () => { const m = M(); let p = D.projects.find(x => x.id === m.proj); if (!p) { p = D.projects[0]; m.proj = p.id; } return p; };
  const lbl = k => D.prefs.labels[k] || META.find(x => x[0] === k)[2];
  const fd = v => SL.fmtDate(v, D ? D.prefs.dateFmt : 'dMY');
  const fmtDT = ts => fd(ts) + ' ' + new Date(ts).toLocaleTimeString('en-US');
  const saveDev = () => { DB.set('dev', DEV); };
  let saveT = null;
  function save(opt) {
    if (!D) return;
    if (!(opt && opt.clean)) { const m = M(); m.dirty = true; m.dirtyAt = now(); }
    DB.set('p:' + D.profile.id, D); saveDev();
    setStatus(); schedSync();
  }
  function setD(pid, nd) { DB.set('p:' + pid, nd); if (D && D.profile.id === pid) D = nd; }
  const getD = pid => (D && D.profile.id === pid) ? D : DB.get('p:' + pid);
  Object.assign(App, { D: () => D, P, M, lbl, fd, fmtDT, save, saveDev, toast, dl, imgToData, squarePic, dlg, ask, askText, dev: () => DEV, setD, getD, metaOf });

  /* ===== সিঙ্ক ইঞ্জিন ===== */
  const Sync = { busy: false, again: false, timer: null, poll: null };
  function setStatus(kind, msg) {
    const e = $('#sync'); if (!e) return;
    let cls = '', txt = '';
    if (kind === 'busy') { cls = 'busy'; txt = 'ট্রান্সফার হচ্ছে…'; }
    else if (kind === 'err') { cls = 'err'; txt = '⚠ ' + msg; }
    else {
      const m = D ? M() : {};
      if (!DEV.url) { cls = 'off'; txt = 'শুধু এই ডিভাইসে সেভ (Google সংযোগ নেই)'; }
      else if (!navigator.onLine) { cls = 'off'; txt = 'অফলাইন' + (m.dirty ? ' — পরিবর্তন সেভ আছে, নেট এলে সিঙ্ক হবে' : ''); }
      else if (m.dirty) { cls = 'busy'; txt = DEV.auto ? 'পরিবর্তন সিঙ্কের অপেক্ষায়…' : 'অসিঙ্কড পরিবর্তন আছে'; }
      else if (m.last) { cls = 'ok'; txt = '✓ সিঙ্ক কমপ্লিট — ' + fmtDT(m.last); }
      else { txt = 'Google সংযুক্ত — এখনও সিঙ্ক হয়নি'; }
    }
    e.className = 'pill ' + cls; e.textContent = txt; e.title = txt;
  }
  App.setStatus = setStatus;

  async function gApi(action, extra) {
    if (!DEV.url) throw new Error('অ্যাপ স্ক্রিপ্ট লিংক দেওয়া হয়নি');
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 120000);
    try {
      const r = await fetch(DEV.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(Object.assign({ action, folder: DEV.folder }, extra || {})), signal: ctl.signal, redirect: 'follow' });
      const t = await r.text(); let j;
      try { j = JSON.parse(t); } catch (e) { throw new Error('সার্ভারের উত্তর ঠিক নয় — Apps Script ডিপ্লয়ে "Anyone" অ্যাক্সেস দিয়েছেন কি?'); }
      return j;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('সময় শেষ (টাইমআউট)');
      if (e instanceof TypeError) throw new Error('ইন্টারনেট বা লিংকে সমস্যা');
      throw e;
    } finally { clearTimeout(tm); }
  }
  App.gApi = gApi;
  const cred = pd => { const m = metaOf(pd.profile.id), p = m.pend || {}; return { id: pd.profile.id, ph: pd.profile.ph, ph0: p.ph0 || '', rh: p.rh0 || '' }; };
  const authMsg = r => r.code === 'auth' ? 'PIN মেলেনি — অন্য ডিভাইসে PIN বদলানো হয়ে থাকতে পারে। সাইন আউট করে "সদস্য তালিকা আনুন" থেকে নতুন PIN দিয়ে ঢুকুন' : (r.error || 'ব্যর্থ');
  const netAllowed = () => { if (DEV.net !== 'wifi') return true; const c = navigator.connection; return !(c && c.type && !['wifi', 'ethernet'].includes(c.type)); };

  function split(pd) {
    const data = JSON.parse(JSON.stringify(pd)), photos = {}, keep = [];
    ['notes', 'buys'].forEach(k => (data[k] || []).forEach(n => {
      n.pics = (n.pics || []).filter(p => p.img || p.imn);
      n.pics.forEach(p => {
        if (p.img) { if (!p.imn) p.imn = (k === 'buys' ? 'b_' : 'n_') + n.id + '_' + SL.hash53(p.img); photos[p.imn] = p.img; }
        if (p.imn) keep.push(p.imn); delete p.img;
      });
    }));
    if (data.profile.pic) { if (!data.profile.picn) data.profile.picn = 'p_' + data.profile.id + '_' + SL.hash53(data.profile.pic); photos[data.profile.picn] = data.profile.pic; }
    if (data.profile.picn) keep.push(data.profile.picn); delete data.profile.pic;
    return { data, photos, keep };
  }
  async function fetchPhotos(pid) {
    const pd = getD(pid); if (!pd || !DEV.url) return;
    const need = []; ['notes', 'buys'].forEach(k => (pd[k] || []).forEach(n => (n.pics || []).forEach(p => { if (p.imn && !p.img) need.push(p.imn); }))); if (pd.profile.picn && !pd.profile.pic) need.push(pd.profile.picn);
    const uniq = [...new Set(need)]; if (!uniq.length) return;
    for (let i = 0; i < uniq.length; i += 3) {
      const r = await gApi('photos', Object.assign(cred(pd), { names: uniq.slice(i, i + 3) }));
      if (!r.ok) break;
      const cur = getD(pid), m = metaOf(pid); m.sent = m.sent || {};
      for (const nm in (r.photos || {})) {
        ['notes', 'buys'].forEach(k => (cur[k] || []).forEach(n => (n.pics || []).forEach(p => { if (p.imn === nm) p.img = r.photos[nm]; })));
        if (cur.profile.picn === nm) cur.profile.pic = r.photos[nm];
        m.sent[nm] = 1;
      }
      DB.set('p:' + pid, cur);
      if (D && D.profile.id === pid) { softRender(); updHeader(); }
    }
  }
  const sig = d => JSON.stringify([d.profile.u, d.prefs, d.projects, d.notes.map(n => [n.id, n.u]), (d.buys || []).map(n => [n.id, n.u]), d.tomb]);
  function mergeRemote(pid, remote) {
    const local = getD(pid), before = sig(local);
    const merged = SL.mergeData(local, SL.fixData(remote));
    setD(pid, merged);
    if (D && D.profile.id === pid) { applyTheme(D.prefs.theme || 0); if (sig(merged) !== before) { softRender(); updHeader(); } }
  }
  let renderWait = null;
  function softRender() {
    const a = document.activeElement;
    if (a && a.closest && a.closest('#page') && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) { clearTimeout(renderWait); renderWait = setTimeout(softRender, 3000); return; }
    if ($('.ov')) { clearTimeout(renderWait); renderWait = setTimeout(softRender, 3000); return; }
    if (D) App.refresh();
  }

  async function syncProfile(pid, o = {}) {
    if (!DEV.url) return { ok: false, error: 'অ্যাপ স্ক্রিপ্ট লিংক দেওয়া নেই' };
    if (Sync.busy) { Sync.again = true; return { ok: false, busy: true }; }
    Sync.busy = true; const isCur = D && D.profile.id === pid; if (isCur) setStatus('busy');
    const m = metaOf(pid); let result = { ok: true };
    try {
      for (let tries = 0; tries < 4; tries++) {
        let pd = getD(pid), needCreate = false;
        const r = await gApi('load', Object.assign(cred(pd), { since: m.rev || '' }));
        if (r.ok && !r.same) { mergeRemote(pid, r.data); m.rev = r.rev; pd = getD(pid); result.pulled = true; }
        else if (!r.ok) {
          if (r.code === 'notfound') {
            if (o.push === false) { result = { ok: true, empty: true }; break; }
            if (m.rev) {
              if (!o.manual) throw new Error('Google ড্রাইভে এই প্রোফাইল পাওয়া যায়নি — সেটিং থেকে "এখনই সিঙ্ক" চাপুন');
              if (!(await ask('Google ড্রাইভে এই প্রোফাইলের ফোল্ডার পাওয়া যায়নি (অন্য ডিভাইস থেকে মোছা হয়ে থাকতে পারে)।\nআবার তৈরি করে ডাটা আপলোড করবেন?'))) { result = { ok: false, error: 'বাতিল' }; break; }
              m.rev = '';
            }
            needCreate = true;
          } else throw new Error(authMsg(r));
        }
        if (o.push !== false && (m.dirty || needCreate)) {
          const { data, photos, keep } = split(pd); m.sent = m.sent || {};
          const up = {}; for (const k in photos) if (!m.sent[k]) up[k] = photos[k];
          const body = Object.assign(cred(pd), { base: m.rev || '', data, photos: up, keep, sheet: window.buildSheets ? window.buildSheets(pd) : null });
          const s = await gApi('save', body);
          if (s.conflict) { mergeRemote(pid, s.data); m.rev = s.rev; continue; }
          if (!s.ok) throw new Error(s.code === 'auth' ? authMsg(s) : (s.error || 'সেভ ব্যর্থ'));
          m.rev = s.rev; m.dirty = false; m.pend = null; if (s.sheetUrl) m.sheetUrl = s.sheetUrl;
          for (const k in up) m.sent[k] = 1;
          result.pushed = true;
        }
        break;
      }
      m.last = now(); DB.set('dev', DEV);
      Sync.busy = false;
      if (isCur) setStatus();
      try { await fetchPhotos(pid); } catch (e) { /* ছবি পরে আসবে */ }
    } catch (e) {
      Sync.busy = false; result = { ok: false, error: e.message };
      if (isCur) setStatus('err', 'সিঙ্ক ব্যর্থ: ' + e.message);
    }
    Sync.busy = false;
    if (Sync.again) { Sync.again = false; schedSync(800); }
    return result;
  }
  App.syncProfile = syncProfile;
  App.sync = (o) => D ? syncProfile(D.profile.id, o) : Promise.resolve({ ok: false });
  function schedSync(ms = 3000) {
    if (!DEV || !DEV.auto || !DEV.url || !D) return;
    clearTimeout(Sync.timer); Sync.timer = setTimeout(autoSync, ms);
  }
  async function autoSync() {
    if (!D || !DEV.url || !DEV.auto) return;
    if (!navigator.onLine) { setStatus(); return; }
    if (!netAllowed()) { setStatus(); return; }
    await syncProfile(D.profile.id, {});
  }
  function startPoll() {
    clearInterval(Sync.poll);
    Sync.poll = setInterval(() => { if (D && DEV.url && DEV.auto && !document.hidden && navigator.onLine && netAllowed() && !Sync.busy) syncProfile(D.profile.id, { push: !!M().dirty }); }, 60000);
  }
  App.fetchMembers = async () => {
    const r = await gApi('members', {});
    if (!r.ok) throw new Error(r.error || 'সদস্য তালিকা আনা যায়নি');
    DEV.members = r.members || []; saveDev(); return DEV.members;
  };

  /* ===== প্রোফাইল ===== */
  function listProfiles() {
    const out = [];
    for (const k of DB.keys()) if (k.startsWith('p:')) { const d = DB.get(k); if (d && d.profile) out.push({ id: d.profile.id, name: d.profile.name, pic: d.profile.pic, salt: d.profile.salt, local: true }); }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'bn'));
  }
  function allMembers() {
    const l = listProfiles(), ids = new Set(l.map(x => x.id));
    return l.concat((DEV.members || []).filter(m => !ids.has(m.id)).map(m => Object.assign({}, m, { local: false })));
  }
  App.listProfiles = listProfiles; App.allMembers = allMembers;

  function createProfile(name, pin, legacy) {
    const { rec, profile } = SL.makeProfile(name, pin);
    const d = legacy ? SL.fromLegacy(legacy, profile) : SL.newData(profile);
    if (legacy && legacy.profile && legacy.profile.pic) { d.profile.pic = legacy.profile.pic; d.profile.picn = 'p_' + profile.id + '_' + SL.hash53(legacy.profile.pic); }
    DB.set('p:' + profile.id, SL.fixData(d)); DB.flush();
    return { id: profile.id, rec };
  }
  App.createProfile = createProfile;

  function showRecovery(code, onOk, title) {
    dlg({
      title: title || '🗝 রিকভারি কোড', w: 460, noclose: true,
      html: `<p>PIN ভুলে গেলে এই কোড দিয়ে প্রোফাইল ফিরে পাবেন। কোডটি <b>কপি করে অন্তত ৩টি নিরাপদ জায়গায়</b> রাখুন (যেমন: ফোনের নোট, স্ক্রিনশট, কাগজে লিখে)।</p><div class="rec" id="__rc">${esc(code)}</div>
      <div class="row"><button class="btn" id="__cp">📋 কপি করুন</button></div>
      <p style="margin-top:12px"><label style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="__ck"> আমি কোডটি কপি/সংরক্ষণ করেছি</label></p>`,
      onMount: a => {
        const ok = a.el.querySelector('.df .btn'); ok.disabled = true;
        $('#__ck', a.el).onchange = e => { ok.disabled = !e.target.checked; };
        $('#__cp', a.el).onclick = async () => {
          try { await navigator.clipboard.writeText(code); toast('কপি হয়েছে'); }
          catch (e) { const r = document.createRange(); r.selectNodeContents($('#__rc', a.el)); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('কোডটি সিলেক্ট হয়েছে — কপি করুন'); }
        };
      },
      buttons: [{ t: 'ঠিক আছে', cls: 'pri', fn: () => { onOk && onOk(); } }]
    });
  }
  App.showRecovery = showRecovery;

  /* ===== লগইন পেজ ===== */
  function legacyData() { try { const o = JSON.parse(localStorage.getItem('solar') || 'null'); return o && (o.loads || o.cfg) ? o : null; } catch (e) { return null; } }
  function pwField(id, ph) { return `<div class="pw"><input id="${id}" type="password" inputmode="numeric" autocomplete="off" placeholder="${ph || ''}"><button type="button" class="eye" data-eye="${id}" tabindex="-1">👁</button></div>`; }
  function bindEyes(root) { $$('[data-eye]', root).forEach(b => b.onclick = () => { const i = $('#' + b.dataset.eye, root); i.type = i.type === 'password' ? 'text' : 'password'; }); }
  App.pwField = pwField; App.bindEyes = bindEyes;

  function showLogin(o = {}) {
    D = null; sessionStorage.removeItem('sl_sess'); clearInterval(Sync.poll);
    $('#app').hidden = true; const lg = $('#login'); lg.hidden = false;
    applyTheme(DEV.theme || 0);
    const members = allMembers(), appName = (members.length && DEV.appName) || 'সোলার ক্যালকুলেশন';
    const legacy = legacyData();
    const createMode = o.create || !members.length;
    if (createMode) {
      lg.innerHTML = `<div class="lc"><h2>🔐 <span>${esc(DEV.appName || 'সোলার ক্যালকুলেশন')}</span></h2>
        <p class="note" style="text-align:center;margin:-6px 0 4px">${members.length ? 'নতুন প্রোফাইল তৈরি করুন' : 'প্রথমবার — নাম ও PIN দিয়ে প্রোফাইল তৈরি করুন'}</p>
        <label>নাম</label><input id="cn" autocomplete="off">
        <label>PIN (কমপক্ষে ৪ অক্ষর/সংখ্যা)</label>${pwField('cp1')}
        <label>PIN আবার দিন</label>${pwField('cp2')}
        ${legacy && !members.length ? '<label style="display:flex;gap:8px;align-items:center;margin-top:12px;font-weight:600"><input type="checkbox" id="cleg" checked> পুরনো ড্যাশবোর্ডের লোড/প্যারামিটার ইমপোর্ট করুন</label>' : ''}
        <button class="btn pri wide" id="cgo">প্রোফাইল তৈরি করুন</button>
        <p class="err" id="lerr"></p>
        <div class="lk">${members.length ? '<a id="lback">← লগইনে ফিরুন</a> · ' : ''}<a id="lgoogle">🔗 Google সংযোগ</a>${!members.length ? ' · <a id="lmem">🔄 সদস্য তালিকা আনুন</a>' : ''}</div></div>`;
      bindEyes(lg);
      $('#cgo').onclick = () => {
        const n = $('#cn').value.trim(), p1 = $('#cp1').value, p2 = $('#cp2').value, er = $('#lerr');
        if (!n) return er.textContent = 'নাম লিখুন';
        if (p1.trim().length < 4) return er.textContent = 'PIN কমপক্ষে ৪ অক্ষর হতে হবে';
        if (p1 !== p2) return er.textContent = 'দুই জায়গার PIN মেলেনি';
        const lg2 = legacy && $('#cleg') && $('#cleg').checked ? legacy : null;
        const { id, rec } = createProfile(n, p1.trim(), lg2);
        showRecovery(rec, () => openProfile(id));
      };
      if ($('#lback')) $('#lback').onclick = () => showLogin();
    } else {
      const sel = o.pre && members.some(m => m.id === o.pre) ? o.pre : (members.some(m => m.id === DEV.last) ? DEV.last : members[0].id);
      lg.innerHTML = `<div class="lc"><h2>🔐 <span>${esc(DEV.appName || 'সোলার ক্যালকুলেশন')}</span></h2>
        <label>প্রোফাইল</label><select id="lp">${members.map(m => `<option value="${esc(m.id)}" ${m.id === sel ? 'selected' : ''}>${m.local ? '' : '☁ '}${esc(m.name)}</option>`).join('')}</select>
        <label>PIN</label>${pwField('lpin')}
        <button class="btn pri wide" id="lgo">ঢুকুন</button><p class="err" id="lerr"></p>
        <div class="lk"><a id="lforgot">PIN ভুলে গেছেন?</a> · <a id="lnew">+ নতুন প্রোফাইল</a><br><a id="lmem">🔄 সদস্য তালিকা আনুন</a> · <a id="lgoogle">🔗 Google সংযোগ</a></div></div>`;
      bindEyes(lg);
      const go = async () => {
        const id = $('#lp').value, pin = $('#lpin').value, er = $('#lerr'); er.textContent = '';
        if (!pin) return er.textContent = 'PIN দিন';
        const mem = allMembers().find(m => m.id === id), loc = DB.get('p:' + id);
        try {
          if (loc) {
            if (SL.hashPin(pin, loc.profile.salt) !== loc.profile.ph) return er.textContent = 'PIN ভুল';
            openProfile(id);
          } else {
            $('#lgo').disabled = true; er.textContent = 'Google থেকে ডাটা আনা হচ্ছে…';
            const ph = SL.hashPin(pin, mem.salt), r = await gApi('load', { id, ph });
            if (!r.ok) { er.textContent = r.code === 'auth' ? 'PIN ভুল' : (r.error || 'ডাটা আনা যায়নি'); return; }
            const d = SL.fixData(r.data); DB.set('p:' + id, d); const m = metaOf(id); m.rev = r.rev; m.dirty = false; m.last = now(); m.sent = {}; saveDev(); DB.flush();
            openProfile(id);
          }
        } catch (e) { er.textContent = e.message; } finally { const b = $('#lgo'); if (b) b.disabled = false; }
      };
      $('#lgo').onclick = go; $('#lpin').onkeydown = e => { if (e.key === 'Enter') go(); };
      $('#lnew').onclick = () => showLogin({ create: true });
      $('#lforgot').onclick = () => forgotPin($('#lp').value);
      setTimeout(() => $('#lpin') && $('#lpin').focus(), 50);
    }
    if ($('#lgoogle')) $('#lgoogle').onclick = googleDialog;
    if ($('#lmem')) $('#lmem').onclick = async () => {
      const er = $('#lerr'); if (!DEV.url) { googleDialog(); return; }
      er.textContent = 'সদস্য তালিকা আনা হচ্ছে…';
      try { const m = await App.fetchMembers(); if (!m.length) { er.textContent = 'Google ড্রাইভে কোনো সদস্য পাওয়া যায়নি'; return; } showLogin(); } catch (e) { er.textContent = e.message; }
    };
  }
  App.showLogin = showLogin;

  function googleDialog() {
    dlg({
      title: '🔗 Google সংযোগ', w: 480,
      html: `<label>Google Apps Script ওয়েব অ্যাপ লিংক</label><input id="__gu" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(DEV.url)}">
        <label style="margin-top:10px">ড্রাইভ ফোল্ডারের নাম</label><input id="__gf" class="big" value="${esc(DEV.folder)}">
        <p class="note">PC-তে যে লিংক ও ফোল্ডারের নাম দিয়েছিলেন হুবহু সেটিই দিন। সংরক্ষণের পর "সদস্য তালিকা আনুন" চাপুন।</p><p class="err" id="__ge"></p>`,
      buttons: [
        { t: 'সংরক্ষণ', cls: 'pri', fn: async () => {
          const u = $('#__gu').value.trim(), f = $('#__gf').value.trim() || 'Solar_Dashboard', er = $('#__ge');
          if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/.test(u)) { er.textContent = 'লিংকটি https://script.google.com/macros/s/…/exec ধরনের হতে হবে'; return false; }
          DEV.url = u; DEV.folder = f; saveDev(); toast('সংরক্ষিত হয়েছে'); showLogin(); } },
        { t: 'টেস্ট', close: false, fn: async () => {
          const er = $('#__ge'); DEV.url = $('#__gu').value.trim(); er.style.color = ''; er.textContent = 'পরীক্ষা চলছে…';
          try { const r = await gApi('ping', {}); er.style.color = r.ok ? 'var(--ok)' : ''; er.textContent = r.ok ? '✓ সংযোগ ঠিক আছে' : (r.error || 'ব্যর্থ'); } catch (e) { er.textContent = e.message; } } },
        { t: 'বন্ধ' }
      ]
    });
  }
  App.googleDialog = googleDialog;

  function forgotPin(pre) {
    const ms = allMembers();
    dlg({
      title: '🗝 PIN ভুলে গেছেন?', w: 460,
      html: `<label>প্রোফাইল</label><select id="__fp">${ms.map(m => `<option value="${esc(m.id)}" ${m.id === pre ? 'selected' : ''}>${m.local ? '' : '☁ '}${esc(m.name)}</option>`).join('')}</select>
        <label style="margin-top:10px">রিকভারি কোড</label><input id="__fr" placeholder="XXXX-XXXX-XXXX" autocomplete="off" style="text-transform:uppercase">
        <label style="margin-top:10px">নতুন PIN</label>${pwField('__f1')}<label style="margin-top:10px">নতুন PIN আবার</label>${pwField('__f2')}<p class="err" id="__fe"></p>`,
      onMount: a => bindEyes(a.el),
      buttons: [{ t: 'PIN রিসেট', cls: 'pri', fn: async a => {
        const er = $('#__fe', a.el), id = $('#__fp', a.el).value, code = $('#__fr', a.el).value, p1 = $('#__f1', a.el).value, p2 = $('#__f2', a.el).value;
        if (!SL.normRec(code)) { er.textContent = 'রিকভারি কোড দিন'; return false; }
        if (p1.trim().length < 4) { er.textContent = 'নতুন PIN কমপক্ষে ৪ অক্ষর'; return false; }
        if (p1 !== p2) { er.textContent = 'নতুন PIN দুটি মেলেনি'; return false; }
        const mem = ms.find(m => m.id === id); let d = DB.get('p:' + id);
        try {
          const salt = d ? d.profile.salt : mem.salt, rh = SL.hashRec(code, salt);
          if (d) { if (rh !== d.profile.rh) { er.textContent = 'রিকভারি কোড ভুল'; return false; } }
          else {
            er.textContent = 'Google থেকে যাচাই হচ্ছে…'; const r = await gApi('load', { id, rh });
            if (!r.ok) { er.textContent = r.code === 'auth' ? 'রিকভারি কোড ভুল' : (r.error || 'ব্যর্থ'); return false; }
            d = SL.fixData(r.data); const m = metaOf(id); m.rev = r.rev; m.dirty = false; m.sent = {};
          }
          const np = SL.makeProfile(d.profile.name, p1.trim()), m = metaOf(id);
          m.pend = { ph0: d.profile.ph, rh0: d.profile.rh };
          // একই salt ব্যবহার না করে নতুন salt/hash বসানো হচ্ছে
          d.profile.salt = np.profile.salt; d.profile.ph = np.profile.ph; d.profile.rh = np.profile.rh; d.profile.u = now();
          DB.set('p:' + id, d); m.dirty = true; saveDev(); DB.flush();
          a.close();
          showRecovery(np.rec, () => { toast('PIN রিসেট হয়েছে'); if (DEV.url) syncProfile(id, { manual: true }); showLogin({ pre: id }); }, '🗝 নতুন রিকভারি কোড');
          return false;
        } catch (e) { er.textContent = e.message; return false; }
      } }, { t: 'বাতিল' }]
    });
  }
  App.forgotPin = forgotPin;

  function openProfile(id) {
    const d = DB.get('p:' + id); if (!d) return showLogin();
    D = SL.fixData(d); DB.set('p:' + id, D);
    DEV.last = id; DEV.appName = D.prefs.app.name; saveDev();
    sessionStorage.setItem('sl_sess', id);
    applyTheme(D.prefs.theme || 0);
    $('#login').hidden = true; $('#app').hidden = false;
    applyApp(); applyShell(); buildNav(); updHeader();
    const k = (location.hash || '').slice(1); go(PAGE[k] ? k : 'dash', { replace: true });
    setStatus(); startPoll();
    if (DEV.url && DEV.auto && navigator.onLine && netAllowed()) syncProfile(id, { push: !!M().dirty });
  }
  App.openProfile = openProfile;
  function logout() { DB.flush(); const id = D && D.profile.id; D = null; showLogin({ pre: id }); }
  App.logout = logout;

  function applyApp() {
    const a = D.prefs.app; document.title = a.name; $('#ttl').textContent = a.name;
    $('#sbt').textContent = '📊 নেভিগেশন';
    if (App.applyIcons) App.applyIcons();
  }
  App.applyApp = applyApp;
  (function () {
    const h = document.getElementById('ttl'); if (!h) return; h.title = 'ক্লিক করে অ্যাপের নাম বদলান';
    const done = ok => {
      h.removeAttribute('contenteditable'); const v = h.textContent.trim();
      if (ok && D && v && v !== D.prefs.app.name) { D.prefs.app.name = v; D.prefs.u = Date.now(); save(); }
      if (D) applyApp();
    };
    h.addEventListener('click', () => { if (!D || h.isContentEditable) return; h.setAttribute('contenteditable', 'plaintext-only'); h.focus(); const r = document.createRange(); r.selectNodeContents(h); const s = getSelection(); s.removeAllRanges(); s.addRange(r); });
    h.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); h.blur(); } else if (e.key === 'Escape') { h.textContent = D.prefs.app.name; h.blur(); } });
    h.addEventListener('blur', () => { if (h.isContentEditable) done(true); });
  })();

  function updHeader() {
    if (!D) return;
    const ms = allMembers(), sel = $('#hsel');
    sel.innerHTML = ms.map(m => `<option value="${esc(m.id)}" ${m.id === D.profile.id ? 'selected' : ''}>${m.local ? '' : '☁ '}${esc(m.name)}</option>`).join('');
    fitSel();
    const img = $('#avi'), av = $('#av');
    if (D.profile.pic) { img.src = D.profile.pic; img.style.display = ''; av.firstChild.style.display = ''; [...av.childNodes].forEach(n => { if (n.nodeType === 3) n.remove(); }); }
    else { img.removeAttribute('src'); img.style.display = 'none'; if (![...av.childNodes].some(n => n.nodeType === 3)) av.insertBefore(document.createTextNode('👤'), av.firstChild); }
  }
  function fitSel() {
    const s = $('#hsel'); if (!s || !s.options.length) return; const o = s.options[s.selectedIndex]; if (!o) return;
    const t = document.createElement('span'), cs = getComputedStyle(s);
    t.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:-9999px;font-family:' + cs.fontFamily + ';font-size:' + cs.fontSize + ';font-weight:700';
    t.textContent = o.textContent; document.body.appendChild(t); const w = t.getBoundingClientRect().width; t.remove();
    s.style.width = Math.ceil(w + 58) + 'px';
  }
  App.updHeader = updHeader;

  /* ===== সাইডবার ও রাউটার ===== */
  const isMob = () => matchMedia('(max-width:820px)').matches;
  function applyShell() {
    document.documentElement.style.setProperty('--sbw', (DEV.sbw || 250) + 'px');
    $('#app').classList.toggle('hid', !!DEV.sbhid); $('#app').classList.remove('mopen');
  }
  function buildNav() {
    $('#nav').innerHTML = META.map(m => `<button data-k="${m[0]}">${m[1]} ${esc(lbl(m[0]))}</button>`).join('');
  }
  App.buildNav = buildNav;
  function toggleSb(force) {
    if (isMob()) { $('#app').classList.toggle('mopen', force); }
    else { DEV.sbhid = force === undefined ? !DEV.sbhid : !force; $('#app').classList.toggle('hid', DEV.sbhid); saveDev(); }
  }
  function go(k, o = {}) {
    if (!D) return; if (!PAGE[k]) k = 'dash'; CUR = k;
    $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    if (!o.nopush && !o.replace) history.pushState({ k }, '', '#' + k); else if (o.replace) history.replaceState({ k }, '', '#' + k);
    const root = $('#page'), sc = o.keep ? root.scrollTop : 0;
    root.innerHTML = '';
    try { PAGE[k](root); } catch (e) { console.error(e); root.innerHTML = `<div class="card"><h3>⚠ ত্রুটি</h3><p>${esc(e.message)}</p></div>`; }
    root.scrollTop = sc; if (isMob()) $('#app').classList.remove('mopen');
  }
  App.go = go; App.cur = () => CUR;
  App.refresh = () => { if (D) go(CUR, { nopush: true, keep: true }); };

  function bindShell() {
    $('#nav').onclick = e => { const b = e.target.closest('button[data-k]'); if (b) go(b.dataset.k); };
    $('#sbhide').onclick = () => toggleSb(false);
    $('#mb').onclick = () => toggleSb(isMob() ? !$('#app').classList.contains('mopen') : undefined);
    $('#bd').onclick = () => $('#app').classList.remove('mopen');
    window.addEventListener('popstate', () => { if (D) go((location.hash || '#dash').slice(1), { nopush: true }); });
    // সাইডবার চওড়া/সরু
    const rs = $('#sbr');
    rs.addEventListener('pointerdown', e => {
      e.preventDefault(); rs.setPointerCapture(e.pointerId); rs.classList.add('drag'); document.body.classList.add('noanim');
      const left = $('#sb').getBoundingClientRect().left;
      const mv = ev => { const w = Math.round(Math.min(480, Math.max(150, ev.clientX - left))); document.documentElement.style.setProperty('--sbw', w + 'px'); DEV.sbw = w; };
      const up = () => { rs.removeEventListener('pointermove', mv); rs.removeEventListener('pointerup', up); rs.removeEventListener('pointercancel', up); rs.classList.remove('drag'); document.body.classList.remove('noanim'); saveDev(); };
      rs.addEventListener('pointermove', mv); rs.addEventListener('pointerup', up); rs.addEventListener('pointercancel', up);
    });
    rs.addEventListener('dblclick', () => { DEV.sbw = 250; document.documentElement.style.setProperty('--sbw', '250px'); saveDev(); });
    // প্রোফাইল ড্রপডাউন ও ছবি
    $('#hsel').onchange = e => { const v = e.target.value; if (D && v !== D.profile.id) { flushNow(); showLogin({ pre: v }); } };
    $('#av').onclick = () => $('#avf').click();
    $('#avf').onchange = async e => {
      const f = e.target.files[0]; e.target.value = ''; if (!f || !D) return;
      try { const d = await squarePic(f); D.profile.pic = d; D.profile.picn = 'p_' + D.profile.id + '_' + SL.hash53(d); D.profile.u = now(); save(); updHeader(); if (CUR === 'settings') App.refresh(); } catch (er) { toast(er.message); }
    };
    $('#sync').onclick = () => { if (D && DEV.url) { toast('সিঙ্ক শুরু হচ্ছে…'); syncProfile(D.profile.id, { manual: true }); } else if (D) go('settings'); };
    window.addEventListener('online', () => { setStatus(); schedSync(1200); });
    window.addEventListener('offline', () => setStatus());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) flushNow();
      else if (D && DEV.url && DEV.auto && navigator.onLine && netAllowed() && !Sync.busy) syncProfile(D.profile.id, { push: !!M().dirty });
    });
    window.addEventListener('pagehide', flushNow);
    window.addEventListener('beforeunload', e => { if (D && DEV.url && M().dirty && navigator.onLine) { flushNow(); } });
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); App.installEvt = e; if (CUR === 'settings') App.refresh(); });
  }
  function flushNow() { if (D) DB.set('p:' + D.profile.id, D); DB.set('dev', DEV); DB.flush(); }
  App.flushNow = flushNow;

  /* ===== পুরো ডাটা বদলানো (রিস্টোর) ===== */
  App.replaceData = nd => {
    const old = D, t = now(); nd = SL.fixData(nd);
    const ids = x => { const s = new Set(); x.projects.forEach(p => { s.add(p.id); p.loads.forEach(l => s.add(l.id)); }); x.notes.forEach(n => s.add(n.id)); (x.buys || []).forEach(n => s.add(n.id)); return s; };
    const keep = ids(nd), tomb = Object.assign({}, old.tomb);
    ids(old).forEach(i => { if (!keep.has(i)) tomb[i] = t; });
    nd.projects.forEach(p => { p.u = t; p.loads.forEach(l => { l.u = t; }); }); nd.notes.forEach(n => { n.u = t; }); (nd.buys || []).forEach(n => { n.u = t; });
    nd.profile = old.profile; nd.prefs.u = t; nd.tomb = tomb;
    D = nd; M().proj = nd.projects[0].id; save(); applyTheme(D.prefs.theme || 0); applyApp(); buildNav(); updHeader(); go(CUR, { nopush: true });
  };

  /* ===== চালু ===== */
  App.boot = async function () {
    await DB.init();
    DEV = Object.assign({ url: '', folder: 'Solar_Dashboard', auto: true, net: 'any', sbw: 250, sbhid: false, theme: 0, members: [], meta: {}, last: '', appName: '', nc: { iw: 58, cw: 220 } }, DB.get('dev') || {});
    DEV.meta = DEV.meta || {}; DEV.nc = Object.assign({ iw: 58, cw: 220 }, DEV.nc || {});
    DB.set('dev', DEV);
    bindShell();
    if (isMob()) DEV.sbhid = false;
    if ('serviceWorker' in navigator && /^https:|^http:\/\/localhost/.test(location.href)) navigator.serviceWorker.register('sw.js').catch(() => { });
    const sess = sessionStorage.getItem('sl_sess');
    if (sess && DB.get('p:' + sess)) openProfile(sess); else showLogin();
  };
})();
