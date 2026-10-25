// ocena.js: liczenie Atlasu bez ekranu: filtry modeli, ceny z Otomoto, kolejność marek i modeli, mój ranking z mediany.
// Działa w przeglądarce (window.AtlasOcena) i w node (testy\test.js).
(function (glob) {
  'use strict';
  const BUDZETY = [30, 40, 50, 60, 75, 90, 110, 130, 160, 200, 300, 500, 0];   // tys. zł, 0 = bez limitu
  const PRZEBIEGI = [30, 50, 75, 100, 125, 150, 200, 250, 0];                  // tys. km, 0 = bez limitu
  const ROK_MIN = 2016;
  const NAPEDY = { HEV: 'Hybryda', PHEV: 'Plug-in', BEV: 'Elektryk' };
  const TYPY = { maly: 'Małe', kompakt: 'Kompakt', kombi: 'Kombi', suv: 'SUV', van: 'Van', limuzyna: 'Limuzyna' };
  const ZASTOSOWANIA = { miasto: 'Miasto', wypady: 'Wypady', trasy: 'Długie trasy' };
  const SOCZEWKI = { ogolem: 'Ogółem', bezp: 'Bezpieczeństwo', niez: 'Niezawodność' };
  const domyslne = () => ({ napedy: ['HEV'], budzet: 75, rokOd: ROK_MIN, przebieg: 0, typy: [], zastosowanie: '', tylkoToyota: false });

  const kwartyl = (s, f) => s[Math.min(s.length - 1, Math.max(0, Math.round(f * (s.length - 1))))];
  const mediana = (a) => { const s = [...a].sort((x, y) => x - y); const i = s.length >> 1; return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2; };

  // Ogłoszenia modelu po roczniku i przebiegu, ceny „zwykle” (kwartyle) i ile mieści się w budżecie.
  function rynek(m, f) {
    const og = m.r.filter((o) => o[1] >= f.rokOd && (!f.przebieg || (o[2] && o[2] <= f.przebieg * 1000)));
    const ceny = og.map((o) => o[0]).sort((a, b) => a - b);
    const km = og.map((o) => o[2]).filter(Boolean).sort((a, b) => a - b);
    const wBudzecie = f.budzet ? og.filter((o) => o[0] <= f.budzet * 1000).length : og.length;
    return {
      ile: og.length, wszystkie: m.r.length, wBudzecie,
      ceny: ceny.length ? [kwartyl(ceny, 0.25), kwartyl(ceny, 0.5), kwartyl(ceny, 0.75)] : null,
      przebieg: km.length ? kwartyl(km, 0.5) : null,
    };
  }
  const rynekBezOgraniczen = (f) => !f.budzet && !f.przebieg && f.rokOd <= ROK_MIN;

  // Model pasuje, gdy zgadzają się napęd, nadwozie, zastosowanie i marka, a na rynku są co najmniej trzy ogłoszenia
  // po roczniku i przebiegu i co piąte z nich mieści się w budżecie. Bez żadnego ograniczenia rynku liczy się każdy model.
  function pasuje(m, f, ry) {
    if (!f.napedy.includes(m.naped)) return false;
    if (f.typy.length && !m.typy.some((t) => f.typy.includes(t))) return false;
    if (f.zastosowanie && !m.z[f.zastosowanie]) return false;
    if (f.tylkoToyota && m.marka !== 'Toyota' && m.marka !== 'Lexus') return false;
    if (m.do && m.do < f.rokOd) return false;
    if (rynekBezOgraniczen(f)) return true;
    if (ry.ile < 3) return false;
    return !f.budzet || ry.wBudzecie / ry.ile >= 0.2;
  }

  const porzadek = (soczewka) => (a, b) => (b[soczewka] ?? -1) - (a[soczewka] ?? -1) || b.ogolem - a.ogolem || (a.nazwa || a.model).localeCompare(b.nazwa || b.model, 'pl');

  // Ranking modeli dla filtrów: [{ m, ry }] w kolejności soczewki.
  function rankingModeli(modele, f, soczewka) {
    return modele.map((m) => ({ m, ry: rynek(m, f) })).filter((x) => pasuje(x.m, f, x.ry))
      .sort((a, b) => porzadek(soczewka)(a.m, b.m));
  }

  // Marki: w kolejce tylko te z co najmniej dwoma testami i z ankietą usterek. Reszta idzie do „Za mało danych”.
  function rankingMarek(marki, soczewka) {
    const pelne = marki.filter((m) => m.bezp != null && m.testy.length >= 2 && m.niez != null);
    const reszta = marki.filter((m) => !pelne.includes(m));
    return { lista: pelne.sort(porzadek(soczewka)), malo: reszta };
  }

  // Mój ranking: miejsce modelu w każdym zestawie (brak w zestawie to miejsce za ostatnim), mediana miejsc.
  // W wyniku tylko modele obecne w co najmniej połowie zestawów.
  function rankingZestawow(modele, zestawy) {
    const listy = zestawy.map((z) => rankingModeli(modele, z.filtry, z.soczewka || 'ogolem').map((x) => x.m.id));
    if (!listy.length) return [];
    const ids = [...new Set(listy.flat())];
    return ids.map((id) => {
      const miejsca = listy.map((l) => { const i = l.indexOf(id); return i < 0 ? l.length + 1 : i + 1; });
      const obecny = listy.filter((l) => l.includes(id)).length;
      return { m: modele.find((x) => x.id === id), mediana: mediana(miejsca), srednia: miejsca.reduce((s, x) => s + x, 0) / miejsca.length, obecny, z: listy.length, miejsca };
    }).filter((x) => x.obecny * 2 >= x.z)
      .sort((a, b) => a.mediana - b.mediana || a.srednia - b.srednia || b.m.ogolem - a.m.ogolem);
  }

  // Przykład w pustym Moim rankingu (Jacek, 24.10.2026: „Mógłby dać przykład tego”): trzy zestawy, jakie mogłaby zapisać rodzina.
  const przyklad = () => [
    { nazwa: 'Miasto do 60 tys.', filtry: { ...domyslne(), budzet: 60, zastosowanie: 'miasto' }, soczewka: 'ogolem' },
    { nazwa: 'Rodzina do 75 tys.', filtry: { ...domyslne(), rokOd: 2018, przebieg: 150, zastosowanie: 'wypady' }, soczewka: 'ogolem' },
    { nazwa: 'Tylko Toyota i Lexus', filtry: { ...domyslne(), tylkoToyota: true }, soczewka: 'bezp' },
  ];

  const tys = (zl) => Math.round(zl / 1000);
  function nazwaZestawu(f) {
    const czesci = [f.napedy.map((n) => NAPEDY[n]).join(' i ')];
    czesci.push(f.budzet ? `do ${f.budzet} tys. zł` : 'bez limitu ceny');
    if (f.rokOd > ROK_MIN) czesci.push(`od ${f.rokOd}`);
    if (f.przebieg) czesci.push(`do ${f.przebieg} tys. km`);
    if (f.typy.length) czesci.push(f.typy.map((t) => TYPY[t]).join(', '));
    if (f.zastosowanie) czesci.push(ZASTOSOWANIA[f.zastosowanie]);
    if (f.tylkoToyota) czesci.push('Toyota i Lexus');
    return czesci.join(', ');
  }

  // Adres wyszukiwania na Otomoto z filtrami: rocznik od, przebieg do, cena do.
  function adresOtomoto(m, f) {
    if (!m.otomoto) return '';
    let u = m.otomoto.replace(/\/od-\d{4}/, `/od-${Math.max(m.od || ROK_MIN, f.rokOd)}`);
    if (f.przebieg) u += `&search%5Bfilter_float_mileage%3Ato%5D=${f.przebieg * 1000}`;
    if (f.budzet) u += `&search%5Bfilter_float_price%3Ato%5D=${f.budzet * 1000}`;
    return u;
  }

  const AtlasOcena = { BUDZETY, PRZEBIEGI, ROK_MIN, NAPEDY, TYPY, ZASTOSOWANIA, SOCZEWKI, domyslne, rynek, pasuje, rankingModeli, rankingMarek, rankingZestawow, przyklad, nazwaZestawu, adresOtomoto, mediana, tys };
  if (typeof module !== 'undefined' && module.exports) module.exports = AtlasOcena;
  else glob.AtlasOcena = AtlasOcena;
})(typeof window !== 'undefined' ? window : globalThis);