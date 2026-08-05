/*!
 * Kader Motoru v2 — nasiptevarsa.com
 * Model yok, sunucu yok, ağ isteği yok. Kural tabanlı Türkçe çözümleme +
 * dönem tohumlu deterministik üretim.
 *
 * Boru hattı:  düzle → katla(ASCII) → böl → durak ayıkla → gövdele
 *              → soru tipi → konu → tohum(kökler, dönem) → şablon doldur
 *
 * Aynı soru + aynı dönem = aynı cevap. Kelime sırası ve dolgu kelimeler
 * sonucu değiştirmez. Dönem değişince kader yeniden yazılır.
 */
(function (kok) {
  "use strict";

  /* ————— 1. Normalizasyon ————— */

  var KATLAMA = {
    "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
    "â": "a", "î": "i", "û": "u", "Â": "a", "Î": "i", "Û": "u"
  };

  function katla(s) {
    var o = "";
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      o += KATLAMA[c] || c;
    }
    return o;
  }

  function duzle(s) {
    return String(s)
      .toLocaleLowerCase("tr-TR")
      .replace(/[.,!?;:"'“”‘’()\[\]{}\/\\|*_~`^+=<>@#$%&]/g, " ")
      .replace(/[–—]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  /** Karşılaştırma metni: küçük harf + noktalama yok + ASCII katlanmış. */
  function anahtarla(s) {
    return katla(duzle(s));
  }

  function bol(s) {
    if (!s) return [];
    return s.split(" ").filter(function (t) { return t.length > 0; });
  }

  /* ————— 2. Gövdeleme (kural tabanlı Türkçe ek soyma) ————— */

  /* ASCII katlandıktan sonraki ek listesi. Uzunluk sırası kodda verilir,
     yazım sırası önemsizdir. Yalnızca yüksek frekanslı çekim ekleri. */
  var HAM_EKLER = [
    "abilecegim", "ebilecegim", "abileceksin", "ebileceksin",
    "acagimi", "ecegimi", "acagini", "ecegini",
    "abilir", "ebilir", "abilecek", "ebilecek",
    "iyorum", "uyorum", "iyorsun", "uyorsun", "iyoruz", "uyoruz",
    "acagim", "ecegim", "acaksin", "eceksin", "acagiz", "ecegiz",
    "acaklar", "ecekler", "acakmi", "ecekmi",
    "maliyim", "meliyim", "malisin", "melisin", "mali", "meli",
    "masina", "mesine", "masini", "mesini", "maktan", "mekten",
    "makta", "mekte", "mamis", "memis",
    "lardan", "lerden", "larda", "lerde", "larin", "lerin",
    "lari", "leri", "lara", "lere",
    "mistir", "mustur", "missin", "mussun", "misim", "musum",
    "digim", "digin", "dugum", "dugun", "tigim", "tigin",
    "diklerini", "digini", "dugunu", "tigini",
    "acak", "ecek", "iyor", "uyor", "mis", "mus", "mak", "mek",
    "ndan", "nden", "sinin", "sinin", "nunun",
    "dan", "den", "tan", "ten", "nin", "nun", "sin", "sun",
    "siz", "suz", "lar", "ler", "dir", "tir", "dur", "tur",
    "nda", "nde", "yla", "yle", "ile", "ken",
    "da", "de", "ta", "te", "im", "in", "um", "un", "iz", "uz",
    "di", "du", "ti", "tu", "se", "sa",
    "ya", "ye", "na", "ne", "yi", "yu", "ni", "nu", "la", "le",
    "ma", "me",
    "a", "e", "i", "u"
    /* Not: li/lu/ci/cu/gi/gu/si/su bilinçli olarak yok — bunlar türetim
       ekleridir ve "okulu"→"oku" gibi hatalı soymalara yol açar. */
  ];

  var EKLER = HAM_EKLER.slice().sort(function (a, b) { return b.length - a.length; });

  /* Ünsüz yumuşamasını geri al: kitab→kitap, agac→agac, kanad→kanat, ekmeg→ekmek */
  var SERTLESME = { "b": "p", "c": "c", "d": "t", "g": "k" };

  function sertlestir(g) {
    if (g.length < 3) return g;
    var son = g.charAt(g.length - 1);
    if (SERTLESME[son] && son !== "c") {
      return g.slice(0, -1) + SERTLESME[son];
    }
    return g;
  }

  function ikizAyir(g) {
    var n = g.length;
    if (n >= 4 && g.charAt(n - 1) === g.charAt(n - 2) && "bcdfgklmnprstvyz".indexOf(g.charAt(n - 1)) >= 0) {
      return g.slice(0, -1);
    }
    return g;
  }

  /**
   * Katlanmış tek kelimeyi gövdesine indirger.
   * Yinelemeli en-uzun-ek soyma + asgari gövde koruması.
   */
  function govdele(kelime, asgari) {
    var g = kelime;
    var min = asgari || 2;
    if (g.length <= min) return g;
    for (var tur = 0; tur < 3; tur++) {
      var soyuldu = false;
      for (var i = 0; i < EKLER.length; i++) {
        var ek = EKLER[i];
        if (g.length - ek.length >= min && g.slice(-ek.length) === ek) {
          g = g.slice(0, -ek.length);
          soyuldu = true;
          break;
        }
      }
      if (!soyuldu) break;
    }
    return sertlestir(ikizAyir(g));
  }

  /* ————— 3. Soru tipi ————— */

  var TIP_SIRA = ["secim", "zaman", "nicel", "kisi", "yer", "neden", "nasil"];
  var SORU_ZARFI = ["mi", "mu", "miyim", "muyum", "misin", "musun", "miyiz", "muyuz",
                    "midir", "mudur", "miydi", "muydu", "mimis", "mumus", "misiniz", "musunuz"];

  function tipBul(katlanmis, jetonlar, desenler) {
    var i, j;
    for (i = 0; i < TIP_SIRA.length; i++) {
      var tip = TIP_SIRA[i];
      var liste = desenler[tip] || [];
      for (j = 0; j < liste.length; j++) {
        var d = liste[j];
        if (d.indexOf(" ") >= 0) {
          if (katlanmis.indexOf(d) >= 0) return tip;
        } else if (jetonlar.indexOf(d) >= 0) {
          return tip;
        }
      }
    }
    for (i = 0; i < jetonlar.length; i++) {
      if (SORU_ZARFI.indexOf(jetonlar[i]) >= 0) return "evet_hayir";
    }
    return "acik";
  }

  /* ————— 4. Konu ————— */

  function konuBul(govdeler, konuIndeks, esik) {
    var puan = {}, en = null, enPuan = 0;
    for (var i = 0; i < govdeler.length; i++) {
      var g = govdeler[i];
      for (var konu in konuIndeks) {
        if (!Object.prototype.hasOwnProperty.call(konuIndeks, konu)) continue;
        var kokler = konuIndeks[konu];
        for (var j = 0; j < kokler.length; j++) {
          var k = kokler[j];
          /* Kısa kökler (<4) yalnızca birebir eşleşir: "zam" kökü
             "zaman" jetonunu yakalamasın diye. */
          var esles = (k === g) ||
                      (k.length >= 4 && g.indexOf(k) === 0) ||
                      (g.length >= 4 && k.indexOf(g) === 0);
          if (esles) {
            puan[konu] = (puan[konu] || 0) + 1;
            break;
          }
        }
      }
    }
    for (var c in puan) {
      if (puan[c] > enPuan) { enPuan = puan[c]; en = c; }
    }
    return (en && enPuan >= (esik || 1)) ? en : "genel";
  }

  /* ————— 5. Tohum ve sözde-rastgelelik ————— */

  function hashle(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* splitmix32 finalizer — komşu tohumların birbirinden uzaklaşması için */
  function karistir(h) {
    h = h | 0;
    h ^= h >>> 16; h = Math.imul(h, 2246822507);
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function sec(rnd, dizi) {
    return dizi[Math.floor(rnd() * dizi.length) % dizi.length];
  }

  function agirlikliSec(rnd, agirlik) {
    var toplam = 0, k;
    for (k in agirlik) { if (agirlik[k] > 0) toplam += agirlik[k]; }
    var n = rnd() * toplam;
    for (k in agirlik) {
      if (agirlik[k] > 0) {
        n -= agirlik[k];
        if (n <= 0) return k;
      }
    }
    return "bekle";
  }

  /** Ağırlıklı havuz: [{liste, kat}] → tek düz dizi */
  function havuz(parcalar) {
    var out = [];
    for (var i = 0; i < parcalar.length; i++) {
      var p = parcalar[i];
      if (!p.liste || !p.liste.length) continue;
      for (var k = 0; k < (p.kat || 1); k++) out = out.concat(p.liste);
    }
    return out;
  }

  /* ————— 6. Dönem ————— */

  function donemHesapla(ayar, simdiMs) {
    var gun = (ayar && ayar.donemGun) || 7;
    var bas = Date.parse((ayar && ayar.donemBaslangic) || "2024-01-01");
    if (isNaN(bas)) bas = 0;
    return Math.floor((simdiMs - bas) / (gun * 86400000));
  }

  function donemAraligi(ayar, donem) {
    var gun = (ayar && ayar.donemGun) || 7;
    var bas = Date.parse((ayar && ayar.donemBaslangic) || "2024-01-01");
    if (isNaN(bas)) bas = 0;
    var bit = bas + (donem + 1) * gun * 86400000;
    return { bitisMs: bit };
  }

  /* ————— 7. Veriyi hazırla (gövdelenmiş konu indeksi) ————— */

  function hazirla(veri) {
    var asgari = (veri.ayar && veri.ayar.asgariGovde) || 2;
    var indeks = {};
    for (var konu in veri.konular) {
      if (!Object.prototype.hasOwnProperty.call(veri.konular, konu)) continue;
      var kokler = veri.konular[konu].kokler || [];
      var g = [];
      for (var i = 0; i < kokler.length; i++) {
        var s = govdele(katla(duzle(kokler[i])).replace(/\s+/g, ""), asgari);
        if (s && g.indexOf(s) < 0) g.push(s);
      }
      indeks[konu] = g;
    }
    var duraklar = {};
    var dl = veri.durak || [];
    for (var d = 0; d < dl.length; d++) duraklar[katla(duzle(dl[d]))] = true;

    var ozel = {};
    for (var o in veri.ozel) {
      if (Object.prototype.hasOwnProperty.call(veri.ozel, o)) ozel[anahtarla(o)] = veri.ozel[o];
    }

    veri._indeks = indeks;
    veri._durak = duraklar;
    veri._ozel = ozel;
    veri._hazir = true;
    return veri;
  }

  /* ————— 8. Çözümleme ————— */

  function coz(soru, veri) {
    if (!veri._hazir) hazirla(veri);
    var asgari = (veri.ayar && veri.ayar.asgariGovde) || 2;
    var kat = anahtarla(soru);
    var hepsi = bol(kat);
    var tip = tipBul(kat, hepsi, veri.tipDesen || {});

    var anlamli = [];
    for (var i = 0; i < hepsi.length; i++) {
      var j = hepsi[i];
      if (veri._durak[j]) continue;
      if (SORU_ZARFI.indexOf(j) >= 0) continue;
      anlamli.push(j);
    }

    var govdeler = [];
    for (var k = 0; k < anlamli.length; k++) {
      var g = govdele(anlamli[k], asgari);
      if (g && govdeler.indexOf(g) < 0) govdeler.push(g);
    }
    /* Her şey elendiyse ham jetonlara düş — tohumsuz kalma. */
    if (!govdeler.length) govdeler = hepsi.slice();

    var konu = konuBul(govdeler, veri._indeks, (veri.ayar && veri.ayar.konuEsik) || 1);
    return { anahtar: kat, jetonlar: hepsi, govdeler: govdeler, tip: tip, konu: konu };
  }

  /* ————— 9. Cevap üretimi ————— */

  function cevapla(soru, veri, donem) {
    if (!veri._hazir) hazirla(veri);
    var c = coz(soru, veri);

    var ozel = veri._ozel[c.anahtar];
    if (ozel) {
      return {
        yanit: ozel.yanit, serh: ozel.serh || "", kutup: ozel.kutup || "bekle",
        no: 1000 + (hashle(c.anahtar) % 9000),
        tip: c.tip, konu: c.konu, govdeler: c.govdeler, ozel: true, donem: donem
      };
    }

    var cekirdek = c.govdeler.slice().sort().join("|");
    var tohum = karistir(hashle(cekirdek) ^ karistir((donem | 0) * 2654435761 | 0));
    var rnd = mulberry32(tohum);

    var ay = veri.ayar || {};
    var kutup = agirlikliSec(rnd, ay.kutupAgirlik || { var: 33, yok: 30, bekle: 35, kapandi: 2 });

    if (kutup === "kapandi") {
      return {
        yanit: (veri.hukum.kapandi || ["Eeee? Bu gadar."])[0],
        serh: (veri.tavsiye.kapandi || ["Dosya kapandı."])[0],
        kutup: "kapandi", no: 1000 + (tohum % 9000),
        tip: c.tip, konu: c.konu, govdeler: c.govdeler, ozel: false, donem: donem
      };
    }

    var konuH = (veri.konuHukum[c.konu] || {})[kutup];
    var tipH = (veri.tipHukum[c.tip] || {})[kutup];
    /* Soru tipi bir cevap biçimi dayatıyorsa (ne zaman / kim / kaç …) genel
       havuzu devre dışı bırak: "Yüzde elli" cümlesi "ne zaman"ı cevaplamaz. */
    var yanitHavuz = (tipH && tipH.length)
      ? [{ liste: tipH, kat: ay.tipAgirlik || 3 },
         { liste: konuH, kat: ay.konuAgirlik || 3 }]
      : [{ liste: konuH, kat: ay.konuAgirlik || 3 },
         { liste: veri.hukum[kutup], kat: ay.genelAgirlik || 1 }];
    var yanit = sec(rnd, havuz(yanitHavuz));

    var okuma = sec(rnd, havuz([
      { liste: veri.okumaKonu[c.konu], kat: ay.konuAgirlik || 3 },
      { liste: veri.okumaTip[c.tip], kat: 1 }
    ]));

    var tavsiye = sec(rnd, veri.tavsiye[kutup] || veri.tavsiye.bekle);

    return {
      yanit: yanit,
      serh: okuma + " " + tavsiye,
      kutup: kutup,
      no: 1000 + (tohum % 9000),
      tip: c.tip, konu: c.konu, govdeler: c.govdeler, ozel: false, donem: donem
    };
  }

  /** Günün nasibi — takvim gününe bağlı, herkeste aynı. */
  function gununNasibi(veri, simdi) {
    var liste = veri.gunluk || [];
    if (!liste.length) return "";
    var yilBasi = new Date(simdi.getFullYear(), 0, 0);
    var gunNo = Math.floor((simdi - yilBasi) / 86400000);
    return liste[(simdi.getFullYear() * 366 + gunNo) % liste.length];
  }

  var API = {
    surum: 2,
    katla: katla, duzle: duzle, anahtarla: anahtarla, bol: bol,
    govdele: govdele, coz: coz, cevapla: cevapla,
    hazirla: hazirla, gununNasibi: gununNasibi,
    donemHesapla: donemHesapla, donemAraligi: donemAraligi,
    hashle: hashle, karistir: karistir, mulberry32: mulberry32
  };

  if (typeof module === "object" && module.exports) module.exports = API;
  else kok.Kader = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
