/*!
 * Kader Motoru v3 — nasiptevarsa.com
 * Model yok, sunucu yok, ağ isteği yok. Kural tabanlı Türkçe çözümleme +
 * alan-ayrımlı tohumdan kararlı ağırlıklı seçim.
 *
 * Katmanlar
 *   1) Sesbilim      — ünlü uyumu (kalınlık + düzlük), ünsüz benzeşmesi,
 *                      ünsüz yumuşaması; ekler arketip (archiphoneme) yazımıyla
 *                      tutulur ve yüzey biçimi gövdeden ÜRETİLİP doğrulanır.
 *   2) Biçimbilim    — üretilen yüzeyle eşleşmeyen ek soyulmaz. Kör en-uzun-ek
 *                      soymanın "okulu→oku" türü hatalarını bu katman keser.
 *   3) Sözdizim      — soru tipi (9 sınıf), olumsuzluk, 1. şahıs işaretlemesi.
 *   4) Anlam         — IDF ağırlıklı konu sözlüğü + karakter n-gram geri düşüşü;
 *                      arzu ekseni (istenen / korkulan / nötr).
 *   5) Üretim        — tohum = H(kökler) ⊕ H(dönem); her karar ekseni ayrı
 *                      alan etiketiyle tohumlanır; seçim Efraimidis–Spirakis
 *                      ağırlıklı anahtarıyla yapılır (liste düzenlemesi mevcut
 *                      kaderleri bozmaz).
 *
 * Kaynaklar (fikir düzeyinde):
 *   Weizenbaum 1966, ELIZA — desen eşleme + şablon dönüşümü.
 *   Koskenniemi 1983, Two-Level Morphology — yüzey/derin ayrımı, arketip yazımı.
 *   Efraimidis & Spirakis 2006, "Weighted random sampling with a reservoir" —
 *     k_i = u_i^(1/w_i), argmax; burada u_i tohumdan türetilir → kararlı seçim.
 *   Thaler & Ravishankar 1998, Rendezvous (HRW) hashing — aday ekleme/çıkarma
 *     mevcut atamaların yalnızca w_yeni/Σw kadarını değiştirir.
 *   Robertson & Spärck Jones 1976 — IDF ağırlıklandırma sezgisi.
 *   Carbonell & Goldstein 1998, MMR — cevap içi tekrarın bastırılması.
 */
