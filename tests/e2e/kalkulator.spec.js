// Tes browser: perilaku kalkulator di halaman sungguhan.
// Jalankan: npm run test:e2e
const { test, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

let galat;
let requestLuar;

// Setiap tes juga memastikan tidak ada error di console dan tidak ada request ke luar
test.beforeEach(async ({ page, baseURL }) => {
  galat = [];
  requestLuar = [];
  page.on('console', (pesan) => {
    if (pesan.type() === 'error') galat.push(pesan.text());
  });
  page.on('pageerror', (e) => galat.push(String(e)));
  page.on('request', (request) => {
    const url = request.url();
    if (!url.startsWith(baseURL) && !/^(data|file):/.test(url)) requestLuar.push(url);
  });
});

test.afterEach(() => {
  expect(galat, 'error di console').toEqual([]);
  expect(requestLuar, 'request ke luar origin').toEqual([]);
});

const hasil = (page) => page.locator('#hasil');

async function isi(page, data) {
  if (data.jk) await page.check(data.jk === 'p' ? '#gender2' : '#gender1');
  for (const id of ['umur', 'tinggi', 'berat', 'pinggang']) {
    if (data[id] !== undefined) await page.fill(`#${id}`, String(data[id]));
  }
  if (data.aktivitas) await page.selectOption('#aktivitas', data.aktivitas);
}

async function bukaPengaturan(page) {
  const pengaturan = page.locator('#pengaturan');
  if (!(await pengaturan.evaluate((d) => d.open))) await pengaturan.locator('summary').click();
}

test.describe('Dasar', () => {
  test('memakai CSS sendiri dan menyembunyikan tombol bagikan sebelum ada hasil', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#formula')).toHaveCSS('appearance', 'none');
    await expect(page.locator('.satuan').first()).toHaveCSS('background-color', 'rgb(233, 236, 239)');
    await expect(page.locator('#bagikan')).toBeHidden();
  });

  test('menampilkan rentang IMT Kemenkes 2025', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 30, tinggi: 160 });
    await expect(hasil(page)).toContainText('Berat idealmu antara 47,5 dan 58,5 kg');
  });

  test('menekan Enter di kolom tinggi tidak me-reload halaman', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 30, tinggi: 160 });
    await expect(hasil(page)).toContainText('58,5 kg');
    let navigasi = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigasi++;
    });
    await page.press('#tinggi', 'Enter');
    await page.waitForTimeout(500);
    expect(navigasi).toBe(0);
    await expect(hasil(page)).toContainText('58,5 kg');
  });

  test('standar WHO mengubah batas atas rentang', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 30, tinggi: 160 });
    await bukaPengaturan(page);
    await page.selectOption('#standar', 'who');
    await expect(hasil(page)).toContainText('47,5 dan 63,5 kg');
  });

  test('rumus berbasis inci tidak dipakai di bawah 152,4 cm', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 30, tinggi: 145 });
    await bukaPengaturan(page);
    await page.selectOption('#formula', 'semua');
    await expect(hasil(page)).toContainText('Rumus Devine, Robinson, Miller, dan Hamwi hanya berlaku untuk tinggi 152,4 cm');
    await expect(page.locator('.hasil-kartu--nonaktif')).toHaveCount(1);
    await expect(hasil(page)).not.toContainText('53,1');

    await page.selectOption('#formula', 'miller');
    const kartu = page.locator('#hasil .hasil-kartu');
    await expect(kartu).toHaveCount(2);
    await expect(kartu.nth(0)).toHaveClass(/hasil-kartu--nonaktif/);
    await expect(kartu.nth(1)).toHaveClass(/hasil-kartu--utama/);
  });

  test('tinggi di luar batas: diam saat mengetik, pesan setelah kolom ditinggalkan', async ({ page }) => {
    await page.goto('/');
    await isi(page, { umur: 30, tinggi: 90 });
    await page.waitForTimeout(400); // melewati jeda 250 ms saat mengetik
    await expect(hasil(page)).toHaveText('');
    await page.locator('#tinggi').blur();
    await expect(hasil(page)).toContainText('Masukkan tinggi badan antara 120 dan 250 cm.');
  });

  test('umur di bawah 18 tahun diarahkan ke standar anak', async ({ page }) => {
    await page.goto('/');
    await isi(page, { umur: 15, tinggi: 160 });
    await expect(hasil(page)).toContainText('Permenkes No. 2 Tahun 2020');
    await expect(hasil(page)).not.toContainText('Berat idealmu');
    await expect(page.locator('#bagikan')).toBeHidden();
  });

  test('umur di atas 65 tahun mendapat catatan khusus', async ({ page }) => {
    await page.goto('/');
    await isi(page, { umur: 70, tinggi: 160 });
    await expect(hasil(page)).toContainText('di atas 65 tahun');
    await expect(hasil(page)).toContainText('Berat idealmu');
  });

  test('hasil rumus di luar rentang normal diberi tanda', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'l', umur: 30, tinggi: 180 });
    await bukaPengaturan(page);
    await page.selectOption('#formula', 'devine');
    await expect(page.locator('.hasil-kartu--peringatan')).toHaveCount(1);
    await expect(hasil(page)).toContainText('Berat idealmu 75 kg');
    await expect(hasil(page)).toContainText('Setara IMT 23,1');

    await page.selectOption('#formula', 'hamwi');
    await expect(hasil(page)).toContainText('Rangka kecil');
    await expect(hasil(page)).toContainText('rangka besar');
  });

  test('bisa dibuka langsung dari file tanpa server', async ({ page }) => {
    await page.goto(pathToFileURL(path.resolve(__dirname, '../../index.html')).href);
    await isi(page, { umur: 30, tinggi: 170 });
    await expect(hasil(page)).toContainText('Berat idealmu');
  });
});

