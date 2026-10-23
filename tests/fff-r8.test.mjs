// Teste pentru funcțiile din v1.1.0: tonul curent ca WAV (verificat spectral), scena partajabilă prin QR/hash, 9 limbi + kit.
// Rulare: node tests/fff-r8.test.mjs   (Playwright din /opt/node-tools, Chromium din /opt/pw-browsers; rețea blocată)
import {createRequire} from 'module'; import fs from 'node:fs'; import path from 'node:path'; import {fileURLToPath} from 'node:url';
const require = createRequire('/opt/node-tools/package.json'); const {chromium} = require('playwright');
const HERE = path.dirname(fileURLToPath(import.meta.url)); const FILE = 'file://' + path.join(HERE, '..', 'index.html');
const AXE = process.env.FFF_AXE || '/tmp/claude-0/-home-claude/78529928-3825-51c3-b9bd-0e81655ab6bc/scratchpad/sweep/node_modules/axe-core/axe.min.js';
let ok = 0, bad = 0; const t = (n, c, x) => { if (c) { ok++; console.log('  ok  ', n); } else { bad++; console.log('  FAIL', n, x ?? ''); } };
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox']});
async function mk(w = 1280, h = 800, scheme = 'dark', hash = '', url = FILE) {
  const ctx = await b.newContext({viewport: {width: w, height: h}, colorScheme: scheme, acceptDownloads: true, locale: 'en-US'});
  const net = []; await ctx.route(/^https?:/, r => { net.push(r.request().url()); r.abort(); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || /Content Security Policy/.test(m.text())) errs.push(m.text()); });
  await p.goto(url + hash); await p.waitForTimeout(3600);
  return {ctx, p, errs, net};
}
const axeSrc = fs.readFileSync(AXE, 'utf8');
const runAxe = async p => { if (!(await p.evaluate(() => !!window.axe))) await p.evaluate(axeSrc + '\n;0'); return p.evaluate(async () => (await axe.run(document, {resultTypes: ['violations']})).violations.map(v => v.id + ':' + v.nodes.map(n => n.target.join(' ')).join(',').slice(0, 120))); };
async function dlWav(p) { const [d] = await Promise.all([p.waitForEvent('download', {timeout: 60000}), p.click('#wavBtn')]); return {name: d.suggestedFilename(), buf: fs.readFileSync(await d.path())}; }
function parseWav(buf) {
  const s = (o, n) => buf.toString('latin1', o, o + n);
  const h = {riff: s(0, 4), wave: s(8, 4), fmt: s(12, 4), pcm: buf.readUInt16LE(20), ch: buf.readUInt16LE(22), sr: buf.readUInt32LE(24), bits: buf.readUInt16LE(34), data: s(36, 4), len: buf.readUInt32LE(40)};
  const n = h.len / 4, L = new Float64Array(n), R = new Float64Array(n); for (let i = 0; i < n; i++) { L[i] = buf.readInt16LE(44 + i * 4) / 32768; R[i] = buf.readInt16LE(46 + i * 4) / 32768; }
  return {h, L, R, n};
}
function goertzel(x, sr, f, i0, i1) { const w = 2 * Math.PI * f / sr, c = 2 * Math.cos(w); let a = 0, bq = 0; for (let i = i0; i < i1; i++) { const win = 0.5 - 0.5 * Math.cos(2 * Math.PI * (i - i0) / (i1 - i0 - 1)); const v = x[i] * win + c * a - bq; bq = a; a = v; } return Math.sqrt(a * a + bq * bq - c * a * bq) / (i1 - i0); }
function peakNear(x, sr, f0, lo, hi, i0, i1) { let best = 0, bf = 0; for (let f = f0 + lo; f <= f0 + hi; f += 0.25) { const e = goertzel(x, sr, f, i0, i1); if (e > best) { best = e; bf = f; } } return {f: bf, e: best}; }

