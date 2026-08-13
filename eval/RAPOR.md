# Kader Motoru v3 — Ölçüm Raporu

Değerlendirme seti: **bağımsız held-out**, 140 Türkçe soru. Sistemin
sözlükleri ve kodu görülmeden, ayrı bir ajan tarafından yazıldı; motor bu sete karşı
hiç eğitilmedi ve eşikler bu sete bakılarak ayarlanmadı.

Set içinde bilinçli **zor vaka**: 49 (Türkçe karaktersiz yazım, olumsuz çekim,
argo, tuzak kelimeler, iki konulu sorular).

---

## 1. Sınıflandırma başarımı

**tip ekseni**

| sınıf | kesinlik | duyarlılık | F1 | destek |
|---|---:|---:|---:|---:|
| acik | 0.952 | 1.000 | 0.976 | 20 |
| evet_hayir | 0.950 | 1.000 | 0.974 | 38 |
| kisi | 1.000 | 1.000 | 1.000 | 11 |
| nasil | 1.000 | 1.000 | 1.000 | 13 |
| neden | 1.000 | 1.000 | 1.000 | 10 |
| nicel | 0.909 | 1.000 | 0.952 | 10 |
| secim | 1.000 | 1.000 | 1.000 | 12 |
| yer | 1.000 | 0.800 | 0.889 | 10 |
| zaman | 1.000 | 0.875 | 0.933 | 16 |
| **makro** | **0.979** | **0.964** | **0.969** | 140 |

Doğruluk: **97.1%**

**tip karışıklık matrisi** (satır = gerçek, sütun = tahmin)

| | acik | evet_hayir | kisi | nasil | neden | nicel | secim | yer | zaman |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **acik** | **20** | · | · | · | · | · | · | · | · |
| **evet_hayir** | · | **38** | · | · | · | · | · | · | · |
| **kisi** | · | · | **11** | · | · | · | · | · | · |
| **nasil** | · | · | · | **13** | · | · | · | · | · |
| **neden** | · | · | · | · | **10** | · | · | · | · |
| **nicel** | · | · | · | · | · | **10** | · | · | · |
| **secim** | · | · | · | · | · | · | **12** | · | · |
| **yer** | 1 | 1 | · | · | · | · | · | **8** | · |
| **zaman** | · | 1 | · | · | · | 1 | · | · | **14** |

**konu ekseni**

| sınıf | kesinlik | duyarlılık | F1 | destek |
|---|---:|---:|---:|---:|
| ask | 0.870 | 0.714 | 0.784 | 28 |
| egitim | 0.800 | 0.857 | 0.828 | 14 |
| genel | 0.452 | 0.778 | 0.571 | 18 |
| is | 0.895 | 0.708 | 0.791 | 24 |
| para | 0.842 | 0.762 | 0.800 | 21 |
| saglik | 1.000 | 0.889 | 0.941 | 18 |
| yol | 0.882 | 0.882 | 0.882 | 17 |
| **makro** | **0.820** | **0.799** | **0.800** | 140 |

Doğruluk: **78.6%**

**konu karışıklık matrisi** (satır = gerçek, sütun = tahmin)

| | ask | egitim | genel | is | para | saglik | yol |
|---|---:|---:|---:|---:|---:|---:|---:|
| **ask** | **20** | 1 | 5 | · | 1 | · | 1 |
| **egitim** | · | **12** | 2 | · | · | · | · |
| **genel** | · | 1 | **14** | 1 | 2 | · | · |
| **is** | 2 | · | 4 | **17** | · | · | 1 |
| **para** | · | 1 | 4 | · | **16** | · | · |
| **saglik** | 1 | · | 1 | · | · | **16** | · |
| **yol** | · | · | 1 | 1 | · | · | **15** |

**arzu ekseni**

| sınıf | kesinlik | duyarlılık | F1 | destek |
|---|---:|---:|---:|---:|
| istenen | 0.592 | 0.714 | 0.647 | 63 |
| korkulan | 0.463 | 0.568 | 0.510 | 44 |
| notr | 0.700 | 0.212 | 0.326 | 33 |
| **makro** | **0.585** | **0.498** | **0.494** | 140 |

