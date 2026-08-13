# TerminBoerse.at - DEV HANDOFF (Mola Sonrasi Buradan Devam)

Son guncelleme: 2026-08-11
Durum: Aktif, production canli (latest legal+seo+landing updates deploy edildi)

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

## 17) Son Session Delta (2026-08-09)
- Arztbereich gecici olarak devre disi tutuldu (navbar inaktif + /arztbereich bilgilendirme sayfasi)
- Supabase migration hazirligi baslatildi:
   - Supabase dependency eklendi: @supabase/supabase-js
   - Server admin client helper eklendi: lib/supabaseAdmin.ts
   - SQL schema eklendi: supabase/migrations/20260809_arztbereich_init.sql
   - Step2 SQL eklendi: supabase/migrations/20260809_arztbereich_step2.sql
   - Env template eklendi: .env.supabase.example
   - Uygulama adimlari dokumani eklendi: SUPABASE_NEXT_STEPS.md

## 18) Son Session Delta (2026-08-10) - Arztbereich Kalender / Terminboard Krizi
- Problem (kullanici bildirimi):
   - Google baglantisi yapildiktan sonra dashboard geri donuyor ancak `Termine > Terminboard` hala `deaktiviert` kaliyor.
   - Bazi akislarda sistem tekrar takvim mail/ID girmeyi istiyor gibi davraniyor.

- Bu session'da yapilan teknik degisiklikler:
   - OAuth callback doctor context iyilestirmesi:
      - Redirect su an `doctorId` query ile donuyor.
      - Dosya: app/api/arztbereich/google-calendar/callback/route.ts
   - Dashboard doctor restore:
      - Query'den gelen `doctorId` secime uygulanip URL temizleniyor.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - Scheduling status hesaplama iyilestirmesi:
      - `not_onboarded` branch'inde de mevcut sakli alanlar (calendarConnected/calendarId/schedulingEnabled) korunuyor.
      - Dosya: lib/doctorSchedulingStatus.ts
   - 5 dk otomatik slot refresh:
      - Kullanici sayfada kaldigi surece Termine tabinda 5 dk'da bir slot reload.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - Secili doktor persistence (reload sonrasi kaybolmamasi icin):
      - localStorage uzerinden selected doctor geri yukleniyor.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx

## 19) Son Session Delta (2026-08-10) - Manual Slot MVP (Google Sync Deaktiv)
- Google Calendar entegrasyonu silinmedi; panelde ayri sekme olarak pasif/"deaktiv" tutuldu.
- Termine paneli, doktorun manuel "bos slot" (tarih+saat+dakika) girmesi modeline cekildi.
- 3 gun kurali eklendi: sadece sonraki 72 saat icindeki slotlar kaydedilebilir.
- Yeni API: app/api/arztbereich/manual-slots/route.ts
   - GET: token+doctorId ile doktorun slotlarini listeler
   - POST: yeni manuel slot olusturur
   - DELETE: slot siler
- Yeni store/service: lib/manualDoctorSlots.ts
   - Supabase table `arzt_manual_slots` uzerinden kalici kayit
   - Slot cakisma kontrolu + 3 gun validasyonu
- Yeni migration: supabase/migrations/20260810_manual_slots.sql
- Public slot feed manual sisteme baglandi:
   - lib/googleCalendarAvailability.ts artik manuel slot listesini donuyor
   - app/api/doctors/[id]/slots route bu feed'i kullanmaya devam ediyor
- Booking gate guncellendi:
   - lib/doctorSchedulingStatus.ts icinde online booking artik calendar baglantisina degil `profileUpdated + schedulingEnabled` durumuna bagli
- Hasta tarafi gorunurluk:
   - Doktor detayinda slotlar manuel kayitlardan geliyor (app/arzt/[id]/page.tsx)
   - Arama kartlarindaki "Nächster Slot" alani manuel slotlardan besleniyor (app/api/doctors/route.ts)

## 20) Son Session Delta (2026-08-10) - Slot Booking + 3-Gun Filter
- Hasta tarafinda slot-secimli randevu talebi eklendi:
   - Modal icinde opsiyonel serbest slot secimi (components/arzt/AppointmentRequestModal.tsx)
   - Secili slot varsa once atomik rezervasyon yapiliyor, sonra lead mail gonderiliyor
- Public slot API'ye booking endpoint eklendi:
   - POST /api/doctors/[id]/slots -> slotId ile `free -> booked`
   - Dosya: app/api/doctors/[id]/slots/route.ts
- Slot rezervasyon atomigi store katmanina eklendi:
   - reserveManualDoctorSlot() (Supabase + memory fallback)
   - Dosya: lib/manualDoctorSlots.ts
- Lead email icerigine secilen slot saat araligi eklendi:
   - Dosya: app/api/lead/route.ts