const {ctx, p, errs, net} = await mk(1280, 800, 'dark', '#heart');
t('pornire fără erori/CSP', errs.length === 0, errs); t('0 cereri de rețea', net.length === 0, net);
t('kitul (core, label, bundle, qr) încărcat', await p.evaluate(() => !!(window.FFF && FFF.qr && FFF.label && FFF.bundle)));
const heart = await p.evaluate(() => ({id: CHAKRAS[current].id, f: CHAKRAS[current].freq})); t('hash #heart selectează chakra inimii', heart.id === 'heart', JSON.stringify(heart));
// --- WAV fără binaural
await p.evaluate(() => { const bo = document.getElementById('binOn'); if (bo.checked) { bo.checked = false; bo.dispatchEvent(new Event('change')); } });
await p.selectOption('#wavDur', '1');
const w1 = await dlWav(p); const W1 = parseWav(w1.buf);
t('WAV: antet RIFF/WAVE/PCM/stereo/32 kHz/16 biți', W1.h.riff === 'RIFF' && W1.h.wave === 'WAVE' && W1.h.pcm === 1 && W1.h.ch === 2 && W1.h.sr === 32000 && W1.h.bits === 16 && W1.h.data === 'data', JSON.stringify(W1.h));
t('WAV: durata 60 s exact', W1.n === 60 * 32000 && w1.buf.length === 44 + W1.n * 4, [W1.n, w1.buf.length]);
t('WAV: nume de fișier cu chakra și frecvența', w1.name === `aurora-heart-${heart.f}hz.wav`, w1.name);
let peak = 0; for (let i = 0; i < W1.n; i++) peak = Math.max(peak, Math.abs(W1.L[i]), Math.abs(W1.R[i])); t('WAV: normalizat la ≈ −1 dBFS (0,891)', Math.abs(peak - 0.891) < 0.005, peak);
const mid0 = 20 * 32000, mid1 = 30 * 32000;
const pk = peakNear(W1.L, 32000, heart.f, -6, 6, mid0, mid1);
t('WAV: vârful spectral la frecvența chakrei (' + heart.f + ' Hz, ±3 Hz; ±1,8 Hz din detuning)', Math.abs(pk.f - heart.f) <= 3, pk.f);
const eF = goertzel(W1.L, 32000, heart.f, mid0, mid1), eOff = Math.max(goertzel(W1.L, 32000, heart.f * 1.5, mid0, mid1), goertzel(W1.L, 32000, heart.f * 0.8, mid0, mid1), goertzel(W1.L, 32000, 220, mid0, mid1));
t('WAV: energia la frecvența chakrei ≫ la alte frecvențe (>30×)', eF > 30 * eOff, [eF, eOff]);
const eSub = goertzel(W1.L, 32000, heart.f / 2, mid0, mid1); t('WAV: subarmonica triunghiulară (f/2) prezentă, mai slabă decât fundamentala', eSub > 0 && eSub < eF, [eSub, eF]);
const eR = goertzel(W1.R, 32000, heart.f, mid0, mid1); t('WAV fără binaural: energia fundamentalei e aceeași în L și R (±30%; reverbul are impulsuri stereo diferite)', Math.abs(eF - eR) / eF < 0.3, [eF, eR]);
const rms = a => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
t('WAV: fade-in la început și fade-out la sfârșit (RMS primele 0,2 s ≪ mijloc; ultimele 0,2 s ≪ mijloc)', rms(W1.L.slice(0, 6400)) < 0.3 * rms(W1.L.slice(mid0, mid0 + 6400)) && rms(W1.L.slice(W1.n - 6400)) < 0.3 * rms(W1.L.slice(mid0, mid0 + 6400)));
// --- WAV cu binaural 6 Hz
await p.evaluate(() => { const bo = document.getElementById('binOn'); bo.checked = true; bo.dispatchEvent(new Event('change')); const bs = document.getElementById('beatSel'); bs.value = '6'; bs.dispatchEvent(new Event('change')); });
const w2 = await dlWav(p); const W2 = parseWav(w2.buf);
t('WAV binaural: nume cu „binaural6”', /binaural6/.test(w2.name), w2.name);
const l220 = goertzel(W2.L, 32000, 220, mid0, mid1), r220 = goertzel(W2.R, 32000, 220, mid0, mid1), l226 = goertzel(W2.L, 32000, 226, mid0, mid1), r226 = goertzel(W2.R, 32000, 226, mid0, mid1);
t('WAV binaural: L conține 220 Hz, R conține 226 Hz (diferență 6 Hz), nu invers (>15×)', l220 > 15 * r220 && r226 > 15 * l226, JSON.stringify({l220, r220, l226, r226}));
t('WAV binaural: tonul chakrei prezent în ambele canale', goertzel(W2.L, 32000, heart.f, mid0, mid1) > 20 * l226 && goertzel(W2.R, 32000, heart.f, mid0, mid1) > 20 * r220);
t('stare buton/mesaj: fișier salvat, buton reactivat', /MB/.test(await p.textContent('#wavStatus')) && !(await p.isDisabled('#wavBtn')), await p.textContent('#wavStatus'));
// --- Scenă QR
await p.evaluate(() => { const bs = document.getElementById('breathSel'); bs.value = 'box'; bs.dispatchEvent(new Event('change')); const s = document.getElementById('beatSel'); s.value = '10'; s.dispatchEvent(new Event('change')); });
await p.click('#qrBtn'); await p.waitForTimeout(400);
const qurl = await p.textContent('#qrUrl'); t('QR: adresa = bază publică + #heart&beat=10&breath=box', qurl === 'https://chiuta.github.io/Aurora/#heart&beat=10&breath=box', qurl);
t('QR: modal deschis cu SVG', await p.evaluate(() => document.getElementById('qrScrim').classList.contains('on') && !!document.querySelector('#qrImg svg')));
const dec = await p.evaluate(async () => { const svg = document.querySelector('#qrImg svg').outerHTML, u = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), im = new Image(); await new Promise((r, j) => { im.onload = r; im.onerror = j; im.src = u; }); const c = document.createElement('canvas'); c.width = c.height = 420; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 420, 420); x.drawImage(im, 0, 0, 420, 420); const bl = await new Promise(r => c.toBlob(r, 'image/png')); try { const r = await FFF.qr.scan(new File([bl], 'q.png', {type: 'image/png'})); return r && (r.text || r); } catch (e) { return 'ERR ' + e.message; } });
t('QR: decodat înapoi = adresa afișată', dec === qurl, dec);
t('QR: axe 0 violări cu modalul deschis', (await runAxe(p)).length === 0, await runAxe(p));
await p.keyboard.press('Escape'); await p.waitForTimeout(200); t('QR: Esc închide modalul', await p.evaluate(() => !document.getElementById('qrScrim').classList.contains('on')));
// deschide scena pe o pagină nouă (context curat, fără preferințe salvate)
{ const m = await mk(1280, 800, 'dark', '#crown&beat=2&breath=calm');
  const st = await m.p.evaluate(() => ({c: CHAKRAS[current].id, bin: document.getElementById('binOn').checked, beat: document.getElementById('beatSel').value, br: document.getElementById('breathSel').value, bk: breathKey, hz: beatHz}));
  t('scena din hash se aplică la deschidere: chakră, binaural 2 Hz, respirație „calm”', st.c === 'crown' && st.bin && st.beat === '2' && st.br === 'calm' && st.bk === 'calm' && st.hz === 2, JSON.stringify(st));
  t('scena: fără erori', m.errs.length === 0, m.errs);
  const m2 = await mk(1280, 800, 'dark', '#throat&beat=99&breath=nimic'); const s2 = await m2.p.evaluate(() => ({c: CHAKRAS[current].id, bin: document.getElementById('binOn').checked, bk: breathKey}));
  t('valori invalide în hash sunt ignorate (beat=99, breath=nimic), chakra se aplică', s2.c === 'throat' && !s2.bin && s2.bk === 'off', JSON.stringify(s2)); await m2.ctx.close(); await m.ctx.close(); }
