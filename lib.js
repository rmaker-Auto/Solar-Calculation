/* lib.js — বিশুদ্ধ লজিক (ব্রাউজার ও Node দুই জায়গাতেই চলে): হ্যাশ, মার্জ, ক্যালকুলেশন, তারিখ */
(function (G) {
  'use strict';
  const L = {};
  const now = () => Date.now();
  L.now = now;
  L.num = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
  L.uid = () => now().toString(36) + Math.random().toString(36).slice(2, 7);
  L.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  L.f = (v, d = 2) => { v = +v; if (!isFinite(v)) return v > 0 ? '∞' : '—'; return v.toLocaleString('bn-BD', { maximumFractionDigits: d }); };
  L.clone = o => JSON.parse(JSON.stringify(o));
  L.hash53 = (str, seed = 0) => { // cyrb53
    let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
    for (let i = 0, ch; i < str.length; i++) { ch = str.charCodeAt(i); h1 = Math.imul(h1 ^ ch, 2654435761); h2 = Math.imul(h2 ^ ch, 1597334677); }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  };

  /* ---------- SHA-256 (সব ডিভাইসে একই ফল দেওয়ার জন্য নিজস্ব বাস্তবায়ন) ---------- */
  const PR = []; for (let n = 2; PR.length < 64; n++) { if (PR.every(p => n % p)) PR.push(n); }
  const K = PR.map(p => Math.floor((Math.cbrt(p) % 1) * 4294967296));
  const H0 = PR.slice(0, 8).map(p => Math.floor((Math.sqrt(p) % 1) * 4294967296));
  L.sha256 = function (str) {
    const bytes = new TextEncoder().encode(str), len = bytes.length;
    const n = ((len + 9 + 63) >> 6) << 6, m = new Uint8Array(n);
    m.set(bytes); m[len] = 0x80;
    const dv = new DataView(m.buffer);
    dv.setUint32(n - 8, Math.floor(len * 8 / 4294967296)); dv.setUint32(n - 4, (len * 8) >>> 0);
    const h = H0.slice(), w = new Uint32Array(64);
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = w[i - 15], c = w[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((c >>> 17) | (c << 15)) ^ ((c >>> 19) | (c << 13)) ^ (c >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) >>> 0;
        hh = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      h[0] = (h[0] + a) >>> 0; h[1] = (h[1] + b) >>> 0; h[2] = (h[2] + c) >>> 0; h[3] = (h[3] + d) >>> 0;
      h[4] = (h[4] + e) >>> 0; h[5] = (h[5] + f) >>> 0; h[6] = (h[6] + g) >>> 0; h[7] = (h[7] + hh) >>> 0;
    }
    return h.map(x => x.toString(16).padStart(8, '0')).join('');
  };
  const rnd = n => { const a = new Uint8Array(n); (G.crypto || {}).getRandomValues ? G.crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.floor(Math.random() * 256)); return a; };
  L.genSalt = () => [...rnd(12)].map(x => x.toString(16).padStart(2, '0')).join('');
  L.hashPin = (pin, salt) => { let h = L.sha256(salt + ':' + String(pin).trim()); for (let i = 0; i < 1500; i++) h = L.sha256(h + salt); return h; };
  L.normRec = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  L.hashRec = (code, salt) => L.hashPin('R:' + L.normRec(code), salt);
  L.genRecovery = () => {
    const al = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', r = rnd(12); let s = '';
    r.forEach((x, i) => { s += al[x % al.length]; if (i % 4 === 3 && i < 11) s += '-'; });
    return s;
  };
  L.makeProfile = (name, pin) => {
    const salt = L.genSalt(), rec = L.genRecovery();
    return { rec, profile: { id: L.uid(), name: String(name).trim(), pic: '', picn: '', salt, ph: L.hashPin(pin, salt), rh: L.hashRec(rec, salt), u: now() } };
  };

  /* ---------- রং মিশ্রণ (থিমের জন্য) ---------- */
  L.mix = (c1, c2, t) => {
    const p = c => { c = c.replace('#', ''); if (c.length === 3) c = c.split('').map(x => x + x).join(''); return [0, 2, 4].map(i => parseInt(c.substr(i, 2), 16)); };
    const a = p(c1), b = p(c2);
    return '#' + a.map((x, i) => Math.round(x + (b[i] - x) * t).toString(16).padStart(2, '0')).join('');
  };
  // [প্রধান রং, সাইডবার রং, নাম]
  L.THEMES = [
    ['#0f5ea8', '#0d2438', 'নেভি নীল'], ['#2f8fe8', '#16202c', 'আকাশি'], ['#8a6a3b', '#2b2622', 'বাদামি'],
    ['#e69a1a', '#0c1d33', 'সোনালি'], ['#0a8fb8', '#083a4d', 'সায়ান'], ['#8a4fff', '#1f1b3a', 'রংধনু'],
    ['#c2306b', '#4a1a33', 'গোলাপি'], ['#2a8f46', '#0f3a1c', 'সবুজ'], ['#e8650a', '#3d1c0a', 'কমলা'], ['#6c47d8', '#251a52', 'বেগুনি']
  ];

  /* ---------- তারিখ ---------- */
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const BMON = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
  L.BMON = BMON;
  L.bn = s => String(s).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  L.DATEFMTS = [['dMY', 'দিন মাস-নাম বছর'], ['dmy', 'দিন/মাস/বছর'], ['mdy', 'মাস/দিন/বছর'], ['ymd', 'বছর-মাস-দিন'], ['dmyd', 'দিন-মাস-বছর'], ['bn', 'বাংলা (২০ অক্টোবর ২০২৬)']];
  L.parseD = v => {
    if (v instanceof Date) return v;
    if (typeof v === 'number') return new Date(v);
    const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(v || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  };
  L.fmtDate = (v, fmt) => {
    const d = L.parseD(v); if (!d || isNaN(d)) return '';
    const D = d.getDate(), M = d.getMonth(), Y = d.getFullYear(), p = n => String(n).padStart(2, '0');
    switch (fmt) {
      case 'dmy': return `${p(D)}/${p(M + 1)}/${Y}`;
      case 'mdy': return `${p(M + 1)}/${p(D)}/${Y}`;
      case 'ymd': return `${Y}-${p(M + 1)}-${p(D)}`;
      case 'dmyd': return `${p(D)}-${p(M + 1)}-${Y}`;
      case 'bn': return L.bn(D) + ' ' + BMON[M] + ' ' + L.bn(Y);
      default: return `${D} ${MON[M]} ${Y}`;
    }
  };
  L.ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  L.fmtHM = h => {
    if (!isFinite(h)) return 'সীমাহীন';
    const m = Math.round(h * 60), hh = Math.floor(m / 60), mm = m % 60;
    return (hh ? L.bn(hh) + ' ঘণ্টা ' : '') + (mm || !hh ? L.bn(mm) + ' মিনিট' : '');
  };

  /* ---------- ডাটা মডেল ---------- */
  L.SUN0 = [4.5, 5.2, 5.7, 5.9, 5.4, 4.4, 4.2, 4.4, 4.3, 4.5, 4.4, 4.2];
  L.DIM = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  L.defCfg = () => ({
    V: 24, sun: 5, loss: 25, eff: 90, dod: 50, days: 1, safe: 25, pf: 0.8, pw: 550, bw: 12, bah: 100, price: 8, cur: '৳', dayfrac: 50,
    pvIsc: 14, pvVoc: 50, pvVmp: 42, ps: 2, ccVmax: 150, lenPV: 10, lenArr: 5, lenCC: 2, lenBat: 2, lenAC: 10,
    dropPV: 3, dropArr: 2, dropBat: 1.5, dropAC: 3, acV: 220, rho: 0.0217, derate: 0.9
  });
  L.defCost = () => ({ pw: 35, bat: 15000, inv: 12, ctrl: 250, oth: 10000, lab: 8, maint: 2000, deg: 0.6, esc: 0, bRep: 0 });
  L.defBk = () => ({ n: 0, type: 'acid', bv: 0, bah: 0, soc: 100, min: '', fac: 100, solar: 0, out: 2, times: 2, off: {} });
  // ব্যাটারির ধরন: ব্যবহারযোগ্য গভীরতা (DoD %), কার্যদক্ষতা (%), Peukert ধ্রুবক
  L.BTYPES = {
    acid: { name: 'সাধারণ লেড-অ্যাসিড ব্যাটারি', dod: 50, eff: 82, k: 1.3, cmax: 0.15 },
    tub: { name: 'টিউবুলার ব্যাটারি', dod: 60, eff: 85, k: 1.2, cmax: 0.15 },
    tall: { name: 'টল টিউবুলার ব্যাটারি', dod: 70, eff: 88, k: 1.15, cmax: 0.2 },
    lfp: { name: 'লিথিয়াম ফসফেট (LiFePO₄)', dod: 90, eff: 97, k: 1.05, cmax: 0.5 },
    li: { name: 'লিথিয়াম আয়ন (Li-ion / NMC)', dod: 80, eff: 95, k: 1.08, cmax: 0.5 }
  };
  L.defApp = () => ({ name: 'সোলার ক্যালকুলেশন', short: 'সোলার', emoji: '☀️', color: '#f2a900', img: '' });
  L.newProject = name => ({ id: L.uid(), name: name || 'প্রজেক্ট ১', u: now(), cfg: L.defCfg(), loads: [], sunM: L.SUN0.slice(), cost: L.defCost(), bk: L.defBk() });
  L.fixProject = p => {
    p.id = p.id || L.uid(); p.name = p.name || 'প্রজেক্ট'; p.u = p.u || 0;
    p.cfg = Object.assign(L.defCfg(), p.cfg || {});
    p.cost = Object.assign(L.defCost(), p.cost || {});
    p.bk = Object.assign(L.defBk(), p.bk || {}); p.bk.off = p.bk.off || {};
    if (!Array.isArray(p.sunM) || p.sunM.length !== 12) p.sunM = L.SUN0.slice();
    p.loads = (p.loads || []).filter(Boolean).map(l => { l.id = l.id || L.uid(); l.t = l.t || 'b'; l.u = l.u || 0; return l; });
    return p;
  };
  L.newData = profile => ({
    v: 2, profile, prefs: { u: 0, theme: 0, labels: {}, dateFmt: 'dMY', app: L.defApp() },
    projects: [L.newProject()], notes: [], buys: [], tomb: {}
  });
  L.fixPics = n => {
    n.id = n.id || L.uid(); n.u = n.u || 0;
    if (!Array.isArray(n.pics)) n.pics = [];
    if (n.imn || n.img) { if (!n.pics.length) n.pics.push({ imn: n.imn || '', img: n.img || '' }); delete n.imn; delete n.img; }
    n.pics = n.pics.filter(p => p && (p.imn || p.img));
    return n;
  };
  L.fixData = d => {
    d.v = 2; d.tomb = d.tomb || {};
    d.prefs = Object.assign({ u: 0, theme: 0, labels: {}, dateFmt: 'dMY' }, d.prefs || {});
    d.prefs.labels = d.prefs.labels || {}; d.prefs.app = Object.assign(L.defApp(), d.prefs.app || {});
    d.projects = (d.projects || []).filter(Boolean).map(L.fixProject);
    if (!d.projects.length) d.projects.push(L.newProject());
    d.notes = (d.notes || []).filter(Boolean).map(L.fixPics);
    d.buys = (d.buys || []).filter(Boolean).map(L.fixPics);
    return d;
  };
  L.fromLegacy = (old, profile) => {
    const d = L.newData(profile), p = d.projects[0];
    p.cfg = Object.assign(L.defCfg(), old.cfg || {});
    p.loads = (old.loads || []).map(l => ({ id: L.uid(), n: l.n || '', w: l.w, q: l.q, h: l.h, s: l.s, t: 'b', u: now() }));
    return d;
  };
  L.isNewFmt = o => o && o.v === 2 && Array.isArray(o.projects);
  L.isLegacy = o => o && !L.isNewFmt(o) && (Array.isArray(o.loads) || o.cfg);

  /* ---------- মার্জ (দুই ডিভাইসের ডাটা একত্র) ---------- */
  L.mergeList = (a, b, tomb, fix) => {
    const m = new Map();
    for (const r of (a || []).concat(b || [])) {
      if (!r || !r.id) continue;
      const o = m.get(r.id);
      if (!o) m.set(r.id, r);
      else { const w = (r.u || 0) > (o.u || 0) ? r : o, l = w === r ? o : r; if (fix) fix(w, l); m.set(r.id, w); }
    }
    tomb = tomb || {};
    return [...m.values()].filter(r => !(tomb[r.id] >= (r.u || 0)));
  };
  const imgFix = (w, l) => { (w.pics || []).forEach(p => { if (!p.img && p.imn) { const q = (l.pics || []).find(x => x.imn === p.imn && x.img); if (q) p.img = q.img; } }); };
  L.mergeData = (a, b) => {
    const tomb = {};
    for (const t of [a.tomb, b.tomb]) for (const k in (t || {})) tomb[k] = Math.max(tomb[k] || 0, t[k]);
    const lim = now() - 90 * 864e5; for (const k in tomb) if (tomb[k] < lim) delete tomb[k];
    const newer = (x, y) => ((y.u || 0) > (x.u || 0) ? y : x);
    const pw = newer(a.profile, b.profile), pl = pw === a.profile ? b.profile : a.profile;
    const profile = Object.assign({}, pw);
    if (!profile.pic && pl.pic && pl.picn === profile.picn) profile.pic = pl.pic;
    const prefs = Object.assign({}, newer(a.prefs, b.prefs));
    const by = new Map();
    for (const src of [a.projects, b.projects]) for (const p of (src || [])) {
      const o = by.get(p.id);
      if (!o) by.set(p.id, { best: p, ls: [p.loads] });
      else { o.ls.push(p.loads); if ((p.u || 0) > (o.best.u || 0)) o.best = p; }
    }
    let projects = [...by.values()].filter(o => !(tomb[o.best.id] >= (o.best.u || 0))).map(o => {
      const p = Object.assign({}, o.best); p.loads = L.mergeList(o.ls[0], o.ls[1], tomb); return p;
    });
    const notes = L.mergeList(a.notes, b.notes, tomb, imgFix), buys = L.mergeList(a.buys, b.buys, tomb, imgFix);
    const out = { v: 2, profile, prefs, projects, notes, buys, tomb };
    return L.fixData(out);
  };

  /* ---------- ক্যালকুলেশন (মূল ড্যাশবোর্ডের সূত্র অপরিবর্তিত) ---------- */
  L.viewK = (t, view, frPct) => {
    t = t || 'b'; const fr = L.num(frPct) / 100;
    if (view === 'day') return t === 'd' ? 1 : t === 'b' ? fr : 0;
    if (view === 'night') return t === 'n' ? 1 : t === 'b' ? 1 - fr : 0;
    return 1;
  };
  L.calc = (P, view) => {
    const c = P.cfg, n = L.num; view = view || 'all';
    const Ls = P.loads.map(l => {
      const k = L.viewK(l.t, view, c.dayfrac), inc = k > 0;
      const W0 = n(l.w) * n(l.q), Wh0 = W0 * n(l.h);
      const w = inc ? W0 : 0, wh = inc ? w * n(l.h) * (view === 'all' ? 1 : k) : 0;
      return Object.assign({}, l, { k, inc, W0, Wh0, W: w, Wh: wh, A: c.V ? w / c.V : 0, kwm: wh * 30 / 1000, cost: wh * 30 / 1000 * c.price });
    });
    const W = Ls.reduce((a, l) => a + l.W, 0), Wh = Ls.reduce((a, l) => a + l.Wh, 0), kwm = Wh * 30 / 1000;
    const surge = Ls.reduce((m, l) => Math.max(m, W + l.W * (Math.max(1, n(l.s)) - 1)), W);
    const invW = Math.max(W * (1 + c.safe / 100), surge), invVA = invW / (c.pf || 1), eff = c.eff / 100 || 1;
    const whB = Wh / eff, pvW = whB / (c.sun || 1) / Math.max(1 - c.loss / 100, 0.01), np = Math.ceil(pvW / (c.pw || 1)), pvT = np * c.pw;
    const bWh = whB * c.days / (c.dod / 100 || 1), bAh = bWh / (c.V || 1), ser = Math.ceil(c.V / (c.bw || 1)), par = Math.ceil(bAh / (c.bah || 1));
    return {
      L: Ls, W, Wh, kwm, invW, invVA, invA: W / (c.V * eff || 1), pvW, np, pvT, ctrl: pvT / (c.V || 1) * 1.25,
      bAh, bWh, ser, par, nb: ser * par, month: kwm * c.price, day: Wh / 1000 * c.price, whB
    };
  };

  /* ক্যাবল ও ফিউজ/ব্রেকার */
  L.CABLES = [[1.5, 14], [2.5, 19], [4, 26], [6, 34], [10, 46], [16, 61], [25, 80], [35, 99], [50, 119], [70, 151], [95, 182], [120, 210], [150, 240], [185, 273], [240, 321]];
  L.BREAKERS = [1, 2, 3, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 150, 160, 200, 250, 300, 350, 400, 500, 630];
  L.nextBreaker = I => L.BREAKERS.find(b => b >= I - 1e-9) || Math.ceil(I / 100) * 100;
  // I: লোড কারেন্ট (ভোল্টেজ ড্রপের জন্য), Iamp: ন্যূনতম প্রয়োজনীয় ক্ষমতা, len: একমুখী দৈর্ঘ্য (মি), V: অপারেটিং ভোল্ট, dropPct: অনুমোদিত ড্রপ %
  L.sizeCircuit = (o, c) => {
    const dV = Math.max(o.V * o.dropPct / 100, 1e-6);
    const Adrop = 2 * c.rho * o.len * o.I / dV;
    const brk = L.nextBreaker(o.Iamp);
    let pick = L.CABLES.find(([a, amp]) => a >= Adrop && amp * c.derate >= brk) || L.CABLES[L.CABLES.length - 1];
    const real = o.V ? 2 * c.rho * o.len * o.I / pick[0] / o.V * 100 : 0;
    return { I: o.I, Iamp: o.Iamp, Adrop, breaker: brk, size: pick[0], amp: pick[1] * c.derate, drop: real, ok: pick[0] >= Adrop && pick[1] * c.derate >= brk };
  };
  L.cables = (P, R) => {
    const c = P.cfg, n = L.num, out = [];
    const ps = Math.max(1, Math.round(n(c.ps))), npar = Math.max(1, Math.ceil(R.np / ps));
    const Vop = ps * n(c.pvVmp), Isc = n(c.pvIsc);
    out.push(Object.assign({ key: 'pvs', name: 'প্যানেল স্ট্রিং ক্যাবল (প্যানেল → কম্বাইনার/কন্ট্রোলার)', kind: 'DC', V: Vop }, L.sizeCircuit({ I: Isc, Iamp: Isc * 1.56, len: n(c.lenPV), V: Vop, dropPct: n(c.dropPV) }, c)));
    out.push(Object.assign({ key: 'pva', name: 'প্যানেল অ্যারে মেইন ক্যাবল (অ্যারে → চার্জ কন্ট্রোলার)', kind: 'DC', V: Vop }, L.sizeCircuit({ I: Isc * npar, Iamp: Isc * npar * 1.56, len: n(c.lenArr), V: Vop, dropPct: n(c.dropArr) }, c)));
    const Icc = R.pvT / (c.V || 1);
    out.push(Object.assign({ key: 'cc', name: 'চার্জ কন্ট্রোলার → ব্যাটারি', kind: 'DC', V: c.V }, L.sizeCircuit({ I: Icc, Iamp: Icc * 1.25, len: n(c.lenCC), V: c.V, dropPct: n(c.dropBat) }, c)));
    const Iinv = R.invW / ((c.V || 1) * (c.eff / 100 || 1));
    out.push(Object.assign({ key: 'bat', name: 'ব্যাটারি → ইনভার্টার', kind: 'DC', V: c.V }, L.sizeCircuit({ I: Iinv, Iamp: Iinv * 1.25, len: n(c.lenBat), V: c.V, dropPct: n(c.dropBat) }, c)));
    const Iac = R.invVA / (c.acV || 220);
    out.push(Object.assign({ key: 'ac', name: 'ইনভার্টার আউটপুট (AC, ১ ফেজ)', kind: 'AC', V: c.acV }, L.sizeCircuit({ I: Iac, Iamp: Iac * 1.25, len: n(c.lenAC), V: c.acV, dropPct: n(c.dropAC) }, c)));
    const vocArr = ps * n(c.pvVoc) * 1.12;
    return { rows: out, ps, npar, vocArr, vocOk: !c.ccVmax || vocArr <= c.ccVmax };
  };

  /* মাসওয়ারি সূর্যালোক */
  L.sunTable = (P, R) => {
    const c = P.cfg, rows = []; let gen = 0, use = 0, saved = 0;
    for (let m = 0; m < 12; m++) {
      const sun = L.num(P.sunM[m]), dim = L.DIM[m];
      const g = R.pvT * sun * (1 - c.loss / 100) * dim / 1000, u = R.Wh / 1000 * dim, cov = u ? Math.min(g, u) / u * 100 : 0;
      const sv = Math.min(g, u) * c.price;
      const need = sun ? Math.ceil(R.whB / sun / Math.max(1 - c.loss / 100, 0.01) / (c.pw || 1)) : Infinity;
      rows.push({ m, sun, dim, gen: g, use: u, cov, saved: sv, need });
      gen += g; use += u; saved += sv;
    }
    const sunMin = Math.min(...P.sunM.map(L.num)), sunAvg = P.sunM.reduce((a, b) => a + L.num(b), 0) / 12;
    return { rows, gen, use, saved, cov: use ? Math.min(gen, use) / use * 100 : 0, sunMin, sunAvg };
  };
  L.payback = (P, R, T) => {
    const k = P.cost, c = P.cfg, n = L.num;
    const items = [
      ['সোলার প্যানেল', R.pvT * n(k.pw)], ['ব্যাটারি', R.nb * n(k.bat)], ['ইনভার্টার', R.invVA * n(k.inv)],
      ['চার্জ কন্ট্রোলার', R.ctrl * n(k.ctrl)], ['ক্যাবল/ফিউজ/অন্যান্য', n(k.oth)]
    ];
    const sub = items.reduce((a, b) => a + b[1], 0), lab = sub * n(k.lab) / 100, total = sub + lab;
    items.push(['ইনস্টলেশন/শ্রমিক', lab]);
    const years = []; let cum = -total, pb = null, prev = cum;
    for (let y = 1; y <= 25; y++) {
      const fac = Math.pow(1 - n(k.deg) / 100, y - 1), esc = Math.pow(1 + n(k.esc) / 100, y - 1);
      let sv = 0; for (const r of T.rows) sv += Math.min(r.gen * fac, r.use) * c.price * esc;
      let net = sv - n(k.maint);
      if (n(k.bRep) > 0 && y % n(k.bRep) === 0 && y < 25) net -= R.nb * n(k.bat);
      prev = cum; cum += net;
      years.push({ y, net, cum });
      if (pb === null && cum >= 0) pb = (y - 1) + (net > 0 ? -prev / net : 0);
    }
    return { items, sub, lab, total, year1: years[0].net, payback: pb, net25: cum, years };
  };

  /* লোডশেডিং ব্যাকআপ সময় — ব্যাটারির ধরন, ভোল্ট ও Ah অনুযায়ী */
  L.backup = (P, R) => {
    const c = P.cfg, b = P.bk, n = L.num, T = L.BTYPES[b.type] || L.BTYPES.acid;
    const sel = P.loads.filter(l => !b.off[l.id]);
    const Psel = sel.reduce((a, l) => a + n(l.w) * n(l.q), 0);
    const bv = n(b.bv) > 0 ? n(b.bv) : n(c.bw), bah = n(b.bah) > 0 ? n(b.bah) : n(c.bah), Vs = n(c.V) || 1;
    const over = n(b.bv) > 0 || n(b.bah) > 0;
    const nb = n(b.n) > 0 ? n(b.n) : (over ? Math.ceil(Vs / (bv || 1)) * Math.ceil(R.bAh / (bah || 1)) : R.nb);
    const nominal = nb * bv * bah;
    const minSoc = b.min === '' || b.min == null ? 100 - T.dod : n(b.min);
    const net = Math.max(Psel - n(b.solar), 0);
    // Peukert: বেশি কারেন্টে ব্যাটারির কার্যকর ক্ষমতা কমে (২০ ঘণ্টা রেটিং ধরে)
    const Ahb = nominal / Vs, I = net / Vs, H = 20;
    const fp = I > 0 && Ahb > 0 ? Math.min(1, Math.pow(Ahb / (I * H), T.k - 1)) : 1;
    const usable = nominal * Math.max(n(b.soc) - minSoc, 0) / 100 * n(b.fac) / 100 * T.eff / 100 * (n(c.eff) / 100 || 1) * fp;
    const hours = net > 0 ? usable / net : Infinity;
    const outH = [1, 2, 3, 4, 6, 8, 12];
    const sc = outH.map(h => ({ h, need: net * h, pct: usable ? net * h / usable * 100 : Infinity, maxW: usable / h }));
    const dayNeed = net * n(b.out) * n(b.times);
    return { sel, Psel, nb, bv, bah, T, fp, nominal, minSoc, usable, net, hours, sc, dayNeed, dayPct: usable ? dayNeed / usable * 100 : Infinity };
  };

  G.SL = L;
  if (typeof module !== 'undefined' && module.exports) module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);