- Arzt panelinde Termine board icin hizli gun filtresi eklendi:
   - Alle / Heute / Morgen / Übermorgen
   - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - KV yoksa Supabase fallback persistence:
      - Scheduling store + Google connection store'a Supabase fallback eklendi.
      - Dosyalar: lib/arztbereichSchedulingStore.ts, lib/googleCalendarConnectionStore.ts

## 21) Son Session Delta (2026-08-11) - Profil/Community Cleanup + 3-Gun Slot Vitrini + Deploy
- Kullanici istek listesine gore profile/community cleanup tamamlandi:
   - Uydurma rating/yorum gorunumleri kaldirildi (card + profil odakli sade gosterim).
   - Doktor detailde `Aktuell ausgebucht` metni kaldirildi.
   - Doktor email varsa detail sayfasina direkt `mailto:` tabanli `Direkt fragen` CTA eklendi.
- Arztbereich profile UX sadeleştirildi:
   - Ust durum stripi kaldirildi.
   - Doktor rolunde `Termine` tab'i kaldirildi.
   - Profilübersicht altina bugun/yarin/obur gun icin hizli slot ekleme alani eklendi.
- 3 gun slotlarin public gorunurlugu tamamlandi:
   - Yeni feed API: app/api/doctors/upcoming-slots/route.ts
   - Store helper genisletmesi: lib/manualDoctorSlots.ts (`getUpcomingManualSlotsByDoctorIds`)
   - Landing section eklendi: components/landing/LandingPage.tsx
      - Baslik: `Freie Termine in den nächsten 3 Tagen`
      - Doktor bazli 3 slot chip'i + profil linki
