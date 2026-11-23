# KeyForCars CRM — Tanıtım & Eğitim Video Serisi Planı

Tarih: 2026-11-23 · Hedef: ERPNext tutorial serisi tarzında, 2–3 dakikalık, modül başına bir video.
Üretim: tamamen otomatik (script → kayıt → seslendirme → avatar → montaj), avatar sadece giriş/çıkışta.

---

## 1. Araç araştırması (search-first sonucu)

| İhtiyaç | Aday | Karar | Neden |
|---|---|---|---|
| Ekran kaydı (CRM'de gezinme) | **Playwright `recordVideo`** · Claude Browser + gif_creator · onetake `record_footage.py` · manuel kayıt | **Playwright (ADOPT)** | Bir kez yazılan script sonsuz kez aynı videoyu üretir, headless çalışır, hiç token harcamaz. AI'ın tarayıcıda canlı gezmesi her seferinde token yakar ve tekrarlanamaz. |
| Seslendirme (voice-over) | HeyGen Voice Turbo · ElevenLabs (projede zaten var) · Kokoro lokal (`npx hyperframes tts`, ücretsiz) | **HeyGen Voice Turbo (ADOPT)**, bütçe biterse Kokoro | Avatar ile aynı ses → tutarlılık. Kokoro ücretsiz yedek. ElevenLabs sadece NL kalite yetmezse. |
| Avatar (sunucu) | **HeyGen avatar** (`npx hyperframes media-use generate --type avatar`) · HeyGen app | **HeyGen talking-photo/avatar (ADOPT, kısıtlı)** | Video başına ~15–20 sn (giriş 10 sn + çıkış 6 sn). Avatar dakikası ≈ $4.8 → video başına ≈ $1.5. |
| Montaj / overlay / altyazı | **HyperFrames** (skill kurulu, HeyGen MCP bağlı) · ffmpeg · Remotion | **HyperFrames (ADOPT)**, tek şablon | Şablon bir kez yapılır: avatar köşe kutusu, zoom/vurgu, bölüm kartı, altyazı. Sonra her video = JSON + mp4 değişir. ffmpeg sadece son concat/encode. |
| Gerçekçi veri | `deploy/keyforcars-demo` + `workshop-demo-seed.sql` | **Demo ortamı (ADOPT + EXTEND)** | Sentetik ama gerçekçi müşteri/iş/fatura. Seed'i 20–30 kayıtla genişlet (klant, lead, factuur, order). |

Kurulu olmayan: `playwright` (CRM repo'ya devDependency olarak eklenecek, `npx playwright install chromium`), `hyperframes` CLI (`npx hyperframes` ilk çağrıda iner). HeyGen oturumu: `npx hyperframes auth status` ile kontrol.

**Reddedilenler:** Claude'un tarayıcıda canlı kayıt yapması (token + tekrarlanamaz), onetake (UI'ı HTML'de yeniden inşa eder, 60 sn üstü için değil), tam süre avatar (kredi).

---

## 2. Üretim hattı (video başına tek komut hedefi)

```
video/<slug>/
  script.json        ← tek kaynak: sahneler, NL/TR/EN metin, URL, tıklama adımları, vurgu kutuları
  record.spec.ts     ← Playwright: script.json'daki adımları oynatır, 1920x1080 webm kaydeder, her sahne başı timestamp yazar
  assets/vo-*.mp3    ← HeyGen Voice Turbo (sahne başına bir dosya; kelime zaman damgaları altyazı için)
  assets/avatar-intro.mp4, avatar-outro.mp4
  composition/       ← HyperFrames şablonu (ortak), script.json'dan doldurulur
  out/<slug>-nl.mp4
```

Adımlar (`npm run video -- <slug>`):
1. **Kayıt** — demo CRM'e (localhost:3017 veya demo VPS) tester hesabıyla gir, `script.json` adımlarını oynat. Fare hareketleri yavaşlatılmış (`slowMo: 400`), her tıklama öncesi 600 ms bekleme, imleç görünür overlay. Çıktı: `screen.webm` + `marks.json` (sahne → saniye).
2. **Ses** — her sahnenin metni → `media-use generate --type voice`. Süreler `marks.json` ile karşılaştırılır; ses uzunsa Playwright bekleme süreleri otomatik uzatılır ve kayıt tekrar alınır (max 2 tur).
3. **Avatar** — sadece `intro` ve `outro` sahneleri: ses dosyası verilerek (`--audio`) üretilir, böylece ses ikinci kez ücretlendirilmez.
4. **Montaj** — HyperFrames şablonu: 0–10 sn avatar tam ekran + başlık; sonra ekran kaydı tam ekran, sahne geçişlerinde bölüm kartı (2 sn), vurgu kutusu/zoom `script.json`'daki selector'a göre; altyazı HeyGen kelime zamanlarından; son 6 sn avatar köşede + "Sıradaki video" kartı.
5. **Render + kontrol** — `npx hyperframes check`, sonra render. Otomatik QA: süre 120–190 sn mi, ses/kayıt kayması < 0.5 sn mi, hiç boş ekran (>3 sn hareketsiz) var mı.

**Token/kredi disiplini:** Script'ler bir kez yazılır (en pahalı adım, insan+AI). Kayıt ve render sıfır token. Kredi: video başına ≈ 20 sn avatar + ≈ 150 sn ses. Seri (12 video) ≈ 4 dk avatar + 30 dk ses → kabaca $20–30 avatar; ses plana göre (Free plan 3 dk/ay yetmez, Kokoro yedek hazır).

---

## 3. Video şablonu (ERPNext formatı, 150–180 sn)

| Zaman | Blok | İçerik | Görsel |
|---|---|---|---|
| 0:00–0:10 | Hook | "Bu videoda X'i öğreneceksin: a, b, c." | Avatar tam ekran, 3 madde yanında belirir |
| 0:10–0:30 | Neden | Modülün iş akışındaki yeri, kimin ne zaman kullandığı | Ekran: ilgili menü, akış diyagramı kartı |
| 0:30–2:20 | Walkthrough | 3–4 gerçek görev, her biri tam uçtan uca (oluştur → kaydet → sonuç) | Ekran kaydı, selector vurgusu, zoom |
| 2:20–2:40 | Hatalar/ipuçları | En sık yapılan 2 hata | Ekran: yanlış/doğru yan yana kart |
| 2:40–2:55 | Özet + sıradaki | 3 madde özet, bir sonraki video | Avatar köşede, kart |

Anlatım kuralları: her cümle tek eylem; "şimdi tıklıyoruz" değil "Yeni klant için sağ üstteki Nieuw'a bas"; ekranda ne görünüyorsa aynı Hollandaca etiket seslendirmede de geçer (çalışan ekranda arar, bulur).

---

## 4. Seri müfredatı

**Öncelik: Envanter & stok yönetimi.** Bu blok her ekranı, her hareket tipini ve her günlük rutini kapsar; diğer modüller özet bloktur.

### Blok A — Envanter & Stok (9 video, "her şey anlatılır")

Kaynak: `src/app/admin/voorraad/*`, `src/lib/keyforcarsStock.ts`, `inkoop`, `bestellen`, `orders`, `bestellingen/picken`, `verzending`, `producten`, `best-verkocht`.

| # | Video | Rol | Ekranlar | Walkthrough görevleri (hepsi uçtan uca) |
|---|---|---|---|---|
| S1 | Stok mantığı: artikel, stelling, bak, minimum | Herkes (depo) | `/admin/voorraad` (Artikelen görünümü), arama, `?` yardım kutusu | Artikel ara (SKU, isim, kategori, bak kodu), bir artikelin lokasyonlarını oku (stelling + bak + aantal), "Lage voorraad" rozeti ne zaman çıkar, minimum per bak ayarla, "Artikel toevoegen of bijwerken" formu |
| S2 | 6 stok hareketi: Telling, Ontvangst, Uitgifte, Verkoop, Retour, Verplaatsing | Depo | `/admin/voorraad` hareket formu, `?` açıklamaları | Her hareketi bir kez yap: sayım (üzerine yazar), teslimat girişi, atölye için uitgifte (manuel, 20 adet sınırı yok), verkoop + bedrag + factuur bağla, retour, iki bak arası verplaatsing (toplam değişmez). Not alanı, fotoğraf ekleme |
| S3 | Etiketler, QR/barkod, telefonla tarama | Depo | ShelfLabel/StockLabel, etiket boyutları, yazdırma kuyruğu, `StockCamera`, `/admin/voorraad/p/[code]` | Bak etiketi + artikel etiketi bas (LABEL_SIZES), yazıcı kuyruğuna ekle, telefon kamerasıyla barkod okut → doğru artikel açılır, QR'dan ürün profili sayfası (Voorraad op locatie, In de webshops, Laatst verkocht) |
| S4 | Bulktelling met foto (toplu sayım) | Depo | `StockBulkCount`, `StockCamera` | 200'e kadar fotoğraf seç, "Gezien / Geteld / Systeem / Verschil" tablosunu oku, "Te controleren" satırlarını düzelt, "Onbekende code" ne demek, aynı etiket iki kez sayılmaz (SHA-256), lokasyon seç, "Telling opslaan" → logboek'te batch olarak görünür |
| S5 | Bestelvoorstel: bugün ne sipariş etmeliyim? | Depo / inkoop | `/admin/voorraad?view=reorder`, `/admin/inkoop` | Durumları oku: Nu bestellen / Binnenkort / Verkocht nooit geteld / Dead stock / OK; Verwacht = son sayım + hareketler formülü; Bestelpunt, Verbruik, Genoeg voor X dagen, Geschatte bestelwaarde; lead/safety/cover/window günlerini ayarla; "Maak inkooporder" → tedarikçi (örn. KeyDIY Europe), satır ekle/sil, stelling seç, gönder |
| S6 | Webshop siparişleri → A-Key inkoop → picken → verzending | Depo / ofis | `/admin/orders`, `/admin/orders/inkoop`, `/admin/bestellingen/picken`, `/admin/bestellingen/labels`, `/admin/verzending` | Üç webshop siparişini filtrele (status, webshop), "A-Key inkoop vandaag" listesini kopyala, pick board: seç → "Labels maken" → "Alles labelen + printen", zending maken, carrier ayarı, "Verzonden in CRM" durumu |
| S7 | Bus stoğu & monteur parça talebi | Monteur + depo | `/admin/mijn-bus`, `/admin/voorraad/bussen`, `/admin/bestellen`, `PartOrders` | Monteur: "Wat er in de bus ligt", waarde per soort, laatste mutaties, bus minimumu; "Onderdelen bestellen" ile talep aç; Depo: talebi onayla/reddet ("Waarom niet?"), bus'a verplaatsing yap; login monteur'a bağlı değilse ne olur |
| S8 | Raporlar & logboek | Yönetim / depo | `/admin/voorraad?view=reports`, `?view=journal`, `/admin/best-verkocht` | Meest verkocht, dönem raporu (ay aralığı), externe gebeurtenissen (webshop/bot kaynaklı), logboek'te bir hareketi geriye izle (kim, ne zaman, foto, factuur), best-verkocht filtreleri (webshop, kategori, minimum adet) |
| S9 | Ürün kataloğu yönetimi | Ofis / inkoop | `/admin/producten`, `/[slug]`, `BulkPanel` | Ürün tablosu kolonları (Categorie, Inkoop, Voorraad, Zichtbaar), ürün detayı + görsel yükle, toplu kategori aç/kapat, ürün adı/SKU düzenleme, webshop görünürlüğü |

Blok A toplam ≈ 25 dk. Depo çalışanı ilk gün S1–S4, ikinci gün S5–S8 izler.

### Blok B — Diğer modüller (özet, 1'er video)

| # | Video | Rol | Ekranlar |
|---|---|---|---|
| 0 | CRM'e hoş geldin | Herkes | `/admin/login`, `/admin/vandaag`, `/admin/start`, menü, `/admin/mijn-profiel` |
| 1 | Dashboard & Overzicht | Yönetim | `/admin/overzicht`, `/admin/live`, `/admin/rapport` |
| 2 | Leads & gesprekken | Satış/ofis | `/admin/leads`, `/admin/leads/lijst`, `/admin/gesprekken` |
| 3 | Klanten | Ofis | `/admin/klanten`, `/admin/klanten/[telefoon]` |
| 4 | Jobs & Agenda | Ofis/planlama | `/admin/jobs/nieuw`, `/admin/jobs/[id]`, `/admin/agenda` |
| 5 | Monteur günü | Monteur | `/admin/mijn-klussen`, `/admin/mijn-agenda`, `/admin/mijn-saldo` |
| 6 | Faturalama | Ofis/finans | `/admin/facturen/nieuw`, `/admin/facturen/[id]`, `/admin/tarieven` |
| 7 | Kasa, banka, giderler | Finans | `/admin/kas`, `/admin/bank/[view]`, `/admin/uitgaven/nieuw`, `/admin/financien` |
| 8 | AI asistan & bot | Herkes | `/admin/agent-centrum`, `/admin/bot-conversations`, StaffChat |
| 9 | Pazarlama & attributie | Yönetim | `/admin/rapportage`, `/admin/attributie`, `/admin/klikfraude` |
| 10 | Ayarlar & entegrasyonlar | Admin | `/admin/instellingen`, `/admin/integraties`, `/admin/monteurtarieven`, `/admin/monteurs` |
| 11 | Netwerk, marktplaats, taken | Yönetim | `/admin/netwerk`, `/admin/taken` |

**Üretim sırası:** S1 → S2 → S5 → S4 → S3 → S6 → S7 → S8 → S9, sonra 0, 4, 3, 6, 5, kalanlar.

### Stok videolarına özel kayıt notları

- **Telefon ekranları** (S3 kamera, S4 bulktelling, S7 mijn-bus): Playwright `devices['Pixel 7']` viewport'uyla ikinci bir kayıt; montajda telefon çerçevesi içinde gösterilir.
- **Kamera/tarama sahneleri:** gerçek kamera yerine "Telefooncamera / foto kiezen" dosya yolu kullanılır; önceden çekilmiş etiket fotoğrafları `video/assets/labels/*.jpg` olarak hazırlanır. Barkod okutma için Chromium `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=label.y4m`.
- **Gerçekçi veri:** demo seed'e 40 artikel × 2–3 bak, 60 hareket (son 30 gün), 3 bus, 5 parça talebi, 20 webshop siparişi eklenir; `Voorbeeldgegevens` rozeti kayıtta görünmemeli (seed gerçek tablolara yazılır).
- **Yazdırma:** etiket PDF önizlemesi `page.pdf` yerine ekranda açık bırakılır; gerçek yazıcı diyaloğu kaydedilmez.
---

## 5. Çalışan deneyimi (UX) planı

- **Dil:** Seslendirme + altyazı NL (ekran NL). Aynı `script.json`'dan TR ve EN varyant: sadece ses yeniden üretilir, kayıt aynı. (Karar bekliyor, bkz. §7.)
- **Rol bazlı oynatma listeleri:** Depo (0, S1–S9) · Monteur (0, 5, S7, S3) · Ofis (0, 2, 3, 4, 6, S6, S9) · Finans (0, 6, 7, S8) · Yönetim (hepsi). Depo listesi iki güne bölünür (S1–S4, S5–S9); diğer roller ≈ 15 dk.
- **Nerede yaşar:** CRM içinde `/admin/start` sayfasına "Eğitim" kartı; her modül sayfasında `?` ikonu → o modülün videosu (bölüm zaman damgasıyla açılır). Dosyalar Vercel Blob (zaten bağımlılık) veya unlisted YouTube.
- **Video içi UX:** Bölüm kartları (YouTube chapters ile aynı zamanlar), altyazı her zaman açık, imleç büyütülmüş, tıklanan yer 1 sn sarı halka, kritik alanlar zoom. Hız 1.25x'te hâlâ anlaşılır olmalı (QA kontrolü).
- **Pekiştirme:** Her video sonunda 3 maddelik "şimdi sen yap" görevi, demo ortamında denenir. İsteğe bağlı: `/admin/taken`'a otomatik "Eğitim: video 4 görevleri" görevi.
- **Takip:** Hangi çalışan hangi videoyu izledi (basit `training_progress` tablosu; yöneticiye liste). İlk sürümde atlanabilir.
- **Güncel tutma:** Ekran değişince sadece ilgili `script.json` güncellenir, `npm run video` yeniden koşar. Video başına yeniden üretim maliyeti ≈ avatar 20 sn.

---

## 6. Pilot: Video S2 — 6 stok hareketi (tam script taslağı)

```json
{
  "slug": "s2-voorraadbewegingen",
  "lang": "nl",
  "viewport": "desktop",
  "scenes": [
    {"id":"intro","type":"avatar","text":"In deze video leer je de zes voorraadbewegingen: telling, ontvangst, uitgifte, verkoop, retour en verplaatsing. Na deze video weet je precies welke je wanneer gebruikt."},
    {"id":"why","url":"/admin/voorraad","highlight":"details summary","steps":[{"click":"details summary"}],"text":"Elke verandering in de voorraad is een beweging. Het vraagteken legt elke beweging uit. Verkeerde beweging betekent verkeerde voorraad en een verkeerd bestelvoorstel."},
    {"id":"count","steps":[{"fill":["input[type=search]","KD-B01"]},{"click":"text=KD-B01"},{"select":["[name=operation]","count"]},{"fill":["[name=quantity]","12"]},{"fill":["[name=minimum]","4"]},{"click":"text=Boeken"}],"text":"Telling vervangt het aantal op deze bak door wat je echt telt. Hier staan twaalf stuks, minimum vier. Zakt de bak onder vier, dan zie je Lage voorraad."},
    {"id":"receive","steps":[{"select":["[name=operation]","receive"]},{"fill":["[name=quantity]","20"]},{"fill":["[name=note]","KeyDIY levering 23-11"]},{"click":"text=Boeken"}],"text":"Ontvangst telt erbij op. Twintig stuks binnen van KeyDIY, notitie erbij, boeken."},
    {"id":"issue","steps":[{"select":["[name=operation]","issue"]},{"fill":["[name=quantity]","1"]},{"click":"text=Boeken"}],"text":"Uitgifte is voor intern gebruik, bijvoorbeeld een sleutel voor de werkplaats. Handmatig, geen vaste grens."},
    {"id":"sale","steps":[{"select":["[name=operation]","sale"]},{"fill":["[name=quantity]","2"]},{"fill":["[name=amount]","89,00"]},{"fill":["[name=invoiceId]","F-2026-0412"]},{"click":"text=Boeken"}],"text":"Verkoop boekt af en koppelt het bedrag en de factuur. Zo klopt het rapport Meest verkocht."},
    {"id":"return","steps":[{"select":["[name=operation]","return"]},{"fill":["[name=quantity]","1"]},{"click":"text=Boeken"}],"text":"Komt een artikel terug, dan is dat retour: het komt weer bij de voorraad."},
    {"id":"transfer","steps":[{"select":["[name=operation]","transfer"]},{"fill":["[name=quantity]","5"]},{"fill":["[name=destinationShelf]","B"]},{"fill":["[name=destinationBox]","07"]},{"click":"text=Boeken"}],"text":"Verplaatsing schuift vijf stuks van deze bak naar stelling B, bak zeven. Het totaal blijft gelijk."},
    {"id":"journal","url":"/admin/voorraad?view=journal","highlight":"table tbody tr:first-child","text":"In het voorraadlogboek staat elke beweging met tijd, aantal en notitie. Fout geboekt? Boek de tegenovergestelde beweging, verwijder nooit."},
    {"id":"mistakes","type":"card","text":"Twee fouten die we vaak zien: een telling gebruiken om iets erbij te zetten, dat overschrijft het aantal. En een verkoop boeken zonder factuur, dan mist het rapport omzet."},
    {"id":"outro","type":"avatar","text":"Samengevat: telling overschrijft, ontvangst en retour tellen op, uitgifte en verkoop tellen af, verplaatsing schuift. Volgende video: etiketten en scannen met je telefoon."}
  ]
}
```
Selector'lar (`[name=operation]`, `[name=quantity]`, `destinationShelf` vb.) `StockForm.tsx` ve `KeyForCarsStock.tsx` satır 342'den alındı; kayıt öncesi Playwright codegen ile doğrulanır.
---

## 7. Karar bekleyen 4 nokta

1. **Dil:** NL ana dil + TR/EN varyant mı, yoksa sadece NL mi?
2. **Avatar kaynağı:** HeyGen stok avatar mı, kendi fotoğrafınızdan talking-photo mu (bir fotoğraf yeter)?
3. **Kayıt ortamı:** lokal `127.0.0.1:3017` + demo Supabase mi, yoksa demo VPS mi? Tester hesabı `~/Desktop/keyforcars-tester-login.txt` içinde (içeriğine bakılmadı).
4. **HeyGen ödeme:** `npx hyperframes auth login` ile hangi hesap; ses Voice Turbo mu (ücretli plan) Kokoro mu (ücretsiz)?

Cevaplar gelince ilk iş: `video/` iskeleti + Video S2 (stok hareketleri) pilotu uçtan uca, ardından S1 ve S5 (tahmini 1–2 oturum).
