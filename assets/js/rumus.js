// Author: Regga @reggarantai
// https://reggarantai.com

// Rumus berat badan ideal untuk orang dewasa.
// File ini tidak menyentuh DOM, jadi bisa dites di Node dan dipakai ulang.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.Rumus = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const INCI = 2.54; // cm
  const LIMA_KAKI = 152.4; // cm, 60 inci
  const LB = 0.45359237; // kg

  const BATAS_TINGGI = { min: 120, maks: 250 }; // cm
  const BATAS_UMUR = { min: 1, maks: 120, dewasa: 18, lansia: 65 }; // tahun
  const BATAS_BERAT = { min: 20, maks: 300 }; // kg
  const BATAS_PINGGANG = { min: 40, maks: 200 }; // cm

  // Kategori IMT (kg/m²), ditulis dari batas bawah masing-masing
  // Kemenkes: KMK No. HK.01.07/MENKES/509/2025, Tabel 3.1 (Asia-Pasifik)
  const STANDAR = {
    kemenkes2025: {
      nama: 'Kemenkes 2025',
      normal: [18.5, 22.9],
      kategori: [
        { id: 'kurang', nama: 'Berat badan kurang', min: 0 },
        { id: 'normal', nama: 'Normal', min: 18.5 },
        { id: 'lebih', nama: 'Berat badan lebih', min: 23 },
        { id: 'obesitas1', nama: 'Obesitas I', min: 25 },
        { id: 'obesitas2', nama: 'Obesitas II', min: 30 },
      ],
    },
    who: {
      nama: 'WHO',
      normal: [18.5, 24.9],
      kategori: [
        { id: 'kurang', nama: 'Berat badan kurang', min: 0 },
        { id: 'normal', nama: 'Normal', min: 18.5 },
        { id: 'lebih', nama: 'Berat badan lebih', min: 25 },
        { id: 'obesitas1', nama: 'Obesitas I', min: 30 },
        { id: 'obesitas2', nama: 'Obesitas II', min: 35 },
        { id: 'obesitas3', nama: 'Obesitas III', min: 40 },
      ],
    },
  };

  // Lingkar pinggang di atas batas ini berarti obesitas sentral (KMK 509/2025, Tabel 3.2)
  const BATAS_SENTRAL = { pria: 90, wanita: 80 }; // cm

  // Faktor aktivitas untuk mengalikan BMR
  const AKTIVITAS = { jarang: 1.2, ringan: 1.375, sedang: 1.55, berat: 1.725, sangat: 1.9 };

  // KMK 509/2025: total asupan energi per hari dikurangi 500 kkal
  const DEFISIT = 500; // kkal
  // Asupan minimum tanpa pengawasan tenaga kesehatan (Harvard Health Publishing, 2024)
  const ASUPAN_MIN = { pria: 1500, wanita: 1200 }; // kkal

  const kuadrat = (tinggi) => (tinggi / 100) ** 2;

  // Rumus "berat dasar untuk 5 kaki pertama, ditambah sekian per inci di atasnya".
  // Di bawah 5 kaki rumusnya tidak terdefinisi, makanya ada minTinggi.
  function perInci(dasarPria, tambahPria, dasarWanita, tambahWanita) {
    return (tinggi, pria) => {
      const inci = (tinggi - LIMA_KAKI) / INCI;
      return pria ? dasarPria + inci * tambahPria : dasarWanita + inci * tambahWanita;
    };
  }

  const RUMUS = [
    { id: 'devine', nama: 'Devine', tahun: 1974, minTinggi: LIMA_KAKI, hitung: perInci(50, 2.3, 45.5, 2.3) },
    { id: 'robinson', nama: 'Robinson', tahun: 1983, minTinggi: LIMA_KAKI, hitung: perInci(52, 1.9, 49, 1.7) },
    { id: 'miller', nama: 'Miller', tahun: 1983, minTinggi: LIMA_KAKI, hitung: perInci(56.2, 1.41, 53.1, 1.36) },
    { id: 'hamwi', nama: 'Hamwi', tahun: 1964, minTinggi: LIMA_KAKI, rangka: true, hitung: perInci(106 * LB, 6 * LB, 100 * LB, 5 * LB) },
    { id: 'lemmens', nama: 'Lemmens', tahun: 2005, hitung: (tinggi) => 22 * kuadrat(tinggi) },
    { id: 'broca', nama: 'Broca', hitung: (tinggi, pria) => (tinggi - 100) * (pria ? 0.9 : 0.85) },
  ];

  function imt(berat, tinggi) {
    return berat / kuadrat(tinggi);
  }

  // Tabel IMT memakai satu desimal (22,9 lalu 23), jadi bandingkan setelah dibulatkan
  function kategoriIMT(nilai, standar) {
    const dibulatkan = Math.round(nilai * 10) / 10;
    return STANDAR[standar].kategori.filter((k) => dibulatkan >= k.min).pop();
  }

  function imtNormal(nilai, standar) {
    return kategoriIMT(nilai, standar).id === 'normal';
  }

  function rentangIMT(tinggi, standar) {
    const [min, maks] = STANDAR[standar].normal;
    return { min: min * kuadrat(tinggi), maks: maks * kuadrat(tinggi) };
  }

  function hitung(id, tinggi, pria, standar) {
    const rumus = RUMUS.find((r) => r.id === id);
    if (rumus.minTinggi && tinggi < rumus.minTinggi) {
      return { rumus, berlaku: false };
    }
    const berat = rumus.hitung(tinggi, pria);
    const nilaiIMT = imt(berat, tinggi);
    return {
      rumus,
      berlaku: true,
      berat,
      imt: nilaiIMT,
      normal: imtNormal(nilaiIMT, standar),
      // Hamwi: -10% untuk rangka tubuh kecil, +10% untuk rangka besar
      rangka: rumus.rangka ? { kecil: berat * 0.9, besar: berat * 1.1 } : null,
    };
  }

  // Jarak berat sekarang ke rentang normal. Arahnya mengikuti kategori IMT
  // supaya selalu cocok dengan status yang ditampilkan.
  function target(berat, tinggi, standar) {
    const kategori = kategoriIMT(imt(berat, tinggi), standar);
    if (kategori.id === 'normal') return { arah: 'tetap' };
    const { min, maks } = rentangIMT(tinggi, standar);
    const turun = kategori.id !== 'kurang';
    const selisih = bulatkan(turun ? berat - maks : min - berat, 'atas');
    return {
      arah: turun ? 'turun' : 'naik',
      selisih,
      batas: turun ? bulatkan(maks, 'bawah') : bulatkan(min, 'atas'),
      // KMK 509/2025: penurunan berat badan yang realistis 0,5–1 kg per minggu
      minggu: [Math.ceil(selisih / 1), Math.ceil(selisih / 0.5)],
      // KMK 509/2025: target awal obesitas, turun 5–10% berat badan dalam 6 bulan pertama
      awal: kategori.id.startsWith('obesitas') ? [berat * 0.05, berat * 0.1] : null,
    };
  }

  // BMR Harris-Benedict revisi (Roza & Shizgal, 1984), formula yang disebut
  // KMK 509/2025, dikali faktor aktivitas
  function kalori(berat, tinggi, umur, pria, aktivitas) {
    const bmr = pria
      ? 88.362 + 13.397 * berat + 4.799 * tinggi - 5.677 * umur
      : 447.593 + 9.247 * berat + 3.098 * tinggi - 4.33 * umur;
    const harian = bmr * AKTIVITAS[aktivitas];
    const minimum = pria ? ASUPAN_MIN.pria : ASUPAN_MIN.wanita;
    return {
      harian,
      turun: Math.max(harian - DEFISIT, minimum),
      minimum,
      // Defisit penuh tidak bisa dicapai lewat makan saja tanpa melewati batas minimum
      dibatasi: harian - DEFISIT < minimum,
    };
  }

  function obesitasSentral(pinggang, pria) {
    return pinggang > (pria ? BATAS_SENTRAL.pria : BATAS_SENTRAL.wanita);
  }

  function dalamBatas(nilai, batas) {
    return Number.isFinite(nilai) && nilai >= batas.min && nilai <= batas.maks;
  }

  function kelompokUmur(umur) {
    if (!Number.isFinite(umur) || umur < BATAS_UMUR.min || umur > BATAS_UMUR.maks) return null;
    if (umur < BATAS_UMUR.dewasa) return 'anak';
    if (umur > BATAS_UMUR.lansia) return 'lansia';
    return 'dewasa';
  }

  // Dibulatkan ke 0,5 kg; dua desimal itu presisi palsu
  function bulatkan(kg, arah) {
    const fungsi = arah === 'atas' ? Math.ceil : arah === 'bawah' ? Math.floor : Math.round;
    return fungsi(kg * 2) / 2;
  }

  // Data form <-> fragmen URL (#jk=p&umur=28&tb=155...).
  // Fragmen tidak pernah dikirim ke server, jadi datanya tetap di browser.
  const ANGKA_TAUTAN = { umur: 'umur', tinggi: 'tb', berat: 'bb', pinggang: 'lp' };
  const punya = (objek, kunci) => Object.prototype.hasOwnProperty.call(objek, kunci);

  function keTautan(data) {
    const p = new URLSearchParams({ jk: data.pria ? 'l' : 'p' });
    for (const [kunci, nama] of Object.entries(ANGKA_TAUTAN)) {
      if (Number.isFinite(data[kunci])) p.set(nama, data[kunci]);
    }
    if (data.aktivitas) p.set('akt', data.aktivitas);
    if (data.rumus && data.rumus !== 'imt') p.set('rumus', data.rumus);
    if (data.standar && data.standar !== 'kemenkes2025') p.set('standar', data.standar);
    return p.toString();
  }

  // Hanya nilai yang dikenal yang diambil; sisanya diabaikan
  function dariTautan(fragmen) {
    const p = new URLSearchParams(String(fragmen).replace(/^#/, ''));
    const data = {};
    if (p.get('jk') === 'l' || p.get('jk') === 'p') data.pria = p.get('jk') === 'l';
    for (const [kunci, nama] of Object.entries(ANGKA_TAUTAN)) {
      const nilai = Number.parseFloat(p.get(nama));
      if (Number.isFinite(nilai)) data[kunci] = nilai;
    }
    const akt = p.get('akt');
    const rumus = p.get('rumus');
    const standar = p.get('standar');
    if (akt && punya(AKTIVITAS, akt)) data.aktivitas = akt;
    if (rumus === 'imt' || rumus === 'semua' || RUMUS.some((r) => r.id === rumus)) data.rumus = rumus;
    if (standar && punya(STANDAR, standar)) data.standar = standar;
    return data;
  }

  const formatAngka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const formatIMT = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return {
    BATAS_TINGGI,
    BATAS_UMUR,
    BATAS_BERAT,
    BATAS_PINGGANG,
    BATAS_SENTRAL,
    STANDAR,
    RUMUS,
    imt,
    imtNormal,
    kategoriIMT,
    rentangIMT,
    hitung,
    target,
    kalori,
    obesitasSentral,
    tinggiValid: (tinggi) => dalamBatas(tinggi, BATAS_TINGGI),
    beratValid: (berat) => dalamBatas(berat, BATAS_BERAT),
    pinggangValid: (pinggang) => dalamBatas(pinggang, BATAS_PINGGANG),
    kelompokUmur,
    bulatkan,
    keTautan,
    dariTautan,
    angka: (nilai) => formatAngka.format(nilai),
    kg: (nilai, arah) => formatAngka.format(bulatkan(nilai, arah)),
    angkaIMT: (nilai) => formatIMT.format(nilai),
    // Kalori dibulatkan ke 10 kkal
    kkal: (nilai) => formatAngka.format(Math.round(nilai / 10) * 10),
  };
});
