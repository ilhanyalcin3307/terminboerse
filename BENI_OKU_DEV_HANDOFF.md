# TerminBoerse.at - DEV HANDOFF (Mola Sonrasi Buradan Devam)

Son guncelleme: 2026-08-08
Durum: Aktif, production canli

## 1) Proje Ozeti
- Proje: TerminBoerse.at
- Stack: Next.js 16 (App Router), TypeScript, Tailwind v4
- Paket yoneticisi: npm
- Ana kaynak veri: data/doctors.json (Wien GeoJSON)
- Ana alan: /arzt (doktor rehberi)

## 2) Canli Ortam / Deploy Bilgisi
- Production domain: https://www.terminboerse.at
- Vercel project name: terminboerse
- Vercel project id: prj_wspXcpimBVQf6kl8DGeuBc2QO46J
- Vercel org id: team_ftvVcjINKJpbanL2F2bWH0um
- GitHub repo: https://github.com/ilhanyalcin3307/terminboerse
- Aktif branch: main
- Son commit (bu not yazilirken): 0280cd5

## 3) Calistirma / Test Komutlari
- Local dev: npm run dev
- Lint: npm run lint
- Build: npm run build
- Production deploy: vercel --prod --yes

## 4) Mimari (Su Anki)
### 4.1 Ortak Header/Footer
- Tum sayfalarda tek shell kullaniliyor.
- Dosya: components/layout/SiteShell.tsx
- Root layout icinde global sarim var.
- Dosya: app/layout.tsx

### 4.2 Doktor Listeleme Performans Refactor'u
- Eskiden tum doktorlar browser'a tek seferde geliyordu.
- Simdi server-side filtreleme + pagination var.
- API: app/api/doctors/route.ts
- Client liste: components/arzt/ArztDirectory.tsx

Su anki API davranisi:
- Query paramlari: q, district, specialty, page, pageSize
- Varsayilan pageSize: 24
- Maksimum pageSize: 60
- Donen yapi: doctors + pagination + facets + stats

### 4.3 Arama/Filtre Mantigi
- Smart parse mevcut (ornek: 03. Bezirk, Orthopaedie/Ortopedi)
- Tokenized text search mevcut
- Input'a yeni metin yazinca dropdownlar Alle'ye donuyor

## 5) Onemli Dosyalar (Nerede Ne Var)
- Ana sayfa: app/page.tsx
- Landing UI: components/landing/LandingPage.tsx
- Doktor liste sayfasi: app/arzt/page.tsx
- Doktor detail: app/arzt/[id]/page.tsx
- Doktor verisi normalize/helper: lib/doctors.ts
- Doktor API (filtre/pagination): app/api/doctors/route.ts
- Lead API (mail): app/api/lead/route.ts
- Mock lead API: app/api/leads/route.ts
- Analytics helper: lib/analytics.ts

## 6) Env Degiskenleri (Bilinen)
- RESEND_API_KEY
- RESEND_FROM_EMAIL
- LEAD_FALLBACK_EMAIL
- NEXT_PUBLIC_SITE_URL

Not:
- RESEND_API_KEY yoksa app/api/lead simulated response doner (email atmaz, log atar).

## 7) Son Tamamlanan Isler
1. /arzt performans iyilestirme
   - Server-side filtering
   - Pagination
   - Daha dusuk payload + daha az DOM yükü
2. Tum sayfalarda tek header/footer
3. Landing hero sade metin + secime gore doktor sayisi
4. Filtre bug fix (default Alle, smart parse, tokenized match)
5. UI Almanca lokalizasyon duzeltmesi
   - Ekrandaki metinlerde oe/ae/ue yazimlari uygun sekilde ö/ä/ü/ß olarak guncellendi
   - Branding gorunumu TerminBoerse.at yerine Terminbörse.at olacak sekilde duzeltildi
   - URL ve teknik degisken adlari (terminboerse.at) bilincli olarak ayni birakildi
6. Homepage SEO + conversion genisletmeleri
   - Beliebte Suchen in Wien (Quick Links) bolumu eklendi
   - Termin-Alarm lead capture kutusu eklendi
   - B2B banner (Für Ärztinnen & Ärzte) eklendi
   - 4 maddelik FAQ bolumu + FAQPage JSON-LD eklendi
7. SEO title + AI discoverability guclendirme
   - Baslik guncellendi: "Arzttermin Wien: Kurzfristige Termine heute | Terminbörse.at"
   - Metadata guclendirildi: canonical, OpenGraph, Twitter, keywords, robots
   - JSON-LD eklendi: Organization + WebSite (SearchAction) + WebPage + FAQPage
8. Google Search Console HTML verification eklendi
   - app/layout.tsx icinde metadata.verification.google tanimlandi
   - Token canliya deploy edildi
9. Search Console dogrulama hatasi root-cause analizi tamamlandi
   - Domain Property yontemi icin DNS TXT zorunlu oldugu teyit edildi
   - Mevcut HTML meta tag yontemi URL-Prefix property icin dogru ve canli
10. Sitemap implementasyonu tamamlandi ve canliya alindi
   - Dosya: app/sitemap.ts
   - Icerik: statik sayfalar + dinamik /arzt/[id] URL'leri
   - Canli endpoint: https://www.terminboerse.at/sitemap.xml
11. SEO odakli doktor URL migration tamamlandi
   - Eski format: /arzt/ARZTOGD.20467685
   - Yeni format: /arzt/dr-wolfgang-knogler-hausarzt-allgemeinmedizin-10-bezirk-arztogd-20467685
   - Link uretimi: components/arzt/ArztDirectory.tsx
   - Slug helper + resolver: lib/doctors.ts
   - Doktor detail canonical metadata: app/arzt/[id]/page.tsx
   - Sitemap doktor URL'leri yeni slug formatina gecti: app/sitemap.ts
