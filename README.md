# LP galipat story v.03

Proyek baru yang terpisah dari website lama, dengan tampilan baru dan admin katalog. Node.js 22 atau lebih baru, HTML/CSS/JavaScript, tanpa dependensi tambahan. Tidak perlu Astro atau proses build.

## Menjalankan

1. Buka Terminal di folder proyek.
2. Jalankan `npm start`.
3. Website: http://127.0.0.1:4303/
4. Admin: http://127.0.0.1:4303/admin
5. Login awal: nama pengguna `admin`; password acak ada di file `AKSES-ADMIN.txt` yang dibuat saat server pertama kali dijalankan. File ini tidak dilayani melalui website.
6. Ganti password melalui menu admin. Setelah diganti, file password awal dihapus.

## Mengelola tema

Klik Tambah tema, isi kode/nama, kategori (bisa kategori baru), harga tanpa/dengan foto, tautan contoh, gambar, dan catatan. Gambar bisa diunggah (PNG/JPG/WebP maksimal 3 MB) atau pakai URL HTTPS. Simpan: tema langsung tersedia saat katalog dimuat ulang. Gunakan Edit untuk memperbarui atau hilangkan centang Tampilkan untuk menyembunyikan. Prioritaskan membuat tema naik pada urutan Pilihan kami. Tidak perlu mengedit kode untuk menambah tema.

Data tersimpan di `data/themes.json`, gambar baru di `public/uploads/`. Cadangkan kedua lokasi ini. Penyimpanan adalah berkas di server, bukan browser; perubahan tersedia untuk semua pengunjung. Satu proses Node memiliki antrean penulisan dan menyimpan perubahan dengan penggantian file atomik. Jangan menjalankan beberapa proses server sekaligus terhadap berkas data yang sama.

## Hosting nanti

Belum dipublikasikan. Memerlukan hosting yang mendukung proses Node.js dan penyimpanan persisten; mengunggah HTML saja ke hosting statis tidak cukup untuk admin. Jalankan dengan `HOST=0.0.0.0 PORT=4303 COOKIE_SECURE=true npm start` di belakang reverse proxy HTTPS. Pertahankan header Host dan Origin yang sesuai, arahkan trafik domain ke proses ini, dan simpan folder data/uploads pada disk persisten. Gunakan satu instance. Cookie Secure perlu HTTPS; setelan lokal menggunakan HTTP loopback. Login berakhir setelah 8 jam atau restart server.

## Pixel dan pemesanan

Meta Pixel ID **724279088725440**, event PageView dan WhatsAppClick tetap dipakai di halaman publik. WhatsAppClick berisi lokasi tombol dan kode tema; bukan Purchase/Lead atau bukti chat masuk. Halaman admin tidak memuat Pixel. Nomor WhatsApp **6281803300354** dipertahankan. Pemesanan dilanjutkan lewat WhatsApp, bukan pembayaran online otomatis.

## Sumber dan batas verifikasi

768 tema dengan gambar tersedia dimigrasi dari data proyek lama. Tautan dan harga mengikuti sumber proyek; layanan demo eksternal belum diuji satu per satu. Syukuran memakai tautan khusus dari data aslinya. Testimoni dari data asli proyek; tidak menambah rating atau identitas baru. Tidak ada countdown harian atau angka penjualan tanpa bukti.

Sebelum publikasi, konfirmasikan harga terbaru, variasi foto untuk Beragam Acara/Syukuran, cakupan barcode, kuota ganti tema gratis vs add-on, masa aktif, sumber testimoni, dan jam operasional WIB. Hero menampilkan harga Eksklusif spesifik, bukan harga universal. Detail ini masih mengikuti data lama. Catatan tema dapat diubah melalui admin; teks umum hero/FAQ masih berada di index.html.

## Pemeriksaan

`npm run check` memeriksa sintaks. `npm test` menguji login salah/benar, pembatasan API admin, penolakan asal lintas situs, tambah/edit/sembunyikan, URL tidak valid, unggahan, persistensi setelah restart, dan penggantian password pada salinan sementara (tidak memodifikasi katalog asli).

Browser: tampilan diperiksa pada 360, 390, 768 dan 1440 piksel tanpa scroll horizontal; filter Premium dan pencarian PR#01 bekerja, login admin berhasil. Tidak mengirim chat WhatsApp atau menerbitkan website.

## Popup contoh undangan

