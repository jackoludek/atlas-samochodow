// ui.js: drobne narzędzia ekranu Atlasu: liczby po polsku, skala ocen, dymki, komunikat z „Cofnij”, przeciąganie myszą,
// ściąga przesuwana i skalowana oraz połysk wybranego widoku. Bez stanu aplikacji: ten jest w app.js.
(function () {
  'use strict';
  const $ = (s, w = document) => w.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const ik = (id, kl = '') => `<svg class="ikona ${kl}" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const liczba = (x, m = 0) => (x == null ? '–' : Number(x).toLocaleString('pl-PL', { minimumFractionDigits: m, maximumFractionDigits: m }));
  const tys = (zl) => liczba(Math.round(zl / 1000));
  const odmiana = (n, jeden, kilka, wiele) => (n === 1 ? jeden : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14)) ? kilka : wiele);

  // Skala ocen w jednej kolumnie: najsłabszy czerwony, najlepszy fioletowy (lider), reszta w czterech krokach.
  function skala(wartosci) {
    const w = wartosci.filter((x) => x != null).map((x) => Math.round(x));
    const min = Math.min(...w), max = Math.max(...w);
    return (x) => {
      if (x == null) return '';
      x = Math.round(x);
      if (x === max) return 'lider';
      if (max - min < 0.5) return '3';
      return String(Math.min(3, Math.floor(((x - min) / (max - min)) * 4)));
    };
  }

  // Sylwetka nadwozia z przewodnika: kontur i dwa koła, które zasłaniają linię spodu.
  function sylwetka(n, kl = 'sylwetka-duza') {
    const [a, b, r] = n.k;
    return `<svg class="sylwetka ${kl}" viewBox="0 0 120 48" aria-hidden="true"><path d="${n.s}"/><circle class="kolo" cx="${a}" cy="38" r="${r}"/><circle class="kolo" cx="${b}" cy="38" r="${r}"/></svg>`;
  }

  // ---------------------------------------------------------------- dymki: pod rzeczą, na środku, po pół sekundy
  const dymek = $('#dymek');
  let zegarDymka = 0, wlasciciel = null;
  function pokazDymek(el) {
    const t = el.getAttribute('data-dymek'); if (!t) return;
    wlasciciel = el; dymek.textContent = t; dymek.hidden = false;
    const r = el.getBoundingClientRect(), d = dymek.getBoundingClientRect();
    let x = r.left + r.width / 2 - d.width / 2, y = r.bottom + 8;
    if (y + d.height > innerHeight - 8) y = r.top - d.height - 8;
    x = Math.max(8, Math.min(innerWidth - d.width - 8, x));
    dymek.style.left = x + 'px'; dymek.style.top = y + 'px';
  }
  function schowajDymek() { clearTimeout(zegarDymka); dymek.hidden = true; wlasciciel = null; }
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest('[data-dymek]');
    if (el === wlasciciel) return;
    schowajDymek();
    if (el && e.pointerType === 'mouse') zegarDymka = setTimeout(() => pokazDymek(el), 500);
  });
  document.addEventListener('focusin', (e) => { const el = e.target.closest('[data-dymek]'); schowajDymek(); if (el && el.matches(':focus-visible')) pokazDymek(el); });
  document.addEventListener('focusout', schowajDymek);
  document.addEventListener('pointerdown', schowajDymek);
  addEventListener('scroll', schowajDymek, { passive: true });

  // ---------------------------------------------------------------- komunikat na dole z „Cofnij”
  const toast = $('#toast');
  let zegarToastu = 0;
  function komunikat(tekst, przycisk, akcja, ms = 6000) {
    clearTimeout(zegarToastu);
    toast.innerHTML = `<span>${esc(tekst)}</span>` + (przycisk ? `<button class="przycisk" type="button">${ik('cofnij')}${esc(przycisk)}</button>` : '');
    toast.hidden = false;
    const b = toast.querySelector('button');
    if (b) b.onclick = () => { toast.hidden = true; akcja(); };
    zegarToastu = setTimeout(() => { toast.hidden = true; }, ms);
  }

  // ---------------------------------------------------------------- przeciąganie myszą i Alt + strzałka
  // Palec przewija, nie przestawia (reguła telefonu), więc ruszamy tylko myszą, po 5 px ruchu.
  function przeciagalne(kontener, selektor, { os = 'x', poZmianie }) {
    let ciagniety = null, start = null, ruszony = false, cel = null;
    const elementy = () => [...kontener.querySelectorAll(selektor)];
    const kolejnosc = () => elementy().map((e) => e.dataset.id);
    const ruch = (e) => {
      if (!ruszony && Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5) return;
      ruszony = true; ciagniety.classList.add('ciagniety'); schowajDymek();
      const nad = elementy().find((x) => { const r = x.getBoundingClientRect(); return os === 'x' ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2; });
      if (cel) cel.classList.remove('cel-przed');
      cel = nad && nad !== ciagniety ? nad : null;
      if (cel) cel.classList.add('cel-przed');
    };
    const koniec = () => {
      removeEventListener('pointermove', ruch);
      const el = ciagniety; ciagniety = null; el.classList.remove('ciagniety');
      if (cel) cel.classList.remove('cel-przed');
      if (!ruszony) return;
      const ids = kolejnosc().filter((id) => id !== el.dataset.id);
      const i = cel ? ids.indexOf(cel.dataset.id) : ids.length;
      ids.splice(i, 0, el.dataset.id);
      cel = null;
      el.addEventListener('click', (k) => { k.stopPropagation(); k.preventDefault(); }, { capture: true, once: true });
      setTimeout(() => { if (ids.join() !== kolejnosc().join()) poZmianie(ids); else el.click(); }, 0);
    };
    kontener.addEventListener('pointerdown', (e) => {
      const el = e.target.closest(selektor);
      if (!el || e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('input, .bez-ciagniecia')) return;
      ciagniety = el; start = { x: e.clientX, y: e.clientY }; ruszony = false;
      addEventListener('pointermove', ruch); addEventListener('pointerup', koniec, { once: true });
    });
    kontener.addEventListener('keydown', (e) => {
      const el = e.target.closest(selektor);
      const krok = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1 }[e.key];
      if (!el || !e.altKey || !krok || (os === 'x') !== (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
      e.preventDefault(); e.stopPropagation();
      const ids = kolejnosc(), i = ids.indexOf(el.dataset.id), j = i + krok;
      if (j < 0 || j >= ids.length) return;
      [ids[i], ids[j]] = [ids[j], ids[i]];
      poZmianie(ids, el.dataset.id);
    });
  }
  // ---------------------------------------------------------------- ściąga: na środku, przesuwana i skalowana
  function sciaga(okno, html, poZamknieciu) {
    okno.innerHTML = `<button class="okragly maly zamknij" type="button" aria-label="Zamknij ściągę" data-dymek="Zamknij ściągę">${ik('zamknij')}</button>`
      + `<div class="srodek">${html}</div><div class="uchwyt" aria-hidden="true">${ik('uchwyt')}</div>`;
    let skala = 1, dx = 0, dy = 0;
    const ustaw = () => { okno.style.setProperty('--skala', skala); okno.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${skala})`; };
    const zamknij = () => { okno.hidden = true; document.removeEventListener('keydown', klawisz, true); document.body.classList.remove('czyta'); poZamknieciu && poZamknieciu(); };
    const klawisz = (e) => { if (e.key === 'Escape') { e.stopPropagation(); zamknij(); } };
    okno.querySelector('.zamknij').onclick = zamknij;
    const srodek = okno.querySelector('.srodek');
    srodek.addEventListener('pointerdown', (e) => {
      if (e.target.closest('section') || e.button !== 0) return;
      const p = { x: e.clientX - dx, y: e.clientY - dy };
      const ruch = (m) => { dx = m.clientX - p.x; dy = m.clientY - p.y; ustaw(); };
      addEventListener('pointermove', ruch); addEventListener('pointerup', () => removeEventListener('pointermove', ruch), { once: true });
    });
    okno.querySelector('.uchwyt').addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const s0 = skala, x0 = e.clientX;
      const ruch = (m) => { skala = Math.min(1.6, Math.max(0.75, s0 + (m.clientX - x0) / 400)); ustaw(); };
      addEventListener('pointermove', ruch); addEventListener('pointerup', () => removeEventListener('pointermove', ruch), { once: true });
    });
    okno.addEventListener('wheel', (e) => {
      if (e.ctrlKey) { e.preventDefault(); skala = Math.min(1.6, Math.max(0.75, skala - Math.sign(e.deltaY) * 0.1)); ustaw(); }
      else if (!srodek.contains(e.target)) e.preventDefault();
    }, { passive: false });
    ustaw(); okno.hidden = false; document.body.classList.add('czyta');
    document.addEventListener('keydown', klawisz, true);
    okno.querySelector('.zamknij').focus();
  }

  // ---------------------------------------------------------------- połysk wybranego widoku
  // Barwa smugi losowana przy każdym uruchomieniu: co najmniej 70° od barwy widoku i 1,4:1 do jego pastelu.
  const PULA = ['#ffd60a', '#ff375f', '#63e6e2', '#ff9f0a', '#64d2ff', '#bf5af2', '#30d158', '#ffffff', '#ffb340', '#5e5ce6'];
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lum = (h) => { const c = hex(h).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const kontrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const barwa = (h) => { const [r, g, b] = hex(h), mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (!d) return null;
    const t = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; return (t * 60 + 360) % 360; };
  const mieszaj = (a, b, p) => '#' + hex(a).map((v, i) => Math.round((v * p + hex(b)[i] * (1 - p)) * 255).toString(16).padStart(2, '0')).join('');
  function polysk(przycisk, kolorWidoku, ciemny) {
    const pastel = mieszaj(kolorWidoku, ciemny ? '#000000' : '#ffffff', ciemny ? 0.34 : 0.24);
    const hw = barwa(kolorWidoku);
    const dobre = PULA.filter((p) => { const h = barwa(p); const odl = h == null || hw == null ? 180 : Math.min(Math.abs(h - hw), 360 - Math.abs(h - hw)); return odl >= 70 && kontrast(p, pastel) >= 1.4; });
    const wybor = (dobre.length ? dobre : PULA)[Math.floor(Math.random() * (dobre.length || PULA.length))];
    przycisk.style.setProperty('--polysk', wybor);
  }

  window.AtlasUI = { $, esc, ik, liczba, tys, odmiana, skala, sylwetka, komunikat, przeciagalne, sciaga, polysk, schowajDymek, kontrast };
})();