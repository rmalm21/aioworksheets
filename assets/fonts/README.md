# Paket Emoji Windows 11

Seluruh emoji di aplikasi ini dipetakan ke keluarga font **`"Windows 11 Emoji"`**
yang didefinisikan di `style.css`. Keluarga tersebut dibatasi dengan
`unicode-range` ke blok emoji saja, sehingga huruf, angka, dan ikon geometris
(`▼ ▶ → ● ◇`) tetap memakai font antarmuka dan tampilannya tidak berubah.

## Windows — sudah otomatis

Sumber pertama pada `@font-face` adalah `local("Segoe UI Emoji")`. Di Windows 10
dan Windows 11 font tersebut sudah terpasang, jadi emoji langsung memakai desain
Fluent bawaan Windows 11 tanpa unduhan apa pun.

## Perangkat non-Windows (macOS, Android, iOS, Linux)

Perangkat ini tidak memiliki Segoe UI Emoji, dan font tersebut milik Microsoft
sehingga **tidak boleh didistribusikan ulang lewat CDN publik**. Tanpa langkah di
bawah, perangkat tersebut memakai emoji bawaannya sendiri (Apple Color Emoji /
Noto Color Emoji) — aplikasi tetap berjalan normal dan tidak ada permintaan
jaringan yang gagal.

Agar seluruh perangkat memakai emoji Windows 11:

1. Salin `seguiemj.ttf` dari `C:\Windows\Fonts` pada komputer Windows berlisensi.
2. Ubah menjadi WOFF2 (opsional, tetapi jauh lebih ringan), lalu simpan di
   direktori ini sebagai `seguiemj.woff2`.
3. Daftarkan berkasnya sebelum `core.js` dimuat, di `index.html`:

   ```html
   <script>window.WORKSHEET_EMOJI_FONT_URL = 'assets/fonts/seguiemj.woff2';</script>
   ```

`loadWindowsEmojiWebfont()` di `core.js` akan memuat berkas tersebut dengan
`FontFace`, menambahkannya ke `document.fonts`, lalu menyegarkan font Chart.js.
Bila `window.WORKSHEET_EMOJI_FONT_URL` tidak diisi, fungsi tersebut langsung
berhenti sehingga tidak ada permintaan jaringan sama sekali.

> Pastikan organisasi Anda memiliki hak pakai font Segoe UI Emoji sebelum
> mendistribusikannya ke perangkat non-Windows.
