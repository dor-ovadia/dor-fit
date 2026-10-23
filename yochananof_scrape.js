/* DOR FIT - Yochananof nutrition export.
   How to run: open https://yochananof.co.il in Chrome, press F12, open the "Console" tab,
   paste this whole file, press Enter. Leave the tab open. When it finishes, a file
   "yochananof-foods.json" is downloaded. To stop early: type  window.__stop=true  in the console.
   It sends about 1.5 requests per second and only reads public product data. */
(async () => {
  const API = 'https://api.yochananof.co.il/graphql', DELAY = 650, SIZE = 100;
  const LIMIT = window.__limit || 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const SKIP = /ניקיון|בעלי חיים|חד פעמי|משטחים|שיווק|משאבי אנוש|סחר|קופונים|מבצעים|פארם|תינוקות|\d{1,2}-\d{1,2}\.\d{1,2}\.\d{2}/;
  const gql = async (query, variables) => {
    const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (r.status === 429 || r.status === 403) throw new Error('blocked ' + r.status);
    return r.json();
  };
  const tree = await gql(`{categories{items{children{uid name}}}}`, {});
  let cats = (tree.data.categories.items[0].children || []).filter(c => !SKIP.test(c.name));
  if (LIMIT) cats = cats.slice(0, LIMIT);
  console.log('Categories to read:', cats.map(c => c.name).join(' | '));
  const Q = `query($f:ProductAttributeFilterInput!,$p:Int,$s:Int!){products(filter:$f,currentPage:$p,pageSize:$s){total_count items{sku name brand baseprice_product_amount baseprice_product_unit nutritionals{mida items{ingredient qty unit}}}}}`;
  const rows = new Map(), stats = { products: 0, noNutrition: 0, inconsistent: 0, dup: 0, reqs: 0 };
  const r1 = x => Math.round(x * 10) / 10;
  const get = (grp, test) => {
    const it = (grp.items || []).find(i => test(i.ingredient || ''));
    const v = it ? parseFloat(String(it.qty).replace(',', '.')) : NaN;
    return isNaN(v) ? null : v;
  };
  const isK = n => /אנרגיה|קלוריות/.test(n), isP = n => /^חלבונ/.test(n), isC = n => /^סך הפחמימות|^פחמימות/.test(n), isF = n => n === 'שומנים' || /^שומנים \(/.test(n) || n === 'סך שומנים';
  function convert(p, siteCat) {
    const ns = p.nutritionals || [];
    const g100 = ns.find(x => /100/.test(x.mida || ''));
    if (!g100) return null;
    const k = get(g100, isK), pr = get(g100, isP), c = get(g100, isC), f = get(g100, isF);
    if ([k, pr, c, f].some(x => x === null)) return null;
    const est = 4 * pr + 4 * c + 9 * f;
    if (k > 950 || Math.abs(k - est) > Math.max(60, 0.5 * est)) { stats.inconsistent++; return 'bad'; }
    let name = (p.name || '').trim();
    if (!name) return null;
    const brand = (p.brand || '').trim();
    if (brand && !name.includes(brand)) name += ' · ' + brand;
    const units = [];
    const sv = ns.find(x => /מנה/.test(x.mida || ''));
    if (sv) {
      const pairs = [[get(sv, isC), c], [get(sv, isF), f], [get(sv, isP), pr], [get(sv, isK), k]].filter(([a, b]) => a != null && b > 5);
      if (pairs.length) { const g = Math.round(100 * pairs[0][0] / pairs[0][1]); if (g >= 3 && g <= 1500) units.push(['מנה (' + g + ' גרם)', g]); }
    }
    const w = p.baseprice_product_amount, u = p.baseprice_product_unit;
    if (w > 0 && w <= 5000 && (u === 'גרם' || u === 'מ"ל' || u === 'מל')) units.push(['אריזה (' + w + ' גרם)', w]);
    return { key: p.sku || name, row: [name.slice(0, 120), 'מוצרים ארוזים', r1(k), r1(pr), r1(c), r1(f), units, siteCat, p.sku || ''] };
  }
  let ci = 0;
  for (const cat of cats) {
    ci++;
    if (window.__stop) break;
    let page = 1, total = 1, got = 0;
    try {
      while (got < total && !window.__stop) {
        stats.reqs++;
        const j = await gql(Q, { f: { category_uid: { eq: cat.uid } }, p: page, s: SIZE });
        if (j.errors || !j.data) { console.warn('API error', j.errors && j.errors[0].message); break; }
        total = j.data.products.total_count;
        const ps = j.data.products.items || [];
        if (!ps.length) break;
        for (const p of ps) {
          stats.products++;
          const c = convert(p, cat.name);
          if (c === null) { stats.noNutrition++; continue; }
          if (c === 'bad') continue;
          if (rows.has(c.key)) { stats.dup++; continue; }
          rows.set(c.key, c.row);
        }
        got += ps.length; page++;
        if (LIMIT && page > 2) break;
        await sleep(DELAY);
      }
    } catch (e) { console.warn('Stopped:', e.message); break; }
    console.log(`category ${ci}/${cats.length} (${cat.name}) - kept ${rows.size} products`, stats);
  }
  const out = [...rows.values()];
  console.log('Done. Kept', out.length, 'products.', stats);
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'yochananof-foods.json';
  document.body.appendChild(a); a.click(); a.remove();
  window.__yochananof = out;
})();
