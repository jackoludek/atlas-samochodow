// widoki.js: rysowanie widoków Atlasu jako HTML: Marki, Modele z filtrami, Mój ranking, Typy aut oraz szczegóły marki
// i modelu. Tylko rysuje: zdarzenia i stan obsługuje app.js (atrybuty data-akcja, data-otworz, data-filtr).
(function () {
  'use strict';
  const O = window.AtlasOcena, U = window.AtlasUI;
  const { esc, ik, liczba, tys, odmiana } = U;
  const A = () => window.ATLAS;
  const KOLUMNY = [['ogolem', 'Ogółem', 'gwiazda'], ['bezp', 'Bezpieczeństwo', 'tarcza'], ['niez', 'Niezawodność', 'klucz']];
  const MALY = { s: 'M18 38 L18 30 Q19 27 23 26 L34 25 L44 14 Q46 12 50 12 L80 12 Q84 12 87 15 L96 26 Q99 28 99 32 L99 38 Z', k: [34, 84, 6] };
  const SYL = { maly: 'maly', kompakt: 'hatchback', kombi: 'kombi', suv: 'suv', van: 'van', limuzyna: 'sedan' };
  const nadwozie = (id) => (id === 'maly' ? MALY : A().przewodnik.nadwozia.find((n) => n.id === id));
  const sylTypu = (typ, kl) => U.sylwetka(nadwozie(SYL[typ]), kl);
  // Nazwa modelu, która zaczyna się od marki („Mazda2 Hybrid”, „MG4 Electric”), stoi bez marki z przodu, a nie „Mazda Mazda2 Hybrid”.
  const nazwaModelu = (m) => (m.model.toLowerCase().startsWith(m.marka.toLowerCase()) ? m.model : `${m.marka} ${m.model}`);
  // Nazwa na liście bez podpisu pod spodem (Jacek, 25.10.2026: „Żadnych podpisów pod samochodami”). Lata stoją tylko wtedy, gdy dwie
  // generacje mają tę samą nazwę (Yaris, C-HR, RAV4), w tej samej linii, bo inaczej lista miałaby dwa takie same wiersze.
  const nazwaNaLiscie = (m) => { const n = nazwaModelu(m), dwie = A().modele.some((x) => x !== m && nazwaModelu(x) === n);
    return `<div class="nazwa"><b>${esc(n)}${dwie ? `<span class="lata">${esc(m.lata)}</span>` : ''}</b></div>`; };
  const ocena = (x, s, szac) => (x == null ? '<span class="ocena brak">–</span>' : `<span class="ocena${szac ? ' szac' : ''}" data-s="${s}"><span class="tx">${liczba(x)}</span></span>`);
  const zakres = (ry) => (ry && ry.ceny ? `${tys(ry.ceny[0])}–${tys(ry.ceny[2])} tys. zł` : '');

  // Pigułki kolejności stoją tylko na telefonie, bo szersze okno ma te same nagłówki kolumn: pod widokami, poza kartą listy, w jednym rzędzie,
  // a w Modelach pod przyciskiem Filtry (Jacek, 24.10.2026: „razem, nie zbite, jedno po drugim”, „najpierw zaczynamy od filtrów … to musi być
  // w linii”). Wielkość napisu dobiera app.js (wJednymRzedzie). Napis ma od razu miejsce na pogrubienie wybranej (data-n).
  const soczewki = (akt, gdzie) => `<div class="soczewki" role="radiogroup" aria-label="Kolejność">` + KOL.map(([k, n]) =>
    `<button class="chip" type="button" role="radio" aria-checked="${k === akt}" data-akcja="soczewka" data-gdzie="${gdzie}" data-soczewka="${k}" data-id="${k}"><span class="napis" data-n="${n}"><span class="tx">${n}</span></span></button>`).join('') + '</div>';
  const pasekListy = (akt, gdzie, filtry = '') => `<div class="pasek-listy${filtry ? ' z-filtrami' : ''}">${filtry}${soczewki(akt, gdzie)}</div>`;
  // Atlas w zakładce Katalag Kasiomobile (od 25.10.2026, ?k=katalag): rząd widoków rysuje Kasiomobile (tylko Marki i Modele), więc na górze
  // listy stoi jedno zdanie drugim planem, a Mój ranking i Typy aut otwierają się z karty na jej końcu, jako podstrony ze strzałką Wstecz.
  // Poza Katalagiem ani zdania, ani karty nie ma.
  const zdanie = (st, t) => (st.katalag ? `<p class="zdanie-katalagu">${t}</p>` : '');
  const PODSTRONY = [['moj', 'Mój ranking', 'turkus'], ['typy', 'Typy aut', 'braz']];
  // Kolejność wierszy ustawia Jacek: przeciągnięciem myszą albo Alt + strzałką, z cofaniem Ctrl+Z (st.podstrony, app.js).
  const dalej = (st) => {
    if (!st.katalag) return '';
    const kolej = (st.podstrony || []).map((k) => PODSTRONY.find((p) => p[0] === k)).filter(Boolean);
    return '<nav class="karta dalej-obszar" aria-label="Więcej w Atlasie">' + (kolej.length === PODSTRONY.length ? kolej : PODSTRONY).map(([k, n, w]) =>
      `<button class="dalej-wiersz" type="button" data-akcja="podstrona" data-strona="${k}" data-id="${k}" data-w="${w}"><span class="kafel">${ik(k)}</span><span class="tx">${n}</span>${ik('dalej')}</button>`).join('') + '</nav>';
  };
  const wsteczPodstrony = (st, k) => (st.szczegoly && st.szczegoly.rodzaj === k ? wstecz(st) : '');
  // Wersja tekstu (reguła skrot-i-wersja-pelna): najpierw „W skrócie”, potem „Całość”. Kolejność stała, bo coś znaczy: skrót prowadzi do całości.
  const wersje = (gdzie, calosc) => `<div class="wersje" role="radiogroup" aria-label="Wersja tekstu">`
    + [['skrot', 'W skrócie'], ['calosc', 'Całość']].map(([k, n]) => `<button class="chip" type="button" role="radio" aria-checked="${(k === 'calosc') === calosc}" data-akcja="wersja" data-gdzie="${gdzie}" data-wersja="${k}"><span class="tx">${n}</span></button>`).join('') + '</div>';
  const czytajCalosc = (gdzie, haczyk, dalej = '') => `<p class="haczyk">${esc(haczyk)}</p><div class="akcje-skrotu"><button class="przycisk" type="button" data-akcja="wersja" data-gdzie="${gdzie}" data-wersja="calosc"><span class="tx">Czytaj całość</span>${ik('dalej')}</button>${dalej}</div>`;
  // Kolumny ocen w kolejności Jacka (przeciągane myszą albo Alt + strzałka na nagłówku i na pigułce, app.js), domyślnie ogółem, bezpieczeństwo, niezawodność.
  let KOL = KOLUMNY;
  const ustawKolumny = (kolejnosc) => { KOL = (kolejnosc || []).map((k) => KOLUMNY.find((x) => x[0] === k)).filter(Boolean); if (KOL.length !== KOLUMNY.length) KOL = KOLUMNY; };
  const naglowki = (akt, gdzie, ile, dodatkowe = '') => '<thead><tr><th><span class="ukryte">Miejsce</span></th><th><span class="naglowek-kolumny">' + (gdzie === 'marki' ? ile + ' ' + odmiana(ile, 'marka', 'marki', 'marek') : ile + ' ' + odmiana(ile, 'model', 'modele', 'modeli')) + '</span></th>'
    + KOL.map(([k, n]) => `<th data-id="${k}" class="liczba${k === akt ? '' : ' tylko-szeroki'}"${k === akt ? ' aria-sort="descending"' : ''}><button class="naglowek-kolumny" type="button" data-akcja="soczewka" data-gdzie="${gdzie}" data-soczewka="${k}"><span class="tx">${n}</span></button></th>`).join('')
    + dodatkowe + '</tr></thead>';
  const komorki = (o, akt, sk) => KOL.map(([k]) => `<td class="liczba${k === akt ? '' : ' tylko-szeroki'}">${ocena(o[k], sk[k](o[k]), k === 'niez' ? o.niezSzac : k === 'ogolem' && o.niezSzac)}</td>`).join('');
  // Skala liczona na całej liście, nie na widocznej dziesiątce: czerwony znaczy słabszy w całym rankingu.
  const skale = (lista) => Object.fromEntries(KOLUMNY.map(([k]) => [k, U.skala(lista.map((o) => o[k]))]));
  const miejsce = (i) => `<span class="miejsce${i < 3 ? ' podium' : ''}"><span class="tx">${i + 1}</span></span>`;
  const przyciskWiecej = (co, rozwiniete, ile) => (ile > 10 ? `<div class="wiecej"><button class="przycisk" type="button" data-akcja="wszystkie" data-co="${co}"><span class="tx">${rozwiniete ? 'Pokaż pierwszą dziesiątkę' : 'Pokaż wszystkie ' + ile}</span></button></div>` : '');

  // ---------------------------------------------------------------- Marki
  function marki(st) {
    ustawKolumny(st.kolumny);
    const akt = st.soczewka.marki;
    const { lista, malo } = O.rankingMarek(A().marki, akt);
    const widac = st.wszystkie.marki ? lista : lista.slice(0, 10);
    const sk = skale(lista);
    const wiersze = widac.map((m, i) => `<tr tabindex="0" data-otworz="marka:${m.id}"><td>${miejsce(i)}</td><td><div class="nazwa"><b>${esc(m.nazwa)}</b></div></td>${komorki(m, akt, sk)}</tr>`).join('');
    const reszta = malo.map((m) => `<tr tabindex="0" data-otworz="marka:${m.id}"><td><span class="miejsce">–</span></td><td><div class="nazwa"><b>${esc(m.nazwa)}</b></div></td>`
      + '<td></td></tr>').join('');
    return `<div class="uklad waski">${zdanie(st, 'Wszystkie marki, od najlepszej.')}${pasekListy(akt, 'marki')}<section class="karta" aria-label="Ranking marek">`
      + `<table class="lista">${naglowki(akt, 'marki', lista.length)}<tbody>${wiersze}</tbody></table>`
      + przyciskWiecej('marki', st.wszystkie.marki, lista.length)
      + (malo.length ? `<div class="grupa-malo">Za mało danych do rankingu</div><table class="lista malo"><tbody>${reszta}</tbody></table>` : '')
      + '<div style="height:12px"></div></section>' + dalej(st) + '</div>';
  }

  // ---------------------------------------------------------------- filtry modeli
  const etBudzet = (b) => (b ? `do ${b} tys. zł` : 'bez limitu');
  const etPrzebieg = (p) => (p ? `do ${p} tys. km` : 'bez limitu');
  const ileZmian = (f) => { const d = O.domyslne(); return ['budzet', 'rokOd', 'przebieg', 'zastosowanie', 'tylkoToyota'].filter((k) => f[k] !== d[k]).length + (f.napedy.join() !== d.napedy.join() ? 1 : 0) + (f.typy.length ? 1 : 0); };
  const procent = (i, n) => `--p:${(100 * i / n).toFixed(1)}%`;
  function filtry(f) {
    const ib = O.BUDZETY.indexOf(f.budzet), ip = O.PRZEBIEGI.indexOf(f.przebieg), lata = new Date().getFullYear();
    const chip = (filtr, war, napis, wcisniety, dodatek = '') => `<button class="chip" type="button" data-filtr="${filtr}" data-war="${war}" aria-pressed="${wcisniety}">${dodatek}<span class="tx">${esc(napis)}</span></button>`;
    return '<div class="filtry">'
      + `<div class="filtr"><div class="etykieta" id="et-naped">Napęd</div><div class="chipy" role="group" aria-labelledby="et-naped">${Object.entries(O.NAPEDY).map(([k, n]) => chip('napedy', k, n, f.napedy.includes(k))).join('')}</div></div>`
      + `<div class="filtr"><label class="etykieta" for="f-budzet">Budżet <output>${etBudzet(f.budzet)}</output></label><input class="suwak" id="f-budzet" type="range" min="0" max="${O.BUDZETY.length - 1}" step="1" value="${ib}" style="${procent(ib, O.BUDZETY.length - 1)}" data-suwak="budzet" aria-valuetext="${etBudzet(f.budzet)}"></div>`
      + `<div class="filtr"><label class="etykieta" for="f-rok">Rocznik <output>od ${f.rokOd}</output></label><input class="suwak" id="f-rok" type="range" min="${O.ROK_MIN}" max="${lata}" step="1" value="${f.rokOd}" style="${procent(f.rokOd - O.ROK_MIN, lata - O.ROK_MIN)}" data-suwak="rokOd" aria-valuetext="od ${f.rokOd}"></div>`
      + `<div class="filtr"><label class="etykieta" for="f-przebieg">Przebieg <output>${etPrzebieg(f.przebieg)}</output></label><input class="suwak" id="f-przebieg" type="range" min="0" max="${O.PRZEBIEGI.length - 1}" step="1" value="${ip}" style="${procent(ip, O.PRZEBIEGI.length - 1)}" data-suwak="przebieg" aria-valuetext="${etPrzebieg(f.przebieg)}"></div>`
      + `<div class="filtr"><div class="etykieta" id="et-typy">Nadwozie</div><div class="chipy" role="group" aria-labelledby="et-typy">${Object.entries(O.TYPY).map(([k, n]) => chip('typy', k, n, f.typy.includes(k), sylTypu(k, 'sylwetka'))).join('')}</div></div>`
      + `<div class="filtr"><div class="etykieta" id="et-zast">Zastosowanie</div><div class="chipy" role="group" aria-labelledby="et-zast">${Object.entries(O.ZASTOSOWANIA).map(([k, n]) => chip('zastosowanie', k, n, f.zastosowanie === k)).join('')}</div></div>`
      + `<div class="filtr"><div class="chipy">${chip('tylkoToyota', '1', 'Tylko Toyota i Lexus', f.tylkoToyota)}</div></div>`
      + `<div class="filtr"><label class="etykieta" for="nazwa-zestawu">Zestaw do Mojego rankingu</label><div class="zapis"><input id="nazwa-zestawu" type="text" maxlength="60" placeholder="${esc(O.nazwaZestawu(f))}" autocomplete="off"><button class="przycisk" type="button" data-akcja="zapisz-zestaw">${ik('zapisz')}<span class="tx">Zapisz</span></button></div></div>`
      + `<div class="filtry-stopka"><button class="przycisk" type="button" data-akcja="domyslne"${ileZmian(f) ? '' : ' aria-disabled="true"'}><span class="tx">Przywróć domyślne</span></button></div>`
      + '</div>';
  }

  // ---------------------------------------------------------------- Modele
  function modele(st) {
    ustawKolumny(st.kolumny);
    const akt = st.soczewka.modele, f = st.filtry;
    const wynik = O.rankingModeli(A().modele, f, akt);
    const widac = st.wszystkie.modele ? wynik : wynik.slice(0, 10);
    const sk = skale(wynik.map((x) => x.m));
    const wiersze = widac.map(({ m, ry }, i) => `<tr tabindex="0" data-otworz="model:${m.id}"><td>${miejsce(i)}</td><td>${nazwaNaLiscie(m)}</td>${komorki(m, akt, sk)}`
      + `<td class="tylko-szeroki"><span class="cena">${zakres(ry) || '<span class="drugi">mało ogłoszeń</span>'}</span>${ry.przebieg ? `<br><span class="cena drugi">zwykle ${tys(ry.przebieg)} tys. km</span>` : ''}</td></tr>`).join('');
    const n = ileZmian(f);
    const lista = wynik.length
      ? `<table class="lista">${naglowki(akt, 'modele', wynik.length, '<th class="tylko-szeroki"><span class="naglowek-kolumny">Na Otomoto</span></th>')}<tbody>${wiersze}</tbody></table>` + przyciskWiecej('modele', st.wszystkie.modele, wynik.length)
      : `<div class="pusto"><p>Żaden model nie pasuje do tych filtrów. Podnieś budżet albo zdejmij któryś filtr.</p><button class="przycisk glowny" type="button" data-akcja="domyslne"><span class="tx">Przywróć domyślne</span></button></div>`;
    return '<div class="uklad dwie">' + zdanie(st, 'Modele w Twoich filtrach, od najlepszego.')
      + `<aside class="karta filtry-karta" aria-label="Filtry"><div class="naglowek-karty"><h2>Filtry</h2></div><div class="karta-tresc">${filtry(f)}</div></aside>`
      // Prawa kolumna to jedna całość (pasek listy, lista i karta podstron), więc karta stoi zaraz pod listą, a nie pod wyższą kartą filtrów.
      + '<div class="kolumna-listy">' + pasekListy(akt, 'modele', `<button class="przycisk" type="button" data-akcja="filtry">${ik('filtry')}<span class="tx">Filtry${n ? ' · ' + n : ''}</span></button>`)
      + `<section class="karta" aria-label="Ranking modeli">${lista}<div style="height:12px"></div></section>${dalej(st)}</div></div>`;
  }

  // ---------------------------------------------------------------- Mój ranking
  // Tabela Mojego rankingu: mediana miejsc (lider niebieski, reszta zielona), a na szerszym ekranie obok ogółem w skali całej listy.
  function tabelaMoj(wynik, widac) {
    const sk = U.skala(wynik.map((x) => x.m.ogolem));
    const wiersze = widac.map((x, i) => `<tr tabindex="0" data-otworz="model:${x.m.id}"><td>${miejsce(i)}</td><td>${nazwaNaLiscie(x.m)}</td>`
      + `<td class="liczba"><span class="ocena" data-s="${i === 0 ? 'lider' : '3'}"><span class="tx">${liczba(x.mediana, x.mediana % 1 ? 1 : 0)}</span></span></td><td class="liczba tylko-szeroki">${ocena(x.m.ogolem, sk(x.m.ogolem), x.m.niezSzac)}</td></tr>`).join('');
    return `<table class="lista"><thead><tr><th><span class="ukryte">Miejsce</span></th><th><span class="naglowek-kolumny">Model</span></th><th class="liczba"><span class="naglowek-kolumny">Mediana miejsc</span></th><th class="liczba tylko-szeroki"><span class="naglowek-kolumny">Ogółem</span></th></tr></thead><tbody>${wiersze}</tbody></table>`;
  }
  // Pusty Mój ranking pokazuje przykład (Jacek, 24.10.2026: „Mógłby dać przykład tego”): trzy zestawy, ranking, który z nich wychodzi,
  // i jedną drogę dalej. „Zacznij od tego przykładu” zapisuje te zestawy (Ctrl+Z i „Cofnij” je zdejmują).
  function przyklad(nad = '') {
    const zestawy = O.przyklad(), wynik = O.rankingZestawow(A().modele, zestawy);
    return '<div class="uklad waski">' + nad + '<section class="karta przyklad" aria-label="Przykład Mojego rankingu">'
      + '<div class="pas-pastel pas-przykladu"><p class="sedno tx">Zapisz w Modelach kilka zestawów filtrów, a tutaj zobaczysz auta, które wypadają najlepiej we wszystkich naraz.</p></div>'
      + `<div class="karta-tresc"><h2>Na przykład</h2><ul class="przyklad-zestawy">${zestawy.map((z) => `<li><b>${esc(z.nazwa)}</b><span class="drugi">${esc(O.nazwaZestawu(z.filtry))}</span></li>`).join('')}</ul>`
      + '<h2>Ranking z tych zestawów</h2></div>' + tabelaMoj(wynik, wynik.slice(0, 5))
      + '<div class="akcje-przykladu"><button class="przycisk glowny" type="button" data-akcja="przyklad"><span class="tx">Zacznij od tego przykładu</span></button>'
      + '<button class="przycisk" type="button" data-akcja="widok" data-widok="modele"><span class="tx">Otwórz Modele</span></button></div></section></div>';
  }
  function moj(st) {
    const nad = wsteczPodstrony(st, 'moj');
    if (!st.zestawy.length) return przyklad(nad);
    const wlaczone = st.zestawy.filter((z) => z.wlaczony);
    const wynik = O.rankingZestawow(A().modele, wlaczone);
    const widac = st.wszystkie.moj ? wynik : wynik.slice(0, 10);
    const zestawy = st.zestawy.map((z) => `<div class="zestaw${z.wlaczony ? '' : ' wylaczony'}" data-id="${z.id}" tabindex="0" aria-label="Zestaw ${esc(z.nazwa)}">`
      + `<button class="przelacznik bez-ciagniecia" type="button" role="switch" aria-checked="${z.wlaczony}" aria-label="Licz zestaw „${esc(z.nazwa)}” w rankingu" data-akcja="przelacz-zestaw" data-id="${z.id}"></button>`
      + `<div class="opis-zestawu">${st.edycja === z.id ? `<input class="nazwa-zestawu bez-ciagniecia" data-id="${z.id}" value="${esc(z.nazwa)}" maxlength="60" aria-label="Nazwa zestawu">` : `<b>${esc(z.nazwa)}</b>`}<span>${esc(O.nazwaZestawu(z.filtry))}</span></div>`
      + '<div class="akcje">'
      + `<button class="okragly maly bez-ciagniecia" type="button" data-akcja="zmien-nazwe" data-id="${z.id}" aria-label="Zmień nazwę" data-dymek="Zmień nazwę">${ik('olowek')}</button>`
      + `<button class="okragly maly bez-ciagniecia" type="button" data-akcja="otworz-zestaw" data-id="${z.id}" aria-label="Pokaż ten zestaw w Modelach" data-dymek="Pokaż ten zestaw w Modelach">${ik('dalej')}</button>`
      + `<button class="okragly maly bez-ciagniecia" type="button" data-akcja="usun-zestaw" data-id="${z.id}" aria-label="Usuń zestaw" data-dymek="Usuń zestaw">${ik('usun')}</button>`
      + '</div></div>').join('');
    // Najpierw wynik, pod nim zestawy, z których się liczy (reguła dobry-interfejs, zasada 18: wniosek to nagłówek).
    return '<div class="uklad waski">' + nad
      + `<section class="karta" aria-label="Mój ranking"><div class="naglowek-karty pas-pastel"><h2 class="tx">Mediana miejsc</h2><span class="licznik">${wynik.length} ${odmiana(wynik.length, 'model', 'modele', 'modeli')}</span></div>`
      + (wynik.length ? tabelaMoj(wynik, widac) + przyciskWiecej('moj', st.wszystkie.moj, wynik.length)
        : `<div class="pusto"><p>${wlaczone.length ? 'W tych zestawach nie ma wspólnych modeli.' : 'Włącz co najmniej jeden zestaw.'}</p></div>`)
      + '<div style="height:12px"></div></section>'
      + `<section class="karta" aria-label="Zestawy"><div class="naglowek-karty"><h2>Zestawy</h2><span class="licznik">${wlaczone.length} z ${st.zestawy.length} w rankingu</span></div><div class="zestawy" id="zestawy">${zestawy}</div></section></div>`;
  }

  // ---------------------------------------------------------------- Typy aut
  function typy(st) {
    const P = A().przewodnik, S = A().stan;
    if (!st.calosc.typy) {
      const k = P.skrot;
      return '<div class="przewodnik skrot">' + wsteczPodstrony(st, 'typy') + wersje('typy', false)
        + `<section class="karta skrot-karta"><div class="karta-tresc"><p class="sedno">${esc(k.sedno)}</p><ul class="kesy">${k.punkty.map(([b, t]) => `<li><b>${esc(b)}:</b> ${esc(t)}</li>`).join('')}</ul>`
        + czytajCalosc('typy', k.haczyk) + '</div></section></div>';
    }
    const wiersz = (b, o, kl = '') => `<li class="${kl}"><b>${esc(b)}</b><span class="drugi">${esc(o)}</span></li>`;
    return '<div class="przewodnik">' + wsteczPodstrony(st, 'typy') + wersje('typy', true)
      + `<section class="karta szeroka"><div class="karta-tresc"><h2>Nadwozia</h2><div class="nadwozia">${P.nadwozia.map((n) => `<div class="nadwozie">${U.sylwetka(n)}<b>${esc(n.t)}</b><p>${esc(n.o)}</p>`
        + `<a href="#" data-akcja="pokaz-typ" data-typ="${n.typ}">Pokaż modele ›</a></div>`).join('')}</div></div></section>`
      + `<section class="karta"><div class="karta-tresc"><h2>Wielkość</h2><ul class="wiersze">${P.segmenty.map((s) => `<li><b>Segment ${s.s}</b><span><b>${esc(s.t)}.</b> ${esc(s.o)}<br><span class="drugi">${esc(s.p)}</span></span></li>`).join('')}</ul></div></section>`
      + `<section class="karta"><div class="karta-tresc"><h2>Napęd</h2><ul class="wiersze">${P.napedy.map((n) => wiersz(n.t, n.o, n.ostrzezenie ? 'ostrzezenie' : '')).join('')}</ul></div></section>`
      + `<section class="karta"><div class="karta-tresc"><h2>Skrzynia biegów</h2><ul class="wiersze">${P.skrzynie.map((n) => wiersz(n.t, n.o)).join('')}<li><b>Ręczna</b><span class="drugi">Atlas jej nie pokazuje: szukacie automatu.</span></li></ul></div></section>`
      + `<section class="karta"><div class="karta-tresc"><h2>Zastosowanie</h2><ul class="wiersze">${P.zastosowania.map((n) => `<li><b>${esc(n.t)}</b><span class="drugi">${esc(n.o)} <a href="#" data-akcja="pokaz-zastosowanie" data-zast="${n.id}">Pokaż modele ›</a></span></li>`).join('')}</ul></div></section>`
      + `<section class="karta szeroka"><div class="karta-tresc"><h2>Jak liczymy</h2><ul class="wiersze">${P.liczenie.map((n) => `<li><b>${esc(n.t)}</b><span class="drugi">${esc(n.o)}${n.u ? ` <a href="${esc(n.u)}" target="_blank" rel="noopener">Źródło ↗</a>` : ''}</span></li>`).join('')}</ul>`
      + `<p class="zrodla">Euro NCAP: wyniki pobrane ${esc(dzien(S.ncap))}. What Car?: ankieta ${esc(S.whatcar)}. Consumer Reports: ${esc(S.cr)}. Otomoto: ogłoszenia z ${esc(dzien(S.otomoto))}.</p></div></section>`
      + '</div>';
  }
  const dzien = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : '–');

  // ---------------------------------------------------------------- szczegóły
  const wyniki = (o) => '<div class="wyniki">' + KOLUMNY.map(([k, n, i]) => `<div class="karta wynik"><span class="co">${ik(i)}${n}</span><span class="ile">${o[k] == null ? '–' : liczba(o[k])}<small> z 100${k !== 'bezp' && o.niezSzac ? '*' : ''}</small></span></div>`).join('') + '</div>';
  const gwiazdki = (g) => `<span class="gwiazdki" aria-label="${g} na 5 gwiazdek">${'★'.repeat(g)}<span class="pusta">${'★'.repeat(5 - g)}</span></span>`;
  const pasek = (n, w, m = 0) => `<div class="pasek-w"><span>${n}</span><span class="tor"><i style="width:${Math.max(0, Math.min(100, w))}%"></i></span><span class="wart">${liczba(w, w % 1 ? m : 0)}%</span></div>`;
  const wstecz = (st) => `<button class="przycisk wstecz" type="button" data-akcja="wstecz">${ik('wstecz')}<span class="tx">${esc({ marki: 'Marki', modele: 'Modele', moj: 'Mój ranking', typy: 'Typy aut' }[st.szczegoly.skad] || 'Wstecz')}</span></button>`;

  function model(st, id) {
    const m = A().modele.find((x) => x.id === id); if (!m) return '';
    const n = m.ncap, ry = O.rynek(m, st.filtry), marka = A().marki.find((x) => x.id === m.markaId);
    const adres = O.adresOtomoto(m, st.filtry);
    const zast = Object.entries(O.ZASTOSOWANIA).map(([k, t]) => (m.z[k] ? `<span>${ik('ok')}${t}</span>` : `<span class="nie">${t}</span>`)).join('');
    const seg = A().przewodnik.segmenty.find((s) => s.s === m.klasa);
    const ogloszenia = adres ? `<a class="przycisk" href="${esc(adres)}" target="_blank" rel="noopener">${ik('wyjscie')}<span class="tx">Zobacz ogłoszenia</span></a>` : '';
    const gora = `<article class="szczegoly">${wstecz(st)}`
      + `<div class="tytul"><h1>${esc(nazwaModelu(m))}</h1><span class="drugi">${esc([m.generacja, m.lata, m.nadwozie].filter(Boolean).join(' · '))}</span></div>`
      + wersje('model', st.calosc.model) + wyniki(m);
    // Skrót: opis z wnioskiem, jedna zaleta i jedna wada, cena i ogłoszenia. Całość: test, ankieta, rynek, fakty, wszystkie zalety i wady, historia.
    if (!st.calosc.model) return gora
      + `<section class="karta karta-tresc skrot-karta"><p class="sedno">${esc(m.opis)}</p><ul class="kesy"><li><b>Zaleta:</b> ${esc(m.zalety[0])}</li><li><b>Wada:</b> ${esc(m.wady[0])}</li></ul>`
      + `<p>${ry.ceny ? `Na Otomoto zwykle <b>${zakres(ry)}</b>${ry.przebieg ? `, przebieg zwykle ${tys(ry.przebieg)} tys. km` : ''}.` : 'Na Otomoto za mało ogłoszeń w Twoich filtrach.'}</p>`
      + czytajCalosc('model', 'W całości: wynik testu zderzeniowego krok po kroku, ankieta usterek, wszystkie zalety i wady oraz historia modelu.', ogloszenia)
      + '</section></article>';
    return gora
      + '<div class="siatka-szczegolow">'
      + `<section class="karta karta-tresc"><h2>Bezpieczeństwo</h2><p>Euro NCAP ${n.rok}: ${gwiazdki(n.gw)}</p><div class="paski">${pasek('Dorośli', n.ao)}${pasek('Dzieci', n.co)}${pasek('Systemy', n.sa)}${pasek('Piesi i rowerzyści', n.vru)}</div>`
      + `${n.uwaga ? `<p class="uwaga">${esc(n.uwaga)}</p>` : ''}${n.rok < 2020 ? '<p class="uwaga">Test sprzed 2020 roku liczy się trochę słabiej, bo zasady były łagodniejsze.</p>' : ''}<a href="${esc(n.u)}" target="_blank" rel="noopener">Zobacz test na euroncap.com ↗</a></section>`
      + `<section class="karta karta-tresc"><h2>Niezawodność</h2>${m.wc ? `<div class="paski">${pasek('Bez usterek', m.wc.proc, 1)}</div><p class="uwaga">${esc(m.wc.zrodlo)}${m.szac ? '. ' + esc(m.szac) : ''}</p><a href="${esc(m.wc.url)}" target="_blank" rel="noopener">Zobacz ankietę ↗</a>` : `<p class="uwaga">${esc(m.szac)}</p>`}</section>`
      + `<section class="karta karta-tresc"><h2>Na Otomoto</h2>${ry.ceny ? `<p><b>Zwykle ${zakres(ry)}</b>, środek ${tys(ry.ceny[1])} tys. zł${ry.przebieg ? `, przebieg zwykle ${tys(ry.przebieg)} tys. km` : ''}.</p>`
        + `<p class="uwaga">${st.filtry.budzet ? `W Twoim budżecie ${ry.wBudzecie} z ${ry.ile} ogłoszeń` : `${ry.ile} ogłoszeń`} z pierwszej strony wyników, ${esc(dzien(A().stan.otomoto))}.</p>` : `<p class="uwaga">Za mało ogłoszeń w Twoich filtrach (${ry.ile} z ${ry.wszystkie}).</p>`}`
      + ogloszenia + '</section>'
      + `<section class="karta karta-tresc"><h2>Na co dzień</h2><dl class="fakty"><div><dt>Nadwozie</dt><dd>${esc(m.nadwozie)}</dd></div>`
      + (seg ? `<div><dt>Wielkość</dt><dd>segment ${esc(m.klasa)}: ${esc(seg.t.toLowerCase())}</dd></div>` : '')
      + `<div><dt>Napęd</dt><dd>${esc(O.NAPEDY[m.naped])}: ${esc(m.naped_opis)}</dd></div>`
      + (m.bagaznik ? `<div><dt>Bagażnik</dt><dd>${esc(m.bagaznik)}</dd></div>` : '')
      + `<div><dt>Zastosowanie</dt><dd><span class="zast">${zast}</span></dd></div></dl></section>`
      + `<section class="karta karta-tresc"><h2>Zalety</h2><ul class="punkty">${m.zalety.map((z) => `<li>${esc(z)}</li>`).join('')}</ul></section>`
      + `<section class="karta karta-tresc"><h2>Wady</h2><ul class="punkty">${m.wady.map((z) => `<li>${esc(z)}</li>`).join('')}</ul></section>`
      + '</div>'
      + `<section class="karta karta-tresc"><h2>Historia</h2><p>${esc(m.opis)}</p><p class="drugi">${esc(m.historia)}</p>${marka ? `<a href="#" data-otworz="marka:${marka.id}">Marka ${esc(marka.nazwa)} ›</a>` : ''}</section>`
      + '</article>';
  }

  function marka(st, id) {
    const m = A().marki.find((x) => x.id === id); if (!m) return '';
    const mod = A().modele.filter((x) => x.markaId === m.id).sort((a, b) => b.ogolem - a.ogolem);
    return `<article class="szczegoly">${wstecz(st)}`
      + `<div class="tytul"><h1>${esc(m.nazwa)}</h1><span class="drugi">${esc(m.kraj)} · koncern ${esc(m.koncern)}</span>${m.opis ? `<p class="opis-marki">${esc(m.opis)}</p>` : ''}</div>`
      + wyniki(m)
      + '<div class="siatka-szczegolow">'
      + `<section class="karta karta-tresc"><h2>Bezpieczeństwo</h2>${m.testy.length ? `<p class="uwaga">Średnia z ${m.testy.length} ${odmiana(m.testy.length, 'testu', 'testów', 'testów')} Euro NCAP od 2020 roku, bez dostawczych. Małe auta wypadają zwykle trochę słabiej niż duże, a od 2023 roku zasady są ostrzejsze.</p><ul class="testy">`
        + m.testy.map((t) => `<li><a href="${esc(t.u)}" target="_blank" rel="noopener">${esc(t.m)} · ${t.rok}</a>${gwiazdki(t.gw)}<span class="ocena" data-s="${t.w >= 85 ? '3' : t.w >= 80 ? '2' : t.w >= 70 ? '1' : '0'}"><span class="tx">${liczba(t.w)}</span></span></li>`).join('') + '</ul>'
        : '<p class="uwaga">Euro NCAP nie testowało tej marki od 2020 roku.</p>'}</section>`
      + `<section class="karta karta-tresc"><h2>Niezawodność</h2><dl class="fakty">`
      + `<div><dt>Wielka Brytania</dt><dd>${m.wc ? `What Car? 2025: ${m.wc.miejsce}. miejsce z ${m.wc.z} (${liczba(m.wc.proc, 1)}% bez usterek)` : 'Brak w ankiecie What Car?'}</dd></div>`
      + `<div><dt>USA</dt><dd>${m.cr ? `Consumer Reports 2026: ${m.cr}. miejsce` : 'Poza pierwszą czternastką Consumer Reports 2026 albo brak w ankiecie'}</dd></div></dl>`
      + `${m.niezSzac ? '<p class="uwaga">* Bez ankiety usterek: ogółem liczy średnią wszystkich marek.</p>' : ''}<p class="zrodla"><a href="${esc(A().zrodla.whatcarMarki)}" target="_blank" rel="noopener">What Car? ↗</a> · <a href="${esc(A().zrodla.cr)}" target="_blank" rel="noopener">Consumer Reports ↗</a></p></section>`
      + '</div>'
      + (mod.length ? `<section class="karta"><div class="naglowek-karty"><h2>Modele w Atlasie</h2></div><table class="lista"><tbody>${mod.map((x, i) => `<tr tabindex="0" data-otworz="model:${x.id}"><td>${miejsce(i)}</td><td>${nazwaNaLiscie(x)}</td><td class="liczba">${ocena(x.ogolem, '3', x.niezSzac)}</td></tr>`).join('')}</tbody></table><div style="height:12px"></div></section>` : '')
      + '</article>';
  }

  window.AtlasWidoki = { marki, modele, moj, typy, model, marka, filtry, ileZmian, etBudzet, etPrzebieg, nazwaModelu };
})();