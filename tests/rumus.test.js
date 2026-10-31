const test = require('node:test');
const assert = require('node:assert/strict');
const Rumus = require('../assets/js/rumus.js');

function dekat(aktual, harapan, toleransi = 0.01) {
  assert.ok(Math.abs(aktual - harapan) <= toleransi, `${aktual} seharusnya ≈ ${harapan}`);
}

test('nilai rujukan tiap rumus', () => {
  const kasus = [
    // [rumus, tinggi cm, pria, berat kg]
    ['devine', 170, true, 65.94],
    ['devine', 160, false, 52.38],
    ['robinson', 170, true, 65.17],
    ['robinson', 160, false, 54.09],
    ['miller', 170, true, 65.97],
    ['miller', 160, false, 57.17],
    ['hamwi', 170, true, 66.94],
    ['hamwi', 160, false, 52.15],
    ['lemmens', 170, true, 63.58],
    ['broca', 170, true, 63],
    ['broca', 170, false, 59.5],
  ];
  for (const [id, tinggi, pria, berat] of kasus) {
    dekat(Rumus.hitung(id, tinggi, pria, 'who').berat, berat);
  }
});

test('rumus berbasis inci tidak berlaku di bawah 152,4 cm', () => {
  for (const id of ['devine', 'robinson', 'miller', 'hamwi']) {
    for (const tinggi of [145, 152]) {
      assert.equal(Rumus.hitung(id, tinggi, false, 'kemenkes2025').berlaku, false, `${id} ${tinggi} cm`);
    }
    assert.equal(Rumus.hitung(id, 152.4, false, 'kemenkes2025').berlaku, true, `${id} 152,4 cm`);
  }
  dekat(Rumus.hitung('devine', 152.4, false, 'who').berat, 45.5);
});

test('rentang IMT normal mengikuti standar yang dipilih', () => {
  const kemenkes = Rumus.rentangIMT(160, 'kemenkes2025');
  dekat(kemenkes.min, 47.36);
  dekat(kemenkes.maks, 58.62);
  dekat(Rumus.rentangIMT(160, 'who').maks, 63.74);
});

test('hasil rumus di luar IMT normal ditandai', () => {
  // Devine pria 180 cm ≈ 75 kg, IMT 23,1: normal menurut WHO, tidak menurut Kemenkes
  assert.equal(Rumus.hitung('devine', 180, true, 'kemenkes2025').normal, false);
  assert.equal(Rumus.hitung('devine', 180, true, 'who').normal, true);
  // Broca untuk orang pendek hasilnya terlalu ringan
  assert.equal(Rumus.hitung('broca', 125, true, 'who').normal, false);
  // Lemmens selalu IMT 22
  assert.equal(Rumus.hitung('lemmens', 150, false, 'kemenkes2025').normal, true);
});

test('IMT dibandingkan setelah dibulatkan satu desimal', () => {
  assert.equal(Rumus.imtNormal(22.94, 'kemenkes2025'), true);
  assert.equal(Rumus.imtNormal(22.96, 'kemenkes2025'), false);
  assert.equal(Rumus.imtNormal(18.46, 'kemenkes2025'), true);
  assert.equal(Rumus.imtNormal(18.44, 'kemenkes2025'), false);
});

test('Broca tidak pernah nol atau negatif di rentang tinggi yang diterima', () => {
  const { min } = Rumus.BATAS_TINGGI;
  assert.ok(Rumus.hitung('broca', min, true, 'who').berat > 0);
  assert.ok(Rumus.hitung('broca', min, false, 'who').berat > 0);
});

test('batas tinggi badan', () => {
  assert.equal(Rumus.tinggiValid(119), false);
  assert.equal(Rumus.tinggiValid(120), true);
  assert.equal(Rumus.tinggiValid(250), true);
  assert.equal(Rumus.tinggiValid(251), false);
  assert.equal(Rumus.tinggiValid(NaN), false);
});

test('kelompok umur', () => {
  assert.equal(Rumus.kelompokUmur(17), 'anak');
  assert.equal(Rumus.kelompokUmur(18), 'dewasa');
  assert.equal(Rumus.kelompokUmur(65), 'dewasa');
  assert.equal(Rumus.kelompokUmur(66), 'lansia');
  assert.equal(Rumus.kelompokUmur(0), null);
  assert.equal(Rumus.kelompokUmur(121), null);
  assert.equal(Rumus.kelompokUmur(NaN), null);
});

test('format angka Indonesia, dibulatkan ke 0,5 kg', () => {
  assert.equal(Rumus.kg(65.94), '66');
  assert.equal(Rumus.kg(63.58), '63,5');
  assert.equal(Rumus.kg(47.36, 'atas'), '47,5');
  assert.equal(Rumus.kg(58.62, 'bawah'), '58,5');
  assert.equal(Rumus.angkaIMT(22.857), '22,9');
  assert.equal(Rumus.angka(152.4), '152,4');
  assert.equal(Rumus.kkal(1897.3), '1.900');
});

