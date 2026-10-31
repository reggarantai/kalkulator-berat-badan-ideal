// Author: Regga @reggarantai
// https://reggarantai.com

(function () {
  'use strict';

  const form = document.getElementById('form');
  const hasil = document.getElementById('hasil');
  let terakhir = '';
  let jeda;

  // Saat mengetik, tunggu sebentar supaya hasil tidak berkedip
  // dan pembaca layar tidak membacakan setiap angka
  form.addEventListener('input', () => {
    clearTimeout(jeda);
    jeda = setTimeout(() => perbarui(false), 250);
  });

  // Saat kolom selesai diisi atau pilihan diganti, langsung hitung
  form.addEventListener('change', () => {
    clearTimeout(jeda);
    perbarui(true);
  });

  // Tanpa ini, menekan Enter di kolom angka akan me-reload halaman
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearTimeout(jeda);
    perbarui(true);
  });

  // Nilai form bisa dipulihkan browser setelah reload
  perbarui(false);

  // tegas = tampilkan pesan kesalahan walau user mungkin masih mengetik
  function perbarui(tegas) {
    const html = susunHasil(bacaForm(), tegas);
    if (html === terakhir) return;
    terakhir = html;
    hasil.innerHTML = html;
  }

  function bacaForm() {
    const el = form.elements;
    return {
      pria: el.gender.value === 'pria',
      umur: el.umur.valueAsNumber,
      tinggi: el.tinggi.valueAsNumber,
      rumus: el.formula.value,
      standar: el.standar.value,
    };
  }

  function susunHasil({ pria, umur, tinggi, rumus, standar }, tegas) {
    const { min, maks } = Rumus.BATAS_TINGGI;

    // Biarkan kosong selama tinggi belum selesai diketik
    if (Number.isNaN(tinggi) || (!tegas && tinggi < min)) return '';
    if (!Rumus.tinggiValid(tinggi)) {
      return pesan(`Masukkan tinggi badan antara ${min} dan ${maks} cm.`);
    }

    if (Number.isNaN(umur)) return pesan('Isi umur kamu dulu untuk melihat hasilnya.');
    const kelompok = Rumus.kelompokUmur(umur);
    if (!kelompok) {
      return pesan(`Masukkan umur antara ${Rumus.BATAS_UMUR.min} dan ${Rumus.BATAS_UMUR.maks} tahun.`);
    }
    if (kelompok === 'anak') {
      return pesan(
        'Rumus berat badan ideal ini hanya untuk dewasa (18 tahun ke atas). Status gizi anak dan remaja ' +
          'dinilai dengan standar antropometri anak (Permenkes No. 2 Tahun 2020). Cek di posyandu, ' +
          'puskesmas, atau dokter anak.'
      );
    }

    const kartu = [];
    if (kelompok === 'lansia') {
      kartu.push(
        pesan(
          'Untuk usia di atas 65 tahun, IMT optimal sedikit lebih tinggi daripada usia muda ' +
            '(KMK No. HK.01.07/MENKES/509/2025). Diskusikan target beratmu dengan dokter.'
        )
      );
    }

    if (rumus === 'imt') {
      kartu.push(kartuIMT(tinggi, standar));
    } else if (rumus === 'semua') {
      kartu.push(kartuIMT(tinggi, standar));
      const semua = Rumus.RUMUS.map((r) => Rumus.hitung(r.id, tinggi, pria, standar));
      semua.filter((h) => h.berlaku).forEach((h) => kartu.push(kartuRumus(h, standar)));
      // Rumus yang tidak berlaku cukup disebut sekali, tidak perlu satu kartu per rumus
      const tidakBerlaku = semua.filter((h) => !h.berlaku);
      if (tidakBerlaku.length) kartu.push(kartuTidakBerlaku(tidakBerlaku));
    } else {
      const h = Rumus.hitung(rumus, tinggi, pria, standar);
      kartu.push(kartuRumus(h, standar));
      // Kalau rumusnya tidak cocok, tunjukkan acuan yang dianjurkan
      if (!h.berlaku || !h.normal) kartu.push(kartuIMT(tinggi, standar));
    }
    return kartu.join('');
  }

  function pesan(teks) {
    return `<div class="hasil-kartu hasil-kartu--info"><p>${teks}</p></div>`;
  }

  function rentangNormal(standar) {
    const [min, maks] = Rumus.STANDAR[standar].normal;
    return `${Rumus.angkaIMT(min)}–${Rumus.angkaIMT(maks)}`;
  }

  function kartuIMT(tinggi, standar) {
    const { min, maks } = Rumus.rentangIMT(tinggi, standar);
    return `
      <div class="hasil-kartu hasil-kartu--utama">
        <h2>Rentang IMT normal · ${Rumus.STANDAR[standar].nama}</h2>
        <p class="hasil-utama">Berat idealmu antara <strong>${Rumus.kg(min, 'atas')}</strong>
          dan <strong>${Rumus.kg(maks, 'bawah')} kg</strong></p>
        <p>Setara IMT ${rentangNormal(standar)}.</p>
      </div>`;
  }

  function kartuRumus(h, standar) {
    const judul = `<h2>Rumus ${h.rumus.nama}${h.rumus.tahun ? ` (${h.rumus.tahun})` : ''}</h2>`;

    if (!h.berlaku) {
      return `
        <div class="hasil-kartu hasil-kartu--nonaktif">
          ${judul}
          <p>Rumus ini hanya berlaku untuk tinggi ${Rumus.angka(h.rumus.minTinggi)} cm (5 kaki) ke atas,
            jadi tidak dipakai untuk tinggimu. Pakai rentang IMT sebagai acuan.</p>
        </div>`;
    }

    const catatan = h.normal
      ? `<p>Setara IMT ${Rumus.angkaIMT(h.imt)}.</p>`
      : `<p>Setara IMT ${Rumus.angkaIMT(h.imt)}, di luar rentang normal ${Rumus.STANDAR[standar].nama}
          (${rentangNormal(standar)}). Rumus ini kurang cocok untuk tinggimu; pakai rentang IMT sebagai acuan.</p>`;

    const rangka = h.rangka
      ? `<p>Angka ini untuk rangka tubuh sedang. Rangka kecil: <strong>${Rumus.kg(h.rangka.kecil)} kg</strong>,
          rangka besar: <strong>${Rumus.kg(h.rangka.besar)} kg</strong>.</p>`
      : '';

    return `
      <div class="hasil-kartu hasil-kartu--${h.normal ? 'utama' : 'peringatan'}">
        ${judul}
        <p class="hasil-utama">Berat idealmu <strong>${Rumus.kg(h.berat)} kg</strong></p>
        ${catatan}
        ${rangka}
      </div>`;
  }

  // Semua rumus berbasis inci punya batas tinggi yang sama (5 kaki)
  function kartuTidakBerlaku(daftar) {
    const nama = daftar.map((h) => h.rumus.nama);
    const gabungan = nama.length > 1 ? `${nama.slice(0, -1).join(', ')}, dan ${nama[nama.length - 1]}` : nama[0];
    return `
      <div class="hasil-kartu hasil-kartu--nonaktif">
        <h2>Tidak dipakai untuk tinggimu</h2>
        <p>Rumus ${gabungan} hanya berlaku untuk tinggi ${Rumus.angka(daftar[0].rumus.minTinggi)} cm (5 kaki) ke atas.</p>
      </div>`;
  }
})();
