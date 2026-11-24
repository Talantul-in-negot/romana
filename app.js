/* Română cl. a VI-a – aplicație de studiu. Date: window.DATA = {units:[{unit, lessons[]}]} */
(function () {
  'use strict';
  const D = window.DATA || { units: [] };
  const app = document.getElementById('app');

  // ---------- stare persistată ----------
  const KEY = 'rom6-v1';
  const S = Object.assign({ studied: {}, best: {}, known: {}, wrong: {}, theme: '' }, JSON.parse(localStorage.getItem(KEY) || '{}'));
  const save = () => localStorage.setItem(KEY, JSON.stringify(S));
  if (S.theme) document.documentElement.dataset.theme = S.theme;
  document.getElementById('theme').onclick = () => {
    S.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = S.theme; save();
  };

  // ---------- utilitare ----------
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const k in attrs || {}) {
      const v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.startsWith('on')) e[k] = v;
      else if (v !== false && v != null) e.setAttribute(k, v);
    }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
  const allLessons = () => D.units.flatMap(u => u.lessons.map(l => Object.assign(l, { unitId: u.unit.id })));
  const findLesson = id => allLessons().find(l => l.id === id);
  const unitOf = id => D.units.find(u => u.unit.id === id);
  const render = (...nodes) => { app.replaceChildren(...nodes.flat().filter(n => n != null && n !== false)); window.scrollTo(0, 0); };
  const KIND = { definition: 'definiție', rule: 'regulă', classification: 'clasificare', norm: 'normă', tip: 'de reținut', example: 'exemplu' };
  const hasPractice = l => (l.theory && l.theory.length) || (l.quiz && l.quiz.length);

  // ---------- router ----------
  function route() {
    const p = location.hash.replace(/^#\/?/, '').split('/');
    try {
      if (!p[0]) return home();
      if (p[0] === 'u') return unitPage(p[1]);
      if (p[0] === 'l') return lessonPage(p[1], p[2] || 'theory');
      if (p[0] === 'print') return printUnit(p[1]);
      if (p[0] === 'glossary') return glossary();
      if (p[0] === 'review') return review();
      if (p[0] === 'stats') return stats();
    } catch (e) { console.error(e); }
    home();
  }
  window.addEventListener('hashchange', route);

  // ---------- pagini ----------
  function unitProgress(u) {
    const ls = u.lessons.filter(hasPractice);
    const done = ls.filter(l => S.studied[l.id]).length;
    return { total: ls.length, done, pct: ls.length ? Math.round(100 * done / ls.length) : 0 };
  }

  function home() {
    const total = allLessons().filter(hasPractice).length;
    const done = Object.keys(S.studied).filter(id => S.studied[id]).length;
    render(
      h('h1', {}, 'Teoria de română – clasa a VI-a'),
      h('p', { class: 'muted' }, `Învață definițiile, apoi exersează. ${done} din ${total} lecții marcate ca învățate.`),
      h('div', { class: 'row' },
        h('a', { class: 'btn', href: '#/review' }, '🎯 Recapitulare mixtă'),
        h('a', { class: 'btn ghost', href: '#/glossary' }, '📖 Glosar de termeni')),
      h('h2', {}, 'Unități de învățare'),
      h('div', { class: 'grid' }, D.units.map(u => {
        const pr = unitProgress(u);
        return h('a', { class: 'card', href: '#/u/' + u.unit.id },
          h('span', { class: 'unit-n' }, 'Unitatea ' + u.unit.number),
          h('h3', { style: 'margin:.5em 0 .2em' }, u.unit.title),
          h('div', { class: 'muted' }, u.unit.summary || ''),
          h('div', { class: 'muted', style: 'margin-top:8px' }, `${u.lessons.length} lecții · ${pr.done}/${pr.total} învățate`),
          h('div', { class: 'bar' }, h('i', { style: `width:${pr.pct}%` })));
      })));
  }

  function unitPage(id) {
    const u = unitOf(id); if (!u) return home();
    const sections = [];
    u.lessons.forEach(l => { let s = sections.find(x => x.name === l.section); if (!s) sections.push(s = { name: l.section || 'Lecții', items: [] }); s.items.push(l); });
    render(
      h('div', { class: 'crumbs' }, h('a', { href: '#/' }, 'Lecții'), ' › ', 'Unitatea ' + u.unit.number),
      h('h1', {}, u.unit.title),
      h('p', { class: 'muted' }, u.unit.summary || ''),
      h('p', {}, h('a', { class: 'btn ghost', href: '#/print/' + u.unit.id }, '🖨 Fișe printabile pentru toată unitatea')),
      sections.map(s => h('section', {},
        h('h2', {}, s.name),
        s.items.map(l => h('a', { class: 'lesson-row', href: '#/l/' + l.id + '/theory' },
          h('span', { class: 'num' }, 'L' + l.number),
          h('span', { class: 't' }, l.title, h('div', { class: 'muted' }, [l.pages, hasPractice(l) ? (l.theory || []).length + ' noțiuni' : '📖 doar lectură, fără teorie'].filter(Boolean).join(' · '))),
          S.best[l.id] != null && h('span', { class: 'badge score' }, S.best[l.id] + '%'),
          S.studied[l.id] && h('span', { class: 'badge done' }, '✓ învățat'))))));
  }

  function lessonPage(id, tab) {
    const l = findLesson(id); if (!l) return home();
    const u = unitOf(l.unitId);
    const tabs = [['theory', '📚 Teorie'], ['cards', '🃏 Flashcarduri'], ['quiz', '✍️ Exersează'], ['sheet', '🖨 Fișă']];
    const body = h('div');
    const idx = u.lessons.indexOf(l);
    const empty = !(l.theory || []).length && !(l.flashcards || []).length && !(l.quiz || []).length;
    const nav = h('div', { class: 'row' },
      idx > 0 && h('a', { class: 'btn ghost', href: '#/l/' + u.lessons[idx - 1].id + '/' + tab }, '← L' + u.lessons[idx - 1].number),
      idx < u.lessons.length - 1 && h('a', { class: 'btn ghost', href: '#/l/' + u.lessons[idx + 1].id + '/' + tab }, 'L' + u.lessons[idx + 1].number + ' →'));
    render(
      h('div', { class: 'crumbs' }, h('a', { href: '#/' }, 'Lecții'), ' › ', h('a', { href: '#/u/' + u.unit.id }, 'Unitatea ' + u.unit.number), ' › L' + l.number),
      h('span', { class: 'chip' }, l.section || ''), l.pages && h('span', { class: 'chip' }, l.pages),
      h('h1', {}, `Lecția ${l.number}. ${l.title}`),
      l.source && h('p', { class: 'muted' }, 'Text-suport: ' + l.source),
      !empty && h('div', { class: 'tabs' }, tabs.map(([k, t]) => h('a', { href: `#/l/${id}/${k}`, class: k === tab ? 'on' : '' }, t))),
      body, nav);
    if (empty) {
      const nxt = u.lessons.slice(idx + 1).find(x => (x.theory || []).length);
      body.append(h('div', { class: 'card' },
        h('h3', { style: 'margin-top:0' }, '📖 Lecție de lectură'),
        h('p', {}, 'În această lecție manualul se ocupă de citirea și înțelegerea textului și nu introduce definiții sau termeni noi, deci nu există teorie, flashcarduri sau exerciții de învățat aici.'),
        h('p', { class: 'muted' }, 'Citește textul din manual și răspunde la întrebările lui; teoria apare în lecțiile următoare.'),
        nxt && h('a', { class: 'btn', href: `#/l/${nxt.id}/theory` }, `Mergi la prima lecție cu teorie: L${nxt.number}. ${nxt.title} →`)));
    } else if (tab === 'cards') cardsTab(l, body); else if (tab === 'quiz') quizTab(l, body); else if (tab === 'sheet') sheetTab(l, body); else theoryTab(l, body);
  }

  // ---------- fișe printabile ----------
  function sheetNode(l, u) {
    const th = l.theory || [], cards = l.flashcards || [];
    return h('article', { class: 'sheet' },
      h('div', { class: 'sheet-head' }, `Unitatea ${u.unit.number}. ${u.unit.title} · ${l.section || ''}${l.pages ? ' · ' + l.pages : ''}`),
      h('h2', { class: 'sheet-title' }, `Lecția ${l.number}. ${l.title}`),
      l.source && h('div', { class: 'sheet-src' }, 'Text-suport: ' + l.source),
      th.length ? th.map(t => h('div', { class: 'sheet-def' + (t.important ? ' imp' : '') },
        h('b', {}, (t.important ? '★ ' : '') + t.term + (t.derived ? ' · din exerciții' : '') + '. '),
        h('span', {}, t.text),
        (t.examples || []).length > 0 && h('div', { class: 'sheet-ex' }, 'Ex.: ' + t.examples.join(' · '))))
        : h('p', { class: 'muted' }, 'Lecție de lectură, fără noțiuni noi de reținut.'),
      cards.length > 0 && h('div', { class: 'sheet-test' },
        h('h3', {}, 'Autotest (acoperă coloana din dreapta)'),
        h('table', {}, cards.map(c => h('tr', {}, h('td', {}, c.front), h('td', {}, c.back))))),
      h('div', { class: 'sheet-foot' }, 'Română cl. a VI-a · după manualul Art Klett (MEN 5022/2023)'));
  }
  function sheetTab(l, body) {
    const u = unitOf(l.unitId);
    body.append(h('div', { class: 'row noprint' },
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨 Tipărește fișa'),
      h('a', { class: 'btn ghost', href: '#/print/' + u.unit.id }, 'Toate fișele din unitate')),
      sheetNode(l, u));
  }
  function printUnit(id) {
    const u = unitOf(id); if (!u) return home();
    const ls = u.lessons.filter(l => (l.theory || []).length);
    render(h('div', { class: 'noprint' },
      h('div', { class: 'crumbs' }, h('a', { href: '#/u/' + id }, '← Unitatea ' + u.unit.number)),
      h('h1', {}, 'Fișe printabile · ' + u.unit.title),
      h('p', { class: 'muted' }, `${ls.length} fișe, câte una pe pagină (lecțiile fără noțiuni noi sunt omise).`),
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨 Tipărește toate fișele')),
      ls.map(l => sheetNode(l, u)));
  }

  function theoryTab(l, body) {
    const th = l.theory || [];
    if (!th.length) { body.append(h('p', { class: 'muted' }, 'Această lecție este dedicată lecturii și nu introduce definiții noi. Poți totuși exersa din fila „Exersează”.')); return; }
    let hide = false;
    const list = h('div');
    const draw = () => {
      list.replaceChildren(...th.map(t => {
        const d = h('div', { class: 'def' + (t.important ? ' imp' : '') + (hide ? ' hidden' : '') },
          h('div', { class: 'kind' }, (t.important ? '★ Repere · ' : '') + (KIND[t.kind] || t.kind || '') + (t.derived ? ' · din exercițiile manualului, nu din Repere' : '')),
          h('h3', {}, t.term),
          h('div', { class: 'body' },
            h('p', {}, t.text),
            (t.examples || []).length > 0 && h('div', { class: 'ex' }, 'Exemple: ' + t.examples.join(' · '))));
        d.onclick = () => { if (hide) d.classList.toggle('hidden'); };
        return d;
      }));
    };
    const tog = h('button', { class: 'btn ghost', onclick: () => { hide = !hide; tog.textContent = hide ? '👁 Arată definițiile' : '🙈 Acoperă definițiile (autotest)'; draw(); } }, '🙈 Acoperă definițiile (autotest)');
    const mark = h('button', { class: 'btn', onclick: () => { S.studied[l.id] = !S.studied[l.id]; save(); mark.textContent = S.studied[l.id] ? '✓ Marcată ca învățată' : 'Marchează ca învățată'; } },
      S.studied[l.id] ? '✓ Marcată ca învățată' : 'Marchează ca învățată');
    body.append(h('div', { class: 'row' }, tog, mark), list,
      h('p', { class: 'muted' }, 'Sfat: acoperă definițiile și încearcă să le spui din memorie; apasă pe o carte pentru a o descoperi.'));
    draw();
  }

  function cardsTab(l, body) {
    const cards = l.flashcards && l.flashcards.length ? l.flashcards : (l.theory || []).map(t => ({ front: t.term, back: t.text }));
    if (!cards.length) { body.append(h('p', { class: 'muted' }, 'Nu există flashcarduri pentru această lecție.')); return; }
    let order = shuffle(cards.map((_, i) => i)), pos = 0;
    const kk = i => l.id + '#' + i;
    const area = h('div');
    const draw = () => {
      if (pos >= order.length) {
        const kn = cards.filter((_, i) => S.known[kk(i)]).length;
        area.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'big' }, `${kn}/${cards.length}`), h('p', {}, 'carduri știute'),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { order = shuffle(cards.map((_, i) => i)); pos = 0; draw(); } }, 'Reia toate'),
            h('button', { class: 'btn ghost', onclick: () => { order = cards.map((_, i) => i).filter(i => !S.known[kk(i)]); pos = 0; if (!order.length) order = cards.map((_, i) => i); draw(); } }, 'Doar cele nesigure'))));
        return;
      }
      const i = order[pos], c = cards[i];
      const f = h('div', { class: 'flash', onclick: () => f.classList.toggle('flip') }, h('div', { class: 'in' }, h('div', { class: 'f' }, c.front), h('div', { class: 'b' }, c.back)));
      area.replaceChildren(
        h('div', { class: 'prog' }, h('i', { style: `width:${100 * pos / order.length}%` })),
        h('div', { class: 'muted' }, `Card ${pos + 1} din ${order.length} · apasă pe card pentru a vedea răspunsul`), f,
        h('div', { class: 'row' },
          h('button', { class: 'btn', onclick: () => { S.known[kk(i)] = true; save(); pos++; draw(); } }, '✓ Știu'),
          h('button', { class: 'btn ghost', onclick: () => { delete S.known[kk(i)]; save(); pos++; draw(); } }, '✗ Mai repet')));
    };
    body.append(area); draw();
  }

  // ---------- motor de exerciții ----------
  function quizTab(l, body) {
    const items = (l.quiz || []).map((q, i) => Object.assign({ key: l.id + '#' + i, lessonId: l.id }, q));
    if (!items.length) { body.append(h('p', { class: 'muted' }, 'Nu există exerciții pentru această lecție.')); return; }
    runQuiz(body, shuffle(items), r => { if (S.best[l.id] == null || r.pct > S.best[l.id]) S.best[l.id] = r.pct; if (r.pct >= 70) S.studied[l.id] = true; save(); });
  }

  function runQuiz(body, items, onDone) {
    let i = 0, right = 0; const missed = [];
    const box = h('div', { class: 'card' });
    body.append(box);
    const next = () => { i++; step(); };
    function step() {
      if (i >= items.length) {
        const pct = Math.round(100 * right / items.length);
        onDone && onDone({ pct, right, total: items.length });
        box.replaceChildren(h('div', { class: 'big' }, pct + '%'), h('p', {}, `${right} din ${items.length} corecte.`),
          h('div', { class: 'row' },
            missed.length > 0 && h('button', { class: 'btn', onclick: () => { box.remove(); runQuiz(body, shuffle(missed), null); } }, `Reia greșelile (${missed.length})`),
            h('button', { class: 'btn ghost', onclick: () => { box.remove(); runQuiz(body, shuffle(items), onDone); } }, 'Reia tot')));
        return;
      }
      const q = items[i];
      const fb = h('div'); const holder = h('div');
      const nextBtn = h('button', { class: 'btn', style: 'display:none', onclick: next }, i === items.length - 1 ? 'Vezi rezultatul' : 'Următoarea →');
      let answered = false;
      const finish = (ok, correctText) => {
        if (answered) return; answered = true;
        if (ok) { right++; if (S.wrong[q.key]) { delete S.wrong[q.key]; } } else { missed.push(q); S.wrong[q.key] = (S.wrong[q.key] || 0) + 1; }
        save();
        fb.className = 'fb ' + (ok ? 'ok' : 'bad');
        fb.replaceChildren(...[ok ? '✓ Corect!' : '✗ Nu chiar.' + (correctText ? ' Răspuns: ' + correctText : ''), q.why ? h('small', {}, q.why) : null].filter(Boolean));
        nextBtn.style.display = '';
      };
      ({ mcq, tf, fill, match, classify }[q.type] || mcq)(q, holder, finish);
      box.replaceChildren(
        h('div', { class: 'prog' }, h('i', { style: `width:${100 * i / items.length}%` })),
        h('div', { class: 'muted' }, `Întrebarea ${i + 1} din ${items.length}`),
        h('div', { class: 'q' }, q.q), holder, fb, h('div', { class: 'row' }, nextBtn));
    }
    step();
  }

  function mcq(q, holder, finish) {
    const order = shuffle(q.options.map((o, k) => k));
    const btns = order.map(k => h('button', { class: 'opt', onclick: () => {
      btns.forEach((b, n) => { b.disabled = true; if (order[n] === q.answer) b.classList.add('ok'); });
      if (k !== q.answer) btns[order.indexOf(k)].classList.add('bad');
      finish(k === q.answer, q.options[q.answer]);
    } }, q.options[k]));
    holder.append(...btns);
  }
  function tf(q, holder, finish) {
    const mk = (val, txt) => h('button', { class: 'opt', onclick: () => {
      bs.forEach(b => b.disabled = true);
      const ok = val === q.answer; b0(val).classList.add(ok ? 'ok' : 'bad');
      if (!ok) b0(q.answer).classList.add('ok');
      finish(ok, q.answer ? 'Adevărat' : 'Fals');
    } }, txt);
    const bs = [mk(true, 'Adevărat'), mk(false, 'Fals')];
    const b0 = v => bs[v ? 0 : 1];
    holder.append(...bs);
  }
  function fill(q, holder, finish) {
    const inp = h('input', { class: 'txt', placeholder: 'Scrie răspunsul…', autocomplete: 'off' });
    const go = () => {
      if (!inp.value.trim()) return;
      const ok = q.answers.some(a => norm(a) === norm(inp.value));
      inp.disabled = true; btn.disabled = true;
      finish(ok, q.answers[0]);
    };
    const btn = h('button', { class: 'btn', onclick: go }, 'Verifică');
    inp.onkeydown = e => { if (e.key === 'Enter') go(); };
    holder.append(h('div', { class: 'row' }, inp, btn));
    setTimeout(() => inp.focus(), 50);
  }
  function match(q, holder, finish) {
    const rights = shuffle(q.pairs.map(p => p[1]));
    const sels = q.pairs.map(p => h('select', {}, h('option', { value: '' }, '— alege —'), rights.map(r => h('option', { value: r }, r))));
    q.pairs.forEach((p, k) => holder.append(h('div', { class: 'pairrow' }, h('b', {}, p[0]), sels[k])));
    const btn = h('button', { class: 'btn', onclick: () => {
      if (sels.some(s => !s.value)) return;
      let ok = true;
      sels.forEach((s, k) => { const good = s.value === q.pairs[k][1]; if (!good) ok = false; s.disabled = true; s.style.borderColor = good ? 'var(--ok)' : 'var(--bad)'; });
      btn.disabled = true;
      finish(ok, ok ? '' : q.pairs.map(p => p[0] + ' → ' + p[1]).join('; '));
    } }, 'Verifică');
    holder.append(btn);
  }
  function classify(q, holder, finish) {
    const sels = q.items.map(it => h('select', {}, h('option', { value: '' }, '— alege —'), q.categories.map((c, k) => h('option', { value: k }, c))));
    q.items.forEach((it, k) => holder.append(h('div', { class: 'pairrow' }, h('b', {}, it.t), sels[k])));
    const btn = h('button', { class: 'btn', onclick: () => {
      if (sels.some(s => s.value === '')) return;
      let ok = true;
      sels.forEach((s, k) => { const good = +s.value === q.items[k].c; if (!good) ok = false; s.disabled = true; s.style.borderColor = good ? 'var(--ok)' : 'var(--bad)'; });
      btn.disabled = true;
      finish(ok, ok ? '' : q.items.map(it => it.t + ' → ' + q.categories[it.c]).join('; '));
    } }, 'Verifică');
    holder.append(btn);
  }

  // ---------- glosar ----------
  function glossary() {
    const all = [];
    D.units.forEach(u => u.lessons.forEach(l => (l.theory || []).forEach(t => all.push({ t, l, u }))));
    const list = h('div');
    const q = h('input', { class: 'search', placeholder: `Caută printre ${all.length} noțiuni (termen sau definiție)…`, type: 'search' });
    const draw = () => {
      const s = norm(q.value);
      const res = all.filter(x => !s || norm(x.t.term).includes(s) || norm(x.t.text).includes(s)).sort((a, b) => a.t.term.localeCompare(b.t.term, 'ro'));
      list.replaceChildren(h('p', { class: 'muted' }, res.length + ' rezultate'), ...res.slice(0, 120).map(x =>
        h('div', { class: 'def' + (x.t.important ? ' imp' : '') },
          h('div', { class: 'kind' }, `U${x.u.unit.number} · L${x.l.number} · ${x.l.title}`),
          h('h3', {}, x.t.term), h('p', {}, x.t.text),
          h('a', { href: `#/l/${x.l.id}/theory` }, 'Deschide lecția →'))));
    };
    q.oninput = draw;
    render(h('h1', {}, 'Glosar'), q, list); draw();
  }

  // ---------- recapitulare mixtă ----------
  function review() {
    const pool = allLessons().flatMap(l => (l.quiz || []).map((q, i) => Object.assign({ key: l.id + '#' + i, lessonId: l.id }, q)));
    const wrong = pool.filter(q => S.wrong[q.key]);
    const body = h('div');
    const start = items => { body.replaceChildren(); runQuiz(body, shuffle(items).slice(0, 15), null); };
    render(h('h1', {}, 'Recapitulare mixtă'),
      h('p', { class: 'muted' }, `Întrebări din toate lecțiile (${pool.length} disponibile). Greșelile tale sunt reținute.`), body);
    body.append(h('div', { class: 'row' },
      h('button', { class: 'btn', onclick: () => start(pool) }, '🎲 15 întrebări aleatorii'),
      h('button', { class: 'btn ghost', disabled: !wrong.length, onclick: () => start(wrong) }, `🔁 Doar greșelile mele (${wrong.length})`),
      h('button', { class: 'btn ghost', disabled: !Object.keys(S.studied).length, onclick: () => start(pool.filter(q => S.studied[q.lessonId])) }, '✓ Din lecțiile învățate')));
  }

  // ---------- progres ----------
  function stats() {
    const ls = allLessons().filter(hasPractice);
    const done = ls.filter(l => S.studied[l.id]).length;
    const sc = Object.values(S.best);
    const avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : 0;
    const terms = ls.reduce((n, l) => n + (l.theory || []).length, 0);
    render(h('h1', {}, 'Progresul meu'),
      h('div', { class: 'stats' },
        h('div', { class: 'card' }, h('b', {}, `${done}/${ls.length}`), 'lecții învățate'),
        h('div', { class: 'card' }, h('b', {}, avg + '%'), 'scor mediu la exerciții'),
        h('div', { class: 'card' }, h('b', {}, Object.keys(S.known).length), 'flashcarduri știute'),
        h('div', { class: 'card' }, h('b', {}, terms), 'noțiuni în aplicație'),
        h('div', { class: 'card' }, h('b', {}, Object.keys(S.wrong).length), 'întrebări de reluat')),
      h('h2', {}, 'Pe unități'),
      D.units.map(u => { const p = unitProgress(u); return h('div', { class: 'card', style: 'margin:8px 0' }, h('b', {}, `U${u.unit.number}. ${u.unit.title}`), h('div', { class: 'bar' }, h('i', { style: `width:${p.pct}%` }))); }),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { if (confirm('Ștergi tot progresul?')) { localStorage.removeItem(KEY); location.reload(); } } }, 'Resetează progresul')));
  }

  route();
})();