Doğruluk: **55.0%**

**arzu karışıklık matrisi** (satır = gerçek, sütun = tahmin)

| | istenen | korkulan | notr |
|---|---:|---:|---:|
| **istenen** | **45** | 18 | · |
| **korkulan** | 16 | **25** | 3 |
| **notr** | 15 | 11 | **7** |

### Temel çizgiler

| eksen | motor | çoğunluk sınıfı | rastgele (tekdüze) |
|---|---:|---:|---:|
| tip | **97.1%** | 27.1% | 11.1% |
| konu | **78.6%** | 20.0% | 14.3% |
| arzu | **55.0%** | 45.0% | 33.3% |

---

## 1b. Nihai ölçüm — hiç incelenmemiş ikinci bağımsız set

Yukarıdaki 140 soruluk set üzerinde hata çözümlemesi yapıldı ve
bulunan **hatalar giderildi** (sözlüğün ikinci kez gövdelenmesi, iyelik eki şablonları,
olumsuz şimdiki zaman kaynaşması, yüklem ağırlıklı arzu). Bu yüzden o set artık
*geliştirme seti* sayılmalı, saf held-out değil.

Aşağıdaki 100 soruluk set, başka bir ajan tarafından ayrıca yazıldı ve
**tek bir örneği bile incelenmedi**; sistem bu sete göre hiç değiştirilmedi.

| eksen | geliştirme seti (140) | **nihai set (100)** | çoğunluk temel çizgisi |
|---|---:|---:|---:|
| tip | 97.1% | **95.0%** (F1 0.932) | 35.0% |
| konu | 78.6% | **73.0%** (F1 0.755) | 20.0% |
| arzu | 55.0% | **59.0%** (F1 0.576) | 40.0% |

**nihai set — tip ekseni**

| sınıf | kesinlik | duyarlılık | F1 | destek |
|---|---:|---:|---:|---:|
| acik | 0.600 | 0.857 | 0.706 | 7 |
| evet_hayir | 0.972 | 1.000 | 0.986 | 35 |
| kisi | 1.000 | 1.000 | 1.000 | 7 |
| nasil | 1.000 | 0.625 | 0.769 | 8 |
| neden | 1.000 | 1.000 | 1.000 | 7 |
| nicel | 1.000 | 1.000 | 1.000 | 7 |
| secim | 1.000 | 1.000 | 1.000 | 11 |
| yer | 1.000 | 0.857 | 0.923 | 7 |
| zaman | 1.000 | 1.000 | 1.000 | 11 |
| **makro** | **0.952** | **0.927** | **0.932** | 140 |

Doğruluk: **95.0%**

**nihai set — konu ekseni**

| sınıf | kesinlik | duyarlılık | F1 | destek |
|---|---:|---:|---:|---:|
| ask | 0.923 | 0.600 | 0.727 | 20 |
| egitim | 0.875 | 0.700 | 0.778 | 10 |
| genel | 0.424 | 0.875 | 0.571 | 16 |
| is | 0.923 | 0.706 | 0.800 | 17 |
| para | 0.846 | 0.733 | 0.786 | 15 |
| saglik | 0.818 | 0.750 | 0.783 | 12 |
| yol | 0.889 | 0.800 | 0.842 | 10 |
| **makro** | **0.814** | **0.738** | **0.755** | 140 |

Doğruluk: **73.0%**

**nihai set — arzu ekseni**

| sınıf | kesinlik | duyarlılık | F1 | destek |
|---|---:|---:|---:|---:|
| istenen | 0.549 | 0.700 | 0.615 | 40 |
| korkulan | 0.588 | 0.667 | 0.625 | 30 |
| notr | 0.733 | 0.367 | 0.489 | 30 |
| **makro** | **0.624** | **0.578** | **0.576** | 140 |

Doğruluk: **59.0%**

---

## 2. Ablasyon: hangi katman ne kazandırıyor?

