/* DOR FIT - Victory nutrition export.
   How to run: open https://www.victoryonline.co.il in Chrome, press F12, open the "Console" tab,
   paste this whole file, press Enter. Leave the tab open. When it finishes, a file
   "victory-foods.json" is downloaded. To stop early: type  window.__stop=true  in the console.
   It sends about 1.5 requests per second and only reads public product data. */
(async () => {
  const B = '/v2/retailers/1470/branches/2331', DELAY = 650, SIZE = 40;
  const LIMIT = window.__limit || 0;             // for testing: number of categories
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ids = new Map();
  document.querySelectorAll('a[href*="/categories/"]').forEach(a => {
    const m = (a.getAttribute('href') || '').match(/categories\/(\d+)/);
    if (m && !ids.has(m[1])) ids.set(m[1], a.textContent.trim());
  });
  let cats = [...ids.keys()];
  if (LIMIT) cats = cats.slice(0, LIMIT);
  console.log('Categories to read:', cats.length);
  const rows = new Map(), stats = { products: 0, noNutrition: 0, inconsistent: 0, dup: 0, reqs: 0 };
  const val = (nv, test, size) => {
    const v = (nv.values || []).find(x => test((x.names && x.names['1']) || ''));
    if (!v) return null;
    const s = (v.sizeValues || []).find(z => z.sizeId === size);
    return s && typeof s.value === 'number' ? s.value : null;
  };
  const r1 = x => Math.round(x * 10) / 10;
  function convert(p) {
    const nv = p.nutritionValues;
    if (!nv || !nv.sizes) return null;
    const sz = id => (nv.sizes.find(s => /100/.test((s.names && s.names['1']) || '')) || {}).id;
    const s100 = sz(), sServ = (nv.sizes.find(s => /מנה/.test((s.names && s.names['1']) || '')) || {}).id;
    if (!s100) return null;
    const isK = n => /קלוריות/.test(n), isP = n => /^חלבונ/.test(n), isC = n => /^סך הפחמימות/.test(n) || /^פחמימות/.test(n), isF = n => /^שומנים \(/.test(n) || n === 'שומנים';
    const k = val(nv, isK, s100), pr = val(nv, isP, s100), c = val(nv, isC, s100), f = val(nv, isF, s100);
    if ([k, pr, c, f].some(x => x === null)) return null;
    const est = 4 * pr + 4 * c + 9 * f;
    if (k > 950 || Math.abs(k - est) > Math.max(60, 0.5 * est)) { stats.inconsistent++; return 'bad'; }
    const brand = p.brand && p.brand.names && (p.brand.names['1'] || '');
    let nm = (p.names && p.names['1'] && (p.names['1'].long || p.names['1'].short)) || p.localName || '';
    nm = nm.trim();
    if (!nm) return null;
    const name = (nm + (brand && !nm.includes(brand) ? ' · ' + brand : '')).slice(0, 120);
    const units = [];
    if (sServ) {
      const sk = val(nv, isK, sServ), sp = val(nv, isP, sServ), sc = val(nv, isC, sServ), sf = val(nv, isF, sServ);
      const pairs = [[sc, c], [sf, f], [sp, pr], [sk, k]].filter(([a, b]) => a != null && b > 5);
      if (pairs.length) { const [a, b] = pairs[0]; const g = Math.round(100 * a / b); if (g >= 3 && g <= 1500) units.push(['מנה (' + g + ' גרם)', g]); }
    }
    const w = p.weight, u = p.unitOfMeasure && p.unitOfMeasure.defaultName;
    if (w > 0 && w <= 5000 && (u === 'גרם' || u === 'מ"ל' || u === 'מל')) units.push(['אריזה (' + w + ' גרם)', w]);
    const bc = ((p.image && p.image.url) || '').match(/\/(\d{8,14})[-\/]/);
    return { key: bc ? bc[1] : name, row: [name, 'מוצרים ארוזים', r1(k), r1(pr), r1(c), r1(f), units, '', bc ? bc[1] : (p.barcode || p.sku || '') + ''] };
  }
  async function page(cat, from) {
    stats.reqs++;
    const r = await fetch(`${B}/categories/${cat}/products?appId=4&languageId=1&from=${from}&size=${SIZE}&minScore=0`, { credentials: 'same-origin' });
    if (r.status === 429 || r.status === 403) throw new Error('blocked ' + r.status);
    if (!r.ok) return { total: 0, products: [] };
    return r.json();
  }
  let ci = 0;
  for (const cat of cats) {
    ci++;
    if (window.__stop) break;
    let from = 0, total = 1;
    try {
      while (from < total && !window.__stop) {
        const j = await page(cat, from);
        total = j.total || 0;
        const ps = j.products || [];
        if (!ps.length) break;
        for (const p of ps) {
          stats.products++;
          const c = convert(p);
          if (c === null) { stats.noNutrition++; continue; }
          if (c === 'bad') continue;
          if (rows.has(c.key)) { stats.dup++; continue; }
          rows.set(c.key, c.row);
        }
        from += ps.length;
        await sleep(DELAY);
      }
    } catch (e) { console.warn('Stopped:', e.message); break; }
    if (ci % 10 === 0) console.log(`category ${ci}/${cats.length} - kept ${rows.size} products`, stats);
  }
  const out = [...rows.values()];
  console.log('Done. Kept', out.length, 'products.', stats);
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'victory-foods.json';
  document.body.appendChild(a); a.click(); a.remove();
  window.__victory = out;
})();
