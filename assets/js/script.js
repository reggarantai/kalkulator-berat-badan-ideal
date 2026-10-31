// Author: Regga @reggarantai
// https://hiravta.co.id

(function () {
  'use strict';

  const form = document.getElementById('form');
  const hasil = document.getElementById('hasil');
  const pengaturan = document.getElementById('pengaturan');
  const bagikan = document.getElementById('bagikan');
  const tautanWA = document.getElementById('bagikan-wa');
  const statusSalin = document.getElementById('status-salin');
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

  document.getElementById('salin-tautan').addEventListener('click', salinTautan);

  // Isi form dari link hasil kalau ada; kalau tidak, pakai nilai yang dipulihkan browser
  perbarui(isiDariTautan());

  // Simpan halaman supaya kalkulator tetap bisa dibuka tanpa internet
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js');
  }

  // tegas = tampilkan pesan kesalahan walau user mungkin masih mengetik
  function perbarui(tegas) {
    const data = bacaForm();
    perbaruiBagikan(data);
    const html = susunHasil(data, tegas);
    if (html === terakhir) return;
    terakhir = html;
    hasil.innerHTML = html;
    statusSalin.textContent = '';
  }

  function bacaForm() {
    const el = form.elements;
    return {
      pria: el.gender.value === 'pria',
      umur: el.umur.valueAsNumber,
      tinggi: el.tinggi.valueAsNumber,
      berat: el.berat.valueAsNumber,
      pinggang: el.pinggang.valueAsNumber,
      aktivitas: el.aktivitas.value,
      namaAktivitas: el.aktivitas.selectedOptions[0].text,
      rumus: el.formula.value,
      standar: el.standar.value,
    };
  }

  // Link hasil memuat data di fragmen (#jk=p&umur=28...). Mengembalikan true kalau ada datanya.
  function isiDariTautan() {
    const data = Rumus.dariTautan(location.hash);
    if (!Object.keys(data).length) return false;
    const el = form.elements;
    if ('pria' in data) el.gender.value = data.pria ? 'pria' : 'wanita';
    ['umur', 'tinggi', 'berat', 'pinggang'].forEach((kunci) => {
      if (kunci in data) el[kunci].value = data[kunci];
    });
    if (data.aktivitas) el.aktivitas.value = data.aktivitas;
    if (data.rumus) el.formula.value = data.rumus;
    if (data.standar) el.standar.value = data.standar;
    if (data.rumus || data.standar) pengaturan.open = true;
    // Form sudah terisi, jadi data tidak perlu tertinggal di address bar
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }

  function alamatDasar() {
    return location.href.split('#')[0];
  }

  // Pesan WhatsApp hanya memuat rentang berat ideal, bukan berat atau umur
  function perbaruiBagikan({ tinggi, umur, standar }) {
    const siap = Rumus.tinggiValid(tinggi) && ['dewasa', 'lansia'].includes(Rumus.kelompokUmur(umur));
    bagikan.hidden = !siap;
    if (!siap) return;
    const { min, maks } = Rumus.rentangIMT(tinggi, standar);
    const teks =
      `Berat idealku menurut standar IMT ${Rumus.STANDAR[standar].nama}: ` +
      `${Rumus.kg(min, 'atas')}–${Rumus.kg(maks, 'bawah')} kg. Cek punyamu: ${alamatDasar()}`;
    tautanWA.href = `https://wa.me/?text=${encodeURIComponent(teks)}`;
  }

  async function salinTautan() {
    const tautan = `${alamatDasar()}#${Rumus.keTautan(bacaForm())}`;
    try {
      await navigator.clipboard.writeText(tautan);
      statusSalin.textContent =
        'Link disalin. Link ini memuat data yang kamu isi, jadi bagikan hanya ke orang yang kamu percaya.';
    } catch {
      statusSalin.textContent = `Salin link ini: ${tautan}`;
    }
  }

  function susunHasil(d, tegas) {
    const { pria, umur, tinggi, rumus, standar } = d;
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

    const pribadi = kartuPribadi(d, tegas);
    if (rumus === 'imt') {
      kartu.push(kartuIMT(tinggi, standar), ...pribadi);
    } else if (rumus === 'semua') {
      kartu.push(kartuIMT(tinggi, standar), ...pribadi);
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
      kartu.push(...pribadi);
    }
    return kartu.join('');
  }

  // Kartu dari kolom opsional: berat badan dan lingkar pinggang
  function kartuPribadi(d, tegas) {
    // Seperti tinggi, angka yang masih diketik belum dianggap salah
    const diisi = (nilai, batas) => !Number.isNaN(nilai) && (tegas || nilai >= batas.min);
    const kartu = [];

    if (diisi(d.berat, Rumus.BATAS_BERAT)) {
      kartu.push(
        ...(Rumus.beratValid(d.berat)
          ? [kartuStatus(d), kartuKalori(d)]
          : [pesan(`Masukkan berat badan antara ${Rumus.BATAS_BERAT.min} dan ${Rumus.BATAS_BERAT.maks} kg.`)])
      );
    }
    if (diisi(d.pinggang, Rumus.BATAS_PINGGANG)) {
      kartu.push(
        Rumus.pinggangValid(d.pinggang)
          ? kartuPinggang(d.pinggang, d.pria)
          : pesan(`Masukkan lingkar pinggang antara ${Rumus.BATAS_PINGGANG.min} dan ${Rumus.BATAS_PINGGANG.maks} cm.`)
      );
    }
    return kartu;
  }

  function pesan(teks) {
    return `<div class="hasil-kartu hasil-kartu--info"><p>${teks}</p></div>`;
  }

  function rentangNormal(standar) {
    const [min, maks] = Rumus.STANDAR[standar].normal;
    return `${Rumus.angkaIMT(min)}–${Rumus.angkaIMT(maks)}`;
  }

  function rentang([dari, sampai]) {
    return dari === sampai ? `${dari}` : `${dari}–${sampai}`;
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

  function kartuStatus({ berat, tinggi, standar }) {
    const nilai = Rumus.imt(berat, tinggi);
    const kategori = Rumus.kategoriIMT(nilai, standar);
    const t = Rumus.target(berat, tinggi, standar);

    let saran = '<p>Beratmu sudah dalam rentang normal. Pertahankan.</p>';
    if (t.arah === 'turun') {
      saran = `<p>Untuk masuk rentang normal, turunkan <strong>±${Rumus.angka(t.selisih)} kg</strong>
          (ke ${Rumus.angka(t.batas)} kg atau kurang). Dengan laju realistis 0,5–1 kg per minggu,
          itu butuh sekitar ${rentang(t.minggu)} minggu.</p>`;
      if (t.awal) {
        saran += `<p>Target awal yang dianjurkan: turun 5–10% berat badan
            (${Rumus.kg(t.awal[0])}–${Rumus.kg(t.awal[1])} kg) dalam 6 bulan pertama.</p>`;
      }
    } else if (t.arah === 'naik') {
      saran = `<p>Untuk masuk rentang normal, naikkan <strong>±${Rumus.angka(t.selisih)} kg</strong>
          (ke ${Rumus.angka(t.batas)} kg atau lebih). Konsultasikan dengan dokter atau ahli gizi.</p>`;
    }

    return `
      <div class="hasil-kartu hasil-kartu--${kategori.id === 'normal' ? 'utama' : 'peringatan'}">
        <h2>Status berat badanmu · ${Rumus.STANDAR[standar].nama}</h2>
        <p class="hasil-utama">IMT ${Rumus.angkaIMT(nilai)}: <strong>${kategori.nama}</strong></p>
        ${saran}
      </div>`;
  }

  function kartuKalori({ berat, tinggi, umur, pria, aktivitas, namaAktivitas, standar }) {
    if (!aktivitas) return pesan('Pilih aktivitas harian untuk melihat kebutuhan kalorimu.');
    const k = Rumus.kalori(berat, tinggi, umur, pria, aktivitas);
    const arah = Rumus.target(berat, tinggi, standar).arah;

    let saran = '';
    if (arah === 'turun') {
      if (k.turun >= k.harian) {
        saran = `<p>Kebutuhanmu sudah dekat batas asupan minimum (${Rumus.kkal(k.minimum)} kkal), jadi
            mengurangi makan saja tidak dianjurkan. Konsultasikan dengan ahli gizi.</p>`;
      } else if (k.dibatasi) {
        saran = `<p>Untuk menurunkan berat: <strong>±${Rumus.kkal(k.turun)} kkal per hari</strong>. Ini batas
            minimum asupan tanpa pengawasan tenaga kesehatan; kejar sisa defisitnya lewat aktivitas fisik.</p>`;
      } else {
        saran = `<p>Untuk menurunkan berat: <strong>±${Rumus.kkal(k.turun)} kkal per hari</strong>
            (asupan dikurangi 500 kkal, sesuai KMK 509/2025).</p>`;
      }
      saran += `<p>Tambah olahraga aerobik intensitas sedang minimal 150 menit per minggu (misalnya
          30 menit, 5 kali seminggu) dan latihan beban 2–3 kali per minggu.</p>`;
    } else if (arah === 'naik') {
      saran = '<p>Untuk menaikkan berat, asupanmu perlu di atas angka ini. Konsultasikan dengan ahli gizi.</p>';
    }

    return `
      <div class="hasil-kartu hasil-kartu--info">
        <h2>Kebutuhan kalori</h2>
        <p class="hasil-utama">±${Rumus.kkal(k.harian)} kkal per hari</p>
        <p>Untuk mempertahankan berat sekarang, dengan aktivitas ${namaAktivitas.toLowerCase()}.</p>
        ${saran}
      </div>`;
  }

  function kartuPinggang(pinggang, pria) {
    const batas = pria ? Rumus.BATAS_SENTRAL.pria : Rumus.BATAS_SENTRAL.wanita;
    const sentral = Rumus.obesitasSentral(pinggang, pria);
    return `
      <div class="hasil-kartu hasil-kartu--${sentral ? 'peringatan' : 'utama'}">
        <h2>Lingkar pinggang</h2>
        <p class="hasil-utama">${Rumus.angka(pinggang)} cm: <strong>${sentral ? 'obesitas sentral' : 'di bawah batas'}</strong></p>
        <p>Batas untuk ${pria ? 'laki-laki' : 'perempuan'} Asia adalah ${batas} cm (KMK 509/2025).
          ${sentral ? 'Lemak perut berlebih menjadi penanda risiko penyakit jantung dan metabolik.' : ''}</p>
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
