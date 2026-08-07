# TerminBoerse.at - DEV HANDOFF (Mola Sonrasi Buradan Devam)

Son guncelleme: 2026-08-07
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
- Son commit (bu not yazilirken): c72f891

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

## 8) Bekleyen / Sonraki Isler
1. Google Places API entegrasyonu (SONRA YAPILACAK)
   - Hedef: doktor puani + calisma saatleri almak
   - Onerilen model: bir kere backfill + place_id saklama + secmeli/periyodik refresh
2. Maliyet ve policy uyumlu refresh stratejisi
   - Aylik kismi guncelleme veya sadece aktif doktorlar

## 9) Devam Ederken Dikkat
- Iliskisiz degisiklikleri geri alma (rollback) yapma.
- Deploy once lint+build calistir.
- Buyuk degisikliklerde once app/api/doctors/route.ts ve components/arzt/ArztDirectory.tsx uyumunu kontrol et.

## 10) Kaldigimiz Yer (Net)
- Sistem canli ve stabil.
- Ana odak sonraki adim: Google Places API icin teknik implementasyon plani ve sonra kodlama.
- Bugun yapilmadi; bilerek ertelendi.

## 11) Mola Sonrasi Hizli Baslangic Checklist
1. git pull
2. npm install (gerekirse)
3. npm run lint
4. npm run build
5. BENI_OKU_DEV_HANDOFF.md dosyasini oku
6. Google Places entegrasyon task'ina gec
