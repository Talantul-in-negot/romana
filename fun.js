/* Partea jucăușă: decoruri cu animale, mascotă și confetti. Nu atinge lecțiile sau progresul. */
(function () {
  'use strict';
  const SCENES = {
    padure: { name: '🌳 Pădure', mascot: '🦉', animals: ['🦊', '🐻', '🦔', '🐿️', '🦌', '🐰', '🦉', '🐝'], decor: ['🌲', '🍄', '🌳', '🌼', '🌲', '🌷'], air: ['🦋', '🍃', '🐦'] },
    ocean: { name: '🐠 Ocean', mascot: '🐙', animals: ['🐠', '🐬', '🐢', '🐙', '🦀', '🐳', '🐡', '🦭'], decor: ['🪸', '🐚', '🌿', '⭐', '🪸', '🐚'], air: ['🫧', '🐟', '🫧'] },
    spatiu: { name: '🚀 Spațiu', mascot: '👽', animals: ['🚀', '🪐', '🛸', '👩‍🚀', '🐶', '🌍', '🐱', '☄️'], decor: ['🌑', '✨', '🛰️', '✨', '🔭', '✨'], air: ['⭐', '✨', '🌟'] },
    savana: { name: '🦁 Savană', mascot: '🦁', animals: ['🦒', '🐘', '🦓', '🐒', '🦏', '🦛', '🐆', '🦩'], decor: ['🌴', '🌾', '🌵', '🌾', '🌴', '🌻'], air: ['🦜', '☁️', '🦅'] },
    ferma: { name: '🐮 Fermă', mascot: '🐥', animals: ['🐮', '🐷', '🐑', '🐴', '🐓', '🐰', '🐐', '🐕'], decor: ['🌻', '🚜', '🌽', '🌷', '🏡', '🌳'], air: ['🦋', '☁️', '🐝'] },
    linistit: { name: '😌 Liniștit', mascot: '🦉', animals: [], decor: [], air: [] }
  };
  const SKEY = 'rom6-scene';
  const store = {
    get: () => { try { return localStorage.getItem(SKEY); } catch (e) { return null; } },
    set: v => { try { localStorage.setItem(SKEY, v); } catch (e) { /* fără stocare: decorul nu se reține */ } }
  };
  const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pick = a => a[Math.random() * a.length | 0];
  const el = (cls, text) => { const e = document.createElement('div'); e.className = cls; if (text) e.textContent = text; return e; };

  let current = SCENES[store.get()] ? store.get() : 'padure';

  // ---------- decor ----------
  const scene = el('scene'); scene.id = 'scene'; scene.setAttribute('aria-hidden', 'true');
  // poziții pe margini [stânga/dreapta, % de sus, distanța de margine în vw]
  const SPOTS = [['left', 14, 2], ['right', 18, 3], ['left', 36, 6], ['right', 40, 1.5], ['left', 58, 1.5], ['right', 62, 6], ['left', 76, 7], ['right', 78, 2]];

  function drawScene() {
    const s = SCENES[current];
    document.documentElement.dataset.scene = current;
    const nodes = [el('sun'), el('ground')];
    s.animals.forEach((a, i) => {
      const [side, top, off] = SPOTS[i % SPOTS.length];
      const n = el('animal', a);
      n.style.cssText = `${side}:${off}vw;top:${top}%;animation-delay:${-i * 0.7}s`;
      nodes.push(n);
    });
    s.decor.forEach((d, i) => {
      const n = el('decor', d);
      n.style.cssText = `left:${4 + i * 17}%;bottom:${i % 2 ? 6 : 18}px`;
      nodes.push(n);
    });
    s.air.forEach((a, i) => {
      const n = el('flyer', a);
      n.style.cssText = `top:${12 + i * 24}%;animation-duration:${38 + i * 13}s;animation-delay:${-i * 17}s`;
      nodes.push(n);
    });
    scene.replaceChildren(...nodes);
    mascot.textContent = s.mascot;
  }

  // ---------- mascota ----------
  const buddy = el('buddy');
  const bubble = el('bubble'); bubble.setAttribute('role', 'status');
  const mascot = document.createElement('button');
  mascot.className = 'mascot'; mascot.title = 'Apasă pentru un sfat'; mascot.setAttribute('aria-label', 'Mascota: un sfat de învățat');
  buddy.append(bubble, mascot);
  let timer;
  function say(text, ms) {
    bubble.textContent = text; bubble.classList.add('show');
    clearTimeout(timer); timer = setTimeout(() => bubble.classList.remove('show'), ms || 3200);
  }
  function hop(cls) { mascot.classList.remove('hop', 'shake'); void mascot.offsetWidth; mascot.classList.add(cls); }

  const TIPS = [
    'Acoperă definiția și spune-o cu voce tare. Apoi verifică!',
    'Mai bine puțin în fiecare zi decât mult o dată.',
    'Ai greșit? Foarte bine: acum știi ce să repeți.',
    'Dă un exemplu al tău pentru fiecare noțiune.',
    'Explică lecția cuiva din familie. Așa o ții minte!',
    'Ia o pauză scurtă după două lecții. 🥤',
    'O noțiune e a ta când o declari ȘI treci testele.'
  ];
  const GOOD = ['Bravo! 🎉', 'Super! ⭐', 'Excelent! 🌟', 'Așa da! 👏', 'Ești pe drumul bun! 🚀'];
  const RETRY = ['Nu-i nimic, mai încearcă! 💪', 'Aproape! Citește explicația. 🔍', 'Din greșeli învățăm! 🌱'];
  mascot.onclick = () => { hop('hop'); say(pick(TIPS), 5000); };

  // ---------- confetti ----------
  const COLORS = ['#ff6b6b', '#ffd43b', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
  function confetti(n, x, y) {
    if (calmMotion.matches || current === 'linistit' || !document.body.animate) return;
    for (let i = 0; i < n; i++) {
      const animal = i % 9 === 0;
      const p = el('confetti', animal ? pick(SCENES[current].animals) : '');
      p.setAttribute('aria-hidden', 'true');
      if (!animal) p.style.background = pick(COLORS);
      p.style.left = x + 'px'; p.style.top = y + 'px';
      document.body.append(p);
      const dx = (Math.random() - 0.5) * 420, up = 90 + Math.random() * 190;
      const a = p.animate([
        { transform: 'translate(0,0) rotate(0)', opacity: 1 },
        { transform: `translate(${dx * 0.6}px,${-up}px) rotate(${dx}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx}px,${160 + Math.random() * 160}px) rotate(${dx * 2}deg)`, opacity: 0 }
      ], { duration: 1100 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' });
      a.onfinish = () => p.remove();
    }
  }

  let streak = 0;
  window.FUN = {
    answer(ok) {
      streak = ok ? streak + 1 : 0;
      if (ok) {
        hop('hop');
        say(streak >= 3 ? `${streak} la rând! 🔥` : pick(GOOD));
        confetti(streak >= 3 ? 36 : 18, innerWidth / 2, innerHeight * 0.55);
      } else { hop('shake'); say(pick(RETRY)); }
    },
    result(pct) {
      streak = 0; hop('hop');
      say(pct === 100 ? 'Perfect! Ești de aur! 🏆' : pct >= 70 ? 'Felicitări, ai trecut! 🎉' : 'Mai repetă puțin și vei reuși! 💪', 5000);
      if (pct >= 70) confetti(pct === 100 ? 110 : 60, innerWidth / 2, innerHeight * 0.45);
    },
    declared() { hop('hop'); say('Notat! Acum dovedește în „Exersează”. 😉'); }
  };

  // ---------- selector de decor ----------
  const sel = document.createElement('select');
  sel.id = 'scene-pick'; sel.title = 'Alege decorul'; sel.setAttribute('aria-label', 'Alege decorul');
  Object.keys(SCENES).forEach(k => { const o = document.createElement('option'); o.value = k; o.textContent = SCENES[k].name; sel.append(o); });
  sel.value = current;
  sel.onchange = () => { current = sel.value; store.set(current); drawScene(); say(current === 'linistit' ? 'Mod liniștit. Spor la învățat!' : 'Ce decor frumos! 😍'); };

  document.body.prepend(scene);
  document.body.append(buddy);
  document.getElementById('theme').before(sel);
  drawScene();
  say('Salut! Hai să învățăm! 👋', 4000);
})();
