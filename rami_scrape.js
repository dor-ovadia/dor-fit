/* DOR FIT - Rami Levy nutrition + barcode export.
   How to run: open https://www.rami-levy.co.il in Chrome, press F12, open the "Console" tab,
   paste this whole file, press Enter. Leave the tab open. When it finishes, a file
   "rami-foods.json" is downloaded. To stop early: type  window.__stop=true  in the console.
   It sends about 1.5 requests per second and only reads public product data (the same data the site shows). */
(async () => {
  const STORE = 331, DELAY = 650, MAXD = window.__maxd || 160;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const post = async body => {
    const r = await fetch('/api/catalog?', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) });
    if (r.status === 429 || r.status === 403) throw new Error('blocked ' + r.status);
    if (!r.ok) return { total: 0, data: [] };
    return r.json();
  };
  const r1 = x => Math.round(x * 10) / 10;
  const stats = { depts: 0, products: 0, noNutrition: 0, inconsistent: 0, dup: 0, reqs: 0 };
  const rows = new Map();
  const nv = (p, re) => {
    const list = (p.gs && p.gs.Nutritional_Values) || [];
    for (const n of list) for (const f of (n.fields || [])) if (re.test(f.field_name || '')) { const v = parseFloat(String(f.value).replace(',', '.')); return isNaN(v) ? null : v; }
    return null;
  };
  function convert(p) {
    const gs = p.gs || {};
    const k = nv(p, /^Energy_per_100/), pr = nv(p, /^Proteins_per_100/), c = nv(p, /^Carbohydrates_per_100/), f = nv(p, /^Fats_per_100/);
    if ([k, pr, c, f].some(x => x === null)) { stats.noNutrition++; return null; }
    const est = 4 * pr + 4 * c + 9 * f;
    if (k > 950 || Math.abs(k - est) > Math.max(60, 0.5 * est)) { stats.inconsistent++; return null; }
    let name = (gs.internal_product_description || p.name || '').trim();
    const brand = (gs.BrandName || '').trim();
    if (!name) return null;
    if (brand && !name.includes(brand) && brand.length < 30) name += ' · ' + brand;
    const units = [], nw = gs.Net_Content || (gs.Product_Dimensions && gs.Product_Dimensions.Net_Weight);
    const w = nw && parseFloat(nw.value);
    if (w > 0 && w <= 5000 && /גרם|מל|מ"ל/.test(nw.UOM || '')) units.push(['אריזה (' + Math.round(w) + ' גרם)', Math.round(w)]);
    return [name.slice(0, 120), 'מוצרים ארוזים', r1(k), r1(pr), r1(c), r1(f), units, (p.group && p.group.name) || '', String(p.barcode || '')];
  }
  window.__convert = convert;
  for (let d = 1; d <= MAXD && !window.__stop; d++) {
    let from = 0, total = 1, any = false;
    try {
      while (from < total && !window.__stop) {
        stats.reqs++;
        const j = await post({ d, store: STORE, from });
        total = j.total || 0;
        const ps = j.data || [];
        if (!ps.length) break;
        if (!any) { any = true; stats.depts++; console.log('department', d, ps[0].department && ps[0].department.name, 'total', total); }
        for (const p of ps) {
          stats.products++;
          const row = convert(p);
          if (!row) continue;
          const key = row[8] || row[0];
          if (rows.has(key)) { stats.dup++; continue; }
          rows.set(key, row);
        }
        from += ps.length;
        await sleep(DELAY);
      }
    } catch (e) { console.warn('Stopped:', e.message); break; }
    if (!any) await sleep(250);
  }
  const out = [...rows.values()];
  console.log('Done. Kept', out.length, 'products.', stats);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(out)], { type: 'application/json' }));
  a.download = 'rami-foods.json'; document.body.appendChild(a); a.click(); a.remove();
})();