(function (kok) {
  "use strict";

  /* ═══════════ 1. Sesbilim ═══════════ */

  var SESLI      = "aeıioöuü";
  var ARKA       = "aıou";          /* kalın ünlüler */
  var YUVARLAK   = "oöuü";
  var SERT       = "fstkçşhp";      /* "fıstıkçı şahap" — sert ünsüzler */
  var YUMUSAMA   = { "b": "p", "c": "ç", "d": "t", "ğ": "k" };

  var KATLAMA = {
    "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
    "â": "a", "î": "i", "û": "u", "Â": "a", "Î": "i", "Û": "u"
  };
  var TURKCE_OZEL = /[ıİşŞğĞüÜöÖçÇ]/;

  function katla(s) {
    var o = "";
    for (var i = 0; i < s.length; i++) o += KATLAMA[s.charAt(i)] || s.charAt(i);
    return o;
  }

  function sonSesli(s) {
    for (var i = s.length - 1; i >= 0; i--) {
      if (SESLI.indexOf(s.charAt(i)) >= 0) return s.charAt(i);
    }
    return "";
  }

  /** Dar ünlü (H arketipi): kalınlık + düzlük uyumu. */
  function darSes(oncekiSesli) {
    var kalin = ARKA.indexOf(oncekiSesli) >= 0;
    var yuvarlak = YUVARLAK.indexOf(oncekiSesli) >= 0;
    if (kalin) return yuvarlak ? "u" : "ı";
    return yuvarlak ? "ü" : "i";
  }

  /** Geniş ünlü (A arketipi): yalnızca kalınlık uyumu. */
  function genisSes(oncekiSesli) {
    return ARKA.indexOf(oncekiSesli) >= 0 ? "a" : "e";
  }

  /**
   * Arketip şablonundan, verilen gövdeye göre BEKLENEN yüzey biçimini üretir.
   *   A = a|e · H = ı|i|u|ü · D = d|t · C = c|ç
   *   (y)(n)(s) = ünlüyle biten gövdede beliren yardımcı ünsüz
   *   (H)       = ünsüzle biten gövdede beliren yardımcı ünlü
   * Uyum ek içinde de ilerler: "gel" + "(y)AcAK" → "ecek".
   */
  function yuzey(sablon, govde, sonSesliZorla) {
    if (!govde) return null;
    var oncekiSesli = sonSesliZorla || sonSesli(govde);
    if (!oncekiSesli) return null;                 /* ünlüsüz gövde olmaz */
    var oncekiHarf = govde.charAt(govde.length - 1);
    var s = "", i = 0;
    while (i < sablon.length) {
      var c = sablon.charAt(i);
      if (c === "(") {
        var kapa = sablon.indexOf(")", i);
        if (kapa < 0) return null;
        var ic = sablon.slice(i + 1, kapa);
        i = kapa + 1;
        var sesliyleBitiyor = SESLI.indexOf(oncekiHarf) >= 0;
        if (ic === "H") {                          /* yardımcı ünlü */
          if (!sesliyleBitiyor) {
            var yv = darSes(oncekiSesli);
            s += yv; oncekiSesli = yv; oncekiHarf = yv;
          }
        } else {                                   /* yardımcı ünsüz: y, n, s */
          if (sesliyleBitiyor) { s += ic; oncekiHarf = ic; }
        }
        continue;
      }
      var v;
      if (c === "A")      { v = genisSes(oncekiSesli); oncekiSesli = v; }
      else if (c === "H") { v = darSes(oncekiSesli);   oncekiSesli = v; }
      else if (c === "D") { v = SERT.indexOf(oncekiHarf) >= 0 ? "t" : "d"; }
      else if (c === "C") { v = SERT.indexOf(oncekiHarf) >= 0 ? "ç" : "c"; }
      else                { v = c; if (SESLI.indexOf(v) >= 0) oncekiSesli = v; }
      s += v; oncekiHarf = v; i++;
    }
    return s;
  }

  /** Şablonun üretebileceği yüzey uzunlukları (isteğe bağlı parçalar 0 ya da 1). */
  function uzunlukKumesi(sablon) {
    var sabit = 0, secmeli = 0, i = 0;
    while (i < sablon.length) {
      if (sablon.charAt(i) === "(") { secmeli++; i = sablon.indexOf(")", i) + 1; }
      else { sabit++; i++; }
    }
    var out = [];
    for (var k = secmeli; k >= 0; k--) out.push(sabit + k);
    return out;
  }

  /**
   * Ünsüz yumuşamasını geri alır: kitab→kitap, ekmeğ→ekmek, kanad→kanat.
   * YALNIZCA ünlüyle başlayan bir ek soyulduktan sonra çağrılır; yoksa
   * "dağ" gibi zaten yumuşak ünsüzle biten kökler bozulurdu.
   * ASCII yazımda ğ zaten g'ye katlandığı için g→k de kabul edilir.
   */
  function yumusamayiGeriAl(g, asciiYazim) {
    if (g.length < 3) return g;
    var son = g.charAt(g.length - 1);
    var hedef = YUMUSAMA[son] || (asciiYazim && son === "g" ? "k" : null);
    if (hedef && SESLI.indexOf(g.charAt(g.length - 2)) >= 0) return g.slice(0, -1) + hedef;
    return g;
  }

  function ikizAyir(g) {
    var n = g.length;
    if (n >= 4 && g.charAt(n - 1) === g.charAt(n - 2) &&
        SESLI.indexOf(g.charAt(n - 1)) < 0) return g.slice(0, -1);
    return g;
  }

  /* ═══════════ 2. Biçimbilim ═══════════ */

  /**
   * Morfotaktik: Türkçede ekler sabit bir sırayla dizilir. Dıştan içe soyduğumuz
   * için sıra numarası her adımda KESİN AZALMALIDIR. Ayrıca isim çekimi
   * soyulduktan sonra fiil eki gelemez — "doktora" → "doktor" olur, "dokto" olmaz.
   * Köprü yalnızca adlaştırıcılardır (-mA / -mAk): "gelmeyi" → "gelme" → "gel".
   *   9 kopula/şahıs · 7 ad-durum · 6 iyelik · 5 çoğul
   *   4 fiil zaman/görünüş · 3 yeterlilik · 2 olumsuz/adlaştırıcı · 1 mastar
   */
  var EK_BILGI = {
    "(y)Hm": [9, "kopula"], "sHn": [9, "kopula"], "(y)Hz": [9, "kopula"],
    "sHnHz": [9, "kopula"], "DHr": [9, "kopula"],
    "(y)H": [7, "ad"], "(y)A": [7, "ad"], "DA": [7, "ad"], "DAn": [7, "ad"],
    "(n)Hn": [7, "ad"], "(n)DA": [7, "ad"], "(n)DAn": [7, "ad"], "(n)H": [7, "ad"],
    "(n)A": [7, "ad"], "(y)lA": [7, "ad"],
    "(s)H": [6, "ad"], "(H)m": [6, "ad"], "(H)mHz": [6, "ad"], "(H)n": [6, "ad"],
    "(H)nHz": [6, "ad"], "lArH": [6, "ad"],
    "lAr": [5, "notr"],   /* hem çoğul hem 3. çoğul şahıs; zinciri kilitlemez */
    "(y)AcAk": [4, "fiil"], "(H)yor": [4, "fiil"], "DH": [4, "fiil"], "mHş": [4, "fiil"],
    "(H)r": [4, "fiil"], "Ar": [4, "fiil"], "mAlH": [4, "fiil"], "sA": [4, "fiil"],
    "(y)An": [4, "fiil"], "DHk": [4, "fiil"], "(y)ArAk": [4, "fiil"], "mAz": [4, "fiil"],
    "mHyor": [4, "fiil"], "(y)Abil": [3, "fiil"],
    "mA": [2, "adlastirici"], "mAk": [1, "adlastirici"]
  };
  function ekSira(s) { return (EK_BILGI[s] || [4, "fiil"])[0]; }
  function ekTuru(s) { return (EK_BILGI[s] || [4, "fiil"])[1]; }

  /* ═══════════ 2b. Uyum doğrulamalı gövdeleme ═══════════ */

  /**
   * @param {string} kelime  Türkçe küçük harfe indirilmiş tek kelime
   * @param {object} ayar    {asgariGovde, ekler[], katiUyum}
   * @returns {{govde, ekler:string[]}}
   *
   * Her turda tüm şablonlar denenir; şablonun gövdeden ÜRETİLEN yüzeyi kelimenin
   * sonuyla birebir tutmuyorsa soyma reddedilir. Türkçe karakter içermeyen
   * yazımlarda (kullanıcı "sinavi" yazdığında) karşılaştırma katlanmış alfabede
   * yapılır; yoksa ı/i ayrımı kaybolduğu için hiçbir ek eşleşmezdi.
   */
  function govdele(kelime, ayar) {
    var asgari = (ayar && ayar.asgariGovde) || 2;
    var sablonlar = (ayar && ayar._ekler) || [];
    var g = kelime, soyulan = [];
    var kap = (ayar && ayar.kapali) || {};
    if (kap.f5) return { govde: kelime.slice(0, 5), ekler: [] };   /* F5 temel çizgisi */
    var kati = TURKCE_OZEL.test(kelime) || !!kap.gevsek;
    var SESSIZLESTIR = function (x) { return katla(x).replace(/[aeiou]/g, "V"); };
    var esit = kap.uyum
      ? function (a, b) { return SESSIZLESTIR(a) === SESSIZLESTIR(b); }  /* uyum denetimi kapalı */
      : (kati ? function (a, b) { return a === b; }
              : function (a, b) { return katla(a) === katla(b); });

    /* Kullanıcı Türkçe karakter kullanmadıysa ünlü uyumu belirsizleşir:
       "tasinacagim" yazan kişinin gövdesi "taşın" (kalın) ama ASCII "i" ince
       görünür ve -AcAk eki "ecek" beklenir, "acak" gelir. Bu yüzden gevşek
       kipte son ünlünün her iki okunuşu da denenir. */
    var AMBIVALANS = { "i": ["ı", "i"], "u": ["u", "ü"], "o": ["o", "ö"] };
    function sesliAdaylari(govdeAday) {
      if (kati) return [null];
      var sv = sonSesli(govdeAday);
      var alt = AMBIVALANS[sv];
      return alt ? [alt[0], alt[1]] : [null];
    }

    var enSonSira = Infinity, adZinciri = false;

    for (var tur = 0; tur < 5; tur++) {
      var soyuldu = false;
      /* En uzun GERÇEK yüzey önce denenir; şablonun azami boyu değil.
         Yoksa "kavurma" için 1 harflik -A, 2 harflik -mA'yı gölgeler. */
      var enUzun = Math.min(8, g.length - asgari);
      for (var L = enUzun; L >= 1 && !soyuldu; L--) {
        for (var i = 0; i < sablonlar.length; i++) {
          var sab = sablonlar[i];
          if (sab.boylar.indexOf(L) < 0) continue;
          var sira = ekSira(sab.sablon), turu = ekTuru(sab.sablon);
          if (!kap.morfo) {
            if (sira >= enSonSira) continue;                     /* morfotaktik sıra */
            if (adZinciri && turu === "fiil") continue;          /* isimden fiile dönülmez */
          }
          var aday = g.slice(0, g.length - L);
          var son = g.slice(g.length - L), bek = null, adaylar = sesliAdaylari(aday);
          for (var z = 0; z < adaylar.length; z++) {
            var d = yuzey(sab.sablon, aday, adaylar[z]);
            if (d && d.length === L && esit(d, son)) { bek = d; break; }
          }
          if (!bek) continue;
          /* Ünlüyle başlayan ek soyulduysa yumuşamayı geri al: evleneceğ→evlenecek */
          if ("aeıioöuü".indexOf(bek.charAt(0)) >= 0) aday = yumusamayiGeriAl(aday, !kati);
          g = aday; soyulan.push(sab.sablon);
          enSonSira = sira;
          if (turu === "ad") adZinciri = true;
          else if (turu === "adlastirici") adZinciri = false;    /* köprü: zincir sıfırlanır */
          soyuldu = true;
          break;
        }
      }
      if (!soyuldu) break;
    }
    return { govde: ikizAyir(g), ekler: soyulan };
  }

  /* ═══════════ 3. Metin normalizasyonu ═══════════ */

  function duzle(s) {
    return String(s)
      .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF\u00AD\u180E]/g, "")
      .toLocaleLowerCase("tr-TR")
      .replace(/[.,!?;:"'“”‘’()\[\]{}\/\\|*_~`^+=<>@#$%&]/g, " ")
      .replace(/[–—]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  function anahtarla(s) { return katla(duzle(s)); }
  function bol(s) { return s ? s.split(" ").filter(function (t) { return !!t; }) : []; }

  /* ═══════════ 4. Karakter n-gram benzerliği (yazım hatası dayanıklılığı) ═══════════ */

  function ngram(s, n) {
    var p = "  " + s + "  ", m = {}, i;
    for (i = 0; i + n <= p.length; i++) {
      var g = p.substr(i, n);
      m[g] = (m[g] || 0) + 1;
    }
    return m;
  }
  function kosinus(a, b) {
    var nokta = 0, na = 0, nb = 0, k;
    for (k in a) { na += a[k] * a[k]; if (b[k]) nokta += a[k] * b[k]; }
    for (k in b) nb += b[k] * b[k];
    if (!na || !nb) return 0;
    return nokta / Math.sqrt(na * nb);
  }

  /* ═══════════ 5. Sözde-rastgelelik ═══════════ */

  function hashle(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function karistir(h) {                       /* splitmix32 finalizer */
    h = h | 0;
    h ^= h >>> 16; h = Math.imul(h, 2246822507);
    h ^= h >>> 13; h = Math.imul(h, 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  }
  function altTohum(tohum, alan) {             /* alan ayrımı */
    return karistir((tohum ^ hashle("" + alan)) >>> 0);
  }

  /**
   * Efraimidis–Spirakis (2006) ağırlıklı anahtar, tohumdan türetilmiş u ile.
   *   k_i = u_i^(1/w_i)  →  argmax.  ln alınarak sayısal olarak kararlı hâli:
   *   ln(k_i) = ln(u_i)/w_i,  ln(u_i) < 0 olduğundan büyük w daha büyük anahtar verir.
   * Seçim olasılığı w_i/Σw'dir; aday eklemek mevcut seçimlerin yalnızca
   * w_yeni/Σw_yeni kadarını değiştirir (rendezvous hashing kararlılığı).
   */
  function esAnahtar(altTohumDeg, kimlik, agirlik) {
    var h = karistir((altTohumDeg ^ hashle(kimlik)) >>> 0);
    var u = (h + 0.5) / 4294967296;            /* (0,1) açık aralık */
    return Math.log(u) / (agirlik > 0 ? agirlik : 1e-9);
  }

  /** adaylar: [{kimlik, deger, agirlik}] → en yüksek anahtarlı deger */
  function kararliSec(altTohumDeg, adaylar, atla) {
    var enIyi = null, enAnahtar = -Infinity;
    for (var i = 0; i < adaylar.length; i++) {
      var a = adaylar[i];
      if (atla && atla(a)) continue;
      var k = esAnahtar(altTohumDeg, a.kimlik, a.agirlik);
      if (k > enAnahtar) { enAnahtar = k; enIyi = a; }
    }
    return enIyi;
  }

  /** Metin listelerini ağırlıklı aday kümesine çevirir (kimlik = metnin kendisi). */
  function adaylastir(gruplar) {
    var out = [], gorulen = Object.create(null);
    for (var i = 0; i < gruplar.length; i++) {
      var gr = gruplar[i];
      if (!gr.liste || !gr.liste.length) continue;
      for (var j = 0; j < gr.liste.length; j++) {
        var m = gr.liste[j];
        if (gorulen[m]) { gorulen[m].agirlik += gr.agirlik; continue; }
        var a = { kimlik: m, deger: m, agirlik: gr.agirlik };
        gorulen[m] = a; out.push(a);
      }
    }
    return out;
  }

  /* ═══════════ 6. Dönem ═══════════ */

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
    if (!isFinite(donem)) return null;
    var bit = bas + (donem + 1) * gun * 86400000;
    if (!isFinite(bit) || Math.abs(bit) > 8.64e15) return null;
    return { bitisMs: bit };
  }

  /* ═══════════ 7. Veri hazırlığı ═══════════ */

  function hazirla(veri) {
    if (veri._hazir) return veri;
    var ayar = veri.ayar || (veri.ayar = {});

    /* Ek şablonları: uzunluk kümesiyle birlikte, uzun şablon önce. */
    var ham = veri.ekler || [];
    var sab = [];
    for (var i = 0; i < ham.length; i++) {
      sab.push({ sablon: ham[i], boylar: uzunlukKumesi(ham[i]) });
    }
    sab.sort(function (a, b) { return b.boylar[0] - a.boylar[0]; });
    ayar._ekler = sab;

    /* Konu sözlükleri: gövdele + IDF + n-gram profili */
    var indeks = Object.create(null), df = Object.create(null), konuSayisi = 0, konu;
    for (konu in veri.konular) {
      if (!Object.prototype.hasOwnProperty.call(veri.konular, konu)) continue;
      konuSayisi++;
      var kokler = veri.konular[konu].kokler || [], liste = [], gor = Object.create(null);
      for (var j = 0; j < kokler.length; j++) {
        /* Sözlük kökleri GÖVDELENMEZ. İnsan zaten kök yazıyor; ikinci kez
           soymak "hasta"yı "has"a, "evlen"i "evl"e indiriyor ve soru gövdesiyle
           eşleşmeyi bozuyordu (ölçümde konu doğruluğunu ~10 puan düşürüyordu). */
        var yazim = katla(duzle(kokler[j])).replace(/\s+/g, "");
        if (!yazim) continue;
        var govdeli = katla(govdele(duzle(kokler[j]).replace(/\s+/g, ""), ayar).govde);
        var bicimler = (govdeli && govdeli !== yazim) ? [yazim, govdeli] : [yazim];
        for (var bi = 0; bi < bicimler.length; bi++) {
          var gv = bicimler[bi];
          if (!gv || gor[gv]) continue;
          gor[gv] = 1;
          liste.push({ kok: gv, ng: ngram(gv, 3) });
          df[gv] = (df[gv] || 0) + 1;
        }
      }
      indeks[konu] = liste;
    }
    for (konu in indeks) {
      for (var k = 0; k < indeks[konu].length; k++) {
        var kk = indeks[konu][k];
        kk.idf = Math.log(1 + konuSayisi / (df[kk.kok] || 1));
      }
    }
    veri._konuIndeks = indeks;

    /* Arzu sözlükleri */
    function kokKumesi(liste) {
      var m = [], gor = Object.create(null);
      for (var a = 0; a < (liste || []).length; a++) {
        var yazim = katla(duzle(liste[a])).replace(/\s+/g, "");
        if (!yazim) continue;
        var gv = katla(govdele(duzle(liste[a]).replace(/\s+/g, ""), ayar).govde);
        var b = (gv && gv !== yazim) ? [yazim, gv] : [yazim];
        for (var i2 = 0; i2 < b.length; i2++) if (!gor[b[i2]]) { gor[b[i2]] = 1; m.push(b[i2]); }
      }
      return m;
    }
    veri._korku = kokKumesi(veri.korkuKokler);
    veri._istek = kokKumesi(veri.istekKokler);
    veri._notr = kokKumesi(veri.notrKokler);

    /* Durak ve özel sorular */
    var durak = Object.create(null), dl = veri.durak || [];
    for (var d = 0; d < dl.length; d++) durak[anahtarla(dl[d])] = 1;
    veri._durak = durak;

    var soruEki = Object.create(null), sl = veri.soruEki || [];
    for (var s = 0; s < sl.length; s++) soruEki[anahtarla(sl[s])] = 1;
    veri._soruEki = soruEki;

    var ozel = Object.create(null);
    for (var o in veri.ozel) {
      if (Object.prototype.hasOwnProperty.call(veri.ozel, o)) ozel[anahtarla(o)] = veri.ozel[o];
    }
    veri._ozel = ozel;

    veri._hazir = true;
    return veri;
  }

  /* ═══════════ 8. Sözdizimsel çözümleme ═══════════ */

  var TIP_SIRA = ["secim", "zaman", "nicel", "kisi", "yer", "neden", "nasil"];
  var BIRINCI_SAHIS = /(m[ıiuü]y[ıiuü]m|y[ıiuü]m|[ıiuü]m|mal[ıi]y[ıi]m|meliyim|acağım|eceğim|acagim|ecegim|ırım|irim|urum|ürüm|arım|erim)$/;
  var SAHIS_KELIME = ["ben", "bana", "benim", "beni", "bende", "benden", "bize", "bizim"];

  function tipBul(katlanmis, jetonlar, desenler) {
    var i, j;
    for (i = 0; i < TIP_SIRA.length; i++) {
      var tip = TIP_SIRA[i], liste = desenler[tip] || [];
      for (j = 0; j < liste.length; j++) {
        var dz = liste[j];
        if (dz.indexOf(" ") >= 0) { if ((" " + katlanmis + " ").indexOf(" " + dz + " ") >= 0) return tip; }
        else if (jetonlar.indexOf(dz) >= 0) return tip;
      }
    }
    return null;
  }

  /* ═══════════ 9. Anlamsal çözümleme ═══════════ */

  function konuBul(govdeler, indeks, ayar) {
    var kap = (ayar && ayar.kapali) || {};
    var esik = (ayar && ayar.konuEsik) || 0.6;
    var ngEsik = (ayar && ayar.ngramEsik) || 0.72;
    var puan = Object.create(null), kanit = Object.create(null);
    for (var i = 0; i < govdeler.length; i++) {
      var g = govdeler[i], gng = null;
      for (var konu in indeks) {
        var liste = indeks[konu], enIyi = 0, enKok = null;
        for (var j = 0; j < liste.length; j++) {
          var kk = liste[j], kalite = 0;
          if (kk.kok === g) kalite = 1;
          else if (kk.kok.length >= 4 && g.indexOf(kk.kok) === 0) kalite = 0.85;
          else if (g.length >= 4 && kk.kok.indexOf(g) === 0) kalite = 0.8;
          else if (!kap.ngram && g.length >= 4 && kk.kok.length >= 4) {
            if (!gng) gng = ngram(g, 3);
            var c = kosinus(gng, kk.ng);
            if (c >= ngEsik) kalite = 0.6 * c;
          }
          if (kalite > enIyi) { enIyi = kalite; enKok = kk; }
        }
        if (enKok) {
          puan[konu] = (puan[konu] || 0) + enIyi * (kap.idf ? 1 : enKok.idf);
          if (!kanit[konu]) kanit[konu] = [];
          kanit[konu].push(g + "~" + enKok.kok);
        }
      }
    }
    var en = "genel", enP = 0;
    for (var c2 in puan) if (puan[c2] > enP) { enP = puan[c2]; en = c2; }
    return { konu: enP >= esik ? en : "genel", puan: enP, kanit: kanit[en] || [] };
  }

  function kokEsler(g, liste) {
    for (var i = 0; i < liste.length; i++) {
      var k = liste[i];
      if (k === g) return true;
      if (k.length >= 4 && g.indexOf(k) === 0) return true;   /* kök, gövdenin öneki */
    }
    return false;
  }
  /**
   * Arzu yüklemde taşınır, isimde değil:
   *   "Hastalığım ne zaman geçer?"      → yüklem "geç"  → istenen
   *   "Hastalığım geçmeyecek mi?"       → yüklem "geç" + olumsuzluk → korkulan
   * Türkçe SOV olduğu için son içerik kelimesi yüklem kabul edilir ve
   * ağırlığı yüksek tutulur; diğer kökler zayıf kanıttır.
   */
  function arzuBul(govdeler, veri, olumsuz, birinciSahis) {
    var korku = 0, istek = 0, notrKanit = 0;
    var YUKLEM_AGIRLIK = 3;
    for (var i = 0; i < govdeler.length; i++) {
      var w = (i === govdeler.length - 1) ? YUKLEM_AGIRLIK : 1;
      if (kokEsler(govdeler[i], veri._korku)) korku += w;
      if (kokEsler(govdeler[i], veri._istek)) istek += w;
      if (kokEsler(govdeler[i], veri._notr)) notrKanit += w;
    }
    var a;
    if (notrKanit > 0 && notrKanit >= korku && notrKanit >= istek) a = "notr";
    else if (korku > istek) a = "korkulan";
    else if (istek > korku) a = "istenen";
    else if (korku > 0) a = "korkulan";                    /* berabere: temkinli */
    else a = birinciSahis ? "istenen" : "notr";
    /* Olumsuz çekim olayı tersine çevirir: "kovulmayacak mıyım" → istenen */
    if (olumsuz && a !== "notr") a = (a === "korkulan") ? "istenen" : "korkulan";
    return a;
  }

  /* kader (olur/olmaz/belirsiz) × arzu → ton */
  function tonBul(kader, arzu) {
    if (kader === "belirsiz") return "belirsiz";
    if (arzu === "korkulan") return kader === "olur" ? "uyari" : "ferah";
    return kader === "olur" ? "mujde" : "teselli";        /* istenen ve nötr */
  }
  var MUHUR_TON = { mujde: "var", ferah: "var", uyari: "yok", teselli: "yok", belirsiz: "bekle" };

  /* ═══════════ 10. Çözümleme ═══════════ */

  function coz(soru, veri) {
    hazirla(veri);
    var ayar = veri.ayar;
    var turkce = duzle(soru);
    var kat = katla(turkce);
    var hamJeton = bol(turkce), katJeton = bol(kat);

    /* Motor bir kütüphane: arayüz girdiyi 140 karaktere kırpsa da burada da
       kendi sınırı olmalı. Gerçek sorular 20 jetonu geçmez; 400 fazlasıyla
       geniş bir tavan ve girdi boyutundan bağımsız üst sınır sağlar. */
    var AZAMI_JETON = 400;
    if (hamJeton.length > AZAMI_JETON) {
      hamJeton = hamJeton.slice(0, AZAMI_JETON);
      katJeton = katJeton.slice(0, AZAMI_JETON);
      kat = katJeton.join(" ");
    }
    var tip = tipBul(kat, katJeton, veri.tipDesen || {});
    var soruEkiVar = false, birinciSahis = false, olumsuz = false, soruEkiSayi = 0;

    var govdeler = [], gor = Object.create(null), tumEkler = [];
    for (var i = 0; i < hamJeton.length; i++) {
      var ham = hamJeton[i], katJ = katJeton[i];
      /* Şahıs işaretlemesi soru ekinin kendisinde de olabilir ("…mıyım"),
         bu yüzden eleme yapmadan ÖNCE bakılır. */
      if (BIRINCI_SAHIS.test(ham)) birinciSahis = true;
      if (SAHIS_KELIME.indexOf(katJ) >= 0) birinciSahis = true;
      if (veri._soruEki[katJ]) { soruEkiVar = true; soruEkiSayi++; continue; }
      if (veri._durak[katJ]) continue;
      var r = govdele(ham, ayar), adGorduk = false;
      for (var e = 0; e < r.ekler.length; e++) {
        var ek = r.ekler[e];
        tumEkler.push(ek);
        if (ekTuru(ek) === "ad") adGorduk = true;
        /* "olmam gerekecek" → -mA adlaştırıcı, olumsuzluk değil;
           "kovulmayacak" → -mA zaman ekinin altında, olumsuzluk. */
        if ((ek === "mA" || ek === "mAz" || ek === "mHyor") && !adGorduk) olumsuz = true;
      }
      var g = katla(r.govde);
      if (g && !gor[g]) { gor[g] = 1; govdeler.push(g); }
    }
    if (!govdeler.length) govdeler = katJeton.slice();

    /* "istifa etsem mi kalsam mı" — tek cümlede iki soru eki seçim sorusudur. */
    if (soruEkiSayi >= 2) tip = "secim";
    else if (!tip) tip = (soruEkiVar || /\?\s*$/.test(String(soru))) ? "evet_hayir" : "acik";

    var kb = konuBul(govdeler, veri._konuIndeks, ayar);
    var arzu = arzuBul(govdeler, veri, olumsuz, birinciSahis);

    return {
      anahtar: kat, jetonlar: katJeton, govdeler: govdeler, ekler: tumEkler,
      tip: tip, konu: kb.konu, konuPuan: kb.puan, konuKanit: kb.kanit,
      arzu: arzu, olumsuz: olumsuz, birinciSahis: birinciSahis
    };
  }

  /* ═══════════ 11. Üretim ═══════════ */

  function cevapla(soru, veri, donem) {
    hazirla(veri);
    var c = coz(soru, veri);
    var ayar = veri.ayar;

    var ozel = veri._ozel[c.anahtar];
    if (ozel) {
      return {
        yanit: ozel.yanit, serh: ozel.serh || "", kutup: ozel.kutup || "bekle",
        kader: "belirsiz", ton: "belirsiz", arzu: c.arzu,
        no: 1000 + (hashle(c.anahtar) % 9000),
        tip: c.tip, konu: c.konu, govdeler: c.govdeler, ozel: true, donem: donem
      };
    }

    var cekirdek = c.govdeler.slice().sort().join("|");
    var tohum = karistir((hashle(cekirdek) ^ karistir(((donem | 0) * 2654435761) | 0)) >>> 0);

    /* — kader ekseni (olur / olmaz / belirsiz / kapandi) — */
    var ka = ayar.kaderAgirlik || { olur: 33, olmaz: 30, belirsiz: 35, kapandi: 2 };
    var kAdaylar = [];
    for (var k in ka) kAdaylar.push({ kimlik: "kader:" + k, deger: k, agirlik: ka[k] });
    var kader = kararliSec(altTohum(tohum, "kader"), kAdaylar).deger;

    if (kader === "kapandi") {
      return {
        yanit: (veri.hukum.kapandi || ["Eeee? Bu gadar."])[0],
        serh: (veri.tavsiye.kapandi || ["Dosya kapandı."])[0],
        kutup: "kapandi", kader: "kapandi", ton: "kapandi", arzu: c.arzu,
        no: 1000 + (tohum % 9000),
        tip: c.tip, konu: c.konu, govdeler: c.govdeler, ozel: false, donem: donem
      };
    }

    var ton = tonBul(kader, c.arzu);

    /* — hüküm — tona göre genel havuz + konuya/tipe özel havuzlar — */
    var konuH = (veri.konuHukum[c.konu] || {})[kader];
    var tipH = (veri.tipHukum[c.tip] || {})[kader];
    var tonH = (veri.hukum.ton || {})[ton];
    /* Korkulan sorularda ton havuzu ağır basar: "kovulacak mıyım" sorusuna
       "Nasipte varmış, hazırlan" demek tonu ters çevirir. */
    var tonKat = (c.arzu === "korkulan" ? (ayar.tonAgirlikKorku || 6) : (ayar.tonAgirlik || 3));
    var yanitAdaylar = adaylastir([
      { liste: tonH,  agirlik: tonKat },
      { liste: tipH,  agirlik: (tipH && tipH.length) ? (ayar.tipAgirlik || 3) : 0 },
      { liste: konuH, agirlik: ayar.konuAgirlik || 3 }
    ]);
    var yanit = kararliSec(altTohum(tohum, "hukum"), yanitAdaylar);

    /* — şerh: okuma + tavsiye — */
    var okumaAdaylar = adaylastir([
      { liste: (veri.okumaKonu[c.konu] || veri.okumaKonu.genel), agirlik: ayar.konuAgirlik || 3 },
      { liste: veri.okumaTip[c.tip], agirlik: 1 }
    ]);
    var okumaTohum = altTohum(tohum, "okuma");
    var okuma = kararliSec(okumaTohum, okumaAdaylar);
    /* Cevap içi tekrar bastırma (MMR sezgisi): hükümle fazla benzeşen okumayı ele. */
    if (yanit && okuma && benzer(yanit.deger, okuma.deger, ayar)) {
      var alt = kararliSec(okumaTohum, okumaAdaylar, function (a) { return a === okuma; });
      if (alt) okuma = alt;
    }

    var tavsiyeAdaylar = adaylastir([{ liste: veri.tavsiye[ton] || veri.tavsiye.belirsiz, agirlik: 1 }]);
    var tavsiyeTohum = altTohum(tohum, "tavsiye");
    var tavsiye = kararliSec(tavsiyeTohum, tavsiyeAdaylar);
    if (tavsiye && okuma && benzer(tavsiye.deger, okuma.deger, ayar)) {
      var alt2 = kararliSec(tavsiyeTohum, tavsiyeAdaylar, function (a) { return a === tavsiye; });
      if (alt2) tavsiye = alt2;
    }

    return {
      yanit: yanit ? yanit.deger : (veri.hukum.ton.belirsiz || [""])[0],
      serh: ((okuma ? okuma.deger : "") + " " + (tavsiye ? tavsiye.deger : "")).trim(),
      kutup: MUHUR_TON[ton] || "bekle",
      kader: kader, ton: ton, arzu: c.arzu,
      no: 1000 + (tohum % 9000),
      tip: c.tip, konu: c.konu, govdeler: c.govdeler, ozel: false, donem: donem
    };
  }

  var _ngBellek = Object.create(null);
  function benzer(a, b, ayar) {
    if (!a || !b) return false;
    var e = (ayar && ayar.tekrarEsigi) || 0.62;
    if (!_ngBellek[a]) _ngBellek[a] = ngram(katla(duzle(a)), 3);
    if (!_ngBellek[b]) _ngBellek[b] = ngram(katla(duzle(b)), 3);
    return kosinus(_ngBellek[a], _ngBellek[b]) >= e;
  }

  function gununNasibi(veri, simdi) {
    var liste = veri.gunluk || [];
    if (!liste.length) return "";
    var yilBasi = new Date(simdi.getFullYear(), 0, 0);
    var gunNo = Math.floor((simdi - yilBasi) / 86400000);
    return liste[(simdi.getFullYear() * 366 + gunNo) % liste.length];
  }


  /* ═══════════ 12. Cilt (tema) — devre bağlı ═══════════ */

  /** Defterin cildi her devirde değişir; herkes aynı cildi görür. */
  function ciltSec(donem, ciltler) {
    if (!ciltler || !ciltler.length) return null;
    var n = ciltler.length;
    var i = ((donem % n) + n) % n;                 /* negatif dönemde de doğru */
    return ciltler[i];
  }

  /* ═══════════ 13. Burç nasibi ═══════════ */

  function ayGunNo(mmdd) {
    var p = String(mmdd).split("-");
    return parseInt(p[0], 10) * 100 + parseInt(p[1], 10);
  }

  /** Verilen tarihin hangi burç mevsiminde olduğunu döndürür. */
  function bugununBurcu(veri, tarih) {
    var liste = veri.burclar || [];
    var d = tarih || new Date();
    var no = (d.getMonth() + 1) * 100 + d.getDate();
    for (var i = 0; i < liste.length; i++) {
      var b = liste[i], bas = ayGunNo(b.bas), bit = ayGunNo(b.bit);
      if (bas <= bit ? (no >= bas && no <= bit) : (no >= bas || no <= bit)) return b;
    }
    return liste[0] || null;
  }

  function burcBul(veri, id) {
    var liste = veri.burclar || [];
    for (var i = 0; i < liste.length; i++) if (liste[i].id === id) return liste[i];
    return null;
  }

  /**
   * Haftalık burç okuması. Tohum = burç ⊕ dönem, yani aynı devirde aynı burca
   * herkes aynı metni görür; devir dönünce değişir. Seçim yine ES anahtarıyla,
   * böylece havuza cümle eklemek diğer burçların okumasını bozmaz.
   */
  function burcNasibi(veri, burcId, donem) {
    hazirla(veri);
    var b = burcBul(veri, burcId);
    if (!b) return null;
    var okuma = veri.burcOkuma || {};
    var tohum = karistir((hashle("burc:" + b.id) ^ karistir(((donem | 0) * 2654435761) | 0)) >>> 0);
    var elListe = (okuma.element || {})[b.element] || [];
    var el = kararliSec(altTohum(tohum, "burc-element"), adaylastir([{ liste: elListe, agirlik: 1 }]));
    var gn = kararliSec(altTohum(tohum, "burc-genel"), adaylastir([{ liste: okuma.genel || [], agirlik: 1 }]));
    return {
      burc: b,
      metin: [(el ? el.deger : ""), (gn ? gn.deger : "")].filter(Boolean).join(" "),
      no: 1000 + (tohum % 9000),
      donem: donem
    };
  }

  /* ═══════════ 14. İki kişilik nasip ═══════════ */

  var IKILI_BANT = [
    { ad: "dusuk", alt: 30, ust: 54 },
    { ad: "orta", alt: 55, ust: 74 },
    { ad: "yuksek", alt: 75, ust: 89 },
    { ad: "cok", alt: 90, ust: 99 }
  ];

  /**
   * İki isimden ortak kader. İsimler sıralanarak tohumlanır: A+B ile B+A aynı
   * sonucu verir. Yüzde 30–99 aralığına sıkıştırılır — kimse %3 görmesin diye.
   * Havuzlar kasten şefkatlidir; düşük bantta bile aşağılayıcı cümle yoktur.
   */
  function ikiliNasip(veri, ad1, ad2, donem) {
    hazirla(veri);
    var a = anahtarla(ad1 || "").slice(0, 40), b = anahtarla(ad2 || "").slice(0, 40);
    if (!a || !b) return null;
    var cekirdek = [a, b].sort().join("+");
    var tohum = karistir((hashle("ikili:" + cekirdek) ^ karistir(((donem | 0) * 2654435761) | 0)) >>> 0);
    var yuzde = 30 + (karistir(tohum ^ 0x9e3779b9) % 70);
    var bant = IKILI_BANT[0];
    for (var i = 0; i < IKILI_BANT.length; i++) {
      if (yuzde >= IKILI_BANT[i].alt && yuzde <= IKILI_BANT[i].ust) { bant = IKILI_BANT[i]; break; }
    }
    var ik = veri.ikili || {};
    var h = kararliSec(altTohum(tohum, "ikili-hukum"),
                       adaylastir([{ liste: (ik.hukum || {})[bant.ad] || [], agirlik: 1 }]));
    var s = kararliSec(altTohum(tohum, "ikili-serh"),
                       adaylastir([{ liste: ik.serh || [], agirlik: 1 }]));
    return {
      yuzde: yuzde, bant: bant.ad,
      yanit: h ? h.deger : "", serh: s ? s.deger : "",
      no: 1000 + (tohum % 9000), donem: donem
    };
  }

  var API = {
    surum: 3,
    katla: katla, duzle: duzle, anahtarla: anahtarla, bol: bol,
    yuzey: yuzey, govdele: govdele, ngram: ngram, kosinus: kosinus,
    coz: coz, cevapla: cevapla, hazirla: hazirla, gununNasibi: gununNasibi,
    donemHesapla: donemHesapla, donemAraligi: donemAraligi,
    hashle: hashle, karistir: karistir, altTohum: altTohum,
    esAnahtar: esAnahtar, kararliSec: kararliSec, adaylastir: adaylastir,
    tonBul: tonBul, MUHUR_TON: MUHUR_TON,
    ciltSec: ciltSec, bugununBurcu: bugununBurcu, burcBul: burcBul,
    burcNasibi: burcNasibi, ikiliNasip: ikiliNasip
  };

  if (typeof module === "object" && module.exports) module.exports = API;
  else kok.Kader = API;
})(typeof globalThis !== "undefined" ? globalThis : this);