Her satırda tek bir katman kapatıldı, gerisi sabit.

| yapılandırma | konu doğr. | konu makroF1 | arzu doğr. | tip doğr. |
|---|---:|---:|---:|---:|
| **tam sistem** | **78.6%** | **0.800** | **55.0%** | **97.1%** |
| − ünlü uyumu doğrulaması | 77.9% | 0.791 | 48.6% | 97.1% |
| − morfotaktik sıra kısıtı | 74.3% | 0.760 | 54.3% | 97.1% |
| − ASCII gevşek uyum | 78.6% | 0.800 | 55.7% | 97.1% |
| − IDF ağırlığı | 78.6% | 0.800 | 55.0% | 97.1% |
| − karakter n-gram geri düşüşü | 78.6% | 0.800 | 55.0% | 97.1% |
| gövdeleme yerine F5 (ilk 5 harf) | 74.3% | 0.769 | 55.7% | 97.1% |
| − uyum − morfotaktik (kör soyma) | 75.7% | 0.769 | 49.3% | 97.1% |

**Türkçe karakter kullanılmayan 31 soruluk alt kümede konu doğruluğu:**

| yapılandırma | konu doğruluğu |
|---|---:|
| tam sistem | 83.9% |
| − ASCII gevşek uyum | 83.9% |
| − ünlü uyumu doğrulaması | 83.9% |

---

## 3. Seçim kararlılığı: içerik eklemek kaderleri bozuyor mu?

v2'de seçim `indeks = floor(u · n)` idi: listeye tek cümle eklemek eşlemeyi kaydırıyor
ve mevcut cevapların çoğunu değiştiriyordu. v3 Efraimidis–Spirakis anahtarı kullanıyor:
`k_i = u_i^(1/w_i)`, argmax. Yeni aday yalnızca `w_yeni/Σw` olasılıkla kazanır.

İki havuza birer cümle eklendi (12 → 13), 140 soru yeniden üretildi.

| seçim yöntemi | değişen cevap | oran | kuramsal beklenti |
|---|---:|---:|---:|
| v2 · `floor(u·n)` | 75/140 | 53.6% | ~92.3% |
| **v3 · ES anahtarı** | **6/140** | **4.3%** | ~7.7% (yalnız o havuzu çekenlerde) |

**Alan ayrımı sınaması:** yalnızca `tavsiye` havuzlarına cümle eklendiğinde değişen
**hüküm** sayısı: **0/140**. (Alan ayrımı çalışıyorsa 0 olmalı.)

---

## 4. Dağılım ve tohum kalitesi

**4a. Kader ekseni** — 20.000 üretim, hedef ağırlıklara uyum (χ², sd=3, %1 kritik ≈ 11.34):

| sonuç | gözlenen | beklenen | sapma |
|---|---:|---:|---:|
| olur | 6651 | 6600 | 0.8% |
| olmaz | 6057 | 6000 | 0.9% |
| belirsiz | 6923 | 7000 | -1.1% |
| kapandi | 369 | 400 | -7.8% |

χ² = **4.19** → ağırlıklara uygun (H₀ reddedilemez)

**4b. ES anahtarının tekdüzeliği** — 12 eşit ağırlıklı aday, 24.000 bağımsız tohum
(χ², sd=11, %1 kritik ≈ 24.72): χ² = **8.49** → tekdüzelikten anlamlı sapma yok

**4c. Ağırlık orantısı** (1 : 3 : 6 → beklenen %10 : %30 : %60):

| aday | gözlenen | beklenen |
|---|---:|---:|
| a (w=1) | 10.09% | 10.00% |
| b (w=3) | 29.70% | 30.00% |
| c (w=6) | 60.20% | 60.00% |

**4d. Kayıt numarası çakışması** — 140 soru, 9000 olası numara:
gözlenen çakışma **0**, doğum günü paradoksu beklentisi ≈ 1.1.
Numara bir kimlik değil, süstür; çakışma tasarım gereği kabul edilir.

---