test.describe('Status, target, dan kalori', () => {
  test('obesitas: status, target, dan laju yang realistis', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 155, berat: 62 });
    await expect(hasil(page)).toContainText('IMT 25,8: Obesitas I');
    await expect(hasil(page)).toContainText('turunkan ±7 kg (ke 55 kg atau kurang)');
    await expect(hasil(page)).toContainText('sekitar 7–14 minggu');
    await expect(hasil(page)).toContainText('(3–6 kg) dalam 6 bulan pertama');
    await expect(hasil(page)).toContainText('Pilih aktivitas harian');
  });

  test('kebutuhan kalori dan asupan dengan defisit 500 kkal', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 155, berat: 62, aktivitas: 'ringan' });
    await expect(hasil(page)).toContainText('±1.900 kkal per hari');
    await expect(hasil(page)).toContainText('±1.400 kkal per hari');
    await expect(hasil(page)).toContainText('sesuai KMK 509/2025');
    await expect(hasil(page)).toContainText('minimal 150 menit per minggu');
  });

  test('asupan tidak diturunkan di bawah batas minimum', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 155, berat: 62, aktivitas: 'jarang' });
    await expect(hasil(page)).toContainText('±1.200 kkal per hari');
    await expect(hasil(page)).toContainText('batas minimum asupan');
  });

  test('lingkar pinggang di atas batas Asia-Pasifik', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 155, pinggang: 85 });
    await expect(hasil(page)).toContainText('85 cm: obesitas sentral');
    await expect(hasil(page)).toContainText('Batas untuk perempuan Asia adalah 80 cm');
  });

  test('berat badan kurang dan normal', async ({ page }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 160, berat: 40, aktivitas: 'ringan' });
    await expect(hasil(page)).toContainText('Berat badan kurang');
    await expect(hasil(page)).toContainText('naikkan ±7,5 kg (ke 47,5 kg atau lebih)');
    await expect(hasil(page)).toContainText('Untuk menaikkan berat');

    await page.fill('#berat', '50');
    await expect(hasil(page)).toContainText('IMT 19,5: Normal');
    await expect(hasil(page)).toContainText('Beratmu sudah dalam rentang normal');
  });
});

