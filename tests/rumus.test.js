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
});
