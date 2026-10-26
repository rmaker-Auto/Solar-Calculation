/* notes.js — নোটপ্যাড কার্ড (স্টিকি নোট + টেনে সরানো যায় এমন এডিটর পপআপ) */
(function () {
  'use strict';
  const A = window.App, { esc, uid, now, num } = SL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CARDC = ['#f1dfae', '#fff3a8', '#d7f3d7', '#d6e8ff', '#ffdbe9', '#e9ddff', '#ffe2c6', '#e7e7e7', '#ffffff'];
  const TCOL = ['#000000', '#d32f2f', '#2e7d46', '#1565c0', '#ef6c00', '#7b1fa2', '#00838f'];
  const MARK = ['#fff176', '#ffab91', '#a5d6a7', '#90caf9', '#ffcc80', '#ce93d8', '#e0e0e0'];
  const col = (c, d) => /^#[0-9a-f]{3,8}$/i.test(c || '') ? c : d;

  /* ===== নিরাপদ HTML পরিষ্কারক ===== */
  const OK = { B: 1, STRONG: 1, U: 1, I: 1, EM: 1, BR: 1, DIV: 1, P: 1, SPAN: 1, UL: 1, OL: 1, LI: 1, INPUT: 1, FONT: 1 };
  const SAFE_PROPS = { 'color': 1, 'background-color': 1, 'font-size': 1, 'font-weight': 1, 'text-decoration': 1, 'text-decoration-line': 1, 'list-style-type': 1, 'text-align': 1 };
  function safeStyle(s) {
    return String(s || '').split(';').map(x => { const i = x.indexOf(':'); if (i < 0) return ''; const k = x.slice(0, i).trim().toLowerCase(), v = x.slice(i + 1).trim(); return SAFE_PROPS[k] && /^[#\w\s.,()%-]+$/.test(v) && !/expression|url/i.test(v) ? k + ':' + v : ''; }).filter(Boolean).join(';');
  }
  function clean(html) {
    const t = document.createElement('template'); t.innerHTML = html || '';
    (function walk(n) {
      [...n.childNodes].forEach(ch => {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1) { ch.remove(); return; }
        const tag = ch.tagName;
        if (!OK[tag]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|LINK|META|SVG|IMG|VIDEO|AUDIO|FORM|TEXTAREA|SELECT|BUTTON)$/.test(tag)) { ch.remove(); return; } walk(ch); while (ch.firstChild) n.insertBefore(ch.firstChild, ch); ch.remove(); return; }
        if (tag === 'INPUT') { if (ch.getAttribute('type') !== 'checkbox') { ch.remove(); return; } const c = ch.hasAttribute('checked'); [...ch.attributes].forEach(a => ch.removeAttribute(a.name)); ch.setAttribute('type', 'checkbox'); if (c) ch.setAttribute('checked', ''); return; }
        const st = safeStyle(ch.getAttribute('style')), sz = ch.getAttribute('size'), fc = ch.getAttribute('color');
        [...ch.attributes].forEach(a => ch.removeAttribute(a.name));
        if (tag === 'FONT') { if (/^[1-7]$/.test(sz || '')) ch.setAttribute('size', sz); if (/^#[0-9a-f]{3,8}$/i.test(fc || '')) ch.setAttribute('color', fc); }
        if (st) ch.setAttribute('style', st);
        walk(ch);
      });
    })(t.content);
    return t.innerHTML;
  }
  function noteText(html) {
    const t = document.createElement('template'); t.innerHTML = clean(html); const r = t.content;
    r.querySelectorAll('input[type=checkbox]').forEach(c => c.replaceWith(c.hasAttribute('checked') ? '☑ ' : '☐ '));
    r.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
    r.querySelectorAll('div,p,li').forEach(e => e.append('\n'));
    return r.textContent.replace(/\n{3,}/g, '\n\n').trim();
  }
  A.noteText = noteText; A.cleanHtml = clean;

  /* ===== ফটো গ্যালারি পপআপ (একটির পর একটি) — নোটপ্যাড ও প্রোডাক্ট ক্রয় দুজনেই ব্যবহার করে ===== */
  A.gallery = function (pics, o) {
    o = o || {}; let i = Math.max(0, Math.min(o.start || 0, pics.length - 1)); if (!pics.length && !o.prefix) return;
    const btns = [];
    if (o.prefix) btns.push({ t: '＋ ফটো যোগ করুন', cls: 'pri', close: false, fn: () => $('#gl_f', v.el).click() });
    btns.push({ t: '🗑 এই ছবি মুছুন', cls: 'bad', close: false, fn: () => { if (!pics.length) return; pics.splice(i, 1); i = Math.max(0, Math.min(i, pics.length - 1)); o.onChange && o.onChange(); if (!pics.length && !o.prefix) { v.close(); return; } show(); } }, { t: 'বন্ধ' });
    const v = A.dlg({ title: '', w: 1000, html: `<div class="gal"><button class="btn go" data-d="-1">◀</button><div id="gv"></div><button class="btn go" data-d="1">▶</button></div><input type="file" id="gl_f" accept="image/*" multiple hidden>`, buttons: btns });
    const show = () => {
      const p = pics[i];
      $('#gv', v.el).innerHTML = !pics.length ? '<p class="note" style="text-align:center">কোনো ছবি নেই — "ফটো যোগ করুন" চাপুন</p>' : (p.img ? `<img src="${esc(p.img)}" alt="">` : '<p class="note" style="text-align:center">☁ ছবি Google থেকে আসছে…</p>');
      $('.dh b', v.el).textContent = pics.length ? `ছবি ${SL.bn(i + 1)} / ${SL.bn(pics.length)}` : 'ছবি';
      $$('.go', v.el).forEach(b => { b.style.visibility = pics.length > 1 ? '' : 'hidden'; });
    };
    const go = d => { if (pics.length < 2) return; i = (i + d + pics.length) % pics.length; show(); };
    v.el.addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) go(+b.dataset.d); });
    const kh = e => { if (!v.el.isConnected) { document.removeEventListener('keydown', kh); return; } if (e.target.closest && e.target.closest('input,textarea,[contenteditable]')) return; if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'ArrowRight') go(1); };
    document.addEventListener('keydown', kh);
    const fi = $('#gl_f', v.el);
    fi.onchange = async e => {
      const fl = [...e.target.files]; e.target.value = '';
      for (const f1 of fl) { try { const img = await A.imgToData(f1, 1600, 0.82); pics.push({ imn: o.prefix + SL.hash53(img), img }); } catch (er) { A.toast(er.message); } }
      if (fl.length) { i = pics.length - 1; o.onChange && o.onChange(); show(); }
    };
    show(); return v;
  };

  /* ===== এডিটর পপআপ ===== */
  function openNote(id) {
    const D0 = A.D(), old = id ? D0.notes.find(x => x.id === id) : null, nid = old ? old.id : uid();
    const st = { tc: col(old && old.tc, '#000000'), cc: col(old && old.cc, CARDC[0]), pics: old ? (old.pics || []).map(p => ({ imn: p.imn || '', img: p.img || '' })) : [] };
    const no0 = old ? old.no : Math.max(0, ...D0.notes.map(x => num(x.no))) + 1;
    const dots = (grp, arr) => arr.map(c => `<button type="button" class="cc ${(grp === 'tc' && c === st.tc) || (grp === 'cc' && c === st.cc) ? 'on' : ''}" data-g="${grp}" data-c="${c}" style="background:${c}" title="${c}"></button>`).join('');
    const dlg = A.dlg({
      title: '📝 ' + esc(old ? (old.title || 'নোট সম্পাদনা') : 'নতুন নোট'), w: 960,
      html: `<div class="grid" style="grid-template-columns:90px 170px 1fr"><div><label>নম্বর</label><input id="nn_no" type="number" value="${no0}"></div><div><label>তারিখ</label><input id="nn_dt" type="date" value="${esc(old ? old.date : SL.ymd())}"></div><div><label>টাইটেল</label><input id="nn_t" value="${esc(old ? old.title : '')}" autocomplete="off"></div></div>
      <div class="colrow"><span>টাইটেল রং:</span>${dots('tc', TCOL)}<span style="margin-left:12px">কার্ডের রং:</span>${dots('cc', CARDC)}</div>
      <div class="colrow"><span>লেখার রং:</span>${TCOL.map(c => `<button type="button" class="cc" data-g="fg" data-c="${c}" style="background:${c}"></button>`).join('')}<button type="button" class="btn sm" data-g="fg" data-c="#000000">✕ লেখার রং মুছুন</button>
        <span style="margin-left:12px">মার্ক:</span>${MARK.map(c => `<button type="button" class="cc" data-g="mk" data-c="${c}" style="background:${c}"></button>`).join('')}<button type="button" class="btn sm" data-g="mk" data-c="transparent">✕ মার্ক মুছুন</button></div>
      <div class="edtools"><button type="button" class="btn sm" data-x="bold"><b>B</b></button><button type="button" class="btn sm" data-x="underline"><u>U</u></button>
        <select id="nn_sz" title="লেখার মাপ"><option value="">মাপ</option><option value="2">ছোট</option><option value="3">সাধারণ</option><option value="5">বড়</option><option value="6">অনেক বড়</option></select>
        <button type="button" class="btn sm" data-x="check">☑ চেক-লাইন</button><button type="button" class="btn sm" data-x="disc">● গোল</button><button type="button" class="btn sm" data-x="square">▪ চৌকো</button><button type="button" class="btn sm" data-x="ol">1. নম্বর</button></div>
      <div class="ed" id="nn_ed" contenteditable="true" spellcheck="false"></div>
      <div class="row" style="margin-top:10px;align-items:center"><div id="nn_pv" style="flex:none;min-width:0"></div><button type="button" class="btn sm" id="nn_ph">📷 ফটো যোগ করুন (একাধিক)</button><span class="note" id="nn_pc" style="margin:0"></span><input type="file" id="nn_pf" accept="image/*" multiple hidden></div>`,
      buttons: [
        { t: '💾 সংরক্ষণ', cls: 'pri', fn: a => save(a) },
        ...(old ? [{ t: '🗑 ডিলিট', cls: 'bad', close: false, fn: async a => { if (await A.ask('এই নোটটি মুছে ফেলবেন?', { danger: true, ok: 'মুছুন' })) { const D = A.D(); D.tomb[nid] = now(); D.notes = D.notes.filter(x => x.id !== nid); A.save(); a.close(); A.refresh(); } } }] : []),
        { t: 'বন্ধ' }
      ]
    });
    const el = dlg.el, ed = $('#nn_ed', el); ed.innerHTML = clean(old ? old.html : '');
    let saved = null;
    document.addEventListener('selectionchange', function h() { if (!el.isConnected) { document.removeEventListener('selectionchange', h); return; } const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); });
    function exec(cmd, val) {
      ed.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); }
      try { document.execCommand('styleWithCSS', false, true); } catch (e) { }
      document.execCommand(cmd, false, val);
    }
    const inList = () => { const s = getSelection(); let n = s.anchorNode; while (n && n !== ed) { if (n.nodeType === 1 && /^(UL|OL)$/.test(n.tagName)) return n; n = n.parentNode; } return null; };
    function paintPv() {
      const pv = $('#nn_pv', el), n = st.pics.length, f0 = st.pics[0];
      pv.innerHTML = n ? `<div class="thumb" id="nn_th" title="বড় করে দেখুন">${f0.img ? `<img src="${esc(f0.img)}" alt="">` : '☁'}${n > 1 ? `<b>${n}</b>` : ''}</div>` : '<div class="thumb" style="cursor:default;background:var(--ac)">📝</div>';
      $('#nn_pc', el).textContent = n ? `${n}টি ছবি — ছবিতে ক্লিক করলে একটির পর একটি দেখা যাবে` : '';
      const th = $('#nn_th', el); if (th) th.onclick = () => viewer(0);
    }
    function viewer(i0) { A.gallery(st.pics, { start: i0, onChange: paintPv }); }
    paintPv();
    el.addEventListener('mousedown', e => { if (e.target.closest('button[data-x],button[data-g]')) e.preventDefault(); });
    el.addEventListener('click', e => {
      const b = e.target.closest('button[data-x],button[data-g]'); if (!b) return;
      if (b.dataset.g === 'tc' || b.dataset.g === 'cc') { st[b.dataset.g] = b.dataset.c; $$(`[data-g="${b.dataset.g}"]`, el).forEach(x => x.classList.toggle('on', x === b)); return; }
      if (b.dataset.g === 'fg') { exec('foreColor', b.dataset.c); return; }
      if (b.dataset.g === 'mk') { exec('hiliteColor', b.dataset.c); return; }
      const x = b.dataset.x;
      if (x === 'bold' || x === 'underline') exec(x);
      else if (x === 'check') exec('insertHTML', '<div><input type="checkbox">&nbsp;</div>');
      else if (x === 'ol') exec('insertOrderedList');
      else if (x === 'disc' || x === 'square') { exec('insertUnorderedList'); const u = inList(); if (u && u.tagName === 'UL') u.style.listStyleType = x; }
    });
    $('#nn_sz', el).onchange = e => { if (e.target.value) exec('fontSize', e.target.value); e.target.value = ''; };
    $('#nn_ph', el).onclick = () => $('#nn_pf', el).click();
    $('#nn_pf', el).onchange = async e => {
      const fl = [...e.target.files]; e.target.value = ''; if (!fl.length) return;
      for (const f1 of fl) { try { const img = await A.imgToData(f1, 1600, 0.82); st.pics.push({ imn: 'n_' + nid + '_' + SL.hash53(img), img }); } catch (er) { A.toast(er.message); } }
      paintPv();
    };
    function save(a) {
      $$('input[type=checkbox]', ed).forEach(c => { if (c.checked) c.setAttribute('checked', ''); else c.removeAttribute('checked'); });
      const html = clean(ed.innerHTML), title = $('#nn_t', el).value.trim(), er = !html.replace(/<[^>]*>/g, '').trim() && !html.includes('<input') && !title && !st.pics.length;
      if (er) { A.toast('খালি নোট সংরক্ষণ হবে না'); return false; }
      const D = A.D(); let n = D.notes.find(x => x.id === nid);
      if (!n) { n = { id: nid }; D.notes.push(n); }
      Object.assign(n, { no: num($('#nn_no', el).value) || no0, date: $('#nn_dt', el).value || SL.ymd(), title, tc: st.tc, cc: st.cc, html, u: now() });
      n.pics = st.pics.filter(p => p.img || p.imn).map(p => ({ imn: p.imn, img: p.img }));
      delete n.imn; delete n.img;
      A.save(); A.refresh(); A.toast('নোট সংরক্ষিত হয়েছে');
    }
    setTimeout(() => $('#nn_t', el).focus(), 40);
  }

  /* ===== নোটপ্যাড পেজ ===== */
  A.reg('notes', root => {
    const dev = A.dev(), nc = dev.nc;
    const d = document.createElement('div'); d.className = 'card';
    d.innerHTML = `<h3>📝 ${esc(A.lbl('notes'))}<button class="btn pri sm" id="nn" style="margin-left:auto">＋ নতুন এন্ট্রি</button></h3>
      <div class="ntools"><div class="s"><label>🔍 খুঁজুন (টাইটেল বা নোটের লেখা)</label><input id="nq" placeholder="যা খুঁজতে চান লিখুন…" autocomplete="off"></div><div><label>তারিখ থেকে</label><input type="date" id="nf"></div><div><label>পর্যন্ত</label><input type="date" id="nt"></div><div style="flex:none;min-width:0"><button class="btn sm" id="nclr">✕ ক্লিয়ার</button></div></div>
      <div class="sliders"><div><label>কার্ডের মাপ (চওড়া) — বড় করলে লেখা ধীরে ধীরে বের হবে</label><input type="range" id="scw" min="130" max="480" value="${nc.cw}"></div></div>
      <div class="nwrap" id="nw"></div>`;
    root.appendChild(d);
    const nw = $('#nw', d), setSz = () => { nw.style.setProperty('--cw', nc.cw + 'px'); }; setSz();
    $('#scw', d).oninput = e => { nc.cw = +e.target.value; setSz(); A.saveDev(); };
    function paint() {
      const q = $('#nq', d).value.trim().toLowerCase(), f1 = $('#nf', d).value, f2 = $('#nt', d).value;
      const list = A.D().notes.filter(n => {
        if (f1 && (n.date || '') < f1) return false; if (f2 && (n.date || '') > f2) return false;
        if (!q) return true; return ((n.title || '') + ' ' + noteText(n.html) + ' ' + (n.no || '')).toLowerCase().includes(q);
      }).sort((a, b) => num(b.no) - num(a.no) || (b.u || 0) - (a.u || 0));
      nw.innerHTML = list.map(n => `<div class="nc" data-id="${esc(n.id)}" style="background:${col(n.cc, CARDC[0])}"><div class="ic"><button data-e title="সম্পাদনা">✎</button><button data-d title="মুছুন">🗑</button></div>
        <div class="ln"><b>নং:</b> ${esc(n.no)}</div><div class="ln"><b>তারিখ:</b> ${esc(A.fd(n.date))}</div><div class="tt" style="color:${col(n.tc, '#000')}" title="${esc(n.title || '')}"><b>টাইটেল:</b> ${esc(n.title || '—')}</div></div>`).join('') || '<p class="note" style="margin:6px">কোনো নোট নেই — "নতুন এন্ট্রি" চাপুন।</p>';
    }
    paint();
    ['nq', 'nf', 'nt'].forEach(i => { $('#' + i, d).oninput = paint; });
    $('#nclr', d).onclick = () => { ['nq', 'nf', 'nt'].forEach(i => { $('#' + i, d).value = ''; }); paint(); };
    $('#nn', d).onclick = () => openNote();
    nw.onclick = async e => {
      const c = e.target.closest('.nc'); if (!c) return; const id = c.dataset.id;
      if (e.target.closest('[data-d]')) { if (await A.ask('এই নোটটি মুছে ফেলবেন?', { danger: true, ok: 'মুছুন' })) { const D = A.D(); D.tomb[id] = now(); D.notes = D.notes.filter(x => x.id !== id); A.save(); paint(); } return; }
      openNote(id);
    };
  });
})();