Klik gambar atau Lihat contoh untuk membuka popup. Tema yang memiliki dua link menawarkan pilihan Tanpa Foto / Dengan Foto beserta harga. Contoh dimuat dalam iframe dengan proporsi layar HP 390:844 yang menyesuaikan ruang jendela, sehingga tampil sebagai HP meski dibuka dari desktop. Ganti pilihan untuk berpindah versi. Tombol tutup/Escape menghapus iframe agar audio/aktivitas contoh berhenti. Tema dengan satu contoh tidak diberi versi foto buatan.

Admin memiliki field Link contoh utama / tanpa foto dan Link contoh dengan foto (opsional). Data `demoPhoto` dimigrasikan untuk tautan asli yang memiliki pola tanpa-/dengan-foto pada sumber proyek. Situs contoh eksternal harus mengizinkan embedding iframe; beberapa tema lain mungkin memerlukan perubahan pengaturan di server contoh. TE#01 dengan foto telah diuji berhasil dimuat; tanpa foto telah diperiksa alamatnya. Pixel halaman utama tidak diubah.

### Perbaikan tombol pembuka dan proporsi HP

Preview sekarang memakai rasio layar 390:844 yang disesuaikan dengan ruang jendela, tanpa transform scale pada iframe. Lebar/tinggi aktual mengecil bersama pada layar kecil; tidak memakai bingkai persegi.

Contoh di by.galipatstory.id dimuat melalui endpoint lokal terbatas `/invitation-preview` berdasarkan ID tema aktif. Adapter klik memperbaiki tombol pembuka mobile dengan ID duplikat, membuka konten, mengaktifkan scroll, dan memulai media. HTML eksternal tetap dalam sandbox opaque tanpa izin same-origin, sehingga tidak mendapat akses sesi admin. Fitur kirim ucapan/RSVP bukan bagian pengujian dan mungkin tidak aktif pada preview terisolasi. Sumber undangan asli tidak diubah. Host contoh lain tetap menggunakan embed langsung.

Pengujian browser TE#03: versi dengan foto dan tanpa foto berhasil membuka isi; overflow berubah dari hidden ke auto, kolom konten menjadi block, scroll berpindah dari cover. Layar HP 390px tidak memiliki scroll horizontal. Syntax dan tiga pengujian backend/preview lolos. Localhost dipertahankan berjalan sesuai permintaan.

### Ikon dan tombol asli undangan

Font Awesome dan Elementor Icons dibundel lokal di public/vendor/fonts dan disematkan dalam dokumen preview agar ikon tidak gagal dimuat akibat akses lintas domain.

Hanya tombol **Buka Undangan bawaan tema** yang tampil. Tidak ada tombol overlay, tombol pembuka tambahan, atau perintah postMessage pembuka dari popup. `public/preview-opener.js` menangani klik/sentuhan pada tombol asli (termasuk ID btnOpens dan tombolbuka), menyembunyikan sampul yang sesuai, dan mempertahankan scroll tetap aktif meski skrip template terlambat dimuat. Desain tombol aslinya dipertahankan. Posisi iframe dibulatkan ke piksel utuh.

Verifikasi browser terbaru: TE#03 dan TE#04, masing-masing tanpa foto dan dengan foto, berhasil dibuka lewat tombol bawaan pada ukuran HP 390 × 844. TE#04 dengan foto juga berhasil pada desktop 1440 × 1000. Sebelum dibuka terdapat satu tombol native yang terlihat dan tidak ada tombol overlay; setelah klik sampul disembunyikan dan konten terbuka. Seluruh katalog belum diuji satu per satu.

### Penanganan sentuhan dan overlay

Preview memakai overlay berperan dialog dengan dukungan Escape, fokus keyboard, dan tombol tutup. Tombol asli undangan diberi handler klik/sentuhan langsung, serta pointer tap dibedakan dari gerakan scroll. Tidak ada tombol tambahan. Skrip pembuka template yang bentrok dan snippet Cloudflare khusus asal sumber tidak dijalankan di snapshot lokal; observer normalisasi teks menunggu DOM siap. Sandbox iframe tetap terisolasi tanpa izin same-origin.

Tujuh pengujian backend/preview/input lolos, termasuk touchend dari text node dan pointer tap vs scroll. Pengujian klik internal TE#04 tanpa foto berhasil pada ukuran 440 × 956. Pengujian Chrome dengan emulasi iPhone milik pengguna belum terkonfirmasi melalui kontrol native; menunggu hasil pengujian ulang pengguna. Pesan CORS dari fitur ucapan/RSVP eksternal bisa tetap muncul dan belum berarti fitur tersebut berfungsi pada snapshot preview. Pixel utama tetap ID 724279088725440; ekstensi pemblokir di browser dapat menolak pemuatan skrip Pixel tanpa mengubah konfigurasi situs.
