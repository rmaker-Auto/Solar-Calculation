/* calc.js — ড্যাশবোর্ড, লোড, সিস্টেম, ক্যাবল, সূর্যালোক/পে-ব্যাক, ব্যাকআপ সময়, চার্ট/রিপোর্ট, কনভার্টার */
(function () {
  'use strict';
  const A = window.App, { num, esc, f, uid, now } = SL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const PAL = ['#0f5ea8', '#e69a1a', '#2a8f46', '#c2306b', '#8a4fff', '#0a8fb8', '#e8650a', '#6c47d8', '#8a6a3b', '#455a6e'];
  const MS = ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'];
  const K = (l, v, u, c) => `<div class="kpi ${c || ''}"><span>${l}</span><b>${v}${u ? ' <small>' + esc(u) + '</small>' : ''}</b></div>`;
  const tp = p => { p.u = now(); };
  const ctx = () => { const p = A.P(); return { p, c: p.cfg, R: SL.calc(p, A.M().view || 'all') }; };
  const icon = k => A.META.find(m => m[0] === k)[1];
  const H = (k, extra) => `<h3>${icon(k)} ${esc(A.lbl(k))}${extra || ''}</h3>`;
  const card = (html, cls) => { const d = document.createElement('div'); d.className = 'card' + (cls ? ' ' + cls : ''); d.innerHTML = html; return d; };
  const VIEWS = [['all', 'সব লোড'], ['day', '☀ দিন'], ['night', '🌙 রাত']];
  const viewName = v => v === 'day' ? 'শুধু দিনের লোড' : v === 'night' ? 'শুধু রাতের লোড' : 'সব লোড';

  /* ================= চার্ট (SVG) ================= */
  function niceMax(v) { if (!(v > 0)) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))), m = v / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; }
  const legend = s => `<div class="legend">${s.map(x => `<span><i style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}</div>`;
  function barChart(labels, series, o = {}) {
    const W = 680, Ht = o.h || 240, pl = 54, pr = 10, pt = 14, pb = 34, iw = W - pl - pr, ih = Ht - pt - pb;
    const mx = niceMax(Math.max(0, ...series.flatMap(s => s.vals))), gw = iw / labels.length, bw = Math.min(30, gw * 0.8 / series.length);
    let g = '';
    for (let i = 0; i <= 4; i++) { const y = pt + ih - ih * i / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="#d6e0ea"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end">${f(mx * i / 4, mx < 10 ? 1 : 0)}</text>`; }
    labels.forEach((lb, i) => {
      const cx = pl + gw * i + gw / 2;
      series.forEach((s, j) => { const v = s.vals[i] || 0, h = ih * v / mx, x = cx - bw * series.length / 2 + bw * j; g += `<rect x="${x.toFixed(1)}" y="${(pt + ih - h).toFixed(1)}" width="${(bw - 2).toFixed(1)}" height="${h.toFixed(1)}" rx="3" fill="${s.color}"><title>${esc(s.name)}: ${f(v)}</title></rect>`; });
      g += `<text x="${cx}" y="${Ht - 12}" text-anchor="middle">${esc(lb)}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${Ht}" role="img">${g}</svg>${series.length > 1 || o.legend ? legend(series) : ''}</div>`;
  }
  function hbarChart(items, unit) {
    const W = 680, rh = 30, lw = 170, pr = 90, Ht = Math.max(rh * items.length + 10, 40), mx = Math.max(1e-9, ...items.map(i => i.v));
    let g = '';
    items.forEach((it, i) => {
      const y = 5 + i * rh, w = (W - lw - pr) * it.v / mx;
      g += `<text x="${lw - 8}" y="${y + 18}" text-anchor="end">${esc((it.l || '—').slice(0, 22))}</text><rect x="${lw}" y="${y + 4}" width="${Math.max(w, 2).toFixed(1)}" height="18" rx="4" fill="${PAL[i % PAL.length]}"/><text x="${lw + Math.max(w, 2) + 6}" y="${y + 18}">${f(it.v, 1)} ${esc(unit || '')}</text>`;
    });
    return `<div class="chart"><svg viewBox="0 0 ${W} ${Ht}" role="img">${g}</svg></div>`;
  }
  function lineChart(pts, o = {}) {
    const W = 680, Ht = 250, pl = 70, pr = 14, pt = 14, pb = 34, iw = W - pl - pr, ih = Ht - pt - pb;
    const ys = pts.map(p => p.y), lo = Math.min(0, ...ys), hi = Math.max(0, ...ys), span = (hi - lo) || 1;
    const X = i => pl + iw * i / (pts.length - 1), Y = v => pt + ih - ih * (v - lo) / span;
    let g = '';
    for (let i = 0; i <= 4; i++) { const v = lo + span * i / 4, y = Y(v); g += `<line x1="${pl}" x2="${W - pr}" y1="${y}" y2="${y}" stroke="#d6e0ea"/><text x="${pl - 6}" y="${y + 4}" text-anchor="end">${f(v / (o.div || 1), 0)}${o.suf || ''}</text>`; }
    g += `<line x1="${pl}" x2="${W - pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="#555" stroke-width="1.4"/>`;
    g += `<polyline fill="none" stroke="${o.color || PAL[0]}" stroke-width="3" points="${pts.map((p, i) => X(i).toFixed(1) + ',' + Y(p.y).toFixed(1)).join(' ')}"/>`;
    pts.forEach((p, i) => { if (i % 5 === 0 || i === pts.length - 1) g += `<text x="${X(i)}" y="${Ht - 12}" text-anchor="middle">${f(p.x, 0)}</text>`; });
    if (o.mark != null) { const i = Math.min(pts.length - 1, o.mark); g += `<circle cx="${X(i)}" cy="${Y(0)}" r="6" fill="#e8650a"/><text x="${X(i)}" y="${Y(0) - 12}" text-anchor="middle" style="font-weight:700">${esc(o.markT || '')}</text>`; }
    return `<div class="chart"><svg viewBox="0 0 ${W} ${Ht}" role="img">${g}</svg></div>`;
  }
  A.charts = { barChart, hbarChart, lineChart };

  /* ================= প্রজেক্ট বার ================= */
  function projBar(root, o) {
    const D = A.D(), p = A.P(), vw = A.M().view || 'all';
    const d = card(`<div class="row"><div style="min-width:170px"><label>প্রজেক্ট</label><select id="pj">${D.projects.map(x => `<option value="${esc(x.id)}" ${x.id === p.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <button class="btn sm" id="pjn">＋ নতুন</button><button class="btn sm" id="pjr">✎ নাম</button><button class="btn sm" id="pjc">⎘ কপি</button><button class="btn sm bad" id="pjd">🗑</button>
      ${o && o.view ? `<div><label>লোড প্রোফাইল</label><div class="seg" id="vw">${VIEWS.map(v => `<button data-v="${v[0]}" class="${v[0] === vw ? 'on' : ''}">${v[1]}</button>`).join('')}</div></div>` : ''}</div>`, 'pbar');
    root.appendChild(d);
    $('#pj', d).onchange = e => { A.M().proj = e.target.value; A.saveDev(); A.refresh(); };
    $('#pjn', d).onclick = async () => {
      const n = await A.askText('নতুন প্রজেক্ট', 'প্রজেক্টের নাম', 'প্রজেক্ট ' + (A.D().projects.length + 1)); if (n === null || !n.trim()) return;
      const np = SL.newProject(n.trim()); A.D().projects.push(np); A.M().proj = np.id; A.save(); A.refresh();
    };
    $('#pjr', d).onclick = async () => { const p0 = A.P(), n = await A.askText('প্রজেক্টের নাম বদলান', 'নতুন নাম', p0.name); if (n === null || !n.trim()) return; const p1 = A.P(); p1.name = n.trim(); tp(p1); A.save(); A.refresh(); };
    $('#pjc', d).onclick = () => {
      const p0 = A.P(), cp = SL.clone(p0); cp.id = uid(); cp.name = p0.name + ' (কপি)'; cp.u = now(); cp.loads.forEach(l => { l.id = uid(); l.u = now(); }); cp.bk.off = {};
      A.D().projects.push(cp); A.M().proj = cp.id; A.save(); A.refresh(); A.toast('প্রজেক্ট কপি হয়েছে');
    };
    $('#pjd', d).onclick = async () => {
      const D1 = A.D(); if (D1.projects.length < 2) { A.toast('অন্তত একটি প্রজেক্ট রাখতে হবে'); return; }
      const p0 = A.P(); if (!(await A.ask(`"${p0.name}" প্রজেক্ট ও এর সব লোড মুছে যাবে। নিশ্চিত?`, { danger: true, ok: 'মুছুন' }))) return;
      D1.tomb[p0.id] = now(); D1.projects = D1.projects.filter(x => x.id !== p0.id); A.M().proj = ''; A.save(); A.refresh();
    };
    const vwEl = $('#vw', d);
    if (vwEl) vwEl.onclick = e => { const b = e.target.closest('button[data-v]'); if (!b) return; A.M().view = b.dataset.v; A.saveDev(); A.refresh(); };
  }
  A.projBar = projBar;
  const viewNote = () => { const v = A.M().view || 'all'; return v === 'all' ? '' : `<p class="note" style="margin:0 0 8px">▶ এখন দেখানো হচ্ছে: <b>${viewName(v)}</b> (ড্যাশবোর্ডের "লোড প্রোফাইল" থেকে বদলান)</p>`; };

  /* ================= ড্যাশবোর্ড ================= */
  A.reg('dash', root => {
    projBar(root, { view: true });
    const { p, c, R } = ctx(), T = SL.sunTable(p, R), PB = SL.payback(p, R, T), BK = SL.backup(p, R);
    root.appendChild(card(`${H('dash')}${viewNote()}<div class="grid">
      ${K('মোট লোড', f(R.W, 0), 'W') + K('দৈনিক ব্যবহার', f(R.Wh / 1000), 'kWh')}${K('মাসিক ইউনিট', f(R.kwm), 'kWh')}${K('মাসিক খরচ', c.cur + f(R.month))}${K('বার্ষিক খরচ', c.cur + f(R.month * 12, 0))}
      ${K('লোড কারেন্ট', f(R.W / (c.V || 1)), 'A @ ' + f(c.V, 0) + 'V')}${K('প্যানেল', f(R.pvT, 0) + ' W', f(R.np, 0) + 'টি')}${K('ইনভার্টার', f(R.invVA, 0), 'VA')}${K('ব্যাটারি', f(R.bAh, 0), 'Ah')}${K('ব্যাটারি সংখ্যা', f(R.nb, 0), 'টি')}
      ${K('ইনস্টলেশন খরচ (আনুমানিক)', c.cur + f(PB.total, 0))}${K('পে-ব্যাক', PB.payback == null ? '২৫+ বছর' : f(PB.payback, 1) + ' বছর', '', PB.payback == null ? 'warn' : 'ok')}${K('লোডশেডিং ব্যাকআপ', SL.fmtHM(BK.hours), '', BK.hours === Infinity ? 'ok' : '')}</div>`));
    const inc = R.L.filter(l => l.inc && l.Wh > 0).sort((a, b) => b.Wh - a.Wh);
    root.appendChild(card(`<h3>কোথায় কত বিদ্যুৎ ব্যবহার হচ্ছে</h3>${inc.length ? `<div class="tw"><table><thead><tr><th>লোড</th><th>ওয়াট</th><th>Wh/দিন</th><th>অংশ</th><th style="width:34%"></th></tr></thead><tbody>${inc.map(l => `<tr><td>${esc(l.n || '—')}</td><td>${f(l.W, 0)}</td><td>${f(l.Wh, 0)}</td><td>${R.Wh ? f(l.Wh / R.Wh * 100, 1) : 0}%</td><td><div class="bar" style="width:${R.Wh ? l.Wh / R.Wh * 100 : 0}%"></div></td></tr>`).join('')}</tbody></table></div>` : '<p class="note">এখনও কোনো লোড নেই — বাঁ পাশ থেকে "লোড টেবিল" এ গিয়ে লোড যোগ করুন।</p>'}`));
    root.appendChild(card(`<h3>মাসওয়ারি সোলার উৎপাদন ও ব্যবহার (kWh)</h3>${barChart(MS, [{ name: 'উৎপাদন', color: PAL[1], vals: T.rows.map(r => r.gen) }, { name: 'ব্যবহার', color: PAL[0], vals: T.rows.map(r => r.use) }])}<p class="note">বছরে উৎপাদন ${f(T.gen, 0)} kWh · ব্যবহার ${f(T.use, 0)} kWh · সোলার কভারেজ ${f(T.cov, 0)}%</p>`));
  });

  /* ================= লোড টেবিল ================= */
  const TYPES = [['b', 'দিন-রাত'], ['d', 'শুধু দিন'], ['n', 'শুধু রাত']];
  const PRESETS = [
    ['LED বাল্ব', 10, 4, 6, 1, 'n'], ['টিউবলাইট', 40, 2, 5, 1, 'n'], ['সিলিং ফ্যান', 75, 3, 10, 1, 'b'], ['টিভি', 80, 1, 5, 1, 'n'], ['ফ্রিজ', 150, 1, 12, 4, 'b'],
    ['ল্যাপটপ', 65, 1, 4, 1, 'd'], ['ডেস্কটপ কম্পিউটার', 200, 1, 4, 1, 'd'], ['পানির পাম্প', 750, 1, 1, 4, 'd'], ['ওয়াইফাই রাউটার', 12, 1, 24, 1, 'b'], ['মোবাইল চার্জার', 10, 3, 3, 1, 'n'],
    ['এক্সহস্ট ফ্যান', 40, 1, 3, 1, 'b'], ['ওয়াশিং মেশিন', 400, 1, 1, 3, 'd'], ['ইলেকট্রিক ইস্ত্রি', 1000, 1, 0.5, 1, 'd'], ['এসি (১ টন)', 1200, 1, 8, 3, 'n'], ['রাইস কুকার', 700, 1, 1, 1, 'd']
  ];
  function loadForm(title, onSave) {
    A.dlg({
      title, w: 480,
      html: `<div class="g2"><div><label>লোডের নাম</label><input id="lf_n" autocomplete="off"></div><div><label>ধরন</label><select id="lf_t">${TYPES.map(t => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select></div></div>
      <div class="grid" style="margin-top:10px"><div><label>ওয়াট (প্রতিটি)</label><input id="lf_w" type="number" step="any"></div><div><label>সংখ্যা</label><input id="lf_q" type="number" step="any" value="1"></div><div><label>ঘণ্টা/দিন</label><input id="lf_h" type="number" step="any" value="1"></div><div><label>স্টার্ট গুণক</label><input id="lf_s" type="number" step="any" value="1"></div></div>
      <p class="note">স্টার্ট গুণক: মোটর/ফ্রিজ/পাম্প চালুর সময় ৩–৬ গুণ পাওয়ার টানে। সাধারণ লোডে ১।</p><p class="err" id="lf_e"></p>`,
      onMount: a => setTimeout(() => $('#lf_n', a.el).focus(), 30),
      buttons: [{ t: 'সংরক্ষণ', cls: 'pri', fn: a => {
        const g = i => $('#' + i, a.el).value, er = $('#lf_e', a.el);
        if (!g('lf_n').trim() && !num(g('lf_w'))) { er.textContent = 'নাম বা ওয়াট দিন'; return false; }
        onSave({ id: uid(), n: g('lf_n').trim(), t: g('lf_t'), w: g('lf_w'), q: g('lf_q') || 1, h: g('lf_h') || 0, s: g('lf_s') || 1, u: now() });
      } }, { t: 'বন্ধ' }]
    });
  }
  A.reg('loads', root => {
    projBar(root);
    const d = card(`${H('loads')}<div class="tw"><table style="min-width:980px"><thead><tr><th>লোডের নাম</th><th>ধরন</th><th>ওয়াট</th><th>সংখ্যা</th><th>ঘণ্টা/দিন</th><th>স্টার্ট গুণক</th><th>মোট W</th><th>Wh/দিন</th><th>অ্যাম্পিয়ার</th><th>ইউনিট/মাস</th><th>খরচ/মাস</th><th></th></tr></thead><tbody id="lb"></tbody><tfoot id="lf"></tfoot></table></div>
      <div class="row" style="margin-top:12px"><button class="btn pri" id="addL">＋ লোড যোগ করুন</button><button class="btn" id="presets">সাধারণ লোড যোগ</button></div>
      <div id="ldsum" class="grid" style="margin-top:12px"></div>
      <p class="note">ধরন: "দিন-রাত" লোড দিন ও রাতে ভাগ হয় (অনুপাত সিস্টেম সাইজ পেজে সেট করুন)। স্টার্ট গুণক: মোটর/ফ্রিজ/পাম্প চালুর সময় ৩–৬ গুণ পাওয়ার টানে।</p>`);
    root.appendChild(d);
    const tb = $('#lb', d), V = x => num(x);
    const rowHTML = l => `<tr data-id="${esc(l.id)}"><td><input data-k="n" value="${esc(l.n || '')}" style="min-width:150px"></td>
      <td><select data-k="t" style="min-width:112px">${TYPES.map(t => `<option value="${t[0]}" ${t[0] === (l.t || 'b') ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></td>
      ${['w', 'q', 'h', 's'].map(k => `<td class="n"><input type="number" step="any" data-k="${k}" value="${esc(l[k] ?? '')}"></td>`).join('')}
      <td class="cW"></td><td class="cWh"></td><td class="cA"></td><td class="ckm"></td><td class="cst"></td><td><button class="btn sm bad" data-del="${esc(l.id)}">✕</button></td></tr>`;
    function fillRow(tr, l) {
      const c = A.P().cfg, W = V(l.w) * V(l.q), Wh = W * V(l.h), km = Wh * 30 / 1000;
      $('.cW', tr).textContent = f(W, 0); $('.cWh', tr).textContent = f(Wh, 0); $('.cA', tr).textContent = f(c.V ? W / c.V : 0); $('.ckm', tr).textContent = f(km); $('.cst', tr).textContent = c.cur + f(km * c.price);
    }
    function foot() {
      const p = A.P(), c = p.cfg, R = SL.calc(p, 'all'), D1 = SL.calc(p, 'day'), N1 = SL.calc(p, 'night');
      $('#lf', d).innerHTML = `<tr><th>মোট</th><th></th><th></th><th></th><th></th><th></th><th>${f(R.W, 0)} W</th><th>${f(R.Wh, 0)}</th><th>${f(c.V ? R.W / c.V : 0)} A</th><th>${f(R.kwm)}</th><th>${c.cur}${f(R.month)}</th><th></th></tr>`;
      $('#ldsum', d).innerHTML = K('☀ দিনের লোড', f(D1.W, 0), 'W · ' + f(D1.Wh / 1000) + ' kWh/দিন') + K('🌙 রাতের লোড', f(N1.W, 0), 'W · ' + f(N1.Wh / 1000) + ' kWh/দিন');
    }
    function paint() {
      const p = A.P(); tb.innerHTML = p.loads.map(rowHTML).join('') || '<tr><td colspan="12" class="note">কোনো লোড নেই — "লোড যোগ করুন" চাপুন</td></tr>';
      $$('tr[data-id]', tb).forEach(tr => fillRow(tr, p.loads.find(l => l.id === tr.dataset.id))); foot();
    }
    paint();
    const edit = e => {
      const t = e.target, k = t.dataset.k; if (!k) return; const tr = t.closest('tr'), l = A.P().loads.find(x => x.id === tr.dataset.id); if (!l) return;
      l[k] = t.value; l.u = now(); A.save(); fillRow(tr, l); foot();
    };
    tb.addEventListener('input', edit); tb.addEventListener('change', edit);
    tb.onclick = e => { const id = e.target.dataset.del; if (!id) return; const p = A.P(); A.D().tomb[id] = now(); p.loads = p.loads.filter(l => l.id !== id); delete p.bk.off[id]; tp(p); A.save(); paint(); };
    $('#addL', d).onclick = () => loadForm('＋ নতুন লোড', l => { const p = A.P(); p.loads.push(l); A.save(); paint(); A.toast('লোড যোগ হয়েছে'); });
    $('#presets', d).onclick = () => A.dlg({
      title: 'সাধারণ লোড যোগ করুন', w: 520,
      html: `<p class="note" style="margin-top:0">যেগুলো লাগবে টিক দিন; পরে টেবিলে ওয়াট/ঘণ্টা বদলাতে পারবেন।</p>${PRESETS.map((x, i) => `<label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--ink);padding:3px 0"><input type="checkbox" data-i="${i}"> ${esc(x[0])} <span class="note" style="margin:0 0 0 auto">${x[1]}W × ${x[2]} · ${x[3]} ঘণ্টা</span></label>`).join('')}`,
      buttons: [{ t: 'যোগ করুন', cls: 'pri', fn: a => { const p = A.P(); let n = 0; $$('input[data-i]:checked', a.el).forEach(c => { const x = PRESETS[c.dataset.i]; p.loads.push({ id: uid(), n: x[0], w: x[1], q: x[2], h: x[3], s: x[4], t: x[5], u: now() }); n++; }); if (n) { A.save(); paint(); } } }, { t: 'বন্ধ' }]
    });
  });

  /* ================= সাধারণ প্যারামিটার কার্ড ================= */
  function cfgCard(title, fields, onchg, note, key = 'cfg') {
    const p = A.P(), d = card(`<h3>${title}</h3><div class="grid">${fields.map(([k, l, st]) => `<div><label>${l}</label><input data-c="${k}" ${k === 'cur' ? '' : `type="number" step="${st || 'any'}"`} value="${esc(p[key][k] ?? '')}"></div>`).join('')}</div>${note ? `<p class="note">${note}</p>` : ''}`);
    d.addEventListener('input', e => { const k = e.target.dataset.c; if (!k) return; const q = A.P(); q[key][k] = k === 'cur' ? e.target.value : num(e.target.value); tp(q); A.save(); onchg && onchg(); });
    return d;
  }
  A.cfgCard = cfgCard;

  /* ================= সিস্টেম সাইজ ================= */
  A.reg('system', root => {
    projBar(root, { view: true });
    root.appendChild(cfgCard(`${icon('system')} ${esc(A.lbl('system'))} — প্যারামিটার`, [['V', 'সিস্টেম ভোল্ট (V)'], ['sun', 'সূর্যালোক ঘণ্টা/দিন'], ['loss', 'সিস্টেম লস (%)'], ['eff', 'ইনভার্টার দক্ষতা (%)'], ['dod', 'ব্যাটারি DoD (%)'], ['days', 'ব্যাকআপ দিন'], ['safe', 'সেফটি মার্জিন (%)'], ['pf', 'লোড পাওয়ার ফ্যাক্টর'], ['pw', 'প্যানেল ওয়াট (W)'], ['bw', 'একটি ব্যাটারি ভোল্ট'], ['bah', 'একটি ব্যাটারি Ah'], ['price', 'ইউনিট দাম'], ['cur', 'মুদ্রা চিহ্ন'], ['dayfrac', '"দিন-রাত" লোডের দিনের অংশ (%)']], paint));
    const res = card(''); root.appendChild(res);
    root.appendChild(card('<p class="note" style="margin:0">হিসাব: দৈনিক Wh ÷ ইনভার্টার দক্ষতা ÷ সূর্যালোক ঘণ্টা ÷ (১ − লস) = প্যানেল ওয়াট। ব্যাটারি = (দৈনিক Wh ÷ দক্ষতা) × ব্যাকআপ দিন ÷ DoD ÷ ভোল্ট। ইনভার্টার = মোট লোড + সেফটি মার্জিন (বা স্টার্টিং সার্জ, যেটি বেশি)।</p>'));
    function paint() {
      const { c, R } = ctx();
      res.innerHTML = `<h3>ফলাফল</h3>${viewNote()}<div class="grid">${K('প্যানেল (মোট ওয়াট)', f(R.pvW, 0), 'W') + K('প্যানেল সংখ্যা (' + f(c.pw, 0) + 'W)', f(R.np, 0), 'টি') + K('প্যানেল মোট', f(R.pvT, 0), 'W') + K('অ্যারে কারেন্ট', f(R.pvT / (c.V || 1)), 'A') + K('চার্জ কন্ট্রোলার', f(R.ctrl, 0), 'A') + K('ইনভার্টার', f(R.invW, 0), 'W') + K('ইনভার্টার', f(R.invVA, 0), 'VA') + K('ইনভার্টার DC কারেন্ট', f(R.invA), 'A') + K('ব্যাটারি ক্ষমতা', f(R.bAh, 0), 'Ah') + K('ব্যাটারি শক্তি', f(R.bWh / 1000), 'kWh') + K('ব্যাটারি ব্যবস্থা', R.ser + ' সিরিজ × ' + R.par + ' প্যারালাল') + K('মোট ব্যাটারি', f(R.nb, 0), 'টি') + K('দৈনিক খরচ', c.cur + f(R.day))}</div>`;
    }
    paint();
  });

  /* ================= ক্যাবল ও ফিউজ ================= */
  A.reg('cable', root => {
    projBar(root, { view: true });
    root.appendChild(cfgCard(`${icon('cable')} ${esc(A.lbl('cable'))} — প্যারামিটার`, [['pvIsc', 'প্যানেল Isc (A)'], ['pvVoc', 'প্যানেল Voc (V)'], ['pvVmp', 'প্যানেল Vmp (V)'], ['ps', 'সিরিজে প্যানেল সংখ্যা'], ['ccVmax', 'চার্জ কন্ট্রোলার সর্বোচ্চ PV ভোল্ট'],
      ['lenPV', 'প্যানেল স্ট্রিং দৈর্ঘ্য (মি, একমুখী)'], ['lenArr', 'অ্যারে → কন্ট্রোলার (মি)'], ['lenCC', 'কন্ট্রোলার → ব্যাটারি (মি)'], ['lenBat', 'ব্যাটারি → ইনভার্টার (মি)'], ['lenAC', 'ইনভার্টার আউটপুট (মি)'],
      ['dropPV', 'অনুমোদিত ড্রপ: প্যানেল (%)'], ['dropArr', 'অনুমোদিত ড্রপ: অ্যারে (%)'], ['dropBat', 'অনুমোদিত ড্রপ: ব্যাটারি (%)'], ['dropAC', 'অনুমোদিত ড্রপ: AC (%)'], ['acV', 'AC ভোল্ট (V)'], ['rho', 'তামার রোধাংক (Ω·mm²/m)'], ['derate', 'ক্যাবল ডিরেটিং (০.৯ = ১০% কম)']], paint,
      'ভোল্ট সিস্টেম, প্যানেল সংখ্যা ও ইনভার্টার সাইজ "সিস্টেম সাইজ" পেজ থেকে আসে। এটি তামার ক্যাবলের আনুমানিক হিসাব — স্থাপনের আগে লাইসেন্সধারী ইলেকট্রিশিয়ানকে দিয়ে যাচাই করুন; DC-তে অবশ্যই DC-রেটেড ফিউজ/ব্রেকার ব্যবহার করুন।'));
    const res = card(''); root.appendChild(res);
    function paint() {
      const { p, c, R } = ctx(), Cb = SL.cables(p, R);
      res.innerHTML = `<h3>ক্যাবল সাইজ ও ফিউজ/ব্রেকার</h3>${viewNote()}<div class="grid" style="margin-bottom:12px">${K('প্যানেল স্ট্রিং', f(Cb.ps, 0) + ' সিরিজ × ' + f(Cb.npar, 0) + ' প্যারালাল')}${K('অ্যারে Voc (ঠান্ডায় +১২%)', f(Cb.vocArr, 0), 'V', Cb.vocOk ? 'ok' : 'bad')}${K('কন্ট্রোলার সীমা', f(c.ccVmax, 0), 'V')}${K('Voc যাচাই', Cb.vocOk ? '✓ ঠিক আছে' : '✗ সীমা পেরিয়ে যাচ্ছে', '', Cb.vocOk ? 'ok' : 'bad')}</div>
      <div class="tw"><table style="min-width:900px"><thead><tr><th>সার্কিট</th><th>ধরন</th><th>ভোল্ট</th><th>কারেন্ট (A)</th><th>ফিউজ/ব্রেকার</th><th>ড্রপের জন্য ন্যূনতম mm²</th><th>নির্বাচিত ক্যাবল</th><th>বহন ক্ষমতা</th><th>ভোল্ট ড্রপ</th><th></th></tr></thead><tbody>${Cb.rows.map(r => `<tr><td style="white-space:normal;min-width:230px">${esc(r.name)}</td><td><span class="tag">${r.kind}</span></td><td>${f(r.V, 0)} V</td><td>${f(r.I)}</td><td><b>${f(r.breaker, 0)} A</b></td><td>${f(r.Adrop)}</td><td><b>${f(r.size, 1)} mm²</b></td><td>${f(r.amp, 0)} A</td><td>${f(r.drop)}%</td><td>${r.ok ? '<span class="tag ok">ঠিক</span>' : '<span class="tag bad">বড় ক্যাবল/ছোট দৈর্ঘ্য লাগবে</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">ফিউজ/ব্রেকার = সার্কিটের কারেন্টের ১.২৫–১.৫৬ গুণ (প্যানেল Isc-র জন্য ১.৫৬), তারপর পরের স্ট্যান্ডার্ড মান। ক্যাবল = ভোল্ট ড্রপ ও বহন ক্ষমতা — দুটোর মধ্যে যেটি বড় সেটি।</p>`;
    }
    paint();
  });

  /* ================= সূর্যালোক টেবিল ও পে-ব্যাক ================= */
  A.reg('sun', root => {
    projBar(root, { view: true });
    const t = card(`${H('sun')}${viewNote()}<p class="note" style="margin:0 0 8px">প্রতি মাসে গড় "পিক সান আওয়ার" (ঘণ্টা/দিন) আপনার এলাকা অনুযায়ী বদলান।</p><div class="tw"><table style="min-width:760px"><thead><tr><th>মাস</th><th>সূর্যালোক (ঘণ্টা/দিন)</th><th>দিন</th><th>উৎপাদন kWh</th><th>ব্যবহার kWh</th><th>কভারেজ</th><th>সাশ্রয়</th><th>প্যানেল লাগবে</th></tr></thead><tbody id="sm"></tbody><tfoot id="sf"></tfoot></table></div><div id="sch"></div>`);
    root.appendChild(t);
    const cost = cfgCard('💰 ইনস্টলেশন খরচের হিসাব (প্রাইস ইনপুট)', [['pw', 'প্যানেল (প্রতি ওয়াট)'], ['bat', 'ব্যাটারি (প্রতিটি)'], ['inv', 'ইনভার্টার (প্রতি VA)'], ['ctrl', 'চার্জ কন্ট্রোলার (প্রতি A)'], ['oth', 'ক্যাবল/ফিউজ/স্ট্যান্ড ইত্যাদি (মোট)'], ['lab', 'ইনস্টলেশন/শ্রমিক (% )'], ['maint', 'বার্ষিক রক্ষণাবেক্ষণ'], ['deg', 'প্যানেলের বার্ষিক ক্ষয় (%)'], ['esc', 'বিদ্যুতের দাম বার্ষিক বাড়ে (%)'], ['bRep', 'ব্যাটারি বদল (প্রতি কত বছর, ০=না)']], paintCost, 'দাম আপনার স্থানীয় বাজার অনুযায়ী দিন। সাশ্রয় = সোলার থেকে যতটা বিদ্যুৎ ব্যবহার হয় × ইউনিট দাম।', 'cost');
    root.appendChild(cost);
    const res = card(''); root.appendChild(res);
    const sm = $('#sm', t);
    sm.innerHTML = A.P().sunM.map((v, i) => `<tr data-m="${i}"><td>${SL.BMON[i]}</td><td class="n"><input type="number" step="any" data-i="${i}" value="${esc(v)}"></td><td class="d"></td><td class="g"></td><td class="u"></td><td class="cv"></td><td class="sv"></td><td class="nd"></td></tr>`).join('');
    sm.addEventListener('input', e => { const i = e.target.dataset.i; if (i == null) return; const p = A.P(); p.sunM[i] = e.target.value; tp(p); A.save(); paintSun(); paintCost(); });
    function paintSun() {
      const { p, c, R } = ctx(), T = SL.sunTable(p, R);
      T.rows.forEach(r => { const tr = $(`tr[data-m="${r.m}"]`, sm); $('.d', tr).textContent = f(r.dim, 2); $('.g', tr).textContent = f(r.gen, 0); $('.u', tr).textContent = f(r.use, 0); $('.cv', tr).innerHTML = `<span class="tag ${r.cov >= 95 ? 'ok' : r.cov >= 60 ? 'warn' : 'bad'}">${f(r.cov, 0)}%</span>`; $('.sv', tr).textContent = c.cur + f(r.saved, 0); $('.nd', tr).textContent = isFinite(r.need) ? f(r.need, 0) + 'টি' : '—'; });
      $('#sf', t).innerHTML = `<tr><th>বছর</th><th>গড় ${f(T.sunAvg)}</th><th></th><th>${f(T.gen, 0)}</th><th>${f(T.use, 0)}</th><th>${f(T.cov, 0)}%</th><th>${c.cur}${f(T.saved, 0)}</th><th></th></tr>`;
      $('#sch', t).innerHTML = `<p class="note">সবচেয়ে কম সূর্যালোকের মাস: ${f(T.sunMin)} ঘণ্টা — সেই মাসেও পুরো লোড চালাতে ${f(Math.max(...T.rows.map(r => isFinite(r.need) ? r.need : 0)), 0)}টি প্যানেল লাগবে।</p>`;
    }
    function paintCost() {
      const { p, c, R } = ctx(), T = SL.sunTable(p, R), PB = SL.payback(p, R, T);
      res.innerHTML = `<h3>খরচ ও পে-ব্যাক ফলাফল</h3><div class="grid">${K('মোট ইনস্টলেশন খরচ', c.cur + f(PB.total, 0))}${K('প্রথম বছরের নিট সাশ্রয়', c.cur + f(PB.year1, 0))}${K('পে-ব্যাক সময়', PB.payback == null ? '২৫ বছরেও হচ্ছে না' : f(PB.payback, 1) + ' বছর', '', PB.payback == null ? 'bad' : 'ok')}${K('২৫ বছরে নিট লাভ', c.cur + f(PB.net25, 0), '', PB.net25 >= 0 ? 'ok' : 'bad')}</div>
      <h4>খরচের বিভাজন</h4><div class="tw"><table><thead><tr><th>আইটেম</th><th>খরচ</th><th>অংশ</th></tr></thead><tbody>${PB.items.map(i => `<tr><td>${i[0]}</td><td>${c.cur}${f(i[1], 0)}</td><td>${PB.total ? f(i[1] / PB.total * 100, 0) : 0}%</td></tr>`).join('')}</tbody><tfoot><tr><th>মোট</th><th>${c.cur}${f(PB.total, 0)}</th><th></th></tr></tfoot></table></div>
      <h4>২৫ বছরের নিট নগদ প্রবাহ (হাজার ${esc(c.cur)})</h4>${lineChart([{ x: 0, y: -PB.total }].concat(PB.years.map(y => ({ x: y.y, y: y.cum }))), { div: 1000, suf: 'k', mark: PB.payback == null ? null : Math.round(PB.payback), markT: PB.payback == null ? '' : f(PB.payback, 1) + ' বছর' })}`;
    }
    paintSun(); paintCost();
  });

  /* ================= লোডশেডিং ব্যাকআপ ================= */
  A.reg('backup', root => {
    projBar(root);
    const p0 = A.P();
    const inp = card(`${H('backup')}<div class="grid">
      <div style="grid-column:span 2"><label>ব্যাটারির ধরন</label><select data-b="type">${Object.keys(SL.BTYPES).map(k => `<option value="${k}" ${p0.bk.type === k ? 'selected' : ''}>${SL.BTYPES[k].name}</option>`).join('')}</select></div>
      <div><label>প্রতিটি ব্যাটারির ভোল্ট (V)</label><input data-b="bv" type="number" step="any" value="${p0.bk.bv > 0 ? esc(p0.bk.bv) : ''}" placeholder="সিস্টেম: ${esc(p0.cfg.bw)}"></div>
      <div><label>প্রতিটি ব্যাটারির Ah</label><input data-b="bah" type="number" step="any" value="${p0.bk.bah > 0 ? esc(p0.bk.bah) : ''}" placeholder="সিস্টেম: ${esc(p0.cfg.bah)}"></div>
      <div><label>ব্যাটারি সংখ্যা (০ = অটো)</label><input data-b="n" type="number" step="any" value="${esc(p0.bk.n)}"></div>
      <div><label>চার্জ এখন (%)</label><input data-b="soc" type="number" step="any" value="${esc(p0.bk.soc)}"></div>
      <div><label>সর্বনিম্ন চার্জ % (খালি = ধরন অনুযায়ী)</label><input data-b="min" id="bk_min" type="number" step="any" value="${esc(p0.bk.min)}"></div>
      <div><label>ব্যাটারির কার্যক্ষমতা/বয়স (%)</label><input data-b="fac" type="number" step="any" value="${esc(p0.bk.fac)}"></div>
      <div><label>ওই সময় সোলার সহায়তা (W)</label><input data-b="solar" type="number" step="any" value="${esc(p0.bk.solar)}"></div>
      <div><label>লোডশেডিং (ঘণ্টা/বার)</label><input data-b="out" type="number" step="any" value="${esc(p0.bk.out)}"></div>
      <div><label>দিনে কতবার</label><input data-b="times" type="number" step="any" value="${esc(p0.bk.times)}"></div></div>
      <p class="note" id="bk_tn"></p>
      <h4>লোডশেডিংয়ের সময় যেসব লোড চালু থাকবে (টিক দিন)</h4><div id="bsel" class="grid3"></div>`);
    root.appendChild(inp);
    const res = card(''); root.appendChild(res);
    $('#bsel', inp).innerHTML = p0.loads.length ? p0.loads.map(l => `<label style="display:flex;gap:8px;align-items:center;font-weight:500;color:var(--ink)"><input type="checkbox" data-l="${esc(l.id)}" ${p0.bk.off[l.id] ? '' : 'checked'}> ${esc(l.n || '—')} <span class="note" style="margin:0 0 0 auto">${f(num(l.w) * num(l.q), 0)}W</span></label>`).join('') : '<p class="note">কোনো লোড নেই</p>';
    inp.addEventListener('input', e => {
      const t = e.target, p = A.P();
      if (t.dataset.b) { const k = t.dataset.b; p.bk[k] = k === 'type' ? t.value : (k === 'min' && t.value === '') ? '' : num(t.value); }
      else if (t.dataset.l) { if (t.checked) delete p.bk.off[t.dataset.l]; else p.bk.off[t.dataset.l] = 1; }
      else return;
      tp(p); A.save(); paint();
    });
    function paint() {
      const { p, c, R } = ctx(), B = SL.backup(p, R), cls = B.dayPct <= 100 ? 'ok' : 'bad';
      $('#bk_min', inp).placeholder = 'ধরন অনুযায়ী ' + f(100 - B.T.dod, 0);
      $('#bk_tn', inp).textContent = `${B.T.name}: ব্যবহারযোগ্য গভীরতা (DoD) ~${f(B.T.dod, 0)}%, কার্যদক্ষতা ~${f(B.T.eff, 0)}%, Peukert ধ্রুবক ${f(B.T.k)} — হিসাবে এগুলো ধরা হয়েছে।`;
      res.innerHTML = `<h3>ব্যাকআপ ফলাফল</h3><div class="grid">${K('ব্যাটারির ধরন', B.T.name.split(' (')[0]) + K('ব্যাটারি', f(B.nb, 0) + 'টি × ' + f(B.bv) + 'V × ' + f(B.bah, 0) + 'Ah') + K('মোট ক্ষমতা', f(B.nominal / 1000), 'kWh') + K('ব্যবহারযোগ্য শক্তি', f(B.usable / 1000), 'kWh') + K('চালু লোড', f(B.Psel, 0), 'W') + K('নিট লোড (সোলার বাদে)', f(B.net, 0), 'W') + (B.fp < 0.995 ? K('বেশি কারেন্টে ক্ষমতা কমে (Peukert)', f(B.fp * 100, 0) + '%', '', 'warn') : '')}${K('ব্যাটারি চলবে', SL.fmtHM(B.hours), '', B.hours > B.sc[1].h ? 'ok' : 'warn')}</div>
      <h4>দিনের লোডশেডিং (${f(p.bk.out)} ঘণ্টা × ${f(p.bk.times, 0)} বার)</h4><div class="grid">${K('প্রয়োজনীয় শক্তি', f(B.dayNeed / 1000), 'kWh')}${K('ব্যাটারির ব্যবহার', isFinite(B.dayPct) ? f(B.dayPct, 0) + '%' : '—', '', cls)}${K('অবস্থা', B.dayPct <= 100 ? '✓ পুরোটা চলবে' : '✗ ব্যাটারি কম পড়বে', '', cls)}</div>
      <h4>কত ঘণ্টা লোডশেডিংয়ে কী লাগবে</h4><div class="tw"><table><thead><tr><th>লোডশেডিং</th><th>প্রয়োজনীয় শক্তি (Wh)</th><th>ব্যাটারি ব্যবহার</th><th>সর্বোচ্চ চালানো যাবে (W)</th><th></th></tr></thead><tbody>${B.sc.map(s => `<tr><td>${f(s.h, 0)} ঘণ্টা</td><td>${f(s.need, 0)}</td><td>${isFinite(s.pct) ? f(s.pct, 0) + '%' : '—'}</td><td>${f(s.maxW, 0)}</td><td>${s.pct <= 100 ? '<span class="tag ok">চলবে</span>' : '<span class="tag bad">চলবে না</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="note">ব্যবহারযোগ্য শক্তি = (ভোল্ট × Ah × সংখ্যা) × (এখনকার চার্জ − সর্বনিম্ন চার্জ) × বয়সের কার্যক্ষমতা × ব্যাটারির ধরনের দক্ষতা × ইনভার্টার দক্ষতা × Peukert ফ্যাক্টর (অ্যাসিড ব্যাটারিতে বেশি লোডে ক্ষমতা কমে)। চালু থাকবে এমন লোড কমালে ব্যাকআপ সময় বাড়ে।</p>`;
    }
    paint();
  });

  /* ================= চার্ট ও রিপোর্ট ================= */
  function reportHTML() {
    const D = A.D(), { p, c, R } = ctx(), T = SL.sunTable(p, R), PB = SL.payback(p, R, T), BK = SL.backup(p, R), Cb = SL.cables(p, R), v = A.M().view || 'all';
    const inc = R.L.filter(l => l.inc && l.Wh > 0).sort((a, b) => b.Wh - a.Wh);
    const kv = (a) => `<div class="kk">${a.map(x => `<div><b>${x[0]}:</b> ${x[1]}</div>`).join('')}</div>`;
    return `<h1>${esc(D.prefs.app.name)} — রিপোর্ট</h1><p>প্রোফাইল: <b>${esc(D.profile.name)}</b> · প্রজেক্ট: <b>${esc(p.name)}</b> · লোড: ${viewName(v)} · তারিখ: ${A.fd(Date.now())}</p>
    <h2>সারাংশ</h2>${kv([['মোট লোড', f(R.W, 0) + ' W'], ['দৈনিক ব্যবহার', f(R.Wh / 1000) + ' kWh'], ['মাসিক ইউনিট', f(R.kwm) + ' kWh'], ['মাসিক খরচ', c.cur + f(R.month)], ['প্যানেল', f(R.pvT, 0) + ' W (' + f(R.np, 0) + 'টি × ' + f(c.pw, 0) + 'W)'], ['ইনভার্টার', f(R.invVA, 0) + ' VA'], ['ব্যাটারি', f(R.bAh, 0) + ' Ah @ ' + f(c.V, 0) + 'V (' + f(R.nb, 0) + 'টি)'], ['চার্জ কন্ট্রোলার', f(R.ctrl, 0) + ' A'], ['ইনস্টলেশন খরচ', c.cur + f(PB.total, 0)], ['পে-ব্যাক', PB.payback == null ? '২৫+ বছর' : f(PB.payback, 1) + ' বছর'], ['লোডশেডিং ব্যাকআপ', SL.fmtHM(BK.hours)], ['সিস্টেম ভোল্ট', f(c.V, 0) + ' V']])}
    <h2>লোড তালিকা</h2><table><thead><tr><th>লোড</th><th>ধরন</th><th>ওয়াট</th><th>সংখ্যা</th><th>ঘণ্টা</th><th>মোট W</th><th>Wh/দিন</th><th>খরচ/মাস</th></tr></thead><tbody>${R.L.filter(l => l.inc).map(l => `<tr><td>${esc(l.n || '—')}</td><td>${(TYPES.find(t => t[0] === l.t) || TYPES[0])[1]}</td><td>${f(num(l.w), 0)}</td><td>${f(num(l.q), 0)}</td><td>${f(num(l.h))}</td><td>${f(l.W, 0)}</td><td>${f(l.Wh, 0)}</td><td>${c.cur}${f(l.cost)}</td></tr>`).join('')}</tbody><tfoot><tr><th colspan="5">মোট</th><th>${f(R.W, 0)}</th><th>${f(R.Wh, 0)}</th><th>${c.cur}${f(R.month)}</th></tr></tfoot></table>
    <h2>লোড অনুযায়ী ব্যবহার (Wh/দিন)</h2>${hbarChart(inc.slice(0, 14).map(l => ({ l: l.n, v: l.Wh })), 'Wh')}
    <h2>ক্যাবল ও ফিউজ/ব্রেকার</h2><table><thead><tr><th>সার্কিট</th><th>কারেন্ট</th><th>ফিউজ/ব্রেকার</th><th>ক্যাবল</th><th>ড্রপ</th></tr></thead><tbody>${Cb.rows.map(r => `<tr><td>${esc(r.name)}</td><td>${f(r.I)} A</td><td>${f(r.breaker, 0)} A</td><td>${f(r.size, 1)} mm²</td><td>${f(r.drop)}%</td></tr>`).join('')}</tbody></table>
    <h2>মাসওয়ারি সূর্যালোক ও উৎপাদন</h2><table><thead><tr><th>মাস</th><th>সূর্যালোক</th><th>উৎপাদন kWh</th><th>ব্যবহার kWh</th><th>কভারেজ</th></tr></thead><tbody>${T.rows.map(r => `<tr><td>${SL.BMON[r.m]}</td><td>${f(r.sun)}</td><td>${f(r.gen, 0)}</td><td>${f(r.use, 0)}</td><td>${f(r.cov, 0)}%</td></tr>`).join('')}</tbody></table>
    ${barChart(MS, [{ name: 'উৎপাদন kWh', color: PAL[1], vals: T.rows.map(r => r.gen) }, { name: 'ব্যবহার kWh', color: PAL[0], vals: T.rows.map(r => r.use) }])}
    <h2>খরচ ও পে-ব্যাক</h2><table><tbody>${PB.items.map(i => `<tr><td>${i[0]}</td><td>${c.cur}${f(i[1], 0)}</td></tr>`).join('')}<tr><th>মোট</th><th>${c.cur}${f(PB.total, 0)}</th></tr></tbody></table>
    ${lineChart([{ x: 0, y: -PB.total }].concat(PB.years.map(y => ({ x: y.y, y: y.cum }))), { div: 1000, suf: 'k', mark: PB.payback == null ? null : Math.round(PB.payback), markT: PB.payback == null ? '' : f(PB.payback, 1) + ' বছর' })}
    <h2>লোডশেডিং ব্যাকআপ</h2>${kv([['ব্যাটারি', f(BK.nb, 0) + 'টি'], ['ব্যবহারযোগ্য শক্তি', f(BK.usable / 1000) + ' kWh'], ['চালু লোড', f(BK.Psel, 0) + ' W'], ['ব্যাটারি চলবে', SL.fmtHM(BK.hours)]])}
    <p style="font-size:11px;margin-top:14px">এটি আনুমানিক হিসাব। ইনস্টলেশনের আগে বিশেষজ্ঞ দিয়ে যাচাই করুন।</p>`;
  }
  A.reg('report', root => {
    projBar(root, { view: true });
    const { p, c, R } = ctx(), T = SL.sunTable(p, R), PB = SL.payback(p, R, T), inc = R.L.filter(l => l.inc && l.Wh > 0).sort((a, b) => b.Wh - a.Wh);
    root.appendChild(card(`${H('report')}${viewNote()}<div class="row"><button class="btn pri" id="pdf">📄 PDF রিপোর্ট (প্রিন্ট → PDF সেভ)</button></div><p class="note">বোতাম চাপলে প্রিন্ট উইন্ডো খুলবে — সেখান থেকে "Save as PDF" / "PDF হিসাবে সংরক্ষণ" বেছে নিন।</p>`));
    root.appendChild(card(`<h3>লোড ধরে ধরে — দৈনিক ব্যবহার (Wh)</h3>${inc.length ? hbarChart(inc.slice(0, 14).map(l => ({ l: l.n, v: l.Wh })), 'Wh') : '<p class="note">লোড নেই</p>'}`));
    root.appendChild(card(`<h3>লোড ধরে ধরে — মাসিক খরচ (${esc(c.cur)})</h3>${inc.length ? hbarChart(inc.slice(0, 14).map(l => ({ l: l.n, v: l.cost })), c.cur) : '<p class="note">লোড নেই</p>'}`));
    root.appendChild(card(`<h3>মাসওয়ারি উৎপাদন বনাম ব্যবহার (kWh)</h3>${barChart(MS, [{ name: 'উৎপাদন', color: PAL[1], vals: T.rows.map(r => r.gen) }, { name: 'ব্যবহার', color: PAL[0], vals: T.rows.map(r => r.use) }])}`));
    root.appendChild(card(`<h3>পে-ব্যাক (হাজার ${esc(c.cur)})</h3>${lineChart([{ x: 0, y: -PB.total }].concat(PB.years.map(y => ({ x: y.y, y: y.cum }))), { div: 1000, suf: 'k', mark: PB.payback == null ? null : Math.round(PB.payback), markT: PB.payback == null ? '' : f(PB.payback, 1) + ' বছর' })}`));
    $('#pdf', root).onclick = () => {
      const pr = $('#print'); pr.innerHTML = reportHTML();
      const old = document.title; document.title = (A.D().prefs.app.name + ' — ' + A.P().name).replace(/[\\/:*?"<>|]/g, '');
      const done = () => { pr.innerHTML = ''; document.title = old; window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); setTimeout(() => window.print(), 200);
    };
  });
  A.reportHTML = reportHTML;

  /* ================= কনভার্টার ================= */
  const U = { 'পাওয়ার': { W: 1, kW: 1e3, MW: 1e6, HP: 745.7, 'BTU/h': .29307, 'kcal/h': 1.163 }, 'এনার্জি': { Wh: 1, kWh: 1e3, MWh: 1e6, J: 1 / 3600, kJ: 1 / 3.6, MJ: 1 / .0036, BTU: .29307 }, 'কারেন্ট': { mA: .001, A: 1, kA: 1e3 }, 'ভোল্টেজ': { mV: .001, V: 1, kV: 1e3 }, 'ক্ষেত্রফল': { 'বর্গফুট': .092903, 'বর্গমিটার': 1, 'বর্গইঞ্চি': .00064516 }, 'দৈর্ঘ্য': { 'মিমি': .001, 'সেমি': .01, 'ইঞ্চি': .0254, 'ফুট': .3048, 'মিটার': 1, 'কিমি': 1e3 } };
  A.reg('conv', root => {
    const d = card(`${H('conv')}<div class="row"><div><label>ধরন</label><select id="ck">${Object.keys(U).map(k => `<option>${k}</option>`).join('')}</select></div><div><label>মান</label><input id="cv" type="number" value="1" step="any"></div><div><label>থেকে</label><select id="cf"></select></div><div><label>এতে</label><select id="ct"></select></div></div><div class="res" id="cr"></div>`);
    const w = card(`<h3>ওয়াট ↔ অ্যাম্পিয়ার</h3><div class="row"><div><label>ভোল্ট (V)</label><input id="wv" type="number" value="220" step="any"></div><div><label>পাওয়ার ফ্যাক্টর</label><input id="wp" type="number" value="1" step="0.05"></div><div><label>ফেজ</label><select id="wph"><option value="1">১ ফেজ / DC</option><option value="1.732">৩ ফেজ</option></select></div><div><label>ওয়াট (W)</label><input id="ww" type="number" value="1000" step="any"></div><div><label>অ্যাম্পিয়ার (A)</label><input id="wa" type="number" step="any"></div></div><p class="note">যেটি পরিবর্তন করবেন, অন্যটি নিজে হিসাব হবে।</p>`);
    const b = card(`<h3>Ah ↔ Wh এবং kVA ↔ kW</h3><div class="row"><div><label>ব্যাটারি ভোল্ট</label><input id="bv" type="number" value="12" step="any"></div><div><label>Ah</label><input id="bah" type="number" value="100" step="any"></div><div><label>Wh</label><input id="bwh" type="number" step="any"></div></div><div class="row" style="margin-top:10px"><div><label>পাওয়ার ফ্যাক্টর</label><input id="kp" type="number" value="0.8" step="0.05"></div><div><label>kVA</label><input id="kva" type="number" value="1" step="any"></div><div><label>kW</label><input id="kw" type="number" step="any"></div></div>`);
    root.append(d, w, b);
    if (A.hybridCard) root.prepend(A.hybridCard());
    const $$$ = id => root.querySelector('#' + id);
    function conv() { const k = U[$$$('ck').value], fr = $$$('cf').value, to = $$$('ct').value; $$$('cr').textContent = f(num($$$('cv').value) * k[fr] / k[to], 6) + ' ' + to; }
    function fill() { const o = Object.keys(U[$$$('ck').value]).map(x => `<option>${x}</option>`).join(''); $$$('cf').innerHTML = o; $$$('ct').innerHTML = o; $$$('ct').selectedIndex = 1; conv(); }
    $$$('ck').onchange = fill; ['cv', 'cf', 'ct'].forEach(i => { $$$(i).oninput = conv; });
    const S = (i, v) => { $$$(i).value = Math.round(v * 1e4) / 1e4; };
    function wa(src) { const V = num($$$('wv').value), pf = num($$$('wp').value) || 1, ph = num($$$('wph').value); if (src === 'a') S('ww', num($$$('wa').value) * V * pf * ph); else S('wa', num($$$('ww').value) / (V * pf * ph || 1)); }
    ['wv', 'wp', 'wph', 'ww'].forEach(i => { $$$(i).oninput = () => wa('w'); }); $$$('wa').oninput = () => wa('a');
    function ah(s) { const v = num($$$('bv').value); if (s === 'h') S('bah', num($$$('bwh').value) / (v || 1)); else S('bwh', num($$$('bah').value) * v); }
    ['bv', 'bah'].forEach(i => { $$$(i).oninput = () => ah('a'); }); $$$('bwh').oninput = () => ah('h');
    function kv(s) { const pf = num($$$('kp').value); if (s === 'w') S('kva', num($$$('kw').value) / (pf || 1)); else S('kw', num($$$('kva').value) * pf); }
    ['kp', 'kva'].forEach(i => { $$$(i).oninput = () => kv('v'); }); $$$('kw').oninput = () => kv('w');
    fill(); wa('w'); ah('a'); kv('v');
  });
})();
