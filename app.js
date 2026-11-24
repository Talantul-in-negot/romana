/* Română cl. a VI-a – aplicație de studiu. Date: window.DATA = {units:[{unit, lessons[]}]} */
(function () {
  'use strict';
  const D = window.DATA || { units: [] };
  const app = document.getElementById('app');

  // ---------- stare persistată ----------
  const KEY = 'rom6-v1';
  const S = Object.assign({ studied: {}, best: {}, known: {}, wrong: {}, ok: {}, notions: {}, theme: '' }, JSON.parse(localStorage.getItem(KEY) || '{}'));
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
  // noțiuni înțelese (bifate de elev), cheie = id lecție # poziția în teorie
  const nKey = (l, i) => l.id + '#' + i;
  // Starea unei noțiuni:
  //  ok   = declarată de elev ȘI toate întrebările legate de ea au ultimul răspuns corect
  //  okn  = declarată, iar pentru ea nu există nicio întrebare (nu se poate dovedi)
  //  weak = cel puțin o întrebare legată are ultimul răspuns greșit
  //  test / decl / part / new = pași intermediari
  function notionState(l, i) {
    const declared = !!S.notions[nKey(l, i)];
    // Dovada = răspunsuri corecte la întrebările din „Exersează". „Știu" la flashcarduri e doar o declarație și nu contează aici.
    const qs = [];
    (l.quiz || []).forEach((q, qi) => { if ((q.n || []).includes(i)) qs.push(l.id + '#' + qi); });
    if (qs.some(k => S.wrong[k])) return 'weak';
    const okQ = qs.filter(k => S.ok[k]).length;
    if (!qs.length) return declared ? 'okn' : 'nt';        // nicio întrebare disponibilă: nu se poate dovedi, contează doar declarația
    const passed = okQ === qs.length;
    if (declared && passed) return 'ok';                  // declarată ȘI dovedită
    if (passed) return 'test';                            // teste trecute, lipsește declarația
    if (declared) return 'decl';                          // declarată, dar nedovedită
    return okQ ? 'part' : 'new';
  }
  const isDone = s => s === 'ok' || s === 'okn';
  const STATE_LABEL = { ok: '✓ înțeleasă', okn: '✓ declarată (fără test disponibil)', nt: '○ fără test disponibil – declar-o dacă ai înțeles-o', weak: '⚠ de repetat', part: '◐ în curs', new: '○ neexersată',
    test: '◐ teste trecute – confirmă că ai înțeles', decl: '◐ declarată – nedovedită încă' };
  const lessonNotions = l => { const n = (l.theory || []).length; const done = (l.theory || []).filter((_, i) => isDone(notionState(l, i))).length; return { total: n, done }; };
  const unitNotions = u => u.lessons.reduce((a, l) => { const x = lessonNotions(l); a.total += x.total; a.done += x.done; return a; }, { total: 0, done: 0 });
  // acord în număr: 0 noțiuni, 1 noțiune, 2–19 noțiuni, 20+ de noțiuni
  const pl = (n, one, many) => n === 1 ? `1 ${one}` : `${n} ${n >= 20 && (n % 100 === 0 || n % 100 >= 20) ? 'de ' : ''}${many}`;
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
      if (p[0] === 'topics') return topicsPage();
      if (p[0] === 'topic') return topicPage(p[1]);
      if (p[0] === 'print-topic') return printTopic(p[1]);
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
        h('a', { class: 'btn ghost', href: '#/topics' }, '🧭 Recapitulare pe teme'),
        h('a', { class: 'btn ghost', href: '#/glossary' }, '📖 Glosar de termeni')),
      h('h2', {}, 'Unități de învățare'),
      h('div', { class: 'grid' }, D.units.map(u => {
        const pr = unitProgress(u);
        return h('a', { class: 'card', href: '#/u/' + u.unit.id },
          h('span', { class: 'unit-n' }, 'Unitatea ' + u.unit.number),
          h('h3', { style: 'margin:.5em 0 .2em' }, u.unit.title),
          h('div', { class: 'muted' }, u.unit.summary || ''),
          h('div', { class: 'muted', style: 'margin-top:8px' }, `${pl(u.lessons.length, 'lecție', 'lecții')} · ${pr.done}/${pr.total} învățate · ${unitNotions(u).done}/${unitNotions(u).total} noțiuni`),
          h('div', { class: 'bar' }, h('i', { style: `width:${pr.pct}%` })));
      })));
  }

  function coveragePanel(u) {
    const tot = unitNotions(u);
    const pct = tot.total ? Math.round(100 * tot.done / tot.total) : 0;
    const left = u.lessons.map(l => ({ l, items: (l.theory || []).map((t, i) => ({ t, i })).map(x => Object.assign(x, { st: notionState(l, x.i) })).filter(x => !isDone(x.st)) })).filter(x => x.items.length);
    const weakN = left.reduce((a, x) => a + x.items.filter(y => y.st === 'weak').length, 0);
    const confirmN = left.reduce((a, x) => a + x.items.filter(y => y.st === 'test').length, 0);
    return h('div', { class: 'card', style: 'margin:14px 0' },
      h('b', {}, `Noțiuni înțelese: ${tot.done} din ${tot.total} (${pct}%)`),
      h('div', { class: 'bar' }, h('i', { style: `width:${pct}%` })),
      left.length === 0
        ? h('p', { style: 'margin:10px 0 0;color:var(--ok);font-weight:600' }, '🎉 Ai acoperit toate noțiunile din această unitate!')
        : h('details', { style: 'margin-top:10px' },
          h('summary', { style: 'cursor:pointer;color:var(--brand);font-weight:600' }, `Ce mai ai de învățat (${pl(tot.total - tot.done, 'noțiune', 'noțiuni')})`),
          left.map(x => h('div', { style: 'margin:10px 0 0' },
            h('a', { href: `#/l/${x.l.id}/theory`, style: 'font-weight:600' }, `L${x.l.number}. ${x.l.title}`),
            h('div', { class: 'muted' }, x.items.map(y => (y.st === 'weak' ? '⚠ ' : '') + y.t.term).join(' · '))))),
      confirmN > 0 && h('p', { class: 'muted', style: 'margin:10px 0 0' }, `◐ ${pl(confirmN, 'noțiune', 'noțiuni')} cu testele trecute, în așteptarea declarației tale „am înțeles”.`),
      weakN > 0 && h('p', { class: 'fb bad', style: 'margin:10px 0 0' }, `⚠ ${pl(weakN, 'noțiune', 'noțiuni')} de repetat (ai greșit întrebări despre ele).`));
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
      coveragePanel(u),
      sections.map(s => h('section', {},
        h('h2', {}, s.name),
        s.items.map(l => h('a', { class: 'lesson-row', href: '#/l/' + l.id + '/theory' },
          h('span', { class: 'num' }, 'L' + l.number),
          h('span', { class: 't' }, l.title, h('div', { class: 'muted' }, [l.pages, hasPractice(l) ? (lessonNotions(l).done ? `${lessonNotions(l).done}/${lessonNotions(l).total} noțiuni înțelese` : pl((l.theory || []).length, 'noțiune', 'noțiuni')) : '📖 doar lectură, fără teorie'].filter(Boolean).join(' · '))),
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
      h('p', { class: 'muted' }, `${pl(ls.length, 'fișă', 'fișe')}, câte una pe pagină (lecțiile fără noțiuni noi sunt omise).`),
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨 Tipărește toate fișele')),
      ls.map(l => sheetNode(l, u)));
  }

  // lista de definiții a unei lecții (cu stare și buton de declarare); reutilizată în pagina lecției și în paginile de teme
  function renderDefs(l, container, hide, onChange) {
    const redraw = () => renderDefs(l, container, hide, onChange);
    container.replaceChildren(...(l.theory || []).map((t, i) => {
      const k = nKey(l, i);
      const st = notionState(l, i);
      const chk = h('button', { class: 'chk' + (S.notions[k] ? ' on' : ''), title: 'O noțiune e „înțeleasă" când o declari tu ȘI ai trecut testele ei.', onclick: e => {
        e.stopPropagation();
        S.notions[k] = !S.notions[k]; if (!S.notions[k]) delete S.notions[k];
        const x = lessonNotions(l); if (x.done === x.total) S.studied[l.id] = true;
        save(); onChange && onChange(); redraw();
      } }, S.notions[k] ? '✓ Declarată înțeleasă' : 'Declar că am înțeles');
      const d = h('div', { class: 'def' + (t.important ? ' imp' : '') + (hide ? ' hidden' : '') },
        h('div', { class: 'kind' }, h('span', { class: 'st st-' + st }, STATE_LABEL[st]), ' ' + (t.important ? '★ Repere · ' : '') + (KIND[t.kind] || t.kind || '') + (t.derived ? ' · din exercițiile manualului, nu din Repere' : '')),
        h('h3', {}, t.term),
        h('div', { class: 'body' },
          h('p', {}, t.text),
          (t.examples || []).length > 0 && h('div', { class: 'ex' }, 'Exemple: ' + t.examples.join(' · '))),
        chk);
      d.onclick = () => { if (hide) d.classList.toggle('hidden'); };
      return d;
    }));
  }

  function theoryTab(l, body) {
    const th = l.theory || [];
    if (!th.length) { body.append(h('p', { class: 'muted' }, 'Această lecție este dedicată lecturii și nu introduce definiții noi. Poți totuși exersa din fila „Exersează”.')); return; }
    let hide = false;
    const list = h('div');
    const counter = h('span', { class: 'badge score' });
    const upd = () => { const x = lessonNotions(l); counter.textContent = `${x.done}/${x.total} noțiuni înțelese`; };
    const draw = () => renderDefs(l, list, hide, upd);
    const tog = h('button', { class: 'btn ghost', onclick: () => { hide = !hide; tog.textContent = hide ? '👁 Arată definițiile' : '🙈 Acoperă definițiile (autotest)'; draw(); } }, '🙈 Acoperă definițiile (autotest)');
    const mark = h('button', { class: 'btn', onclick: () => { S.studied[l.id] = !S.studied[l.id]; save(); mark.textContent = S.studied[l.id] ? '✓ Marcată ca învățată' : 'Marchează ca învățată'; } },
      S.studied[l.id] ? '✓ Marcată ca învățată' : 'Marchează ca învățată');
    upd();
    body.append(h('div', { class: 'row' }, tog, mark, counter), list,
      h('p', { class: 'muted' }, 'Sfat: acoperă definițiile și încearcă să le spui din memorie; apasă pe o carte pentru a o descoperi.'));
    draw();
  }

  function cardsTab(l, body) {
    const cards = l.flashcards && l.flashcards.length ? l.flashcards : (l.theory || []).map(t => ({ front: t.term, back: t.text }));
    if (!cards.length) { body.append(h('p', { class: 'muted' }, 'Nu există flashcarduri pentru această lecție.')); return; }
    cardsPlayer(cards.map((c, i) => ({ key: l.id + '#' + i, front: c.front, back: c.back })), body);
  }

  // player de flashcarduri pe o listă oarecare: [{key, front, back}]
  function cardsPlayer(cards, body) {
    let order = shuffle(cards.map((_, i) => i)), pos = 0;
    const kk = i => cards[i].key;
    const area = h('div');
    const draw = () => {
      if (pos >= order.length) {
        const kn = cards.filter((_, i) => S.known[kk(i)]).length;
        area.replaceChildren(h('div', { class: 'card' }, h('div', { class: 'big' }, `${kn}/${cards.length}`), h('p', {}, 'carduri marcate „Știu" (declarație, nu dovadă)'),
          h('div', { class: 'row' }, h('button', { class: 'btn', onclick: () => { order = shuffle(cards.map((_, i) => i)); pos = 0; draw(); } }, 'Reia toate'),
            h('button', { class: 'btn ghost', onclick: () => { order = shuffle(cards.map((_, i) => i).filter(i => !S.known[kk(i)])); pos = 0; if (!order.length) order = shuffle(cards.map((_, i) => i)); draw(); } }, 'Doar cele nesigure'))));
        return;
      }
      const i = order[pos], c = cards[i];
      const f = h('div', { class: 'flash', onclick: () => f.classList.toggle('flip') }, h('div', { class: 'in' }, h('div', { class: 'f' }, c.front), h('div', { class: 'b' }, c.back)));
      area.replaceChildren(
        h('div', { class: 'prog' }, h('i', { style: `width:${100 * pos / order.length}%` })),
        h('div', { class: 'muted' }, `Card ${pos + 1} din ${order.length} · apasă pe card pentru a vedea răspunsul`), f,
        h('div', { class: 'muted', style: 'font-size:12px' }, '„Știu" te ajută doar să-ți urmărești cardurile. Înțelegerea unei noțiuni o dovedești din fila „Exersează".'),
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

  // noțiunile care sunt acum „de repetat" după întrebările din această sesiune
  function weakNotions(items) {
    const seen = new Set(), out = [];
    items.forEach(q => {
      const l = findLesson(q.lessonId); if (!l) return;
      (q.n || []).forEach(i => {
        const id = l.id + '#' + i;
        if (seen.has(id) || !(l.theory || [])[i] || notionState(l, i) !== 'weak') return;
        seen.add(id); out.push({ l, term: l.theory[i].term });
      });
    });
    return out;
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
        const weak = weakNotions(items);
        box.replaceChildren(h('div', { class: 'big' }, pct + '%'), h('p', {}, `${right} din ${items.length} corecte.`),
          weak.length > 0 && h('div', { class: 'fb bad' }, h('b', {}, 'Noțiuni de repetat: '), weak.map(w => h('a', { href: `#/l/${w.l.id}/theory`, style: 'margin-right:10px' }, w.term))),
          weak.length === 0 && missed.length === 0 && h('div', { class: 'fb ok' }, '✓ Teste trecute. Intră în „Teorie" și apasă „Declar că am înțeles" la noțiunile pe care le-ai înțeles cu adevărat.'),
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
        if (ok) { right++; delete S.wrong[q.key]; S.ok[q.key] = true; } else { missed.push(q); delete S.ok[q.key]; S.wrong[q.key] = (S.wrong[q.key] || 0) + 1; }
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

  // ---------- recapitulare pe teme ----------
  const themeList = () => (window.THEMES || []).map(t => Object.assign({}, t, { ls: t.lessons.map(findLesson).filter(Boolean) }));
  function themeStats(t) {
    const c = { total: 0, ok: 0, weak: 0, wait: 0, new: 0, q: 0, cards: 0 };
    t.ls.forEach(l => {
      c.q += (l.quiz || []).length; c.cards += (l.flashcards || []).length;
      (l.theory || []).forEach((_, i) => {
        c.total++; const s = notionState(l, i);
        if (isDone(s)) c.ok++; else if (s === 'weak') c.weak++; else if (s === 'new' || s === 'nt') c.new++; else c.wait++;
      });
    });
    c.pct = c.total ? Math.round(100 * c.ok / c.total) : 0;
    return c;
  }
  function themeQuestions(t, onlyUnproven) {
    const out = [];
    t.ls.forEach(l => (l.quiz || []).forEach((q, qi) => {
      if (onlyUnproven && !(q.n || []).some(i => !isDone(notionState(l, i)))) return;
      out.push(Object.assign({ key: l.id + '#' + qi, lessonId: l.id }, q));
    }));
    return out;
  }

  function topicsPage() {
    render(h('h1', {}, 'Recapitulare pe teme'),
      h('p', { class: 'muted' }, 'Alege o temă și recapitulezi, într-un singur loc, lecțiile care o tratează din toate unitățile: teorie, flashcarduri și exerciții.'),
      h('div', { class: 'grid' }, themeList().map(t => {
        const c = themeStats(t);
        return h('a', { class: 'card', href: '#/topic/' + t.id },
          h('div', { style: 'font-size:28px' }, t.icon),
          h('h3', { style: 'margin:.2em 0' }, t.title),
          h('div', { class: 'muted' }, t.blurb),
          h('div', { class: 'muted', style: 'margin-top:8px' }, `${pl(t.ls.length, 'lecție', 'lecții')} · ${c.ok}/${c.total} noțiuni înțelese${c.weak ? ' · ⚠ ' + c.weak + ' de repetat' : ''}`),
          h('div', { class: 'bar' }, h('i', { style: `width:${c.pct}%` })));
      })));
  }

  function topicPage(id) {
    const t = themeList().find(x => x.id === id); if (!t) return topicsPage();
    const stats = h('div', { class: 'card', style: 'margin:14px 0' });
    const practice = h('div');
    const btns = h('div', { class: 'row' });
    const drawStats = () => {
      const c = themeStats(t), all = themeQuestions(t), unp = themeQuestions(t, true);
      stats.replaceChildren(
        h('b', {}, `Noțiuni înțelese: ${c.ok} din ${c.total} (${c.pct}%)`),
        h('div', { class: 'bar' }, h('i', { style: `width:${c.pct}%` })),
        h('div', { class: 'muted', style: 'margin-top:8px' },
          `✓ ${c.ok} înțelese · ⚠ ${c.weak} de repetat · ◐ ${c.wait} în curs / în așteptarea declarației · ○ ${c.new} neexersate`));
      const go = items => { practice.replaceChildren(); runQuiz(practice, shuffle(items).slice(0, items.length), null); practice.scrollIntoView({ behavior: 'smooth' }); };
      btns.replaceChildren(
        h('button', { class: 'btn', disabled: !all.length, onclick: () => go(shuffle(all).slice(0, 15)) }, '🎲 15 întrebări'),
        h('button', { class: 'btn ghost', disabled: !all.length, onclick: () => go(all) }, `📝 Toate întrebările (${all.length})`),
        h('button', { class: 'btn ghost', disabled: !unp.length, onclick: () => go(unp) }, `🎯 Ce n-am dovedit încă (${unp.length})`),
        h('button', { class: 'btn ghost', disabled: !c.cards, onclick: () => { practice.replaceChildren(); cardsPlayer(t.ls.flatMap(l => (l.flashcards || []).map((f, i) => ({ key: l.id + '#' + i, front: f.front, back: f.back }))), practice); } }, `🃏 Flashcarduri (${c.cards})`),
        h('a', { class: 'btn ghost', href: '#/print-topic/' + t.id }, '🖨 Fișe'));
    };
    const defs = t.ls.filter(l => (l.theory || []).length).map(l => {
      const box = h('div');
      renderDefs(l, box, false, drawStats);
      return h('details', { class: 'topic-lesson', open: t.ls.length <= 3 ? '' : null },
        h('summary', {}, `${unitOf(l.unitId).unit.number}.L${l.number} · ${l.title} `, h('span', { class: 'muted' }, pl(l.theory.length, 'noțiune', 'noțiuni'))),
        box, h('a', { href: `#/l/${l.id}/theory` }, 'Deschide lecția →'));
    });
    render(h('div', { class: 'crumbs' }, h('a', { href: '#/topics' }, 'Teme'), ' › ' + t.title),
      h('h1', {}, `${t.icon} ${t.title}`), h('p', { class: 'muted' }, t.blurb),
      stats, btns, practice,
      h('h2', {}, 'Lecțiile temei'),
      h('div', {}, t.ls.map(l => h('a', { class: 'lesson-row', href: `#/l/${l.id}/theory` },
        h('span', { class: 'num' }, `U${unitOf(l.unitId).unit.number}·L${l.number}`),
        h('span', { class: 't' }, l.title, h('div', { class: 'muted' }, [l.pages, hasPractice(l) ? pl((l.theory || []).length, 'noțiune', 'noțiuni') : '📖 doar lectură'].filter(Boolean).join(' · ')))))),
      h('h2', {}, 'Teoria temei'),
      defs);
    drawStats();
  }

  function printTopic(id) {
    const t = themeList().find(x => x.id === id); if (!t) return topicsPage();
    const ls = t.ls.filter(l => (l.theory || []).length);
    render(h('div', { class: 'noprint' },
      h('div', { class: 'crumbs' }, h('a', { href: '#/topic/' + id }, '← ' + t.title)),
      h('h1', {}, 'Fișe printabile · ' + t.title),
      h('p', { class: 'muted' }, `${pl(ls.length, 'fișă', 'fișe')}, câte una pe pagină.`),
      h('button', { class: 'btn', onclick: () => window.print() }, '🖨 Tipărește fișele temei')),
      ls.map(l => sheetNode(l, unitOf(l.unitId))));
  }

  // ---------- glosar ----------
  function glossary() {
    const all = [];
    D.units.forEach(u => u.lessons.forEach(l => (l.theory || []).forEach(t => all.push({ t, l, u }))));
    const list = h('div');
    const q = h('input', { class: 'search', placeholder: `Caută printre ${pl(all.length, 'noțiune', 'noțiuni')} (termen, definiție, lecție sau temă)…`, type: 'search' });
    const themes = themeList();
    const themesOf = l => themes.filter(t => t.lessons.includes(l.id));
    // „verbul" → „verb", „timpurile" → „timpuril…": taie terminațiile frecvente ca să se găsească și alte forme ale cuvântului
    const stem = w => { for (const suf of ['ului', 'ilor', 'elor', 'ul', 'le', 'ii', 'ei', 'ea', 'a', 'e', 'i']) if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length); return w; };
    const draw = () => {
      const toks = norm(q.value).split(' ').filter(Boolean).map(stem);
      let banner = null, res;
      if (!toks.length) {
        res = all.slice().sort((a, b) => a.t.term.localeCompare(b.t.term, 'ro'));
      } else {
        // potrivire la început de cuvânt („verb" găsește verbul, verbe, verbale, dar nu și ad-verb)
        const hasAll = txt => toks.every(k => (' ' + txt).includes(' ' + k));
        const titleHits = themes.filter(t => hasAll(norm(t.title)));
        const themeHits = titleHits.length ? titleHits : themes.filter(t => hasAll(norm(t.title + ' ' + t.blurb)));
        const inTheme = new Set(themeHits.flatMap(t => t.lessons));
        res = [];
        all.forEach((x, idx) => {
          const term = norm(x.t.term), text = norm(x.t.text), lt = norm(x.l.title);
          const sc = (inTheme.has(x.l.id) ? 4 : 0) + (hasAll(term) ? 3 : 0) + (hasAll(lt) ? 2 : 0) + (hasAll(text) ? 1 : 0);
          if (sc > 0) res.push({ ...x, sc, idx });
        });
        res.sort((a, b) => b.sc - a.sc || a.idx - b.idx);
        if (themeHits.length) banner = h('div', { class: 'card', style: 'margin:10px 0' },
          h('b', {}, themeHits.length === 1 ? 'Temă găsită:' : 'Teme găsite:'), ' ',
          themeHits.map(t => h('a', { href: '#/topic/' + t.id, style: 'margin-right:12px;font-weight:600' }, `${t.icon} ${t.title} (recapitulare) →`)));
      }
      list.replaceChildren(...[banner, h('p', { class: 'muted' }, pl(res.length, 'rezultat', 'rezultate') + (res.length > 120 ? ' · se afișează primele 120' : ''))].filter(Boolean), ...res.slice(0, 120).map(x =>
        h('div', { class: 'def' + (x.t.important ? ' imp' : '') },
          h('div', { class: 'kind' }, `U${x.u.unit.number} · L${x.l.number} · ${x.l.title}` + (themesOf(x.l).length ? ' · temă: ' + themesOf(x.l).map(t => t.title).join(', ') : '')),
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
        h('div', { class: 'card' }, h('b', {}, Object.keys(S.known).length), 'flashcarduri marcate «Știu»'),
        h('div', { class: 'card' }, h('b', {}, `${D.units.reduce((a, u) => a + unitNotions(u).done, 0)}/${terms}`), 'noțiuni înțelese'),
        h('div', { class: 'card' }, h('b', {}, Object.keys(S.wrong).length), 'întrebări de reluat')),
      h('h2', {}, 'Pe unități'),
      D.units.map(u => { const p = unitProgress(u); return h('div', { class: 'card', style: 'margin:8px 0' }, h('b', {}, `U${u.unit.number}. ${u.unit.title}`), h('div', { class: 'muted' }, `${unitNotions(u).done}/${unitNotions(u).total} noțiuni înțelese · ${p.done}/${p.total} lecții învățate`), h('div', { class: 'bar' }, h('i', { style: `width:${unitNotions(u).total ? Math.round(100 * unitNotions(u).done / unitNotions(u).total) : 0}%` }))); }),
      h('div', { class: 'row' }, h('button', { class: 'btn ghost', onclick: () => { if (confirm('Ștergi tot progresul?')) { localStorage.removeItem(KEY); location.reload(); } } }, 'Resetează progresul')));
  }

  route();
})();
