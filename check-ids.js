// node check-ids.js dorfit-backup-YYYY-MM-DD.json
// Run on the JSON from the coach's "export" (GET /api/export) BEFORE deploying the stricter id validation:
// lists every "id" in the library that the new rule (letters, digits, _ . : - , max 40 chars) would reject.
const fs = require('fs');
const f = process.argv[2];
if (!f) { console.error('usage: node check-ids.js <export.json>'); process.exit(2); }
const RE = /^[A-Za-z0-9_.:-]{1,40}$/;
const data = JSON.parse(fs.readFileSync(f, 'utf8'));
let bad = 0;
const walk = (v, where, d = 0) => {
  if (d > 12 || !v || typeof v !== 'object') return;
  if (Array.isArray(v)) return v.forEach(x => walk(x, where, d + 1));
  for (const [k, x] of Object.entries(v)) {
    if (k === 'id' && typeof x === 'string' && !RE.test(x)) { bad++; console.log('BAD id', JSON.stringify(x), 'in', where); }
    walk(x, where, d + 1);
  }
};
(data.docs || []).filter(r => ['prog', 'plan', 'ex', 'food', 'msg'].includes(r.type)).forEach(r => walk(r.data, r.type + ' ' + r.id));
console.log(bad ? bad + ' id(s) would be rejected - fix them first' : 'all ids OK');
process.exit(bad ? 1 : 0);
