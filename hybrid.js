/* hybrid.js — হাইব্রিড ইনভার্টার / ব্যাটারি / সোলার ক্যালকুলেটর (টেবিল: প্রতিটি ঘরে ইচ্ছামত ইনপুট, ফলাফলের ঘরে লিখলে উল্টো হিসাব) */
(function () {
  'use strict';
  const A = window.App, { num: n, esc, f, now } = SL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const TYPES = Object.keys(SL.BTYPES);

  const defCase = (i, over) => {
    const T = SL.BTYPES.tub;
    return Object.assign({ name: 'কেস ' + SL.bn(i + 1), mode: 'ac', type: 'tub', V: 12, Ah: 100, W: 200, eff: 90, vac: 220, pf: 1, dod: T.dod, beff: T.eff, h: 4, psh: 5, irr: 1000, loss: 25, pv: 0 }, over || {});
  };
  function state() {
    const p = A.D().prefs;
    if (!p.hy || !Array.isArray(p.hy.cases) || !p.hy.cases.length) p.hy = { cases: [defCase(0), defCase(1, { mode: 'dc', eff: 100, name: 'কেস ২ (DC লোড)' })], w: [50, 100, 200, 300, 500, 800, 1000, 1500], sel: 0 };
    if (!Array.isArray(p.hy.w)) p.hy.w = [50, 100, 200, 300, 500, 800, 1000, 1500];
    return p.hy;
  }
  const persist = () => { const d = A.D(); d.prefs.u = now(); A.save(); };

  /* ---------- হিসাব ---------- */
  function calc(c) {
    const T = SL.BTYPES[c.type] || SL.BTYPES.acid, V = n(c.V) || 1, Ah = n(c.Ah), W = n(c.W), eff = (n(c.eff) || 100) / 100, ac = c.mode === 'ac';
    const vac = n(c.vac) || 220, pf = n(c.pf) || 1, dod = n(c.dod) / 100, beff = (n(c.beff) || 100) / 100;
    const Pin = W / eff, Ib = Pin / V, nom = V * Ah;
    const fp = Ib > 0 && Ah > 0 ? Math.min(1, Math.pow(Ah / (Ib * 20), T.k - 1)) : 1; // Peukert (২০ ঘণ্টা রেটিং)
    const use = nom * dod * fp, hrs = Pin > 0 ? use / Pin : Infinity;
    const eday = Pin * n(c.h), ech = eday / beff, loss = 1 - n(c.loss) / 100, psh = n(c.psh), irr = n(c.irr) / 1000;
    const pvReq = psh > 0 && loss > 0 ? ech / (psh * loss) : Infinity, pvOut = n(c.pv) * irr * loss;
    const pvBase = n(c.pv) > 0 ? n(c.pv) : (isFinite(pvReq) ? pvReq : 0);
    return {
      T, Pin, Ib, Iload: W / V, Iac: ac ? W / (vac * pf) : null, VA: ac ? W / pf : null, nom, fp, use, hrs, eday, Ahday: eday / V, ech, pvReq, pvOut,
      tDay: pvOut > 0 ? ech / pvOut : Infinity, tFull: pvOut > 0 ? use / beff / pvOut : Infinity, Ich: pvOut / V, Imax: Ah * T.cmax, ctrl: pvBase / V * 1.25
    };
  }
  A.hybridCalc = calc;

  /* ---------- সারির বিবরণ ---------- */
  const IN = [
    ['sec', '⚙ ইনপুট (যেকোনো ঘর বদলান)'],
    ['mode', 'সিস্টেম', 'sel', [['ac', 'হাইব্রিড / ইনভার্টার (AC আউটপুট)'], ['dc', 'সম্পূর্ণ DC লোড']]],
    ['type', 'ব্যাটারির ধরন', 'sel', TYPES.map(k => [k, SL.BTYPES[k].name])],
    ['V', 'ব্যাটারির ভোল্টেজ (V)', 'num'],
    ['Ah', 'ব্যাটারি ক্ষমতা (Ah — ব্যাংকের মোট)', 'num'],
    ['W', 'লোড / আউটপুট (W)', 'num'],
    ['eff', 'ইনভার্টার / কনভার্টার দক্ষতা (%)', 'num'],
    ['vac', 'AC আউটপুট ভোল্ট (V)', 'num', null, 'ac'],
    ['pf', 'লোডের পাওয়ার ফ্যাক্টর', 'num', null, 'ac'],
    ['dod', 'ব্যাটারি কতটা খালি করা যাবে — DoD (%)', 'num'],
    ['beff', 'ব্যাটারি চার্জ-ডিসচার্জ দক্ষতা (%)', 'num'],
    ['h', 'লোড চলে (ঘণ্টা/দিন)', 'num'],
    ['psh', 'সূর্যালোক — পিক সান আওয়ার (ঘণ্টা/দিন)', 'num'],
    ['irr', 'সূর্যালোকের তেজ (W/m²)', 'num'],
    ['loss', 'সোলার সিস্টেম লস (%)', 'num'],
    ['pv', 'আপনার সোলার প্যানেল (W) — ০ = শুধু প্রয়োজন হিসাব', 'num']
  ];
  const OUT = [
    ['sec', '🧮 ফলাফল (নীল ঘর; ✎ চিহ্নিত ঘরে লিখলে উল্টো হিসাব হবে)'],
    ['Pin', 'ব্যাটারি থেকে নেওয়া পাওয়ার (W)', 1, 'W'],
    ['Ib', '✎ ব্যাটারি থেকে কারেন্ট (A)', 1, 'A', 'rev'],
    ['Iload', 'DC লোডে কারেন্ট (A)', 1, 'A', 'dcOnly'],
    ['Iac', '✎ AC আউটপুট কারেন্ট (A)', 1, 'A', 'rev', 'ac'],
    ['VA', 'AC আউটপুট (VA)', 0, 'VA', null, 'ac'],
    ['nom', 'ব্যাটারির মোট শক্তি (Wh)', 0, 'Wh'],
    ['use', 'ব্যবহারযোগ্য শক্তি (Wh, DoD ও Peukert সহ)', 0, 'Wh'],
    ['hrs', '✎ ব্যাকআপ সময় (ঘণ্টা) — লিখলে প্রয়োজনীয় Ah বের হবে', 2, 'ঘণ্টা', 'rev'],
    ['hrsT', 'ব্যাকআপ (ঘণ্টা-মিনিটে)', 0, '', 'time'],
    ['eday', 'দিনে ব্যাটারি থেকে খরচ (Wh)', 0, 'Wh'],
    ['Ahday', 'দিনে ব্যাটারি থেকে খরচ (Ah)', 1, 'Ah'],
    ['pvReq', 'চার্জ করতে প্রয়োজনীয় সোলার প্যানেল (W)', 0, 'W'],
    ['pvOut', 'আপনার প্যানেলের বাস্তব আউটপুট (W, তেজ ও লস সহ)', 0, 'W'],
    ['tDay', 'দিনের খরচ পূরণে সূর্যালোক লাগবে (ঘণ্টা)', 1, 'ঘণ্টা'],
    ['tFull', 'পুরো (DoD পর্যন্ত) খালি থেকে ভরতে সূর্যালোক (ঘণ্টা)', 1, 'ঘণ্টা'],
    ['Ich', 'প্যানেল থেকে ব্যাটারিতে চার্জ কারেন্ট (A)', 1, 'A'],
    ['Imax', 'ব্যাটারির সর্বোচ্চ নিরাপদ চার্জ কারেন্ট (A)', 1, 'A'],
    ['ctrl', 'চার্জ কন্ট্রোলার (A, +২৫% নিরাপত্তা)', 0, 'A']
  ];

  A.hybridCard = function () {
    const el = document.createElement('div'); el.className = 'card';
    const S = () => state(), cases = () => S().cases;
    function head() {
      return `<tr><th>বিষয়</th>${cases().map((c, i) => `<th><div style="display:flex;gap:4px;align-items:center"><input data-i="${i}" data-k="name" value="${esc(c.name)}" style="font-weight:700;min-width:120px">${cases().length > 1 ? `<button class="btn sm bad" data-del="${i}" title="এই কেস মুছুন">✕</button>` : ''}</div></th>`).join('')}</tr>`;
    }
    function inCell(r, c, i) {
      const [k, , kind, opts, only] = r;
      if (only === 'ac' && c.mode !== 'ac') return '<td class="na">—</td>';
      if (kind === 'sel') return `<td><select data-i="${i}" data-k="${k}">${opts.map(o => `<option value="${o[0]}" ${c[k] === o[0] ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></td>`;
      return `<td><input type="number" step="any" data-i="${i}" data-k="${k}" value="${esc(c[k])}"></td>`;
    }
    function outCell(r, c, i) {
      const [k, , , , flag, only] = r;
      if (only === 'ac' && c.mode !== 'ac') return '<td class="na">—</td>';
      if (flag === 'dcOnly' && c.mode === 'ac') return '<td class="na">—</td>';
      if (flag === 'rev') return `<td class="o r"><input type="number" step="any" data-i="${i}" data-r="${k}"></td>`;
      return `<td class="o" data-i="${i}" data-o="${k}"></td>`;
    }
    function build() {
      const cs = cases(), rows = [];
      IN.forEach(r => { rows.push(r[0] === 'sec' ? `<tr class="sec"><td colspan="${cs.length + 1}">${r[1]}</td></tr>` : `<tr><td>${r[1]}</td>${cs.map((c, i) => inCell(r, c, i)).join('')}</tr>`); });
      OUT.forEach(r => { rows.push(r[0] === 'sec' ? `<tr class="sec"><td colspan="${cs.length + 1}">${r[1]}</td></tr>` : `<tr><td>${r[1]}</td>${cs.map((c, i) => outCell(r, c, i)).join('')}</tr>`); });
      const s = S();
      el.innerHTML = `<h3>⚡ হাইব্রিড ইনভার্টার · ব্যাটারি · সোলার ক্যালকুলেটর</h3>
        <p class="note" style="margin:0 0 10px">প্রতিটি কলাম একটি আলাদা হিসাব (কেস)। সাদা ঘরে মান বদলান — নীল ঘরে ফলাফল আসবে। ✎ চিহ্নিত নীল ঘরে লিখলেও চলে: যেমন ব্যাটারি কারেন্ট লিখলে লোড (W) বের হবে, ব্যাকআপ ঘণ্টা লিখলে কত Ah ব্যাটারি লাগবে তা বসে যাবে। উদাহরণ: ১২V ব্যাটারি, ২০০W লোড।</p>
        <div class="tw"><table class="hy"><thead>${head()}</thead><tbody>${rows.join('')}</tbody></table></div>
        <div class="row" style="margin-top:10px"><button class="btn pri" id="hy_add">＋ নতুন কেস (কলাম)</button><button class="btn" id="hy_dup">⎘ প্রথম কেস কপি</button></div>
        <h4>📋 ওয়াট অনুযায়ী ব্যাকআপ টেবিল</h4>
        <div class="row" style="align-items:center;margin-bottom:6px"><div style="max-width:300px"><label>কোন কেসের ব্যাটারি/ভোল্ট ধরে হিসাব</label><select id="hy_sel">${cs.map((c, i) => `<option value="${i}" ${i === s.sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div><button class="btn sm" id="hy_wadd">＋ সারি</button></div>
        <div class="tw"><table class="hy2"><thead><tr><th>লোড (W) — বদলান</th><th>ব্যাটারি কারেন্ট (A)</th><th>AC কারেন্ট (A)</th><th>ব্যাকআপ</th><th>দিনে খরচ (Wh)</th><th>প্রয়োজনীয় প্যানেল (W)</th><th></th></tr></thead><tbody id="hy_wb"></tbody></table></div>
        <h4>☀ সূর্যালোকের তেজ — কী দিয়ে, কীভাবে মাপে</h4>
        <div class="note" style="line-height:1.8;margin:0">
          • সূর্যালোকের তেজকে বলে <b>সৌর বিকিরণ (Irradiance)</b>; একক <b>W/m²</b> (ওয়াট প্রতি বর্গমিটার)। প্যানেলের রেটিং ধরা হয় ১০০০ W/m²-তে (STC)।<br>
          • মাপার যন্ত্র: <b>পাইরানোমিটার</b> বা <b>সোলার পাওয়ার মিটার</b> (W/m² সরাসরি দেখায়)। মোবাইল লাক্স-মিটার অ্যাপে মোটামুটি আন্দাজ হয়: ১০০০ W/m² ≈ ১,০০,০০০–১,২০,০০০ lux।<br>
          • আনুমানিক তেজ: ভোর/সন্ধ্যা ১০০–৩০০ · মেঘলা ১০০–৪০০ · সাধারণ রোদ ৬০০–৮০০ · ভরদুপুর (পরিষ্কার আকাশ) ৯০০–১১০০ W/m²।<br>
          • <b>পিক সান আওয়ার (PSH)</b> = সারাদিনের মোট সূর্যালোককে ১০০০ W/m² ধরে কত ঘণ্টা হয়। বাংলাদেশে সাধারণত ৪–৫.৫ ঘণ্টা। প্যানেলের বাস্তব আউটপুট = প্যানেল W × (তেজ ÷ ১০০০) × (১ − লস)।
        </div>`;
      paint(); wBody();
    }
    const fmt = (k, v, dec) => !isFinite(v) ? '∞' : f(v, dec);
    function paint(skip) {
      cases().forEach((c, i) => {
        const R = calc(c);
        OUT.forEach(r => {
          const [k, , dec, , flag] = r; if (k === 'sec') return;
          if (flag === 'rev') {
            const inp = $(`input[data-i="${i}"][data-r="${k}"]`, el); if (!inp || inp === skip) return;
            const v = k === 'Ib' ? R.Ib : k === 'Iac' ? R.Iac : R.hrs; inp.value = isFinite(v) ? Math.round(v * 1000) / 1000 : ''; return;
          }
          const td = $(`td[data-i="${i}"][data-o="${k}"]`, el); if (!td) return;
          td.textContent = flag === 'time' ? SL.fmtHM(R.hrs) : fmt(k, R[k], dec);
        });
        const sc = $(`td[data-o="Ich"][data-i="${i}"]`, el); if (sc) sc.style.color = R.Ich > R.Imax * 1.001 && R.Imax > 0 ? 'var(--bad)' : '';
      });
      wBody();
    }
    function wBody() {
      const s = S(), c = s.cases[Math.min(s.sel, s.cases.length - 1)], tb = $('#hy_wb', el); if (!tb || !c) return;
      const act = document.activeElement;
      if (tb.contains(act) && act.dataset.w != null) {
        // টাইপ করার সময় ওই সারির শুধু হিসাব বদলাবে
        s.w.forEach((w, j) => fillW(j, c));
        return;
      }
      tb.innerHTML = s.w.map((w, j) => `<tr data-j="${j}"><td><input type="number" step="any" data-w="${j}" value="${esc(w)}"></td><td class="o"></td><td class="o"></td><td class="o"></td><td class="o"></td><td class="o"></td><td><button class="btn sm bad" data-wdel="${j}">✕</button></td></tr>`).join('');
      s.w.forEach((w, j) => fillW(j, c));
    }
    function fillW(j, c) {
      const tr = $(`#hy_wb tr[data-j="${j}"]`, el); if (!tr) return; const R = calc(Object.assign({}, c, { W: S().w[j] })), t = $$('td.o', tr);
      t[0].textContent = f(R.Ib, 2); t[1].textContent = R.Iac == null ? '—' : f(R.Iac, 2); t[2].textContent = SL.fmtHM(R.hrs); t[3].textContent = f(R.eday, 0) + ' Wh'; t[4].textContent = isFinite(R.pvReq) ? f(R.pvReq, 0) + ' W' : '—';
    }
    function setIn(i, k, v) { const inp = $(`[data-i="${i}"][data-k="${k}"]`, el); if (inp) inp.value = Math.round(v * 1000) / 1000; }

    el.addEventListener('input', e => {
      const t = e.target, cs = cases();
      if (t.dataset.w != null) { S().w[+t.dataset.w] = t.value; persist(); const c = cs[Math.min(S().sel, cs.length - 1)]; fillW(+t.dataset.w, c); return; }
      if (t.dataset.r) { // উল্টো হিসাব
        const i = +t.dataset.i, c = cs[i], v = n(t.value), V = n(c.V) || 1, eff = (n(c.eff) || 100) / 100;
        if (t.dataset.r === 'Ib') { c.W = Math.round(v * V * eff * 1000) / 1000; setIn(i, 'W', c.W); }
        else if (t.dataset.r === 'Iac') { c.W = Math.round(v * (n(c.vac) || 220) * (n(c.pf) || 1) * 1000) / 1000; setIn(i, 'W', c.W); }
        else if (t.dataset.r === 'hrs' && v > 0) {
          const T = SL.BTYPES[c.type] || SL.BTYPES.acid, Pin = n(c.W) / eff, dod = n(c.dod) / 100; let Ah = 0;
          if (Pin > 0 && dod > 0) { Ah = v * Pin / (V * dod); for (let k = 0; k < 6; k++) { const fp = Math.min(1, Math.pow(Ah / ((Pin / V) * 20), T.k - 1)); Ah = v * Pin / (V * dod * fp); } }
          c.Ah = Math.round(Ah * 100) / 100; setIn(i, 'Ah', c.Ah);
        }
        persist(); paint(t); return;
      }
      if (t.dataset.k) { cs[+t.dataset.i][t.dataset.k] = t.dataset.k === 'name' ? t.value : t.value; persist(); paint(); if (t.dataset.k === 'name') { const so = $('#hy_sel', el); if (so) so.options[+t.dataset.i].text = t.value; } }
    });
    el.addEventListener('change', e => {
      const t = e.target, cs = cases();
      if (t.id === 'hy_sel') { S().sel = +t.value; persist(); wBody(); return; }
      if (t.tagName === 'SELECT' && t.dataset.k) {
        const c = cs[+t.dataset.i]; c[t.dataset.k] = t.value;
        if (t.dataset.k === 'type') { const T = SL.BTYPES[t.value]; c.dod = T.dod; c.beff = T.eff; }
        if (t.dataset.k === 'mode') c.eff = t.value === 'dc' ? 100 : 90;
        persist(); build();
      }
    });
    el.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const cs = cases();
      if (b.id === 'hy_add') { cs.push(defCase(cs.length)); persist(); build(); }
      else if (b.id === 'hy_dup') { const c = Object.assign({}, cs[0], { name: 'কেস ' + SL.bn(cs.length + 1) }); cs.push(c); persist(); build(); }
      else if (b.id === 'hy_wadd') { const w = S().w; w.push(w.length ? n(w[w.length - 1]) + 100 : 100); persist(); wBody(); }
      else if (b.dataset.del != null) { cs.splice(+b.dataset.del, 1); S().sel = 0; persist(); build(); }
      else if (b.dataset.wdel != null) { S().w.splice(+b.dataset.wdel, 1); persist(); wBody(); }
    });
    build();
    return el;
  };
})();