12. Doktor Community (Rating + Views + Son 3 Yorum) MVP eklendi
   - UI komponenti: components/arzt/DoctorCommunityPanel.tsx
   - API endpoint: app/api/doctor-community/[doctorId]/route.ts
   - Community helper/store: lib/doctorCommunity.ts
   - Doktor detay sayfasina entegre edildi: app/arzt/[id]/page.tsx
   - Not: Su an yorum/rating gonderimi login beklediginden pasif butonlu
   - Not: View artisi su an process-memory tabanli (MVP), kalici DB/KV baglantisi sonraki adim
13. Lead claim link SEO slug ile uyumlu hale getirildi
   - app/api/lead/route.ts icindeki claim URL yeni slug formatina guncellendi
14. Arztbereich MVP route + panel eklendi
   - Route: app/arztbereich/page.tsx
   - UI: components/arztbereich/ArztDashboard.tsx
15. Header'daki Arztbereich girisi gecici olarak inaktif yapildi
   - Dosya: components/layout/SiteShell.tsx
16. Arztbereich paneli sekmeli yapıya tasindi (Phase 1 baslandi)
   - Sekmeler: Profil / Randevu / Anfragen
   - Profil: Hakkinda, uzmanliklar, diller, sigorta modelleri, acil not + temel iletisim
   - Randevu: slot suresi, buffer, iptal siniri, yeni hasta kabul, online randevu, randevu tipleri
   - Not: Google Calendar baglantisi placeholder olarak eklendi (sonraki adimda entegrasyon)

## 8) Bekleyen / Sonraki Isler
1. Google Places API entegrasyonu (SONRA YAPILACAK)
   - Hedef: doktor puani + calisma saatleri almak
   - Onerilen model: bir kere backfill + place_id saklama + secmeli/periyodik refresh
2. Maliyet ve policy uyumlu refresh stratejisi
   - Aylik kismi guncelleme veya sadece aktif doktorlar
3. (Opsiyonel) Domain Property icin DNS TXT kaydi eklemek
   - Kayit: google-site-verification=vrWQo-G7ko2w-_8-4LOGewb4h2e7890ZeETG8HaGYzw
   - Not: Bu adim sadece Domain Property kullanilacaksa gerekli
4. Arztbereich roadmap (oncelikli)
   - Phase 1 (tamamlanan): Sekmeli temel panel + localStorage tabanli kayitlar
   - Phase 2 (siradaki): Login baglantisi + doktor bazli yetkilendirme + kayitlari API/DB'ye tasima
   - Phase 3: Randevu akisi backend + durum yonetimi + basit takvim gorunumu
   - Phase 4: Google Calendar entegrasyonu (oauth, event sync, availability sync)
   - Phase 5: Bildirimler (mail), audit log, daha gelismis analizler

## 9) Devam Ederken Dikkat
- Iliskisiz degisiklikleri geri alma (rollback) yapma.
- Deploy once lint+build calistir.
- Buyuk degisikliklerde once app/api/doctors/route.ts ve components/arzt/ArztDirectory.tsx uyumunu kontrol et.

## 10) Kaldigimiz Yer (Net)
- Sistem canli ve stabil.
- Sitemap canli ve Search Console'a gonderime hazir durumda.
- Doktor detay URL'leri SEO slug standardina tasindi ve canli.
- Search Console icin URL-Prefix verification teknik olarak hazir; Domain Property icin DNS TXT gerekir.
- Sonraki ana odak Arztbereich Phase 2 (login + persistent storage) ve sonrasinda Google Calendar hazirligi.

## 11) Mola Sonrasi Hizli Baslangic Checklist
1. git pull
2. npm install (gerekirse)
3. npm run lint
4. npm run build
5. BENI_OKU_DEV_HANDOFF.md dosyasini oku
6. Search Console'da sitemap durumunu kontrol et (islenme/hatali URL var mi)
7. Domain Property kullanilacaksa DNS TXT durumunu dogrula
8. Google Places entegrasyon task'ina gec

## 12) Son Session Delta (2026-08-07)
- Commit: 8670ddf -> Google Search Console verification meta eklendi (app/layout.tsx)
- Commit: 4cd5d09 -> app/sitemap.ts eklendi, sitemap.xml canliya alindi
- Production alias dogrulandi: https://www.terminboerse.at

## 13) Son Session Delta (2026-08-08)
- Commit: ad9c19d -> doktor detay URL'leri SEO slug formatina gecirildi
- Canli sitemap dogrulamasi: doktor URL'leri artik slug tabanli listeleniyor

## 14) Son Session Delta (2026-08-08)
- Commit: 80a5dd2 -> doktor detay sayfasina community panel eklendi (rating/views/son 3 yorum)
- Yeni API: /api/doctor-community/[doctorId]
- Community write aksiyonlari login sonrasi aktive edilecek sekilde pasif birakildi

## 15) Son Session Delta (2026-08-08)
- Commit: 8807d12 -> Arztbereich MVP route + panel eklendi
- Commit: 8bdefe4 -> /arztbereich rotasi /artztbereich olarak degisti
- Commit: 14cac9b -> Header Arztbereich butonu gecici olarak inaktif yapildi

## 16) Son Session Delta (2026-08-08)
- Commit: 0280cd5 -> Arztbereich tabli Phase-1 uygulandi (Profil/Randevu/Anfragen)