test.describe('Bagikan', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] });

  test('pesan WhatsApp hanya memuat rentang berat ideal', async ({ page, baseURL }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 155, berat: 62, pinggang: 85 });
    await expect(page.locator('#bagikan')).toBeVisible();
    const href = await page.getAttribute('#bagikan-wa', 'href');
    expect(new URL(href).searchParams.get('text')).toBe(
      `Berat idealku menurut standar IMT Kemenkes 2025: 44,5–55 kg. Cek punyamu: ${baseURL}`
    );
  });

  test('salin link hasil menyimpan isian di fragmen URL', async ({ page, baseURL }) => {
    await page.goto('/');
    await isi(page, { jk: 'p', umur: 28, tinggi: 155, berat: 62, pinggang: 85, aktivitas: 'ringan' });
    await expect(hasil(page)).toContainText('obesitas sentral');
    await page.click('#salin-tautan');
    await expect(page.locator('#status-salin')).toContainText('bagikan hanya ke orang yang kamu percaya');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${baseURL}#jk=p&umur=28&tb=155&bb=62&lp=85&akt=ringan`
    );
  });

  test('link hasil mengisi form lalu menghapus data dari address bar', async ({ page }) => {
    await page.goto('/#jk=p&umur=28&tb=155&bb=62&akt=ringan&rumus=semua');
    await expect(hasil(page)).toContainText('Obesitas I');
    await expect(hasil(page)).toContainText('Rumus Devine');
    await expect(page.locator('#berat')).toHaveValue('62');
    await expect(page.locator('#aktivitas')).toHaveValue('ringan');
    await expect(page.locator('#pengaturan')).toHaveJSProperty('open', true);
    expect(new URL(page.url()).hash).toBe('');
  });
});

test.describe('Aksesibilitas, SEO, dan PWA', () => {
  test('semua kolom berlabel dan hasil diumumkan ke pembaca layar', async ({ page }) => {
    await page.goto('/');
    for (const id of ['umur', 'tinggi', 'berat', 'aktivitas', 'pinggang', 'formula', 'standar']) {
      await expect(page.locator(`label[for="${id}"]`)).toHaveCount(1);
    }
    await expect(hasil(page)).toHaveAttribute('aria-live', 'polite');
  });

  test('canonical, gambar OG, dan manifest tersedia', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://reggarantai.github.io/kalkulator-berat-badan-ideal/'
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /\/assets\/img\/og\.png/);
    const manifest = await (await request.get('manifest.webmanifest')).json();
    expect(manifest.name).toBe('Kalkulator Berat Badan Ideal');
    for (const berkas of ['assets/img/og.png', 'assets/img/ikon-180.png', ...manifest.icons.map((i) => i.src)]) {
      expect((await request.get(berkas)).status(), berkas).toBe(200);
    }
  });

  test('tetap jalan saat offline setelah service worker aktif', async ({ page, context }) => {
    await page.goto('/');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
    await context.setOffline(true);
    await page.reload();
    await isi(page, { umur: 30, tinggi: 170 });
    await expect(hasil(page)).toContainText('Berat idealmu');
    await context.setOffline(false);
  });
});

test.describe('Tampilan HP', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('teks pilihan pada select tidak terpotong', async ({ page }) => {
    await page.goto('/');
    const terpotong = await page.evaluate(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      return [...document.querySelectorAll('select')].flatMap((select) => {
        const gaya = getComputedStyle(select);
        ctx.font = `${gaya.fontWeight} ${gaya.fontSize} ${gaya.fontFamily}`;
        const ruang = select.clientWidth - parseFloat(gaya.paddingLeft) - parseFloat(gaya.paddingRight);
        return [...select.options].filter((o) => ctx.measureText(o.text).width > ruang).map((o) => o.text);
      });
    });
    expect(terpotong).toEqual([]);
  });
});