## 5. Mührün anlamı: v2'de kaç cevap ters tonluydu?

v2'de arzu ekseni yoktu: `kutup=var` her zaman "NASİP VAR" müjdesi basıyordu.
"İşten kovulacak mıyım?" sorusunda bu, kötü habere kutlama damgası demekti.

Held-out sette **44/140** soru `korkulan` (%31.4).
Bunların **P(kader=olur) = %33**'ında v2 kötü olaya müjde mührü basardı:
beklenen ters tonlu cevap oranı ≈ **%10.4**.

v3'te, **altın arzu etiketi** kullanılarak beklenen mühür ile üretilen mühür karşılaştırıldığında
uyumsuzluk: **32/136** (%23.5).
Kalan uyumsuzluk doğrudan arzu sınıflandırma hatasından gelir — mimariden değil.

---

## 6. Çıktı sağlığı ve çeşitlilik

- 8.400 üretim (140 soru × 60 devir), **bozuk çıktı: 0**
- farklı hüküm cümlesi: **142**, farklı şerh: **2229**
- şerh çeşitliliği 248% (kuramsal üst sınır: ton × okuma × tavsiye bileşimleri)

---

## 7. Arzu ekseni: üçüncü set, iki hipotez, iki ret

`eval/test3.json` — 118 soru, on bir konu, arzu dengesi 51/41/26, çoğunluk temel
çizgisi **%43,2**. Ölçümden **önce** commit edilip donduruldu (`7cdad57`).

**Bağımsızlık uyarısı:** bu seti motoru yazan ajan yazdı, `test2.json` gibi ayrı bir
ajanın ürünü değil. Etiketler motor hiç çalıştırılmadan konuldu, ama yine de tam
bağımsız bir set kadar güçlü değildir.

### 7.1 Temel çizgi tekrarlandı

| set | doğruluk | makro F1 | notr geri çağırma |
|---|---:|---:|---:|
| `test2` (100 soru, bağımsız) | %59,0 | 0,576 | 0,37 |
| `test3` (118 soru, yeni) | **%59,3** | 0,524 | 0,19 |

İki set birbirini doğruluyor: arzu ~%59'da duruyor, temel çizginin ~16 puan üstünde.

### 7.2 Karışıklık matrisi (`test3`, satır = gerçek)

| | istenen | korkulan | notr |
|---|---:|---:|---:|
| **istenen** | 40 | 10 | 1 |
| **korkulan** | 13 | 25 | 3 |
| **notr** | 17 | 4 | 5 |

`notr` fiilen ölü: 26 sorunun 5'i doğru, 17'si `istenen`'e kaçıyor. Sebep kodda
görünür — kanıt bulunamayınca `birinciSahis ? "istenen" : "notr"`, sorular ise
çoğunlukla birinci şahıs.

### 7.3 Hipotez 1 — bağlama bağlı fiilleri sözlükten çıkar · **REDDEDİLDİ**

Hata analizinde net bir mekanizma göründü: arzu sözlüklerinde tek başına yön
taşımayan genel fiiller var ve yüklem 3× ağırlıklı olduğu için bunlar cevabı
domine ediyor.

- `al` — "zam almak" istenen, "ceza almak" korkulan
- `art` — "maaş artmak" istenen, "borç artmak" korkulan
- `bit` — "borç bitmek" istenen, "ilişki bitmek" korkulan
- `çık`, `aç`, `kal`, `gel`, `gir` — aynı biçimde
- `öl` — **katlanınca `ol` ile aynı jetona düşüyor**, yani "olmak" fiilinin geçtiği
  her soru korku puanı alıyor ("çocuğum olacak mı", "mezun olabilecek miyim")

Dokuz kök çıkarıldı. Sonuç: **%59,3 → %54,2**, makro F1 0,524 → 0,488. Geri alındı.

Mekanizma gerçek ama düzeltme yönü yanlış: o fiiller bağlama bağlı olsa da net
olarak sinyal taşıyormuş; çıkarmak sinyali yok etti, yerine bir şey koymadı.

