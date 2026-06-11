# GLS Kargo Takip PWA

## Kurulum
npm install
cp .env.example .env
npm run dev

## Supabase
1. Supabase projesi aç.
2. `supabase/schema.sql` dosyasını SQL Editor'da çalıştır.
3. Authentication > Users kısmından Admin, Esinti Ug, Meet Kiosk kullanıcılarını oluştur.
4. `profiles` tablosuna kullanıcı ID'lerini role ve warehouse_id ile ekle.

## Not
Bu ilk çalışan sürümdür. Admin şifre değiştirme ve yeni kullanıcı oluşturma için Supabase Edge Function eklenmelidir.
