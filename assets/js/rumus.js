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

  // Rentang IMT normal (kg/m²)
  // Kemenkes: KMK No. HK.01.07/MENKES/509/2025, Tabel 3.1 (Asia-Pasifik)
  const STANDAR = {
    kemenkes2025: { nama: 'Kemenkes 2025', normal: [18.5, 22.9] },
    who: { nama: 'WHO', normal: [18.5, 24.9] },
  };

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
  function imtNormal(nilai, standar) {
    const [min, maks] = STANDAR[standar].normal;
    const dibulatkan = Math.round(nilai * 10) / 10;
    return dibulatkan >= min && dibulatkan <= maks;
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

  function tinggiValid(tinggi) {
    return Number.isFinite(tinggi) && tinggi >= BATAS_TINGGI.min && tinggi <= BATAS_TINGGI.maks;
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

  const formatAngka = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
  const formatIMT = new Intl.NumberFormat('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return {
    BATAS_TINGGI,
    BATAS_UMUR,
    STANDAR,
    RUMUS,
    imt,
    imtNormal,
    rentangIMT,
    hitung,
    tinggiValid,
    kelompokUmur,
    bulatkan,
    angka: (nilai) => formatAngka.format(nilai),
    kg: (nilai, arah) => formatAngka.format(bulatkan(nilai, arah)),
    angkaIMT: (nilai) => formatIMT.format(nilai),
  };
});
