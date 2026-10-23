#!/usr/bin/env python3
"""Extract Israeli products from the Open Food Facts CSV dump into a small JSON file.
Usage:  python3 off_israel.py en.openfoodfacts.org.products.csv.gz  off-israel.json.gz
Works directly on the .gz (no need to unzip 12GB). Also accepts an already unzipped .csv."""
import csv, gzip, json, sys, re
csv.field_size_limit(10**9)
src, out = sys.argv[1], sys.argv[2]
op = gzip.open if src.endswith('.gz') else open
def num(x):
    try: return float(x)
    except: return None
rows, seen, total = [], set(), 0
with op(src, 'rt', encoding='utf-8', errors='replace', newline='') as f:
    rd = csv.DictReader(f, delimiter='\t')
    for r in rd:
        total += 1
        if total % 500000 == 0: print(total, 'rows read,', len(rows), 'kept', flush=True)
        if 'israel' not in (r.get('countries_tags') or '').lower(): continue
        name = (r.get('product_name_he') or r.get('product_name') or '').strip()
        if not name: continue
        brand = (r.get('brands') or '').split(',')[0].strip()
        k = num(r.get('energy-kcal_100g'))
        if k is None:
            kj = num(r.get('energy_100g'))
            k = kj / 4.184 if kj is not None else None
        p, c, fa = num(r.get('proteins_100g')), num(r.get('carbohydrates_100g')), num(r.get('fat_100g'))
        if None in (k, p, c, fa) or not (0 <= k <= 950) or max(p, c, fa) > 100: continue
        full = (name + (' · ' + brand if brand and brand.lower() not in name.lower() else ''))[:120]
        key = full.lower()
        if key in seen: continue
        seen.add(key)
        units = []
        sq = num(r.get('serving_quantity'))
        if sq and 0 < sq <= 2000: units.append(['מנה (%g גרם)' % round(sq, 1), round(sq, 1)])
        cat = 'מוצרים ארוזים'
        rows.append([full, cat, round(k, 1), round(p, 1), round(c, 1), round(fa, 1), units])
print(total, 'rows read;', len(rows), 'Israeli products kept')
with gzip.open(out, 'wt', encoding='utf-8', compresslevel=9) as o:
    json.dump(rows, o, ensure_ascii=False, separators=(',', ':'))
