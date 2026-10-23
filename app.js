// app.js: stan Atlasu Samochodów i zdarzenia. Stan (widok, kolejność widoków, filtry, zestawy) leży w pamięci przeglądarki,
// każda zmiana Jacka idzie do historii (Ctrl+Z cofa, Ctrl+Y i Ctrl+Shift+Z ponawiają), szczegóły mają strzałkę Wstecz,
// a Android woła Atlas.wstecz() przy przycisku Wstecz. Rysuje widoki.js, liczy ocena.js.
(function () {
  'use strict';
  const O = window.AtlasOcena, U = window.AtlasUI, W = window.AtlasWidoki, { $, esc, ik } = U;
  const KLUCZ = 'atlas-samochodow:stan', KLUCZ_DANYCH = 'atlas-samochodow:dane';
  const ZDALNE = 'https://jackoludek.github.io/atlas-samochodow/dane.json';
  const WIDOKI = { marki: ['Marki', 'marki', 'niebieski'], modele: ['Modele', 'modele', 'indygo'], moj: ['Mój ranking', 'moj', 'turkus'], typy: ['Typy aut', 'typy', 'braz'] };

  // ---------------------------------------------------------------- dane: wbudowane albo nowsze z sieci
  try { const z = JSON.parse(localStorage.getItem(KLUCZ_DANYCH) || 'null'); if (z && z.zbudowano > window.ATLAS.zbudowano) window.ATLAS = z; } catch { /* zostają wbudowane */ }
  function nowszeDane() {
    if (location.hostname.endsWith('github.io') || !navigator.onLine) return;
    fetch(ZDALNE + '?v=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((d) => {
      if (!d || !d.modele || !(d.zbudowano > window.ATLAS.zbudowano)) return;
      window.ATLAS = d;
      try { localStorage.setItem(KLUCZ_DANYCH, JSON.stringify(d)); } catch { /* bez miejsca: dane tylko do zamknięcia */ }
      rysuj();
    }).catch(() => { /* bez sieci zostają dane z aplikacji */ });
  }

  // ---------------------------------------------------------------- stan i pamięć
  const poczatek = () => ({ widok: 'marki', kolejnosc: Object.keys(WIDOKI), kolumny: ['ogolem', 'bezp', 'niez'], soczewka: { marki: 'ogolem', modele: 'ogolem' }, calosc: { typy: false, model: false }, filtry: O.domyslne(), zestawy: [], wszystkie: { marki: false, modele: false, moj: false } });
  let st = poczatek();
  try {
    const z = JSON.parse(localStorage.getItem(KLUCZ) || 'null');
    if (z) { st = { ...st, ...z, filtry: { ...O.domyslne(), ...z.filtry }, soczewka: { ...st.soczewka, ...z.soczewka }, calosc: { ...st.calosc, ...z.calosc }, wszystkie: { ...st.wszystkie, ...z.wszystkie } };
      if (!Array.isArray(st.kolejnosc) || st.kolejnosc.length !== 4 || !st.kolejnosc.every((k) => WIDOKI[k])) st.kolejnosc = Object.keys(WIDOKI);
      if (!WIDOKI[st.widok]) st.widok = 'marki'; }
  } catch { /* pierwszy raz */ }
  st.szczegoly = null; st.edycja = null;
  const trwale = () => JSON.stringify({ widok: st.widok, kolejnosc: st.kolejnosc, kolumny: st.kolumny, soczewka: st.soczewka, calosc: st.calosc, filtry: st.filtry, zestawy: st.zestawy, wszystkie: st.wszystkie });
  const zapisz = () => { try { localStorage.setItem(KLUCZ, trwale()); } catch { /* bez pamięci */ } };

  // Historia operacji: zrzut stanu przed zmianą. Nowa zmiana kasuje to, co było do ponowienia.
  const historia = [], przyszlosc = [];
  function zmien(opis, fn, { komunikat } = {}) {
    const przed = trwale();
    fn();
    if (trwale() === przed) return;
    historia.push({ opis, stan: przed }); if (historia.length > 100) historia.shift();
    przyszlosc.length = 0;
    zapisz(); rysuj();
    if (komunikat) U.komunikat(komunikat, 'Cofnij', cofnij);
  }
  function przywroc(t) { const z = JSON.parse(t); Object.assign(st, z); st.edycja = null; zapisz(); rysuj(); }
  function cofnij() { const k = historia.pop(); if (!k) return; przyszlosc.push({ opis: k.opis, stan: trwale() }); przywroc(k.stan); }
  function ponow() { const k = przyszlosc.pop(); if (!k) return; historia.push({ opis: k.opis, stan: trwale() }); przywroc(k.stan); }

  // ---------------------------------------------------------------- rysowanie
  const tresc = $('#tresc'), pasek = $('#widoki'), arkusz = $('#filtry-arkusz'), tlo = $('#arkusz-tlo');
  const ciemny = matchMedia('(prefers-color-scheme: dark)');
  function rysujPasek() {
    const istniejace = [...pasek.children].map((b) => b.dataset.id).join();
    if (istniejace !== st.kolejnosc.join()) {
      pasek.innerHTML = st.kolejnosc.map((k) => { const [n, i, w] = WIDOKI[k];
        return `<button class="widok" type="button" role="tab" data-id="${k}" data-w="${w}" id="tab-${k}" aria-controls="tresc" aria-label="${esc(n)}" data-dymek="${esc(n)}"><span class="kafel">${ik(i)}</span><span class="napis" data-n="${esc(n)}"><span>${esc(n)}</span></span></button>`; }).join('');
      for (const b of pasek.children) U.polysk(b, getComputedStyle(b).getPropertyValue('--h').trim() || '#0071e3', ciemny.matches);
    }
    for (const b of pasek.children) { const tak = b.dataset.id === st.widok; b.setAttribute('aria-selected', String(tak)); b.tabIndex = tak ? 0 : -1; }
  }
  // Po przerysowaniu fokus wraca na tę samą kontrolkę (suwak, chip, nagłówek), także w arkuszu filtrów.
  const selektorFokusu = (a) => { const atr = Object.entries(a.dataset || {}).map(([k, v]) => `[data-${k.replace(/[A-Z]/g, (z) => '-' + z.toLowerCase())}="${CSS.escape(v)}"]`).join(''); return atr ? a.tagName.toLowerCase() + atr : a.id ? '#' + CSS.escape(a.id) : null; };
  function rysuj({ przewin } = {}) {
    const a = document.activeElement, sel = a && a !== document.body ? selektorFokusu(a) : null, wArkuszu = a && arkusz.contains(a);
    rysujPasek();
    const d = st.szczegoly;
    document.body.classList.toggle('czyta', Boolean(d) || !$('#sciaga').hidden);
    tresc.setAttribute('aria-labelledby', 'tab-' + st.widok);
    tresc.innerHTML = d ? (d.rodzaj === 'model' ? W.model(st, d.id) : W.marka(st, d.id)) : W[st.widok](st);
    const nazwyWidokow = { marki: 'Marki', modele: 'Modele', moj: 'Mój ranking', typy: 'Typy aut' };
    $('#tytul-widoku').innerHTML = d ? `<button class="przycisk" type="button" data-akcja="wstecz">${ik('wstecz')}${esc(nazwyWidokow[d.skad] || 'Wstecz')}</button>` : esc(WIDOKI[st.widok][0]);
    document.title = d ? `${tytulSzczegolow(d)} · Atlas Samochodów` : `${WIDOKI[st.widok][0]} · Atlas Samochodów`;
    if (!$('#filtry-arkusz').hidden) rysujArkusz();
    if (st.widok === 'moj' && !d) { const z = $('#zestawy'); if (z) U.przeciagalne(z, '.zestaw', { os: 'y', poZmianie: (ids, fokus) => zmien('kolejność zestawów', () => { st.zestawy = ids.map((id) => st.zestawy.find((x) => x.id === id)); }) || fokusuj(fokus) }); }
    const glowka = !d && tresc.querySelector('.lista thead tr');
    // Kolumny ocen przestawia nagłówek tabeli i pigułki kolejności (wąskie okno, telefon z myszą): jedna kolejność w st.kolumny.
    const kolumny = (kontener, sel, cel) => U.przeciagalne(kontener, sel, { os: 'x', poZmianie: (ids, fokus) => { zmien('kolejność kolumn', () => { st.kolumny = ids; }); if (fokus) requestAnimationFrame(() => { const b = tresc.querySelector(cel(fokus)); if (b) b.focus(); }); } });
    if (glowka && glowka.querySelector('th[data-id]')) kolumny(glowka, 'th[data-id]', (k) => `th[data-id="${k}"] button`);
    if (!d) for (const s of tresc.querySelectorAll('.soczewki')) kolumny(s, '.chip[data-id]', (k) => `.soczewki .chip[data-id="${k}"]`);
    if (st.edycja) { const p = tresc.querySelector('.nazwa-zestawu'); if (p) { p.focus(); p.select(); } }
    naPiksel();
    if (przewin != null) scrollTo(0, przewin);
    if (sel && !st.edycja && !document.activeElement.closest?.('.zapis')) { const e = (wArkuszu && arkusz.querySelector(sel)) || document.querySelector(sel); if (e && e !== document.activeElement) e.focus({ preventScroll: true }); }
  }
  const fokusuj = (id) => id && requestAnimationFrame(() => { const e = document.querySelector(`[data-id="${id}"]`); if (e) e.focus(); });
  // Rząd „W skrócie” i „Całość” i przyciski pod skrótem stoją w tekście, który płynie, więc zwykle wypadają na ułamku piksela, a wtedy
  // napis stał do 0,6 px za wysoko (pomiar 23.10.2026). Przeglądarka rysuje linię pisma na całym pikselu strony, a przy skali 1,5 jeszcze
  // na całym pikselu ekranu, więc odstęp nad rzędem dosuwa linię pisma (dół napisu przyciętego do wersalików) na najbliższy piksel, który
  // jest całym pikselem i strony, i ekranu (przy skali 1,5 co drugi; gdy takiego nie ma w 4 px, sam cały piksel strony; reguła „Precyzja”).
  function naPiksel() {
    const d = window.devicePixelRatio || 1;
    for (const r of tresc.querySelectorAll('.wersje, .akcje-skrotu')) {
      r.style.paddingTop = '';
      const t = r.querySelector('.tx');
      if (!r.offsetParent || !t) continue;
      const y = t.getBoundingClientRect().bottom + scrollY;
      let k = Math.ceil(y - 0.001), i = 0;
      while (i < 4 && Math.abs((k + i) * d - Math.round((k + i) * d)) > 0.01) i++;
      if (i < 4) k += i;
      if (k - y > 0.001) r.style.paddingTop = (k - y).toFixed(4) + 'px';
    }
  }
  addEventListener('resize', naPiksel);
  if (document.fonts) document.fonts.ready.then(naPiksel);
  function tytulSzczegolow(d) {
    const A = window.ATLAS;
    if (d.rodzaj === 'model') { const m = A.modele.find((x) => x.id === d.id); return m ? `${m.marka} ${m.model}` : ''; }
    const m = A.marki.find((x) => x.id === d.id); return m ? m.nazwa : '';
  }

  // ---------------------------------------------------------------- nawigacja
  function widok(k) { if (!WIDOKI[k]) return; zamknijSzczegoly(true); if (st.widok !== k) { st.widok = k; zapisz(); } rysuj({ przewin: 0 }); }
  function otworz(rodzaj, id) {
    const skad = st.szczegoly ? st.szczegoly.skad : st.widok;
    const przewiniecie = st.szczegoly ? st.szczegoly.przewiniecie : scrollY;
    if (!st.szczegoly) history.pushState({ atlas: 1 }, '', '#' + rodzaj + '/' + id);
    else history.replaceState({ atlas: 1 }, '', '#' + rodzaj + '/' + id);
    st.szczegoly = { rodzaj, id, skad, przewiniecie };
    rysuj({ przewin: 0 }); tresc.focus({ preventScroll: true });
  }
  function zamknijSzczegoly(cicho) {
    if (!st.szczegoly) return false;
    const p = st.szczegoly.przewiniecie;
    st.szczegoly = null;
    if (history.state && history.state.atlas) history.replaceState(null, '', location.pathname + location.search);
    if (!cicho) rysuj({ przewin: p });
    return true;
  }
  addEventListener('popstate', () => { if (st.szczegoly) { const p = st.szczegoly.przewiniecie; st.szczegoly = null; rysuj({ przewin: p }); } });

  // ---------------------------------------------------------------- arkusz filtrów (telefon i wąskie okno)
  function rysujArkusz() {
    const n = O.rankingModeli(window.ATLAS.modele, st.filtry, st.soczewka.modele).length;
    const srodek = arkusz.querySelector('.srodek'), y = srodek ? srodek.scrollTop : 0;
    arkusz.innerHTML = `<div class="glowka"><h2>Filtry</h2><button class="okragly maly" type="button" data-akcja="zamknij-filtry" aria-label="Zamknij filtry" data-dymek="Zamknij filtry">${ik('zamknij')}</button></div>`
      + `<div class="srodek">${W.filtry(st.filtry)}</div><div class="stopka"><button class="przycisk glowny" type="button" data-akcja="zamknij-filtry">Pokaż ${n} ${U.odmiana(n, 'model', 'modele', 'modeli')}</button></div>`;
    arkusz.querySelector('.srodek').scrollTop = y;
  }
  function otworzArkusz() { rysujArkusz(); arkusz.hidden = false; tlo.hidden = false; arkusz.querySelector('.okragly').focus(); }
  function zamknijArkusz() { if (arkusz.hidden) return false; arkusz.hidden = true; tlo.hidden = true; const b = tresc.querySelector('[data-akcja="filtry"]'); if (b) b.focus(); return true; }
  tlo.addEventListener('click', zamknijArkusz);

  // ---------------------------------------------------------------- ściąga
  const okno = $('#sciaga');
  function otworzSciage() { U.sciaga(okno, W.sciaga(), () => { $('#info').focus(); rysujPasek(); }); }
  $('#info').addEventListener('click', otworzSciage);

  // ---------------------------------------------------------------- filtry i zestawy
  const zmienFiltr = (fn, opis = 'filtry') => zmien(opis, () => { fn(st.filtry); st.wszystkie.modele = false; });
  function przelaczFiltr(b) {
    const { filtr, war } = b.dataset;
    zmienFiltr((f) => {
      if (filtr === 'napedy' || filtr === 'typy') {
        const t = f[filtr]; const i = t.indexOf(war);
        if (i < 0) t.push(war); else if (filtr === 'typy' || t.length > 1) t.splice(i, 1);
        if (filtr === 'napedy') f.napedy = Object.keys(O.NAPEDY).filter((k) => t.includes(k));
      } else if (filtr === 'zastosowanie') f.zastosowanie = f.zastosowanie === war ? '' : war;
      else if (filtr === 'tylkoToyota') f.tylkoToyota = !f.tylkoToyota;
    });
  }
  const wartoscSuwaka = (s) => { const i = +s.value; return s.dataset.suwak === 'budzet' ? O.BUDZETY[i] : s.dataset.suwak === 'przebieg' ? O.PRZEBIEGI[i] : i; };
  function podgladSuwaka(s) {
    const w = wartoscSuwaka(s), k = s.dataset.suwak;
    const t = k === 'budzet' ? W.etBudzet(w) : k === 'przebieg' ? W.etPrzebieg(w) : 'od ' + w;
    s.closest('.filtr').querySelector('output').textContent = t;
    s.setAttribute('aria-valuetext', t);
    s.style.setProperty('--p', (100 * (s.value - s.min) / (s.max - s.min)).toFixed(1) + '%');
  }
  function zapiszZestaw(pole) {
    const nazwa = (pole && pole.value.trim()) || O.nazwaZestawu(st.filtry);
    const id = 'z' + Date.now().toString(36);
    zmien('nowy zestaw', () => { st.zestawy.push({ id, nazwa, filtry: JSON.parse(JSON.stringify(st.filtry)), soczewka: st.soczewka.modele, wlaczony: true }); },
      { komunikat: `Zapisany zestaw „${nazwa}”` });
    if (pole) pole.value = '';
  }
  function zakonczEdycje(pole, zatwierdz) {
    const id = pole.dataset.id, nazwa = pole.value.trim();
    st.edycja = null;
    if (zatwierdz && nazwa) zmien('nazwa zestawu', () => { const z = st.zestawy.find((x) => x.id === id); if (z) z.nazwa = nazwa; });
    else rysuj();
    fokusuj(id);
  }

  // ---------------------------------------------------------------- zdarzenia
  pasek.addEventListener('click', (e) => { const b = e.target.closest('.widok'); if (b) widok(b.dataset.id); });
  pasek.addEventListener('keydown', (e) => {
    if (e.altKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const k = st.kolejnosc, i = k.indexOf(st.widok);
    const j = e.key === 'Home' ? 0 : e.key === 'End' ? k.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + k.length) % k.length;
    e.preventDefault(); widok(k[j]); pasek.children[j].focus();
  });
  U.przeciagalne(pasek, '.widok', { os: 'x', poZmianie: (ids, fokus) => { zmien('kolejność widoków', () => { st.kolejnosc = ids; }); fokusuj(fokus); } });

  document.addEventListener('click', (e) => {
    const otw = e.target.closest('[data-otworz]');
    const akc = e.target.closest('[data-akcja]');
    const fil = e.target.closest('[data-filtr]');
    if (akc && (!otw || otw.contains(akc))) {
      const d = akc.dataset;
      switch (d.akcja) {
        case 'soczewka': zmien('kolejność', () => { st.soczewka[d.gdzie] = d.soczewka; }); return;
        case 'wersja': zmien('wersja tekstu', () => { st.calosc[d.gdzie] = d.wersja === 'calosc'; }); scrollTo(0, 0); return;
        case 'wszystkie': zmien('pokaż wszystkie', () => { st.wszystkie[d.co] = !st.wszystkie[d.co]; }); return;
        case 'filtry': otworzArkusz(); return;
        case 'zamknij-filtry': zamknijArkusz(); return;
        case 'domyslne': zmienFiltr((f) => Object.assign(f, O.domyslne()), 'domyślne filtry'); return;
        case 'zapisz-zestaw': zapiszZestaw(akc.closest('.zapis').querySelector('input')); return;
        case 'przelacz-zestaw': zmien('zestaw w rankingu', () => { const z = st.zestawy.find((x) => x.id === d.id); z.wlaczony = !z.wlaczony; }); fokusuj(d.id); return;
        case 'zmien-nazwe': st.edycja = d.id; rysuj(); return;
        case 'otworz-zestaw': { const z = st.zestawy.find((x) => x.id === d.id); zmien('filtry z zestawu', () => { st.filtry = JSON.parse(JSON.stringify(z.filtry)); st.soczewka.modele = z.soczewka || 'ogolem'; st.widok = 'modele'; }); scrollTo(0, 0); return; }
        case 'usun-zestaw': { const z = st.zestawy.find((x) => x.id === d.id); zmien('usunięcie zestawu', () => { st.zestawy = st.zestawy.filter((x) => x.id !== d.id); }, { komunikat: `Usunięty zestaw „${z.nazwa}”` }); return; }
        case 'widok': widok(d.widok); return;
        case 'wstecz': e.preventDefault(); history.state && history.state.atlas ? history.back() : zamknijSzczegoly(); return;
        case 'pokaz-typ': e.preventDefault(); zmien('filtr nadwozia', () => { st.filtry.typy = [d.typ]; st.widok = 'modele'; }); scrollTo(0, 0); return;
        case 'pokaz-zastosowanie': e.preventDefault(); zmien('filtr zastosowania', () => { st.filtry.zastosowanie = d.zast; st.widok = 'modele'; }); scrollTo(0, 0); return;
      }
    }
    if (fil) { przelaczFiltr(fil); return; }
    if (otw && !e.target.closest('a[href^="http"]')) { e.preventDefault(); const [r, id] = otw.dataset.otworz.split(':'); otworz(r, id); }
  });
  document.addEventListener('input', (e) => { if (e.target.matches('[data-suwak]')) podgladSuwaka(e.target); });
  document.addEventListener('change', (e) => {
    const s = e.target.closest('[data-suwak]');
    if (s) zmienFiltr((f) => { f[s.dataset.suwak] = wartoscSuwaka(s); });
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.matches && t.matches('.nazwa-zestawu')) {
      if (e.key === 'Enter') { e.preventDefault(); zakonczEdycje(t, true); }
      else if (e.key === 'Escape') { e.preventDefault(); zakonczEdycje(t, false); }
      return;
    }
    if (t.id === 'nazwa-zestawu' && e.key === 'Enter') { e.preventDefault(); zapiszZestaw(t); return; }
    const wPolu = t.matches && t.matches('input[type="text"], textarea');
    if ((e.ctrlKey || e.metaKey) && !wPolu) {
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) { e.preventDefault(); cofnij(); return; }
      if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); ponow(); return; }
    }
    if (e.key === 'Escape' && !wPolu) { if (zamknijArkusz()) return; if (st.szczegoly) { history.state && history.state.atlas ? history.back() : zamknijSzczegoly(); return; } zamknijWKasiomobile(); return; }
    if ((e.key === 'Enter' || e.key === ' ') && t.matches && t.matches('tr[data-otworz]')) { e.preventDefault(); const [r, id] = t.dataset.otworz.split(':'); otworz(r, id); }
  });
  document.addEventListener('focusout', (e) => { if (e.target.matches && e.target.matches('.nazwa-zestawu') && st.edycja) zakonczEdycje(e.target, true); });
  ciemny.addEventListener('change', () => { pasek.innerHTML = ''; rysuj(); });

  // Android: przycisk Wstecz najpierw zamyka arkusz, ściągę i szczegóły, dopiero potem aplikację.
  window.Atlas = {
    wstecz() {
      if (!okno.hidden) { okno.querySelector('.zamknij').click(); return true; }
      if (zamknijArkusz()) return true;
      if (st.szczegoly) { zamknijSzczegoly(); return true; }
      if (st.widok !== st.kolejnosc[0]) { widok(st.kolejnosc[0]); return true; }
      return false;
    },
    stan: () => st,
  };

  // W Kasiomobile Atlas stoi w oknie pod logo (adres z ?w=kasiomobile). Escape, gdy nic w Atlasie nie jest otwarte, zamyka to okno,
  // a Wstecz telefonu (wiadomość { atlas: 'wstecz' } od powłoki) najpierw cofa w Atlasie, a dopiero potem je zamyka.
  const W_KASIOMOBILE = new URLSearchParams(location.search).get('w') === 'kasiomobile' && window.parent !== window;
  function zamknijWKasiomobile() { if (W_KASIOMOBILE) window.parent.postMessage({ kasiomobile: 'zamknij-poradnik' }, '*'); }
  if (W_KASIOMOBILE) {
    document.body.classList.add('w-kasiomobile');
    window.parent.postMessage({ kasiomobile: 'atlas-gotowy' }, '*');
    addEventListener('message', (e) => { if (e.source === window.parent && e.data && e.data.atlas === 'wstecz' && !window.Atlas.wstecz()) zamknijWKasiomobile(); });
  }

  rysuj();
  nowszeDane();
})();