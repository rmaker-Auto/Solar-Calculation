/* settings.js — সেটিং ও ব্যাকআপ, অ্যাপ আইকন, Google শিটের ডাটা তৈরি */
(function () {
  'use strict';
  const A = window.App, { esc, now, num } = SL;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const card = html => { const d = document.createElement('div'); d.className = 'card'; d.innerHTML = html; return d; };

  /* ===== আইকন তৈরি (canvas) ===== */
  function makeIcon(app, size, pad) {
    return new Promise(res => {
      const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
      const fin = () => res(c.toDataURL('image/png'));
      x.fillStyle = app.color || '#f2a900'; x.fillRect(0, 0, size, size);
      if (app.img) {
        const im = new Image();
        im.onload = () => { const s = Math.min(im.width, im.height), p = size * (pad || 0.1); x.drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, p, p, size - 2 * p, size - 2 * p); fin(); };
        im.onerror = fin; im.src = app.img; return;
      }
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `${Math.round(size * 0.55)}px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif`;
      x.fillText((app.emoji || '☀️').slice(0, 4), size / 2, size / 2 + size * 0.04); fin();
    });
  }
  A.makeIcon = makeIcon;
  A.applyIcons = async function () {
    try {
      const D = A.D(); if (!D) return; const url = await makeIcon(D.prefs.app, 192, 0.1);
      const f = $('#fav'), a = $('#ati'); if (f) f.href = url; if (a) a.href = url;
    } catch (e) { /* আইকন ঐচ্ছিক */ }
  };
  const dataBlob = u => { const [h, b] = u.split(','), mime = /:(.*?);/.exec(h)[1], bin = atob(b), arr = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i); return new Blob([arr], { type: mime }); };

  /* ===== Google শিটের জন্য ডাটা ===== */
  const TN = { b: 'দিন-রাত', d: 'শুধু দিন', n: 'শুধু রাত' };
  window.buildSheets = function (pd) {
    const sheets = [], loads = [], sum = [], par = [], sun = [], notes = [];
    pd.projects.forEach(p => {
      const R = SL.calc(p, 'all'), T = SL.sunTable(p, R), PB = SL.payback(p, R, T), BK = SL.backup(p, R), c = p.cfg;
      R.L.forEach(l => loads.push([p.name, l.n || '', TN[l.t] || TN.b, num(l.w), num(l.q), num(l.h), num(l.s) || 1, l.W0, l.Wh0, +(l.Wh0 * 30 / 1000).toFixed(2), +(l.Wh0 * 30 / 1000 * c.price).toFixed(2)]));
      [['মোট লোড', R.W, 'W'], ['দৈনিক ব্যবহার', +(R.Wh / 1000).toFixed(3), 'kWh'], ['মাসিক ইউনিট', +R.kwm.toFixed(2), 'kWh'], ['মাসিক খরচ', +R.month.toFixed(2), c.cur], ['প্যানেল (মোট)', Math.round(R.pvT), 'W'], ['প্যানেল সংখ্যা', R.np, 'টি'], ['ইনভার্টার', Math.round(R.invVA), 'VA'], ['ব্যাটারি ক্ষমতা', Math.round(R.bAh), 'Ah'], ['ব্যাটারি সংখ্যা', R.nb, 'টি'], ['চার্জ কন্ট্রোলার', Math.round(R.ctrl), 'A'], ['ইনস্টলেশন খরচ', Math.round(PB.total), c.cur], ['পে-ব্যাক', PB.payback == null ? '২৫+' : +PB.payback.toFixed(1), 'বছর'], ['লোডশেডিং ব্যাকআপ', isFinite(BK.hours) ? +BK.hours.toFixed(2) : 'সীমাহীন', 'ঘণ্টা']].forEach(r => sum.push([p.name].concat(r)));
      Object.keys(c).forEach(k => par.push([p.name, k, c[k]]));
      T.rows.forEach(r => sun.push([p.name, SL.BMON[r.m], num(r.sun), +r.gen.toFixed(1), +r.use.toFixed(1), +r.cov.toFixed(0)]));
    });
    const rk = A.buyRanks(pd.buys || []), buys = [];
    (pd.buys || []).slice().sort((a, b) => rk.get(a.id) - rk.get(b.id)).forEach(b => { const sb = num(b.qty) * num(b.rate); buys.push([rk.get(b.id), b.date || '', b.name || '', num(b.qty), num(b.rate), +sb.toFixed(2), num(b.fare), +(sb + num(b.fare)).toFixed(2), b.note || '', (b.pics || []).length]); });
    pd.notes.slice().sort((a, b) => num(a.no) - num(b.no)).forEach(n => notes.push([num(n.no), n.date || '', n.title || '', A.noteText(n.html)]));
    sheets.push({ name: 'লোড তালিকা', head: ['প্রজেক্ট', 'লোডের নাম', 'ধরন', 'ওয়াট', 'সংখ্যা', 'ঘণ্টা/দিন', 'স্টার্ট গুণক', 'মোট W', 'Wh/দিন', 'ইউনিট/মাস', 'খরচ/মাস'], widths: [110, 160, 80, 60, 55, 70, 80, 70, 80, 80, 80], rows: loads });
    sheets.push({ name: 'সারাংশ', head: ['প্রজেক্ট', 'বিষয়', 'মান', 'একক'], widths: [110, 160, 90, 60], rows: sum });
    sheets.push({ name: 'প্যারামিটার', head: ['প্রজেক্ট', 'প্যারামিটার', 'মান'], widths: [110, 120, 80], rows: par });
    sheets.push({ name: 'সূর্যালোক', head: ['প্রজেক্ট', 'মাস', 'সূর্যালোক ঘণ্টা', 'উৎপাদন kWh', 'ব্যবহার kWh', 'কভারেজ %'], widths: [110, 90, 100, 100, 100, 90], rows: sun });
    sheets.push({ name: 'নোটপ্যাড', head: ['নং', 'তারিখ', 'টাইটেল', 'নোট'], widths: [50, 90, 170, 340], rows: notes, noteCols: [2, 3] });
    sheets.push({ name: 'প্রোডাক্ট ক্রয়', head: ['সিরিয়াল', 'তারিখ', 'প্রোডাক্ট নেম', 'কোয়ান্টিটি', 'রেট', 'সাবটোটাল', 'যাতায়াত খরচ', 'টোটাল', 'নোট', 'ফটো'], widths: [60, 90, 180, 80, 80, 90, 90, 90, 260, 60], rows: buys, noteCols: [2, 8] });
    return { sheets };
  };

  /* ===== সহায়ক ===== */
  const GURL = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec/;
  const pw = (id, ph) => A.pwField(id, ph);

  A.reg('settings', root => {
    const D = A.D(), dev = A.dev(), m = A.M(), app = D.prefs.app;
    const touchPrefs = () => { const d = A.D(); d.prefs.u = now(); A.save(); };

    /* ---------- ১. প্রোফাইল ---------- */
    const mem = A.allMembers();
    const ageText = v => { const d = SL.parseD(v); if (!d || isNaN(d)) return ''; const n = new Date(); let y = n.getFullYear() - d.getFullYear(), mo = n.getMonth() - d.getMonth(), dd = n.getDate() - d.getDate(); if (dd < 0) { mo--; dd += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); } if (mo < 0) { y--; mo += 12; } if (y < 0) return ''; return `বয়স: ${SL.bn(y)} বছর ${SL.bn(mo)} মাস ${SL.bn(dd)} দিন · জন্ম: ${A.fd(v)}`; };
    const c1 = card(`<h3>⚙ ${esc(A.lbl('settings'))}</h3><h4 style="margin-top:0;font-size:16px">👤 প্রোফাইল</h4>
      <div class="row inl"><div><label>নাম</label><input id="sn" style="width:210px" value="${esc(D.profile.name)}" autocomplete="off"></div>
      <div><label>ছবি</label><div style="display:flex;align-items:center;gap:6px"><img id="spic" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--ln);${D.profile.pic ? '' : 'display:none'}" ${D.profile.pic ? `src="${esc(D.profile.pic)}"` : ''}><input type="file" id="spf" accept="image/*" style="width:200px;min-height:0"></div></div>
      <div><label>জন্ম তারিখ</label><input type="date" id="sdob" value="${esc(D.profile.dob || '')}"></div>
      <div class="agebox" id="sage">${esc(ageText(D.profile.dob))}</div>
      <button class="btn pri" id="ssave">💾 সেভ</button></div>
      <h4>🔑 PIN</h4><div class="row inl"><div><label>বর্তমান PIN</label>${pw('sp0')}</div><div><label>নতুন PIN</label>${pw('sp1')}</div><button class="btn" id="spc">PIN বদলান</button><button class="btn" id="srec">🗝 নতুন রিকভারি কোড</button></div><p class="err" id="spe" style="margin:4px 0 0"></p>
      <h4 style="margin-top:6px">➕ নতুন সদস্য যোগ</h4><div class="row inl"><div><label>নাম</label><input id="mn" autocomplete="off"></div><div><label>PIN</label>${pw('mp')}</div><button class="btn pri" id="madd">সদস্য যোগ করুন</button><button class="btn bad" id="sdel">এই প্রোফাইল মুছুন</button><button class="btn" id="slo">সাইন আউট</button></div><p class="err" id="mne" style="margin:4px 0 0"></p>
      <p class="note" style="margin-top:4px">সদস্যরা: ${mem.map(x => `<span class="tag ${x.id === D.profile.id ? 'ok' : ''}">${x.local ? '' : '☁ '}${esc(x.name)}</span>`).join(' ')}</p>
      <p class="note">প্রতিটি সদস্যের ডাটা আলাদা; PIN ছাড়া অন্য প্রোফাইলে ঢোকা যায় না। PIN বদলালে অন্য ডিভাইসে পুরনো PIN সচল থাকবে না — সেখানে প্রোফাইল সরিয়ে "সদস্য তালিকা আনুন" থেকে নতুন PIN দিয়ে ঢুকুন।</p>`);
    root.appendChild(c1); A.bindEyes(c1);
    let pendPic = '';
    $('#sdob', c1).oninput = e => { $('#sage', c1).textContent = ageText(e.target.value); };
    $('#spf', c1).onchange = async e => { const fl = e.target.files[0]; e.target.value = ''; if (!fl) return; try { pendPic = await A.squarePic(fl); const i = $('#spic', c1); i.src = pendPic; i.style.display = ''; A.toast('ছবি বাছাই হয়েছে — "সেভ" চাপুন'); } catch (er) { A.toast(er.message); } };
    $('#ssave', c1).onclick = () => {
      const d = A.D(), v = $('#sn', c1).value.trim(); if (!v) { A.toast('নাম লিখুন'); return; }
      d.profile.name = v; d.profile.dob = $('#sdob', c1).value || '';
      if (pendPic) { d.profile.pic = pendPic; d.profile.picn = 'p_' + d.profile.id + '_' + SL.hash53(pendPic); pendPic = ''; }
      d.profile.u = now(); A.save(); A.updHeader(); A.toast('প্রোফাইল সেভ হয়েছে');
    };
    $('#spc', c1).onclick = () => {
      const d = A.D(), er = $('#spe', c1), o = $('#sp0', c1).value, n = $('#sp1', c1).value; er.textContent = '';
      if (SL.hashPin(o, d.profile.salt) !== d.profile.ph) return er.textContent = 'বর্তমান PIN ভুল';
      if (n.trim().length < 4) return er.textContent = 'নতুন PIN কমপক্ষে ৪ অক্ষর';
      const mm = A.M(); if (!mm.pend) mm.pend = { ph0: d.profile.ph, rh0: d.profile.rh };
      d.profile.ph = SL.hashPin(n.trim(), d.profile.salt); d.profile.u = now(); A.save(); $('#sp0', c1).value = $('#sp1', c1).value = ''; A.toast('PIN বদলানো হয়েছে');
    };
    $('#srec', c1).onclick = () => {
      const d = A.D(), er = $('#spe', c1), o = $('#sp0', c1).value; er.textContent = '';
      if (SL.hashPin(o, d.profile.salt) !== d.profile.ph) return er.textContent = 'বর্তমান PIN দিয়ে নিশ্চিত করুন (উপরের "বর্তমান PIN" ঘরে)';
      const rec = SL.genRecovery(), mm = A.M(); if (!mm.pend) mm.pend = { ph0: d.profile.ph, rh0: d.profile.rh };
      d.profile.rh = SL.hashRec(rec, d.profile.salt); d.profile.u = now(); A.save(); A.showRecovery(rec, null, '🗝 নতুন রিকভারি কোড');
    };
    $('#madd', c1).onclick = () => {
      const er = $('#mne', c1), n = $('#mn', c1).value.trim(), p = $('#mp', c1).value; er.textContent = '';
      if (!n) return er.textContent = 'সদস্যের নাম লিখুন'; if (p.trim().length < 4) return er.textContent = 'PIN কমপক্ষে ৪ অক্ষর';
      const { id, rec } = A.createProfile(n, p.trim()); A.metaOf(id).dirty = true; A.saveDev();
      $('#mn', c1).value = $('#mp', c1).value = '';
      A.showRecovery(rec, () => { A.toast('সদস্য যোগ হয়েছে'); if (A.dev().url) A.syncProfile(id, { manual: true }).then(() => A.fetchMembers().catch(() => { })); A.refresh(); }, '🗝 ' + n + ' — রিকভারি কোড');
    };
    $('#slo', c1).onclick = () => A.logout();
    $('#sdel', c1).onclick = async () => {
      const d = A.D(); if (!(await A.ask(`"${d.profile.name}" প্রোফাইল এই ডিভাইস থেকে মুছে যাবে।\nআগে ব্যাকআপ নিয়েছেন তো?`, { danger: true, ok: 'মুছুন' }))) return;
      const pin = await A.askText('নিশ্চিত করতে PIN দিন', 'PIN', '', { type: 'password' }); if (pin === null) return;
      if (SL.hashPin(pin, d.profile.salt) !== d.profile.ph) { A.toast('PIN ভুল'); return; }
      let cloud = false; if (A.dev().url) cloud = await A.ask('Google ড্রাইভ থেকেও এই সদস্যের ফোল্ডার মুছবেন? (ট্র্যাশে যাবে)', { ok: 'হ্যাঁ, ড্রাইভ থেকেও', danger: true });
      if (cloud) { try { const r = await A.gApi('delete', { id: d.profile.id, ph: d.profile.ph }); if (!r.ok) A.toast('ড্রাইভ থেকে মোছা যায়নি: ' + (r.error || '')); } catch (e) { A.toast('ড্রাইভ থেকে মোছা যায়নি: ' + e.message); } }
      const id = d.profile.id; A.DB.del('p:' + id); delete A.dev().meta[id]; A.dev().members = (A.dev().members || []).filter(x => x.id !== id); A.dev().last = ''; A.saveDev(); A.logout();
    };

    /* ---------- ২. থিম ---------- */
    const c2 = card(`<h3>🎨 থিম</h3><div class="sw" id="sw">${SL.THEMES.map((t, i) => `<button title="${esc(t[2])}" data-i="${i}" class="${(D.prefs.theme || 0) === i ? 'on' : ''}" style="background:linear-gradient(135deg,${t[0]} 50%,${t[1]} 50%)"></button>`).join('')}</div>`);
    root.appendChild(c2);
    $('#sw', c2).onclick = e => { const b = e.target.closest('button[data-i]'); if (!b) return; const i = +b.dataset.i; A.D().prefs.theme = i; A.applyTheme(i); touchPrefs(); $$('#sw button', c2).forEach(x => x.classList.toggle('on', x === b)); };

    /* ---------- ৩. সাইডবার ও কার্ডের নাম ---------- */
    const c3 = card(`<h3>✏️ সাইডবার ও কার্ডের নাম</h3><p class="note" style="margin-top:0">এখানে নাম বদলালে সাইডবারের মেনু ও কার্ডের শিরোনাম বদলে যাবে।</p>
      <div class="tiles">${A.META.map(x => `<div class="tile" style="--c:${x[4]};--b:${x[3]}"><small>${esc(x[2])}</small><input data-k="${x[0]}" value="${esc(D.prefs.labels[x[0]] || x[2])}"></div>`).join('')}</div>
      <p class="row" style="margin-top:12px"><button class="btn" id="lbr">↺ ডিফল্ট করুন</button></p>`);
    root.appendChild(c3);
    c3.addEventListener('input', e => { const k = e.target.dataset.k; if (!k) return; const d = A.D(), v = e.target.value.trim(), def = A.META.find(x => x[0] === k)[2]; if (v && v !== def) d.prefs.labels[k] = v; else delete d.prefs.labels[k]; touchPrefs(); A.buildNav(); $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.k === A.cur())); });
    $('#lbr', c3).onclick = () => { A.D().prefs.labels = {}; touchPrefs(); A.buildNav(); A.refresh(); };

    /* ---------- ৪. Google Sheet / Drive ---------- */
    const c4 = card(`<h3>☁ Google Sheet / Drive</h3>
      <div class="row"><div style="flex:1 1 200px"><label>ড্রাইভ ফোল্ডারের নাম (না থাকলে অটো তৈরি হবে)</label><input id="gf" class="big" value="${esc(dev.folder)}"></div><div style="flex:3 1 320px"><label>Apps Script ওয়েব অ্যাপ URL</label><input id="gu" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(dev.url)}"></div></div>
      <div class="row" style="margin-top:12px"><button class="btn pri" id="gsave">💾 সেভ ও ফোল্ডার তৈরি</button><button class="btn" id="gsync">⇅ এখনই সিঙ্ক (পাঠান ও আনুন)</button><button class="btn" id="gpull">⬇ শুধু ডাটা আনুন</button><button class="btn" id="gmem">👥 সদস্য তালিকা আনুন</button><button class="btn" id="gtest">🔌 টেস্ট কানেকশন</button></div>
      <p class="note" id="glog">${m.sheetUrl ? '' : 'Google Sheet-এ ডাটা প্রথম সিঙ্কের পর তৈরি হবে।'}${m.sheetUrl ? `<a href="${esc(m.sheetUrl)}" target="_blank" rel="noopener">📊 Google Sheet খুলুন</a>` : ''}</p>
      <p class="note">ফোল্ডারের ভেতরে প্রতিটি সদস্যের আলাদা সাবফোল্ডার হয় — তাতে ডাটা, শিট ও ছবি থাকে। শিটের লেখা ঘরের ভেতরেই সীমিত থাকে (ঘর বড় করলে বেশি দেখা যায়), নোট কলামে মাউস ধরলে পুরো লেখা পপআপে দেখা যায়।</p>`);
    root.appendChild(c4);
    const glog = (t, ok) => { const e = $('#glog', c4); e.style.color = ok === false ? 'var(--bad)' : ok ? 'var(--ok)' : ''; e.textContent = t; if (ok) { const u = A.M().sheetUrl; if (u) { const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '  📊 Google Sheet খুলুন'; e.append(a); } } };
    const readG = () => { const u = $('#gu', c4).value.trim(), f = $('#gf', c4).value.trim() || 'Solar_Dashboard'; if (!GURL.test(u)) { glog('URL টি https://script.google.com/macros/s/…/exec ধরনের হতে হবে', false); return null; } dev.url = u; dev.folder = f; A.saveDev(); return { u, f }; };
    async function run(fn) { try { await fn(); } catch (e) { glog('ত্রুটি: ' + e.message, false); } }
    $('#gtest', c4).onclick = () => run(async () => { dev.url = $('#gu', c4).value.trim(); glog('পরীক্ষা চলছে…'); const r = await A.gApi('ping', {}); glog(r.ok ? '✓ সংযোগ ঠিক আছে' : (r.error || 'ব্যর্থ'), !!r.ok); });
    $('#gsave', c4).onclick = () => run(async () => {
      if (!readG()) return; glog('সংযোগ পরীক্ষা ও ফোল্ডার তৈরি হচ্ছে…'); const p = await A.gApi('ping', {}); if (!p.ok) throw new Error(p.error || 'সংযোগ হয়নি');
      A.M().dirty = true; A.saveDev(); const r = await A.sync({ manual: true });
      if (r.ok) { try { await A.fetchMembers(); } catch (e) { } glog('✓ সংরক্ষিত — ফোল্ডার ও ডাটা তৈরি হয়েছে', true); } else glog(r.error || 'সিঙ্ক ব্যর্থ', false);
    });
    $('#gsync', c4).onclick = () => run(async () => { if (!readG()) return; glog('সিঙ্ক চলছে…'); A.M().dirty = true; const r = await A.sync({ manual: true }); if (r.ok) { glog('✓ সিঙ্ক সম্পন্ন', true); } else glog(r.error || 'ব্যর্থ', false); });
    $('#gpull', c4).onclick = () => run(async () => { if (!readG()) return; glog('ডাটা আনা হচ্ছে…'); const r = await A.sync({ manual: true, push: false }); glog(r.ok ? (r.empty ? 'Google-এ এই প্রোফাইলের ডাটা এখনও নেই' : '✓ সর্বশেষ ডাটা আনা হয়েছে') : (r.error || 'ব্যর্থ'), !!r.ok); });
    $('#gmem', c4).onclick = () => run(async () => { if (!readG()) return; glog('সদস্য তালিকা আনা হচ্ছে…'); const l = await A.fetchMembers(); glog('✓ সদস্য: ' + (l.map(x => x.name).join(', ') || 'কেউ নেই'), true); });

    /* ---------- ৫. তারিখের ফরম্যাট ---------- */
    const c5 = card(`<h3>📅 তারিখের ফরম্যাট</h3><div class="row"><div><label>পুরো ড্যাশবোর্ডে তারিখ যেভাবে দেখাবে</label><select id="df">${SL.DATEFMTS.map(x => `<option value="${x[0]}" ${x[0] === D.prefs.dateFmt ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select></div><div class="res" id="dpv" style="flex:1"></div></div>`);
    root.appendChild(c5);
    const dpv = () => { $('#dpv', c5).textContent = 'আজ: ' + A.fd(Date.now()); }; dpv();
    $('#df', c5).onchange = e => { A.D().prefs.dateFmt = e.target.value; touchPrefs(); dpv(); };

    /* ---------- ৬. অ্যাপের নাম ও আইকন ---------- */
    const c6 = card(`<h3>📱 অ্যাপের নাম ও আইকন</h3>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))"><div><label>অ্যাপের নাম (পুরো)</label><input id="an" value="${esc(app.name)}"></div><div><label>হোম স্ক্রিনে নাম (ছোট)</label><input id="as" value="${esc(app.short)}" maxlength="14"></div><div><label>আইকনের ইমোজি/অক্ষর</label><input id="ae" value="${esc(app.emoji)}" maxlength="4"></div><div><label>আইকনের রং</label><input id="ac" type="color" value="${esc(app.color)}"></div><div><label>অথবা নিজের ছবি</label><input id="ai" type="file" accept="image/*"></div></div>
      <div class="row" style="margin-top:12px;align-items:center"><img id="aprev" alt="" style="width:64px;height:64px;flex:none;border-radius:14px;border:1px solid var(--ln)"><button class="btn pri" id="aok">প্রয়োগ করুন</button><button class="btn" id="adl">⬇ ফাইল ডাউনলোড (GitHub-এর জন্য)</button><button class="btn" id="adef">ডিফল্ট</button></div>
      <p class="note">"প্রয়োগ করুন" চাপলে এই ডিভাইসের নাম ও ট্যাব-আইকন বদলাবে। হোম স্ক্রিনের ইনস্টল-আইকন বদলাতে "ফাইল ডাউনলোড" থেকে manifest.webmanifest, icon-192.png, icon-512.png নিয়ে GitHub রিপোর (index.html-এর পাশে) আগের ফাইলের জায়গায় দিন, তারপর অ্যাপটি আবার ইনস্টল করুন।</p>`);
    root.appendChild(c6);
    let pickedImg = app.img || '';
    const curApp = () => ({ name: $('#an', c6).value.trim() || 'সোলার ক্যালকুলেশন', short: $('#as', c6).value.trim() || 'সোলার', emoji: $('#ae', c6).value.trim() || '☀️', color: $('#ac', c6).value, img: pickedImg });
    const prev = async () => { $('#aprev', c6).src = await makeIcon(curApp(), 128, 0.1); }; prev();
    ['an', 'as', 'ae', 'ac'].forEach(i => $('#' + i, c6).addEventListener('input', prev));
    $('#ai', c6).onchange = async e => { const fl = e.target.files[0]; e.target.value = ''; if (!fl) return; try { pickedImg = await A.squarePic(fl, 256); prev(); } catch (er) { A.toast(er.message); } };
    $('#aok', c6).onclick = () => { const d = A.D(); d.prefs.app = curApp(); touchPrefs(); A.applyApp(); A.toast('প্রয়োগ হয়েছে'); };
    $('#adef', c6).onclick = () => { A.D().prefs.app = SL.defApp(); touchPrefs(); A.applyApp(); A.refresh(); };
    $('#adl', c6).onclick = async () => {
      const a = curApp(), th = SL.THEMES[A.D().prefs.theme || 0];
      const mf = { name: a.name, short_name: a.short, description: 'সোলার ক্যালকুলেশন ড্যাশবোর্ড', lang: 'bn', start_url: './index.html', scope: './', display: 'standalone', background_color: th[1], theme_color: th[1], icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] };
      const files = [['manifest.webmanifest', new Blob([JSON.stringify(mf, null, 2)], { type: 'application/manifest+json' })], ['icon-192.png', dataBlob(await makeIcon(a, 192, 0.1))], ['icon-512.png', dataBlob(await makeIcon(a, 512, 0.1))]];
      files.forEach((f, i) => setTimeout(() => A.dl(f[0], f[1]), i * 500)); A.toast('৩টি ফাইল ডাউনলোড হচ্ছে — GitHub-এ আপলোড করুন');
    };

    /* ---------- ৭. সিঙ্ক নিয়ন্ত্রণ ও অফলাইন ---------- */
    const c7 = card(`<h3>🔄 সিঙ্ক নিয়ন্ত্রণ ও অফলাইন</h3>
      <label style="display:flex;gap:8px;align-items:center;font-weight:600;color:var(--ink)"><input type="checkbox" id="sa" ${dev.auto ? 'checked' : ''}> অটো সিঙ্ক চালু (নেট থাকলে পরিবর্তনের ৩ সেকেন্ড পর নিজে সিঙ্ক হবে)</label>
      <div class="row" style="margin-top:10px"><div style="max-width:360px"><label>কোন নেটওয়ার্কে অটো সিঙ্ক হবে</label><select id="sn2"><option value="any" ${dev.net !== 'wifi' ? 'selected' : ''}>যেকোনো নেটওয়ার্ক</option><option value="wifi" ${dev.net === 'wifi' ? 'selected' : ''}>শুধু ওয়াইফাই</option></select></div></div>
      <div id="sstat" class="card" style="background:var(--inp);margin:12px 0;line-height:1.9"></div>
      <div class="row"><button class="btn" id="sinst">📲 অ্যাপ হিসাবে ইনস্টল করুন</button><button class="btn" id="sper">🔒 স্থায়ী স্টোরেজের অনুরোধ</button><button class="btn" id="sref">অবস্থা দেখুন</button></div>`);
    root.appendChild(c7);
    $('#sa', c7).onchange = e => { dev.auto = e.target.checked; A.saveDev(); A.setStatus(); if (dev.auto) A.sync({}); };
    $('#sn2', c7).onchange = e => { dev.net = e.target.value; A.saveDev(); };
    async function stat() {
      const c = navigator.connection || {}, mm = A.M(); let per = 'অজানা';
      try { if (navigator.storage && navigator.storage.persisted) per = (await navigator.storage.persisted()) ? 'হ্যাঁ ✓' : 'না (অনুরোধ করুন)'; } catch (e) { }
      const sw = 'serviceWorker' in navigator && navigator.serviceWorker.controller ? 'প্রস্তুত ✓ (নেট ছাড়াও খুলবে)' : ('serviceWorker' in navigator ? 'এখনও প্রস্তুত নয় — একবার পেজ রিলোড করুন (HTTPS দরকার)' : 'এই ব্রাউজারে নেই');
      $('#sstat', c7).innerHTML = `🌐 ইন্টারনেট: <b>${navigator.onLine ? 'আছে' : 'নেই'}</b>${c.effectiveType ? ' · ' + esc(c.effectiveType) : ''}${c.type ? ' · ' + esc(c.type) : ''}<br>☁ Google সংযোগ: <b>${dev.url ? 'সেট করা আছে' : 'নেই'}</b>${mm.last ? ' · শেষ সিঙ্ক ' + esc(A.fmtDT(mm.last)) : ''}<br>⏳ অসিঙ্কড পরিবর্তন: <b>${mm.dirty ? 'আছে' : 'নেই'}</b><br>📴 অফলাইন মোড: <b>${sw}</b><br>💾 স্থায়ী স্টোরেজ: <b>${per}</b> · ধরন: ${A.DB.isIdb() ? 'IndexedDB' : 'localStorage'}`;
    }
    stat();
    $('#sref', c7).onclick = stat;
    $('#sper', c7).onclick = async () => { try { const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false; A.toast(ok ? 'স্থায়ী স্টোরেজ চালু হয়েছে' : 'ব্রাউজার অনুমতি দেয়নি (অ্যাপ ইনস্টল করলে সহজে মেলে)'); } catch (e) { A.toast('সম্ভব হয়নি'); } stat(); };
    $('#sinst', c7).onclick = async () => {
      const ev = A.installEvt;
      if (ev) { ev.prompt(); try { await ev.userChoice; } catch (e) { } A.installEvt = null; }
      else A.dlg({ title: '📲 অ্যাপ হিসাবে ইনস্টল', html: '<p><b>Android Chrome:</b> ডানদিকের উপরের ⋮ মেনু → "Install app" / "হোম স্ক্রিনে যোগ করুন"।</p><p><b>কম্পিউটারে Chrome/Edge:</b> অ্যাড্রেস বারের ডানদিকের ইনস্টল আইকন (⊕) চাপুন।</p><p class="note">ইনস্টল অপশন আসতে হলে সাইটটি HTTPS-এ (GitHub Pages) খুলতে হবে।</p>', w: 440, buttons: [{ t: 'ঠিক আছে', cls: 'pri' }] });
    };

    /* ---------- ৮. JSON ব্যাকআপ ---------- */
    const c8 = card(`<h3>💾 JSON ব্যাকআপ</h3><div class="row"><button class="btn pri" id="bdl">⬇ ব্যাকআপ ডাউনলোড</button><div><label>ব্যাকআপ ফাইল বেছে নিন</label><input type="file" id="brf" accept=".json,application/json"></div><button class="btn" id="brs">⟲ রিস্টোর করুন</button></div>
      <p class="note">ব্যাকআপে এই প্রোফাইলের সব প্রজেক্ট, লোড, নোট ও ছবি থাকে (PIN থাকে না)। রিস্টোর করলে বর্তমান ডাটা ফাইলের ডাটা দিয়ে বদলে যাবে। পুরনো ড্যাশবোর্ডের ব্যাকআপ ফাইলও রিস্টোর করা যায়।</p>`);
    root.appendChild(c8);
    $('#bdl', c8).onclick = () => { const d = SL.clone(A.D()); delete d.profile.ph; delete d.profile.rh; delete d.profile.salt; A.dl(`solar_backup_${d.profile.name.replace(/[^\wঀ-৿-]+/g, '_')}_${SL.ymd()}.json`, new Blob([JSON.stringify(d)], { type: 'application/json' })); };
    $('#brs', c8).onclick = async () => {
      const fl = $('#brf', c8).files[0]; if (!fl) { A.toast('আগে ব্যাকআপ ফাইল বেছে নিন'); return; }
      let o; try { o = JSON.parse(await fl.text()); } catch (e) { A.toast('ফাইলটি সঠিক JSON নয়'); return; }
      let nd; if (SL.isNewFmt(o)) nd = o; else if (SL.isLegacy(o)) nd = SL.fromLegacy(o, A.D().profile); else { A.toast('এটি সোলার ড্যাশবোর্ডের ব্যাকআপ ফাইল নয়'); return; }
      if (!(await A.ask('বর্তমান সব ডাটা ফাইলের ডাটা দিয়ে বদলে যাবে। চালিয়ে যাবেন?', { danger: true, ok: 'রিস্টোর' }))) return;
      if (!nd.profile) nd.profile = A.D().profile;
      A.replaceData(nd); A.toast('রিস্টোর সম্পন্ন');
    };
  });
})();