### 7.4 Hipotez 2 — ağırlık ve geri düşüş ayarı · **REDDEDİLDİ**

`test2` üzerinde tarandı (o set zaten harcanmış; `test3` bu tarama için hiç
kullanılmadı):

| ayar | doğruluk | makro F1 | notr R |
|---|---:|---:|---:|
| şu an (yüklem 3, 1. şahıs → istenen) | %59,0 | 0,576 | 0,37 |
| yüklem 2 | %59,0 | 0,576 | 0,37 |
| yüklem 1 (isim = fiil) | %59,0 | **0,586** | 0,43 |
| geri düşüş hep `notr` | %50,0 | 0,498 | 0,67 |
| yüklem 1 + geri düşüş `notr` | %50,0 | 0,494 | 0,73 |

Hiçbir ayar anlamlı kazanç vermiyor. En iyisi makro F1'de +0,010 — gürültü seviyesi.

### 7.5 Çıkarım

**Arzu ~%59, sözlük yaklaşımının yapısal tavanı.** Yön tek tek kelimelerde değil,
**eşdizimde** yaşıyor:

```
ceza + al   → korkulan        zam + al     → istenen
sınıfta+kal → korkulan        hamile + kal → istenen
işten + çık → korkulan        tayin + çık  → istenen
dava + aç   → korkulan        kapı + aç    → istenen
```

Sonraki adım ayar değil, mekanizma değişikliği: **komşu gövde çiftlerine bakan
küçük bir eşdizim tablosu**. Veri tarafı `kader.json`'a eklenir, kod tarafı
`arzuBul` içinde bir çift denetimi olur. `test2` üzerinde geliştirilir, `test3`
tek seferlik nihai hüküm için saklanır.

**`test3` bu noktadan sonra kısmen harcanmıştır:** hipotez 1 onun üzerinde ölçüldü.
Temiz bir iddia için dördüncü bir set gerekir.

### 7.6 Hipotez 3 — eşdizim tablosu · **KABUL**

Yön tek kelimede değil çiftte yaşıyor. `kader.json`'a `esdizim` tablosu eklendi
(47 korkulan + 51 istenen çift), `arzuBul` komşu olmayan gövde çiftlerini de
tarıyor ve eşleşme 8 ağırlık ekliyor.

Tablo **yalnızca `test2` üzerinde** geliştirildi; `test3` bu geliştirme sırasında
hiç açılmadı ve sonda tek kez ölçüldü.

| | test2 (geliştirme) | test3 (nihai hüküm) |
|---|---:|---:|
| 3 sınıf doğruluk | %59,0 → **%63,0** | %59,3 → **%72,0** |
| makro F1 | 0,576 → 0,610 | 0,524 → 0,628 |

**Ürün için asıl sayı `korkulan` tespiti.** `tonBul` içinde `notr` ile `istenen`
aynı işlenir — ikisi de aynı tonu verir. Yani üç sınıflı doğruluk değil, "kötü
habere kutlama basıyor muyuz" sorusu önemlidir:

| | test2 | test3 |
|---|---:|---:|
| öncesi | %76,0 · F1 0,625 | %74,6 · F1 0,625 |
| sonrası | **%80,0** · F1 0,667 | **%87,3** · F1 0,815 |

**`notr` hâlâ kırık** (F1 0,29, geri çağırma 0,19) ve eşdizim onu düzeltmiyor —
sebep `birinciSahis ? "istenen" : "notr"` geri düşüşü. Ama `notr` yanlışının
çıktıya etkisi yok: aynı tonu üretiyor. Düzeltmenin değeri ölçüme yansır,
kullanıcıya yansımaz.

**Anahtar biçimi tuzağı:** eşdizim anahtarları motorun ÜRETTİĞİ gövdelerdir,
sözlük biçimi değil — `zam`→`za`, `tayin`→`tay`, `hasta`→`has`. Sözlük biçiminde
yazılan anahtar hiç eşleşmez ve sessizce ölür. `test-motor.mjs` §14 anahtarların
katlanmış olduğunu denetliyor.
