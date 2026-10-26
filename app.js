// app.js: stan Atlasu Samochodów i zdarzenia. Stan (widok, kolejność widoków, filtry, zestawy) leży w pamięci przeglądarki,
// każda zmiana Jacka idzie do historii (Ctrl+Z cofa, Ctrl+Y i Ctrl+Shift+Z ponawiają), szczegóły mają strzałkę Wstecz,
// a Android woła Atlas.wstecz() przy przycisku Wstecz. Rysuje widoki.js, liczy ocena.js.
(function () {
  'use strict';
  const O = window.AtlasOcena, U = window.AtlasUI, W = window.AtlasWidoki, { $, esc, ik } = U;
  const KLUCZ = 'atlas-samochodow:stan', KLUCZ_DANYCH = 'atlas-samochodow:dane';
  const ZDALNE = 'https://jackoludek.github.io/atlas-samochodow/dane.json';
  const WIDOKI = { marki: ['Marki', 'marki', 'niebieski'], modele: ['Modele', 'modele', 'indygo'], moj: ['Mój ranking', 'moj', 'turkus'], typy: ['Typy aut', 'typy', 'braz'] };
  // Osadzenie w Kasiomobile: ?w=kasiomobile to Atlas w ramce (od 23.10.2026), a ?w=kasiomobile&k=katalag&widok=marki|modele to Atlas
  // w zakładce Katalag (od 25.10.2026): rząd widoków rysuje wtedy Kasiomobile nad ramką, a Mój ranking i Typy aut są podstronami
  // otwieranymi z wierszy na końcu listy. Bez k=katalag Atlas działa jak wcześniej, bo stare paczki Kasiomobile otwierają go tak dalej.
  const ADRES = new URLSearchParams(location.search);
  const W_KASIOMOBILE = ADRES.get('w') === 'kasiomobile' && window.parent !== window;
  const W_KATALAG = ADRES.get('w') === 'kasiomobile' && ADRES.get('k') === 'katalag';
  // Cienki pasek przewijania w Katalagu (styl.css, html.w-katalagu) od razu, żeby pierwsze rysowanie liczyło już właściwą szerokość.
  if (W_KATALAG) document.documentElement.classList.add('w-katalagu');
  const PODSTRONY = ['moj', 'typy'];

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
  const poczatek = () => ({ widok: 'marki', kolejnosc: Object.keys(WIDOKI), kolumny: ['ogolem', 'bezp', 'niez'], soczewka: { marki: 'ogolem', modele: 'ogolem' }, calosc: { typy: false, model: false }, filtry: O.domyslne(), zestawy: [], wszystkie: { marki: false, modele: false, moj: false }, podstrony: [...PODSTRONY] });
  let st = poczatek();
  try {
    const z = JSON.parse(localStorage.getItem(KLUCZ) || 'null');
    if (z) { st = { ...st, ...z, filtry: { ...O.domyslne(), ...z.filtry }, soczewka: { ...st.soczewka, ...z.soczewka }, calosc: { ...st.calosc, ...z.calosc }, wszystkie: { ...st.wszystkie, ...z.wszystkie } };
      if (!Array.isArray(st.kolejnosc) || st.kolejnosc.length !== 4 || !st.kolejnosc.every((k) => WIDOKI[k])) st.kolejnosc = Object.keys(WIDOKI);
      if (!WIDOKI[st.widok]) st.widok = 'marki';
      if (!Array.isArray(st.podstrony) || st.podstrony.length !== PODSTRONY.length || !PODSTRONY.every((k) => st.podstrony.includes(k))) st.podstrony = [...PODSTRONY]; }
  } catch { /* pierwszy raz */ }
  st.szczegoly = null; st.edycja = null;
  // W Katalagu widok to Marki albo Modele z adresu. st.katalag mówi widokom o zdaniu na górze i wierszach podstron; nie trafia do pamięci.
  if (W_KATALAG) { const w0 = ADRES.get('widok'); st.widok = w0 === 'marki' || w0 === 'modele' ? w0 : st.widok === 'modele' ? 'modele' : 'marki'; st.katalag = true; }
  let widokRodzica = st.widok;
  const trwale = () => JSON.stringify({ widok: st.widok, kolejnosc: st.kolejnosc, kolumny: st.kolumny, soczewka: st.soczewka, calosc: st.calosc, filtry: st.filtry, zestawy: st.zestawy, wszystkie: st.wszystkie, podstrony: st.podstrony });
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
  // Smuga światła na wybranej pigułce kolejności: barwa losowana przy starcie, jak w widokach (ui.js, polysk), daleko od akcentu.
  const polyskStrony = () => U.polysk(document.body, getComputedStyle(document.documentElement).getPropertyValue('--akcent').trim() || '#0071e3', ciemny.matches);
  polyskStrony();
  function rysujPasek() {
    const istniejace = [...pasek.children].map((b) => b.dataset.id).join();
    if (istniejace !== st.kolejnosc.join()) {
      pasek.innerHTML = st.kolejnosc.map((k) => { const [n, i, w] = WIDOKI[k];
        return `<button class="widok" type="button" role="tab" data-id="${k}" data-w="${w}" id="tab-${k}" aria-controls="tresc" aria-label="${esc(n)}" data-dymek="${esc(n)}"><span class="kafel">${ik(i)}</span><span class="napis" data-n="${esc(n)}"><span class="tx">${esc(n)}</span></span></button>`; }).join('');
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
    document.body.classList.toggle('czyta', Boolean(d));
    // Na telefonie szczegóły mają u góry samą strzałkę Wstecz, a lista same widoki (styl.css, część „telefon”).
    document.body.classList.toggle('w-szczegolach', Boolean(d));
    tresc.setAttribute('aria-labelledby', 'tab-' + st.widok);
    tresc.innerHTML = d ? (d.rodzaj === 'model' ? W.model(st, d.id) : d.rodzaj === 'marka' ? W.marka(st, d.id) : W[d.rodzaj](st)) : W[st.widok](st);
    const nazwyWidokow = { marki: 'Marki', modele: 'Modele', moj: 'Mój ranking', typy: 'Typy aut' };
    $('#tytul-widoku').innerHTML = d ? `<button class="przycisk" type="button" data-akcja="wstecz">${ik('wstecz')}<span class="tx">${esc(nazwyWidokow[d.skad] || 'Wstecz')}</span></button>` : '';
    document.title = d ? `${tytulSzczegolow(d)} · Atlas Samochodów` : `${WIDOKI[st.widok][0]} · Atlas Samochodów`;
    if (!$('#filtry-arkusz').hidden) rysujArkusz();
    if (d ? d.rodzaj === 'moj' : st.widok === 'moj') { const z = $('#zestawy'); if (z) U.przeciagalne(z, '.zestaw', { os: 'y', poZmianie: (ids, fokus) => zmien('kolejność zestawów', () => { st.zestawy = ids.map((id) => st.zestawy.find((x) => x.id === id)); }) || fokusuj(fokus) }); }
    const glowka = !d && tresc.querySelector('.lista thead tr');
    // Kolumny ocen przestawia nagłówek tabeli i pigułki kolejności (telefon; przeciąga tylko mysz): jedna kolejność w st.kolumny.
    const kolumny = (kontener, sel, cel) => U.przeciagalne(kontener, sel, { os: 'x', poZmianie: (ids, fokus) => { zmien('kolejność kolumn', () => { st.kolumny = ids; }); if (fokus) requestAnimationFrame(() => { const b = tresc.querySelector(cel(fokus)); if (b) b.focus(); }); } });
    if (glowka && glowka.querySelector('th[data-id]')) kolumny(glowka, 'th[data-id]', (k) => `th[data-id="${k}"] button`);
    if (!d) for (const s of tresc.querySelectorAll('.soczewki')) kolumny(s, '.chip[data-id]', (k) => `.soczewki .chip[data-id="${k}"]`);
    // Wiersze Mój ranking i Typy aut na końcu listy w Katalagu: przestawiane myszą i Alt + strzałką, jedna kolejność dla obu list.
    for (const k of tresc.querySelectorAll('.dalej-obszar')) U.przeciagalne(k, '.dalej-wiersz', { os: 'y', poZmianie: (ids, fokus) => { zmien('kolejność podstron', () => { st.podstrony = ids; }); if (fokus) requestAnimationFrame(() => { const b = tresc.querySelector(`.dalej-wiersz[data-id="${fokus}"]`); if (b) b.focus(); }); } });
    if (st.edycja) { const p = tresc.querySelector('.nazwa-zestawu'); if (p) { p.focus(); p.select(); } }
    uloz();
    if (przewin != null) scrollTo(0, przewin);
    if (sel && !st.edycja && !document.activeElement.closest?.('.zapis')) { const e = (wArkuszu && arkusz.querySelector(sel)) || document.querySelector(sel); if (e && e !== document.activeElement) e.focus({ preventScroll: true }); }
    // W Katalagu Atlas zmienia widok sam tylko z podstron („Pokaż ten zestaw w Modelach”, „Pokaż modele ›”, „Otwórz Modele”) i z Ctrl+Z:
    // mówi wtedy Kasiomobile, który widok stoi, żeby zaznaczyło swoją pigułkę.
    if (W_KATALAG && W_KASIOMOBILE && st.widok !== widokRodzica) { widokRodzica = st.widok; window.parent.postMessage({ kasiomobile: 'atlas-widok', widok: st.widok }, '*'); }
  }
  const fokusuj = (id) => id && requestAnimationFrame(() => { const e = document.querySelector(`[data-id="${id}"]`); if (e) e.focus(); });
  // Napisy przycisków i pigułek są przycięte do wersalików (.tx), więc stoją na środku, ale w tekście, który płynie, zwykle wypadają
  // na ułamku piksela. Przeglądarka rysuje linię pisma na całym pikselu strony, a przy skali 1,5 jeszcze na całym pikselu ekranu, więc
  // napis stał do 1,5 px ekranu za wysoko albo za nisko (pomiar 23 i 24.10.2026, testy\srodek.mjs). Dlatego linię pisma (dół napisu
  // przyciętego do wersalików) dosuwamy na najbliższy piksel, który jest całym pikselem i strony, i ekranu (przy skali 1,5 co drugi):
  // rzędy przycisków odstępem nad rzędem, pas z kolorowym tłem (nagłówek Mojego rankingu) oboma odstępami naraz, żeby napis został
  // na jego środku, a pojedyncze pigułki w tabelach i listach przesunięciem samej pigułki (reguła „Precyzja”).
  const RZEDY = '.pas-pastel, .dalej-obszar, .widoki, #tytul-widoku, .wersje, .akcje-skrotu, .pasek-listy, .soczewki, .wiecej, .akcje-przykladu, .pusto, .filtry .chipy, .filtry .zapis, .filtry-stopka, .filtry-arkusz .stopka';
  const PIGULKI = '.lista .miejsce, .lista .ocena, .testy .ocena, th .naglowek-kolumny, .szczegoly > .wstecz, .uklad > .wstecz, .przewodnik > .wstecz, .karta-tresc > .przycisk';
  const gora = $('.gora');
  // Linia pisma w układzie strony, bez przewinięcia: pasek u góry od swojej krawędzi (w szczegółach się przykleja), nagłówek tabeli
  // od tabeli (też się przykleja), arkusz filtrów od okna (stoi na stałe) razem z przewinięciem swojego środka, reszta od początku strony.
  function liniaPisma(t) {
    const b = t.getBoundingClientRect().bottom;
    if (gora.contains(t)) return b - gora.getBoundingClientRect().top + (parseFloat(getComputedStyle(document.body).paddingTop) || 0);
    const th = t.closest('th');
    if (th) return b - th.getBoundingClientRect().top + th.closest('thead').getBoundingClientRect().top + scrollY;
    if (t.closest('.filtry-arkusz')) { const w = t.closest('.srodek'); return b + (w ? w.scrollTop : 0); }
    return b + scrollY;
  }
  // Najbliższy piksel, który jest całym pikselem i strony, i ekranu; gdy takiego nie ma w kilku pikselach, sam cały piksel strony.
  function dobryPiksel(y, d, tylkoNizej) {
    let k0 = null;
    for (let k = Math.floor(y) - 3; k <= Math.ceil(y) + 4; k++) {
      if ((tylkoNizej && k < y - 0.001) || Math.abs(k * d - Math.round(k * d)) > 0.01) continue;
      if (k0 == null || Math.abs(k - y) < Math.abs(k0 - y)) k0 = k;
    }
    return k0 ?? (tylkoNizej ? Math.ceil(y - 0.001) : Math.round(y));
  }
  function naPiksel() {
    const d = window.devicePixelRatio || 1;
    // Rzędy po kolei, bo odstęp nad jednym przesuwa wszystko pod nim.
    for (const r of document.querySelectorAll(RZEDY)) {
      const pas = r.classList.contains('pas-pastel');
      r.style.paddingTop = ''; if (pas) r.style.paddingBottom = '';
      const t = r.querySelector('.tx');
      if (!r.offsetParent || !t || !t.getClientRects().length) continue;
      const cs = getComputedStyle(r), p0 = parseFloat(cs.paddingTop) || 0, p1 = parseFloat(cs.paddingBottom) || 0, y = liniaPisma(t), k = dobryPiksel(y, d, true);
      if (k - y > 0.001) { r.style.paddingTop = (p0 + k - y).toFixed(4) + 'px'; if (pas) r.style.paddingBottom = (p1 + k - y).toFixed(4) + 'px'; }
    }
    // Pigułki na końcu i naraz: przesunięcie jednej nie rusza innych, więc najpierw wszystkie odczyty, potem wszystkie zapisy.
    const pigulki = [...document.querySelectorAll(PIGULKI)];
    for (const p of pigulki) p.style.top = '';
    const o = pigulki.map((p) => { const t = p.querySelector('.tx'); if (!t || !t.getClientRects().length) return 0; const y = liniaPisma(t); return dobryPiksel(y, d, false) - y; });
    pigulki.forEach((p, i) => { if (Math.abs(o[i]) > 0.001) p.style.top = o[i].toFixed(4) + 'px'; });
  }
  // Siatka (Jacek, 25.10.2026: „wszystko musi być równane do gridu … to nie jest Van Gogh”). Pigułki kolejności na telefonie to trzy równe
  // pigułki na całą szerokość karty listy, co rynnę siatki (styl.css, --rzad: 8 px do 759 px, szerzej 16 px, jak w Kasiomobile): napis tej
  // samej wielkości we wszystkich trzech, największy od 15 px w dół,
  // przy którym najdłuższy, pogrubiony, mieści się w wybranej z pierścieniem w obrysie (2 px akcentu i 2 px przerwy) i ma jeszcze
  // 4 px tła z każdej strony, krokami po 0,25 px (napisy są krótkie: widoki.js, KOLUMNY). Do tego wysokość wersalików musi dać się postawić na środku
  // pigułki co do pół piksela ekranu (pigułka minus wersaliki, w pikselach ekranu, prawie parzyste: najwyżej ćwierć piksela obok),
  // więc napis schodzi jeszcze krokami po ćwierć piksela, gdy wypada między pikselami (wielkość przy każdej szerokości wypisuje
  // testy/zrzuty.js). Chipy filtrów stoją po dwa w rzędzie (data-kol, Kasiomobile, 25.10.2026), a gdy któryś
  // napis nie mieści się z 8 px z boku, jeden w rzędzie (karta filtrów na komputerze). Ukryty arkusz czeka na otwarcie.
  const NAPIS_SOCZEWEK = 15;
  function naSiatce() {
    for (const r of document.querySelectorAll('.pasek-listy .soczewki')) {
      r.style.removeProperty('--napis');
      if (!r.offsetParent || getComputedStyle(r).display !== 'grid') continue;
      const zapas = (p) => { const t = p.querySelector('.napis'), w = t && t.getBoundingClientRect().width; return w ? (p.clientWidth - 16) / w : 1; };
      const krzywo = () => { const p = r.children[0], t = p && p.querySelector('.tx'); if (!t) return false;
        const x = (p.getBoundingClientRect().height - t.getBoundingClientRect().height) * (devicePixelRatio || 1) / 2; return Math.abs(x - Math.round(x)) > 0.25; };
      const dobierz = () => { r.style.setProperty('--napis', NAPIS_SOCZEWEK + 'px');
        let n = Math.max(10, Math.min(NAPIS_SOCZEWEK, Math.floor(NAPIS_SOCZEWEK * Math.min(...[...r.children].map(zapas)) * 4) / 4));
        r.style.setProperty('--napis', n + 'px');
        while (n > 9.5 && ([...r.children].some((p) => zapas(p) < 1) || krzywo())) { n -= 0.25; r.style.setProperty('--napis', n + 'px'); }
        return n; };
      dobierz();
    }
    for (const g of document.querySelectorAll('.chipy[data-kol]')) {
      if (!g.offsetParent) continue;
      for (const k of g.dataset.kol.split(' ').map(Number)) {
        g.style.setProperty('--kol', k);
        const miesci = [...g.children].every((c) => { const s = getComputedStyle(c), luka = parseFloat(s.columnGap) || 0;
          const tresc = [...c.children].reduce((w, x) => w + x.getBoundingClientRect().width, 0) + luka * Math.max(0, c.children.length - 1);
          return tresc + parseFloat(s.paddingLeft) + parseFloat(s.paddingRight) <= c.clientWidth + 0.01; });
        if (miesci) break;
      }
    }
  }
  function uloz() { naSiatce(); naPiksel(); }
  addEventListener('resize', uloz);
  if (document.fonts) document.fonts.ready.then(uloz);
  function tytulSzczegolow(d) {
    const A = window.ATLAS;
    if (PODSTRONY.includes(d.rodzaj)) return WIDOKI[d.rodzaj][0];
    if (d.rodzaj === 'model') { const m = A.modele.find((x) => x.id === d.id); return m ? `${m.marka} ${m.model}` : ''; }
    const m = A.marki.find((x) => x.id === d.id); return m ? m.nazwa : '';
  }

  // ---------------------------------------------------------------- nawigacja
  function widok(k) { if (!WIDOKI[k]) return; zamknijWszystko(); if (st.widok !== k) { st.widok = k; zapisz(); } rysuj({ przewin: 0 }); }
  // Szczegóły i podstrony (Mój ranking, Typy aut w Katalagu) stoją jedne na drugich: model otwarty z podstrony wraca Wsteczem na nią,
  // a podstrona na listę. Model otwarty z modelu albo marki zastępuje poprzedni, jak wcześniej.
  function otworz(rodzaj, id) {
    const z = st.szczegoly, zPodstrony = Boolean(z && PODSTRONY.includes(z.rodzaj));
    if (!z || zPodstrony) {
      history.pushState({ atlas: 1 }, '', '#' + rodzaj + '/' + id);
      st.szczegoly = { rodzaj, id, skad: z ? z.rodzaj : st.widok, przewiniecie: scrollY, poprzednie: z || null };
    } else {
      history.replaceState({ atlas: 1 }, '', '#' + rodzaj + '/' + id);
      st.szczegoly = { rodzaj, id, skad: z.skad, przewiniecie: z.przewiniecie, poprzednie: z.poprzednie };
    }
    rysuj({ przewin: 0 }); tresc.focus({ preventScroll: true });
  }
  function zamknijSzczegoly(cicho) {
    if (!st.szczegoly) return false;
    const z = st.szczegoly;
    st.szczegoly = z.poprzednie || null;
    if (!st.szczegoly && history.state && history.state.atlas) history.replaceState(null, '', location.pathname + location.search);
    if (!cicho) rysuj({ przewin: z.przewiniecie });
    return true;
  }
  function zamknijWszystko() { while (st.szczegoly) zamknijSzczegoly(true); }
  addEventListener('popstate', () => { if (st.szczegoly) { const z = st.szczegoly; st.szczegoly = z.poprzednie || null; rysuj({ przewin: z.przewiniecie }); } });

  // ---------------------------------------------------------------- arkusz filtrów (telefon i wąskie okno)
  function rysujArkusz() {
    const n = O.rankingModeli(window.ATLAS.modele, st.filtry, st.soczewka.modele).length;
    const srodek = arkusz.querySelector('.srodek'), y = srodek ? srodek.scrollTop : 0;
    arkusz.innerHTML = `<div class="glowka"><h2>Filtry</h2><button class="okragly maly" type="button" data-akcja="zamknij-filtry" aria-label="Zamknij filtry" data-dymek="Zamknij filtry">${ik('zamknij')}</button></div>`
      + `<div class="srodek">${W.filtry(st.filtry)}</div><div class="stopka"><button class="przycisk glowny" type="button" data-akcja="zamknij-filtry"><span class="tx">Pokaż ${n} ${U.odmiana(n, 'model', 'modele', 'modeli')}</span></button></div>`;
    arkusz.querySelector('.srodek').scrollTop = y;
  }
  function otworzArkusz() { rysujArkusz(); arkusz.hidden = false; tlo.hidden = false; uloz(); arkusz.querySelector('.okragly').focus(); }
  function zamknijArkusz() { if (arkusz.hidden) return false; arkusz.hidden = true; tlo.hidden = true; const b = tresc.querySelector('[data-akcja="filtry"]'); if (b) b.focus(); return true; }
  tlo.addEventListener('click', zamknijArkusz);


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
        case 'podstrona': e.preventDefault(); otworz(d.strona, ''); return;
        case 'otworz-zestaw': { const z = st.zestawy.find((x) => x.id === d.id); zamknijWszystko(); zmien('filtry z zestawu', () => { st.filtry = JSON.parse(JSON.stringify(z.filtry)); st.soczewka.modele = z.soczewka || 'ogolem'; st.widok = 'modele'; }); rysuj({ przewin: 0 }); return; }
        case 'usun-zestaw': { const z = st.zestawy.find((x) => x.id === d.id); zmien('usunięcie zestawu', () => { st.zestawy = st.zestawy.filter((x) => x.id !== d.id); }, { komunikat: `Usunięty zestaw „${z.nazwa}”` }); return; }
        case 'przyklad': { const t = Date.now().toString(36); zmien('przykładowe zestawy', () => { st.zestawy = O.przyklad().map((z, i) => ({ id: 'z' + t + i, nazwa: z.nazwa, filtry: z.filtry, soczewka: z.soczewka, wlaczony: true })); }, { komunikat: 'Zapisane trzy przykładowe zestawy' }); return; }
        case 'widok': widok(d.widok); return;
        case 'wstecz': e.preventDefault(); history.state && history.state.atlas ? history.back() : zamknijSzczegoly(); return;
        case 'pokaz-typ': e.preventDefault(); zamknijWszystko(); zmien('filtr nadwozia', () => { st.filtry.typy = [d.typ]; st.widok = 'modele'; }); rysuj({ przewin: 0 }); return;
        case 'pokaz-zastosowanie': e.preventDefault(); zamknijWszystko(); zmien('filtr zastosowania', () => { st.filtry.zastosowanie = d.zast; st.widok = 'modele'; }); rysuj({ przewin: 0 }); return;
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
  ciemny.addEventListener('change', () => { pasek.innerHTML = ''; polyskStrony(); rysuj(); });

  // Wstecz telefonu (przez Kasiomobile) najpierw zamyka arkusz filtrów, potem szczegóły i podstrony po jednej, potem (poza Katalagiem,
  // gdzie widoki są w Kasiomobile) wraca do pierwszego widoku, a dopiero potem wychodzi.
  window.Atlas = {
    wstecz() {
      if (zamknijArkusz()) return true;
      if (st.szczegoly) { zamknijSzczegoly(); return true; }
      if (!W_KATALAG && st.widok !== st.kolejnosc[0]) { widok(st.kolejnosc[0]); return true; }
      return false;
    },
    stan: () => st,
  };

  // W Kasiomobile Atlas stoi w ramce (adres z ?w=kasiomobile). Escape, gdy nic w Atlasie nie jest otwarte, mówi powłoce „zamknij”,
  // a Wstecz telefonu (wiadomość { atlas: 'wstecz' } od powłoki) najpierw cofa w Atlasie, a dopiero potem mówi „zamknij”. W Katalagu
  // { atlas: 'widok', widok: 'marki' | 'modele' } przełącza widok bez wczytywania strony od nowa i przewija na górę.
  function zamknijWKasiomobile() { if (W_KASIOMOBILE) window.parent.postMessage({ kasiomobile: 'zamknij-poradnik' }, '*'); }
  if (W_KATALAG) document.body.classList.add('w-katalagu');
  if (W_KASIOMOBILE) {
    document.body.classList.add('w-kasiomobile');
    window.parent.postMessage({ kasiomobile: 'atlas-gotowy' }, '*');
    addEventListener('message', (e) => {
      if (e.source !== window.parent || !e.data) return;
      if (e.data.atlas === 'wstecz' && !window.Atlas.wstecz()) zamknijWKasiomobile();
      if (W_KATALAG && e.data.atlas === 'widok' && (e.data.widok === 'marki' || e.data.widok === 'modele')) { widokRodzica = e.data.widok; arkusz.hidden = true; tlo.hidden = true; widok(e.data.widok); }
    });
  }

  // Nowa wersja w sieci (od 25.10.2026): Atlas w ramce Kasiomobile i w karcie przeglądarki stoi otwarty godzinami, a Kasiomobile ładuje go
  // raz na sesję, więc telefon potrafił pokazywać starą wersję długo po wysłaniu nowej (Jacek, 25.10.2026: „Po raz siódmy mówię …”).
  // Przy starcie i po każdym powrocie do aplikacji strona pyta o wersja.txt. Gdy w sieci stoi inna wersja niż jej własna (znacznik
  // atlas-wersja, wpisuje go wyslij-do-sieci.ps1), wczytuje się od nowa pod adresem z ?v=<wersja>, który omija pamięć przeglądarki
  // i serwera. Stan (widok, filtry, zestawy) leży w pamięci strony, więc ginie tylko otwarty szczegół. Najwyżej raz na 5 minut, a dla tej
  // samej nowej wersji raz na 15 minut, żeby serwer, który jeszcze podaje starą stronę, nie zapętlił odświeżania.
  const WERSJA = (document.querySelector('meta[name="atlas-wersja"]') || {}).content || '';
  let sprawdzone = 0;
  function sprawdzWersje() {
    if (!WERSJA || location.protocol !== 'https:' || !navigator.onLine || Date.now() - sprawdzone < 5 * 60000) return;
    sprawdzone = Date.now();
    fetch('wersja.txt?n=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((t) => {
      const nowa = t.trim();
      if (!/^[0-9a-f]{12}$/.test(nowa) || nowa === WERSJA) return;
      const klucz = 'atlas-samochodow:odswiezenie';
      try { const z = JSON.parse(sessionStorage.getItem(klucz) || '{}'); if (z.w === nowa && Date.now() - z.t < 15 * 60000) return; sessionStorage.setItem(klucz, JSON.stringify({ w: nowa, t: Date.now() })); } catch { return; }
      const p = new URLSearchParams(location.search); p.set('v', nowa); if (W_KATALAG) p.set('widok', st.widok);
      location.replace(location.pathname + '?' + p);
    }).catch(() => { /* bez sieci zostaje ta wersja */ });
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sprawdzWersje(); });
  addEventListener('online', sprawdzWersje);

  rysuj();
  nowszeDane();
  sprawdzWersje();
})();