// --- 9 limbi
const lab = {};
for (const l of ['en', 'ro', 'es', 'fr', 'it', 'pt', 'ca', 'hi', 'ar']) { await p.selectOption('#langSel', l); await p.waitForTimeout(200); lab[l] = await p.evaluate(() => [wavBtn.textContent.trim(), qrBtn.textContent.trim(), document.getElementById('wavNoteP').textContent.trim().slice(0, 12), document.getElementById('wavDur').options[0].textContent, document.documentElement.dir]); }
t('toate cele 9 limbi au etichete noi nevide', Object.values(lab).every(a => a.every((x, i) => i === 4 || x.length > 1)), JSON.stringify(lab));
t('etichetele diferă între limbi (≥ 8 variante distincte ale butonului WAV)', new Set(Object.values(lab).map(a => a[0])).size >= 8, JSON.stringify(Object.values(lab).map(a => a[0])));
t('arabă: dir=rtl', lab.ar[4] === 'rtl');
await p.selectOption('#langSel', 'ar'); await p.click('#qrBtn'); await p.waitForTimeout(300);
t('arabă: modal QR tradus și axe 0 violări', /رمز QR/.test(await p.textContent('#qrTitle')) && (await runAxe(p)).length === 0, await runAxe(p)); await p.keyboard.press('Escape');
await p.selectOption('#langSel', 'en');
// teme + axe
for (const th of ['cosmic', 'light', 'contrast']) { await p.selectOption('#themeSel', th); await p.waitForTimeout(900); t('axe 0 violări, tema ' + th, (await runAxe(p)).length === 0, await runAxe(p)); }
// rezultat bundle: setările apar în copia kitului
const bn = await p.evaluate(async () => { const x = await FFF.bundle.build(); return typeof x === 'string' ? JSON.parse(x) : (x.bundle || x); }); t('pachet .fff.json al kitului conține cheile aurora.*', bn.data && Object.keys(bn.data).some(k => /^aurora\./.test(k)), Object.keys(bn.data || {}).join(','));
await p.click('#app-version').catch(() => {}); await p.waitForTimeout(300);
t('fără erori pe parcurs', errs.length === 0, errs); t('0 cereri de rețea pe parcurs', net.length === 0, net);
await ctx.close();
{ const m = await mk(360, 740, 'dark', '');
  t('360: fără depășire orizontală', await m.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), await m.p.evaluate(() => document.documentElement.scrollWidth));
  t('360: panourile pornesc restrânse (butonul QR ascuns până la deschidere)', !(await m.p.isVisible('#qrBtn'))); await m.p.click('#sessH .ph2btn'); await m.p.click('#toneH .ph2btn'); await m.p.waitForTimeout(300);
  t('360: după deschidere, câmpul WAV și butonul QR sunt vizibile și încap', await m.p.evaluate(() => ['wavBtn', 'qrBtn', 'wavDur'].every(i => { const r = document.getElementById(i).getBoundingClientRect(); return r.width > 0 && r.left >= 0 && r.right <= innerWidth; })));
  t('360: fără depășire orizontală cu panourile deschise', await m.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await m.p.click('#qrBtn'); await m.p.waitForTimeout(300); t('360: modal QR încape', await m.p.evaluate(() => { const r = document.querySelector('#qrScrim .modal').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; }));
  t('360: axe 0 violări', (await runAxe(m.p)).length === 0, await runAxe(m.p)); t('360: fără erori', m.errs.length === 0, m.errs); await m.ctx.close(); }
{ const html = fs.readFileSync(path.join(HERE, '..', 'index.html'), 'utf8').replace(/<!--fff:kit:start[\s\S]*?<!--fff:kit:end-->/, '');
  const tmp = path.join(HERE, '_nokit.tmp.html'); fs.writeFileSync(tmp, html); const m = await mk(1280, 800, 'dark', '', 'file://' + tmp);
  const w = await dlWav(m.p); t('fără kit: fără erori, QR ascuns, WAV se generează', m.errs.length === 0 && !(await m.p.isVisible('#qrBtn')) && w.buf.length > 1e6, m.errs); await m.ctx.close(); fs.unlinkSync(tmp); }