test('kategori IMT per standar', () => {
  assert.equal(Rumus.kategoriIMT(18.4, 'kemenkes2025').id, 'kurang');
  assert.equal(Rumus.kategoriIMT(22.9, 'kemenkes2025').id, 'normal');
  assert.equal(Rumus.kategoriIMT(23, 'kemenkes2025').id, 'lebih');
  assert.equal(Rumus.kategoriIMT(25, 'kemenkes2025').id, 'obesitas1');
  assert.equal(Rumus.kategoriIMT(30, 'kemenkes2025').id, 'obesitas2');
  assert.equal(Rumus.kategoriIMT(24.9, 'who').id, 'normal');
  assert.equal(Rumus.kategoriIMT(25, 'who').id, 'lebih');
  assert.equal(Rumus.kategoriIMT(40, 'who').id, 'obesitas3');
});

test('target menuju rentang normal', () => {
  // Perempuan 155 cm 62 kg: IMT 25,8 (Obesitas I), batas atas normal 55 kg
  const turun = Rumus.target(62, 155, 'kemenkes2025');
  assert.equal(turun.arah, 'turun');
  assert.equal(turun.selisih, 7);
  assert.equal(turun.batas, 55);
  assert.deepEqual(turun.minggu, [7, 14]);
  dekat(turun.awal[0], 3.1);
  dekat(turun.awal[1], 6.2);
  // Berat badan lebih (bukan obesitas): tanpa target awal 5–10%
  assert.equal(Rumus.target(58, 155, 'kemenkes2025').awal, null);
  // Berat badan kurang: 160 cm 40 kg, batas bawah normal 47,5 kg
  const naik = Rumus.target(40, 160, 'kemenkes2025');
  assert.equal(naik.arah, 'naik');
  assert.equal(naik.selisih, 7.5);
  assert.equal(naik.batas, 47.5);
  assert.equal(Rumus.target(50, 160, 'kemenkes2025').arah, 'tetap');
});

test('kebutuhan kalori dengan Harris-Benedict revisi', () => {
  // Pria 70 kg, 170 cm, 30 tahun: BMR 1.671,7 kkal
  dekat(Rumus.kalori(70, 170, 30, true, 'jarang').harian, 1671.672 * 1.2);
  // Perempuan 62 kg, 155 cm, 28 tahun: BMR 1.379,9 kkal
  const k = Rumus.kalori(62, 155, 28, false, 'ringan');
  dekat(k.harian, 1379.857 * 1.375);
  dekat(k.turun, k.harian - 500);
  assert.equal(k.dibatasi, false);
});

test('asupan untuk menurunkan berat tidak di bawah batas minimum', () => {
  // 1.656 − 500 kkal di bawah 1.200 kkal
  const k = Rumus.kalori(62, 155, 28, false, 'jarang');
  assert.equal(k.dibatasi, true);
  assert.equal(k.turun, 1200);
  assert.equal(Rumus.kalori(60, 160, 60, true, 'jarang').turun, 1500);
});

test('obesitas sentral memakai batas Asia-Pasifik', () => {
  assert.equal(Rumus.obesitasSentral(90, true), false);
  assert.equal(Rumus.obesitasSentral(91, true), true);
  assert.equal(Rumus.obesitasSentral(80, false), false);
  assert.equal(Rumus.obesitasSentral(81, false), true);
});

test('batas berat badan dan lingkar pinggang', () => {
  assert.equal(Rumus.beratValid(19), false);
  assert.equal(Rumus.beratValid(62), true);
  assert.equal(Rumus.beratValid(301), false);
  assert.equal(Rumus.pinggangValid(39), false);
  assert.equal(Rumus.pinggangValid(85), true);
});

test('link hasil: data bolak-balik, nilai asing diabaikan', () => {
  const data = { pria: false, umur: 28, tinggi: 155, berat: 62, pinggang: NaN, aktivitas: 'ringan', rumus: 'imt', standar: 'kemenkes2025' };
  const tautan = Rumus.keTautan(data);
  assert.equal(tautan, 'jk=p&umur=28&tb=155&bb=62&akt=ringan');
  assert.deepEqual(Rumus.dariTautan('#' + tautan), { pria: false, umur: 28, tinggi: 155, berat: 62, aktivitas: 'ringan' });
  assert.deepEqual(Rumus.dariTautan('#rumus=semua&standar=who'), { rumus: 'semua', standar: 'who' });
  assert.deepEqual(Rumus.dariTautan('#jk=x&tb=abc&akt=constructor&rumus=<script>&standar=__proto__'), {});
});
