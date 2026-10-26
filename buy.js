/* buy.js — প্রোডাক্ট ক্রয় কার্ড: টেবিল, অ্যাড/এডিট/ডিলেট, সার্চ, তারিখ সর্ট, সারির রং, নোট ও একাধিক ফটো */
(function () {
  'use strict';
  const A = window.App, { num: n, esc, f, uid, now } = SL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ROWC = ['', '#ff9a9a', '#8fdc9f', '#8bbcff', '#fff3a8', '#d7f3d7', '#d6e8ff', '#ffdbe9', '#e9ddff', '#ffe2c6', '#d9d9d9'];
  const col = c => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : '';
  const sub = b => n(b.qty) * n(b.rate), tot = b => sub(b) + n(b.fare);
  const cur = () => (A.P().cfg.cur || '৳');
  const B = () => A.D().buys;
  const cmp = (a, b) => (a.date || '').localeCompare(b.date || '') || (a.c || a.u || 0) - (b.c || b.u || 0);
  // তারিখ অনুযায়ী স্বয়ংক্রিয় সিরিয়াল (সবচেয়ে পুরনো = ১)
  function ranks(list) { const m = new Map(); list.slice().sort(cmp).forEach((b, i) => m.set(b.id, i + 1)); return m; }
  A.buyRanks = ranks; A.buyTotals = { sub, tot };
  let sel = new Set();

  /* ---------- এন্ট্রি পপআপ (যোগ / সম্পাদনা) ---------- */
  function entryDlg(old, done) {
    const id = old ? old.id : uid(), st = { pics: old ? (old.pics || []).map(p => ({ imn: p.imn || '', img: p.img || '' })) : [], mark: old ? col(old.mark) : '' };
    const serial = dt => { const others = B().filter(x => x.id !== id), c0 = old ? (old.c || old.u) : now(); return others.filter(x => (x.date || '') < dt || ((x.date || '') === dt && (x.c || x.u || 0) < c0)).length + 1; };
    const d = A.dlg({
      title: old ? '✎ এন্ট্রি সম্পাদনা' : '＋ নতুন ক্রয় এন্ট্রি', w: 680,
      html: `<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        <div><label>সিরিয়াল নম্বর (স্বয়ংক্রিয়)</label><input id="e_sn" readonly></div><div><label>তারিখ</label><input id="e_dt" type="date" value="${esc(old ? old.date : SL.ymd())}"></div>
        <div style="grid-column:span 2"><label>প্রোডাক্ট নেম</label><input id="e_nm" value="${esc(old ? old.name : '')}" autocomplete="off"></div>
        <div><label>কোয়ান্টিটি</label><input id="e_q" type="number" step="any" value="${esc(old ? old.qty : '1')}"></div><div><label>রেট</label><input id="e_r" type="number" step="any" value="${esc(old ? old.rate : '')}"></div>
        <div><label>সাবটোটাল (স্বয়ংক্রিয়)</label><input id="e_s" readonly></div><div><label>যাতায়াত খরচ</label><input id="e_f" type="number" step="any" value="${esc(old ? old.fare : '')}"></div>
        <div style="grid-column:span 2"><label>টোটাল (স্বয়ংক্রিয়)</label><input id="e_t" readonly style="font-weight:700"></div></div>
      <label style="margin-top:10px">নোট</label><textarea id="e_n" rows="4" style="resize:vertical">${esc(old ? old.note : '')}</textarea>
      <label style="margin-top:10px">ফটো (একাধিক)</label><div class="row" style="align-items:center" id="e_ph"></div>
      <label style="margin-top:10px">সারির রং</label><div class="colrow" id="e_c" style="margin:2px 0"></div><input type="file" id="e_pf" accept="image/*" multiple hidden>`,
      buttons: [{ t: '💾 সংরক্ষণ', cls: 'pri', fn: a => {
        const g = i => $('#' + i, a.el).value, nm = g('e_nm').trim();
        if (!nm) { A.toast('প্রোডাক্টের নাম লিখুন'); return false; }
        const D = A.D(); let b = D.buys.find(x => x.id === id);
        if (!b) { b = { id, c: now() }; D.buys.push(b); }
        Object.assign(b, { date: g('e_dt') || SL.ymd(), name: nm, qty: g('e_q'), rate: g('e_r'), fare: g('e_f'), note: g('e_n'), mark: st.mark, u: now() });
        b.pics = st.pics.filter(p => p.img || p.imn).map(p => ({ imn: p.imn, img: p.img }));
        A.save(); sel = new Set([id]); done && done(); A.toast('সংরক্ষিত হয়েছে');
      } }, { t: 'বন্ধ' }]
    });
    const el = d.el;
    const calc = () => { const q = n($('#e_q', el).value), r = n($('#e_r', el).value), fr = n($('#e_f', el).value); $('#e_s', el).value = f(q * r); $('#e_t', el).value = cur() + f(q * r + fr); $('#e_sn', el).value = SL.bn(serial($('#e_dt', el).value || SL.ymd())); };
    ['e_q', 'e_r', 'e_f', 'e_dt'].forEach(i => $('#' + i, el).addEventListener('input', calc)); calc();
    const paintC = () => { $('#e_c', el).innerHTML = ROWC.map(c => `<button type="button" class="cc ${c === st.mark ? 'on' : ''}" data-c="${c}" title="${c ? c : 'রং নেই'}" style="background:${c || '#fff'}">${c ? '' : '✕'}</button>`).join(''); };
    paintC(); $('#e_c', el).onclick = e => { const b = e.target.closest('button'); if (!b) return; st.mark = b.dataset.c; paintC(); };
    const paintP = () => {
      $('#e_ph', el).innerHTML = (st.pics.length ? `<div class="thumb sm" style="margin:0;width:44px;height:44px;flex:none;min-width:0" data-v title="${st.pics.length}টি ছবি — ক্লিক করে সব দেখুন">${st.pics[0].img ? `<img src="${esc(st.pics[0].img)}" alt="">` : '☁'}${st.pics.length > 1 ? `<b>${st.pics.length}</b>` : ''}</div>` : '') + '<button type="button" class="btn sm" id="e_pa">📷 ফটো যোগ করুন</button>';
      $('#e_pa', el).onclick = () => $('#e_pf', el).click();
    };
    paintP();
    $('#e_ph', el).addEventListener('click', e => {
      if (e.target.closest('[data-v]')) A.gallery(st.pics, { prefix: 'b_' + id + '_', onChange: paintP });
    });
    $('#e_pf', el).onchange = async e => {
      const fl = [...e.target.files]; e.target.value = '';
      for (const f1 of fl) { try { const img = await A.imgToData(f1, 1600, 0.82); st.pics.push({ imn: 'b_' + id + '_' + SL.hash53(img), img }); } catch (er) { A.toast(er.message); } }
      paintP();
    };
    setTimeout(() => $('#e_nm', el).focus(), 40);
  }

  /* ---------- নোট পপআপ ---------- */
  function noteDlg(id, done, key) {
    key = key || 'note';
    const b = B().find(x => x.id === id); if (!b) return;
    A.dlg({
      title: key === 'name' ? '🏷 প্রোডাক্টের নাম' : '📝 নোট — ' + esc(b.name || ''), w: 560, html: `<textarea id="bn_t" rows="${key === 'name' ? 4 : 10}" style="resize:vertical;background:#fff">${esc(b[key] || '')}</textarea>`,
      onMount: a => setTimeout(() => { const t = $('#bn_t', a.el); t.focus(); t.setSelectionRange(t.value.length, t.value.length); }, 40),
      buttons: [{ t: '💾 সংরক্ষণ', cls: 'pri', fn: a => { const c = B().find(x => x.id === id); if (c) { c[key] = $('#bn_t', a.el).value; c.u = now(); A.save(); done && done(); } } }, { t: 'বন্ধ' }]
    });
  }

  /* ---------- পেজ ---------- */
  A.reg('buy', root => {
    const dir = () => A.M().buyDir || 'asc';
    const d = document.createElement('div'); d.className = 'card buyc';
    d.innerHTML = `<h3>🛒 ${esc(A.lbl('buy'))}</h3>
      <div class="grid bk" id="bk"></div>
      <div class="btool"><button class="btn pri" id="ba">＋ অ্যাড এন্ট্রি</button><button class="btn" id="be">✎ এডিট</button><button class="btn bad" id="bdel">🗑 ডিলেট</button><button class="btn" id="bc">🎨 রং দিন</button><span class="note" id="bsel" style="margin:0"></span></div>
      <div class="ntools" style="margin-bottom:10px"><div class="s"><label>🔍 প্রোডাক্টের নাম খুঁজুন</label><input id="bq" placeholder="প্রোডাক্টের নাম লিখুন…" autocomplete="off"></div><div><label>তারিখ থেকে</label><input type="date" id="bf"></div><div><label>পর্যন্ত</label><input type="date" id="bt"></div><div style="flex:none;min-width:0"><button class="btn sm" id="bx">✕ সার্চ ক্লিয়ার</button></div></div>
      <div class="tw buyw"><table class="buy"><colgroup><col style="width:6%"><col style="width:10%"><col style="width:21%"><col style="width:8%"><col style="width:9%"><col style="width:10%"><col style="width:9%"><col style="width:10%"><col style="width:12%"><col style="width:5%"></colgroup>
      <thead><tr><th>সিরিয়াল নম্বর</th><th class="srt" id="bth" title="ক্লিক করলে সর্ট বদলাবে"></th><th>প্রোডাক্ট নেম</th><th>কোয়ান্টিটি</th><th>রেট</th><th>সাবটোটাল</th><th>যাতায়াত খরচ</th><th>টোটাল</th><th>নোট</th><th>ফটো</th></tr></thead><tbody id="bb"></tbody><tfoot id="bfoot"></tfoot></table></div>
      <p class="note">সারিতে ক্লিক করে সিলেক্ট করুন (একাধিকের জন্য Ctrl/Shift চেপে ক্লিক) → এডিট / ডিলেট / রং দিন। যেকোনো ঘরে সরাসরি লিখতে পারবেন; সাবটোটাল ও টোটাল নিজে হিসাব হয়। নোট বা ফটোতে ক্লিক করলে পপআপ খুলবে।</p>`;
    root.appendChild(d);
    const tb = $('#bb', d);
    const view = () => {
      const q = $('#bq', d).value.trim().toLowerCase(), f1 = $('#bf', d).value, f2 = $('#bt', d).value;
      const l = B().filter(b => (!q || (b.name || '').toLowerCase().includes(q)) && (!f1 || (b.date || '') >= f1) && (!f2 || (b.date || '') <= f2)).sort(cmp);
      return dir() === 'desc' ? l.reverse() : l;
    };
    const thumbHTML = b => { const p = (b.pics || []); return p.length ? `<div class="thumb sm" data-ph title="${p.length}টি ছবি">${p[0].img ? `<img src="${esc(p[0].img)}" alt="">` : '☁'}${p.length > 1 ? `<b>${p.length}</b>` : ''}</div>` : '<button class="btn sm" data-ph title="ফটো যোগ করুন" style="padding:2px 8px;min-height:28px">📷</button>'; };
    const rowHTML = (b, rk) => `<tr data-id="${esc(b.id)}" class="${sel.has(b.id) ? 'sel' : ''}" style="${col(b.mark) ? 'background:' + col(b.mark) : ''}"><td class="sn">${SL.bn(rk)}</td>
      <td class="nt"><div class="clip" data-date title="ক্লিক করে তারিখ বদলান">${esc(A.fd(b.date) || b.date || '—')}</div></td><td class="nt"><div class="clip" data-name title="ক্লিক করে পুরো নাম দেখুন/লিখুন">${b.name ? esc(String(b.name).replace(/\s+/g, ' ')) : '<span class="ph0">＋ নাম</span>'}</div></td>
      <td><input type="number" step="any" data-k="qty" value="${esc(b.qty ?? '')}"></td><td><input type="number" step="any" data-k="rate" value="${esc(b.rate ?? '')}"></td><td class="c st">${f(sub(b))}</td>
      <td><input type="number" step="any" data-k="fare" value="${esc(b.fare ?? '')}"></td><td class="c tt">${f(tot(b))}</td>
      <td class="nt"><div class="clip" data-note title="ক্লিক করে পুরো নোট দেখুন/লিখুন">${b.note ? esc(String(b.note).replace(/\s+/g, ' ')) : '<span class="ph0">＋ নোট</span>'}</div></td><td class="ph">${thumbHTML(b)}</td></tr>`;
    function totals() {
      const l = view(), S = l.reduce((a, b) => a + sub(b), 0), F = l.reduce((a, b) => a + n(b.fare), 0), T = S + F, c = cur();
      $('#bfoot', d).innerHTML = `<tr><th colspan="5" style="text-align:right">মোট (${SL.bn(l.length)}টি এন্ট্রি)</th><th class="c">${c}${f(S)}</th><th class="c">${c}${f(F)}</th><th class="c">${c}${f(T)}</th><th colspan="2"></th></tr>`;
      $('#bk', d).innerHTML = `<div class="kpi"><span>এন্ট্রি</span><b>${SL.bn(l.length)}</b></div><div class="kpi"><span>প্রোডাক্ট খরচ</span><b>${c}${f(S)}</b></div><div class="kpi"><span>যাতায়াত খরচ</span><b>${c}${f(F)}</b></div><div class="kpi ok"><span>সর্বমোট</span><b>${c}${f(T)}</b></div>`;
    }
    function selInfo() { $('#bsel', d).textContent = sel.size ? `${SL.bn(sel.size)}টি সারি সিলেক্ট করা` : 'কোনো সারি সিলেক্ট নেই'; $$('tr[data-id]', tb).forEach(r => r.classList.toggle('sel', sel.has(r.dataset.id))); }
    function paint() {
      const all = B(), rk = ranks(all); sel = new Set([...sel].filter(i => all.some(b => b.id === i)));
      tb.innerHTML = view().map(b => rowHTML(b, rk.get(b.id))).join('') || '<tr><td colspan="10" class="note" style="padding:16px;text-align:center">কোনো এন্ট্রি নেই — "অ্যাড এন্ট্রি" চাপুন</td></tr>';
      $('#bth', d).textContent = 'তারিখ ' + (dir() === 'asc' ? '▲' : '▼'); totals(); selInfo();
    }
    paint();
    $('#bth', d).onclick = () => { A.M().buyDir = dir() === 'asc' ? 'desc' : 'asc'; A.saveDev(); paint(); };
    ['bq', 'bf', 'bt'].forEach(i => { $('#' + i, d).oninput = paint; });
    $('#bx', d).onclick = () => { ['bq', 'bf', 'bt'].forEach(i => { $('#' + i, d).value = ''; }); paint(); };
    $('#ba', d).onclick = () => entryDlg(null, paint);
    $('#be', d).onclick = () => { if (sel.size !== 1) { A.toast('একটি সারিতে ক্লিক করে সিলেক্ট করুন, তারপর এডিট চাপুন'); return; } entryDlg(B().find(b => b.id === [...sel][0]), paint); };
    $("#bdel", d).onclick = async () => {
      if (!sel.size) { A.toast('আগে সারিতে ক্লিক করে সিলেক্ট করুন'); return; }
      if (!(await A.ask(`${SL.bn(sel.size)}টি সারি মুছে ফেলবেন?`, { danger: true, ok: 'মুছুন' }))) return;
      const D = A.D(), t = now(); sel.forEach(i => { D.tomb[i] = t; }); D.buys = D.buys.filter(b => !sel.has(b.id)); sel = new Set(); A.save(); paint();
    };
    $('#bc', d).onclick = () => {
      if (!sel.size) { A.toast('আগে সারিতে ক্লিক করে সিলেক্ট করুন'); return; }
      const dl = A.dlg({ title: '🎨 সারির রং', w: 340, html: `<div class="colrow" style="gap:10px">${ROWC.map(c => `<button type="button" class="cc" data-c="${c}" style="background:${c || '#fff'};width:32px;height:32px">${c ? '' : '✕'}</button>`).join('')}</div><p class="note">✕ = রং মুছুন</p>` });
      dl.el.onclick = e => { const b = e.target.closest('button[data-c]'); if (!b) return; const t = now(); B().forEach(x => { if (sel.has(x.id)) { x.mark = b.dataset.c; x.u = t; } }); A.save(); dl.close(); paint(); };
    };
    // সারি নির্বাচন, নোট ও ফটো
    tb.addEventListener('click', e => {
      const tr = e.target.closest('tr[data-id]'); if (!tr) return; const id = tr.dataset.id;
      if (e.target.closest('[data-name]')) { sel = new Set([id]); selInfo(); noteDlg(id, paint, 'name'); return; }
      const dc = e.target.closest('[data-date]');
      if (dc) {
        sel = new Set([id]); selInfo(); const b = B().find(x => x.id === id), inp = document.createElement('input'); inp.type = 'date'; inp.value = b.date || ''; inp.dataset.k = 'date';
        dc.replaceWith(inp); inp.focus(); try { inp.showPicker && inp.showPicker(); } catch (er) { }
        inp.onblur = () => setTimeout(() => { if (inp.isConnected) paint(); }, 150); return;
      }
      if (e.target.closest('[data-note]')) { sel = new Set([id]); selInfo(); noteDlg(id, paint); return; }
      if (e.target.closest('[data-ph]')) { sel = new Set([id]); selInfo(); const b = B().find(x => x.id === id); A.gallery(b.pics, { prefix: 'b_' + id + '_', onChange: () => { b.u = now(); A.save(); const r = $(`tr[data-id="${id}"] .ph`, tb); if (r) r.innerHTML = thumbHTML(b); } }); return; }
      if (e.ctrlKey || e.metaKey || e.shiftKey) { if (sel.has(id)) sel.delete(id); else sel.add(id); } else sel = new Set([id]);
      selInfo();
    });
    // সরাসরি ঘরে লেখা
    tb.addEventListener('input', e => {
      const t = e.target, k = t.dataset.k; if (!k || k === 'date') return; const tr = t.closest('tr'), b = B().find(x => x.id === tr.dataset.id); if (!b) return;
      b[k] = t.value; b.u = now(); A.save(); $('.st', tr).textContent = f(sub(b)); $('.tt', tr).textContent = f(tot(b)); totals();
    });
    tb.addEventListener('change', e => {
      const t = e.target; if (t.dataset.k !== 'date') return; const tr = t.closest('tr'), b = B().find(x => x.id === tr.dataset.id); if (!b || !t.value) { if (b) t.value = b.date || ''; return; }
      b.date = t.value; b.u = now(); A.save(); paint();
    });
  });
})();