// 1.3.8: importul de setări acceptă doar cheile cunoscute, valori primitive și scurte
{
  const {ctx, p, errs} = await mk(1280, 800, 'dark', '');
  const payload = {app: 'aurora', v: 1, prefs: {vol: '73', 'evil.key': 'x', __proto__x: 'y', theme: {a: 1}, presets: 'z'.repeat(5000), 'fff.aurora.x': '1'}};
  await p.setInputFiles('#importFile', {name: 's.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(payload))});
  await p.waitForTimeout(3600);
  const ls = await p.evaluate(() => Object.keys(localStorage).filter(k => k.indexOf('aurora.') === 0 && k.indexOf('aurora.__') !== 0).sort());
  t('import: se păstrează cheia cunoscută (vol)', await p.evaluate(() => localStorage.getItem('aurora.vol')) === '73', ls.join());
  t('import: chei necunoscute, obiecte și valori peste 4000 ignorate', ls.indexOf('aurora.evil.key') < 0 && ls.indexOf('aurora.__proto__x') < 0 && (await p.evaluate(() => localStorage.getItem('aurora.theme'))) !== '[object Object]' && (await p.evaluate(() => (localStorage.getItem('aurora.presets') || '').length)) < 4000 && ls.indexOf('aurora.fff.aurora.x') < 0, ls.join());
  t('import: 0 erori', errs.length === 0, errs);
  await ctx.close();
}
await b.close();
console.log(`\n${ok} ok / ${bad} eșuate`); process.exit(bad ? 1 : 0);
