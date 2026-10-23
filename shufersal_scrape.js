/* DOR FIT - Shufersal nutrition export.
   How to run: open https://www.shufersal.co.il/online/he in Chrome, press F12, open the "Console" tab,
   paste this whole file, press Enter. Leave the tab open. When it finishes, a file
   "shufersal-foods.json" is downloaded. To stop early (and still download what was collected):
   type  window.__stop=true  in the console. Test run: set  window.__limit=2  before pasting.
   It sends about 5 requests per second and only reads public product data. */
(async () => {
  const DELAY = 200, LIMIT = window.__limit || 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const SKIP = /ניקיון|ניקוי|פארם|טיפוח|תינוק|חיות|בעלי חיים|חד פעמי|בית וגן|מטבח|אלקטרוניקה|ביגוד|צעצוע|משרד|מבצע|SBOX|כלי/;
  const html = async u => { const r = await fetch(u, { credentials: 'same-origin' }); if (r.status === 429 || r.status === 403) throw new Error('blocked ' + r.status); return new DOMParser().parseFromString(await r.text(), 'text/html'); };
  const prodsOf = d => [...d.querySelectorAll('li[data-product-code]')].map(l => ({ code: l.dataset.productCode, name: (l.dataset.productName || '').trim(), tile: l.textContent.replace(/\s+/g, ' ') }));
  // 1. food categories (found by checking the site; other codes do not exist or are not food)
  const cats = [['A01','חלב וגבינות'],['A04','פירות וירקות'],['A07','בשר עוף ודגים'],['A10','מאפיה ולחם'],['A13','משקאות'],['A15','מוצרים בפיקוח'],['A16','מזון מקורר וקפוא'],['A17','סלטים ונקניקים'],['A22','בישול אפיה ושימורים'],['A25','חטיפים ממתקים ודגנים'],['A28','אורגני ובריאות'],['A36','מעושר בחלבון']].map(([code, name]) => ({ code, name }));
  console.log('Categories:', cats.map(c => c.code + ' ' + c.name).join(' | '));
  const list = LIMIT ? cats.slice(0, LIMIT) : cats;
  // 2. collect product codes
  const prods = new Map();
  for (const c of list) {
    if (window.__stop) break;
    for (let pg = 0; pg < 200 && !window.__stop; pg++) {
      let ps; try { ps = prodsOf(await html('/online/he/c/' + c.code + '?q=:relevance&page=' + pg)) } catch (e) { console.warn(e.message); break }
      const nw = ps.filter(p => !prods.has(p.code)); if (!nw.length) break;
      nw.forEach(p => prods.set(p.code, { ...p, site: c.name }));
      await sleep(DELAY);
    }
    console.log(c.name, '- products so far:', prods.size);
  }
  // 3. read nutrition
  const rows = new Map(), st = { total: prods.size, noNut: 0, bad: 0, done: 0 };
  const r1 = x => Math.round(x * 10) / 10, num = s => { const v = parseFloat(String(s).replace(',', '.')); return isNaN(v) ? null : v };
  for (const p of prods.values()) {
    if (window.__stop) break;
    st.done++; if (st.done % 100 === 0) console.log(st.done + '/' + st.total, 'kept', rows.size);
    try {
      const d = await html('/online/he/p/' + p.code + '/json');
      const basis = (d.querySelector('.nutritionListTitle .subInfo') || {}).textContent || '';
      if (!/100/.test(basis)) { st.noNut++; continue }
      const g = {};
      d.querySelectorAll('.nutritionItem').forEach(e => { const t = (e.querySelector('.text') || {}).textContent.trim(), v = num((e.querySelector('.number') || {}).textContent); if (v !== null) g[t] = v });
      const k = g['אנרגיה'], pr = g['חלבונים'], c = g['פחמימות'], f = g['שומנים'];
      if ([k, pr, c, f].some(x => x === undefined)) { st.noNut++; continue }
      const est = 4 * pr + 4 * c + 9 * f;
      if (k > 950 || Math.abs(k - est) > Math.max(60, 0.5 * est)) { st.bad++; continue }
      let name = p.name, units = [];
      const m = p.tile.match(/([\d.,]+)\s*(ק"ג|קילוגרם|גרם|ליטר|מ"ל)\s*\|\s*([^|\d]+?)\s*\d+\.\d{2}\s*₪/);
      if (m) {
        let w = num(m[1]); if (/ק"ג|קילו|ליטר/.test(m[2])) w *= 1000;
        const brand = m[3].trim();
        if (brand && !name.includes(brand)) name += ' · ' + brand;
        if (w >= 5 && w <= 5000) units.push(['אריזה (' + Math.round(w) + ' גרם)', Math.round(w)]);
      }
      if (name) rows.set(p.code, [name.slice(0, 120), 'מוצרים ארוזים', r1(k), r1(pr), r1(c), r1(f), units, p.site, String(p.code || '').replace(/^P_/, '')]);
    } catch (e) { console.warn(e.message); if (/blocked/.test(e.message)) break }
    await sleep(DELAY);
  }
  console.log('Finished', st, 'rows', rows.size);
  const blob = new Blob([JSON.stringify([...rows.values()])], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'shufersal-foods.json'; document.body.appendChild(a); a.click(); a.remove();
})();