- Build dogrulama:
   - `npm run build` basarili (Next.js 16.3.0, tum route'lar derlendi).
- Production deploy:
   - Deployment: https://terminboerse-2n2mrncfa-ilhanyalcin3307s-projects.vercel.app
   - Alias: https://www.terminboerse.at

## 22) Kalan Onerilen Minik Kontrol Listesi
1. Canlida `/` ana sayfada `Freie Termine in den nächsten 3 Tagen` bolumunu dogrula.
2. Canlida `/arzt/[slug]` detailde `Direkt fragen` butonunu (email olan doktorda) dogrula.
3. Arztbereich profilde yeni 3-gun slot panelinden slot ekle/sil akisini smoke-test et.

## 23) Son Session Delta (2026-08-11) - SEO + AI Discovery + Sitemap Refresh
- Global metadata (title/description/keywords/OG/Twitter) guncellendi:
   - Dosya: app/layout.tsx
   - Odak: Arzttermine Wien + 3-gun slotlar + Apotheke arama + Arztbereich
- Homepage schema/FAQ metinleri guncellendi:
   - Dosya: app/page.tsx
   - Eski Termin-Alarm ifadesi kaldirildi, Apotheke arama uyumu eklendi
- Footer SEO/discovery linkleri genisletildi:
   - Dosya: components/layout/SiteShell.tsx
   - Yeni linkler: Arzttermine Wien, Apotheken Wien (anchor), Arztbereich
- Homepage Apotheke bolumune anchor eklendi:
   - Dosya: components/landing/LandingPage.tsx
   - Anchor: `#apotheken-wien`
- AI/crawler discovery dosyalari eklendi:
   - robots.txt route: app/robots.ts
   - llms.txt route: app/llms.txt/route.ts
- Sitemap kapsamı guncellendi:
   - Dosya: app/sitemap.ts
   - Eklendi: /arztbereich, /login, /profil
- Production deploy:
   - Deployment: https://terminboerse-cnc0i907m-ilhanyalcin3307s-projects.vercel.app
   - Alias: https://www.terminboerse.at

## 24) Son Session Delta (2026-08-11) - Landing, Auth UI ve Yasal Sayfalar Finalizasyonu
- Landing ana sayfa UX/content guncellemeleri:
   - `Freie Termine in den nächsten 3 Tagen` bolumu eski Storno-Ticker konumuna alindi ve ayni yesil kart diline cekildi.
   - `Kein passender Termin frei?`/Termin-Alarm bolumu kaldirildi; yerine OGD tabanli Apotheke arama bolumu eklendi.
   - Yeni data kaynagi: `data/APOTHEKEOGD.json` (name/adres arama + bezirk filtresi + Anrufen/Route/Website aksiyonlari).
   - `Profil kostenlos beanspruchen` CTA linki `/arztbereich` olarak degistirildi.
- Login/Arztbereich giris UI sadeleştirme:
   - User login sayfasinda Google ile devam butonlari kaldirildi.
   - Arztbereich login/register ekranindaki `Mit Google` ve `Registrierung mit Google` butonlari kaldirildi.
   - Header'daki Login butonu tekrar aktif hale getirildi (guest -> `/login`).
- SEO/AI discovery son durum:
   - Metadata + schema mevcut urun kapsamina göre guncellendi.
   - `robots.txt` ve `llms.txt` endpointleri canli.
   - Sitemap `/arztbereich`, `/login`, `/profil` ile guncel.
- Impressum ve Datenschutz tamamen revize edildi:
   - Gercek iletisim bilgileri eklendi:
      - Ilhan Yalcin
      - Kiningergasse, 1120 Wien
      - kontakt@terminboerse.at
      - 004369919050017
   - Non-commercial/public-benefit pozisyonlama aciklandi.
   - data.gv.at / OGD veri kaynagi, sorumluluk sinirlari ve DSGVO haklari netlestirildi.
   - Acil durumda 144 notu eklendi.
- Son production deploy (en guncel):
   - https://terminboerse-bdfhpwnv3-ilhanyalcin3307s-projects.vercel.app
   - Alias: https://www.terminboerse.at

## 25) Devam Icin Net Baslangic Noktasi
1. Search Console'da sitemap yeniden gonderildi mi kontrol et (`/sitemap.xml`).
2. Homepage Apotheke arama bolumunde performans/artirma gereksinimi var mi degerlendir (gerekirse API route'a tasima).
3. Hukuki metinler avukat review'e gidecekse son metin freeze etmeden once adres/isim yazimini tekrar teyit et.
      - Migration: supabase/migrations/20260810_calendar_persistence.sql
   - Env/secret robustness:
      - Supabase/KV env degerleri trimleniyor.
      - Token crypto decrypt tarafi eski/yeni secret formatlari ile geriye donuk calisacak sekilde sertlestirildi.
      - Dosyalar: lib/supabaseAdmin.ts, lib/secureTokenCrypto.ts, ilgili store dosyalari
   - Missing refresh token toleransi:
      - OAuth callback refresh token gelmezse baglanti tamamen dusurulmuyor.
      - Connection store sentinel yaklasimi ile DB uyumlulugu saglandi.
      - Dosyalar: app/api/arztbereich/google-calendar/callback/route.ts, lib/googleCalendarConnectionStore.ts, lib/googleCalendarAvailability.ts, lib/googleCalendarEvents.ts
   - Kalender input UX iyilestirmesi:
      - Termine Einstellungen'da email/kalender-id tekrar tekrar zorunlu yazdirma azaltildi (doctor bazli local persistence + fallback prefill).
      - Dosya: components/arztbereich/ArztDashboardLite.tsx
   - Terminboard gate auto-heal denemesi:
      - `calendarConnected` varsa board'u acmaya yardimci mantik + `schedulingEnabled` auto-heal effect eklendi.
      - Dosya: components/arztbereich/ArztDashboardLite.tsx

- Runtime dogrulama notlari (onemli):
   - Production env'lerde kritik bos degerler vardi; session icinde panodan tekrar girilerek dolduruldu:
      - NEXT_PUBLIC_SUPABASE_URL
      - NEXT_PUBLIC_SUPABASE_ANON_KEY
      - SUPABASE_SERVICE_ROLE_KEY
      - GOOGLE_OAUTH_CLIENT_SECRET
   - Son kontrol: bu 4 deger non-empty ve newline'siz gorundu.
   - Supabase tablo varlik kontrolu:
      - arzt_accounts: OK
      - arzt_account_doctors: OK
      - arzt_scheduling_status: OK (count 0)
      - arzt_google_calendar_connections: OK (count 0)

- Mevcut durum (session kapanis anindaki gercek):
   - Kullaniciya gore Terminboard hala deaktiviert gorunuyor.
   - Yani issue production'da hala tam kapanmamis; bir sonraki adimda live diagnostics zorunlu.

- Sonraki oturumda ilk yapilacaklar (sira ile):
1. `components/arztbereich/ArztDashboardLite.tsx` icine gecici ama net bir debug panel ekle (yalnizca admin/doctor panelde gorunsun):
    - selectedDoctorId
    - schedulingStatus.doctorId
    - schedulingStatus.calendarConnected
    - schedulingStatus.schedulingEnabled
    - schedulingStatus.reason
    - calendarHealth.googleEmail / accessTokenState
2. `/api/arztbereich/scheduling-status` response'una debug alanlari ekle:
    - storagePath: `kv|supabase|memory`
    - foundSchedulingEntry: boolean
    - foundGoogleConnection: boolean
    - resolvedDoctorId
3. Connect callback sonrasinda ayni doctorId icin write-read smoke log ekle:
    - upsert sonra immediate read back ve fark varsa explicit error log.
4. Gating'i nihai olarak tek kaynaga bagla:
    - `isTermineEnabled` icin final karar mantigi netlestir (server status + fallback) ve UI/checkbox tutarliligini sabitle.

- Not:
   - Kullanici ara verdi; geri donuste ilk hedef sadece bu bug'i kapatmak.
   - Yeni ozellik yok, sadece runtime truth ile sorunu bitirme odagi.
