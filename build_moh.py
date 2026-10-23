# Build moh-foods.json.gz from the MoH Tzameret CSVs (data.gov.il)
import csv,json,gzip,sys,collections
src=sys.argv[1]; out=sys.argv[2]
G={'11':'חלב ומוצריו','12':'חלב ומוצריו','13':'חלב ומוצריו','14':'חלב ומוצריו','21':'בשר ועוף','22':'בשר ועוף','23':'בשר ועוף','24':'בשר ועוף','25':'בשר ועוף','26':'דגים','27':'בשר ועוף','28':'בשר ועוף','31':'ביצים','32':'ביצים','34':'ביצים','41':'קטניות ושונות','42':'שומנים ואגוזים','43':'שומנים ואגוזים','44':'קטניות ושונות','50':'דגנים ולחמים','51':'דגנים ולחמים','52':'דגנים ולחמים','53':'מאפים וחטיפים','54':'מאפים וחטיפים','55':'מאפים וחטיפים','56':'דגנים ולחמים','57':'דגנים ולחמים','58':'מאפים וחטיפים','61':'פירות','62':'פירות','63':'פירות','64':'משקאות','65':'פירות','67':'תינוקות','71':'ירקות עמילניים','72':'ירקות','73':'ירקות','74':'ירקות','75':'קטניות ושונות','76':'תינוקות','77':'מאפים וחטיפים','81':'שומנים ואגוזים','82':'שומנים ואגוזים','83':'רטבים וממתיקים','90':'משקאות','91':'רטבים וממתיקים','92':'משקאות','93':'משקאות','94':'משקאות','95':'רטבים וממתיקים'}
UN={}
for r in csv.DictReader(open(src+'e122a2a9-moh_yehidot_mida.csv',encoding='utf-8-sig')):
    UN[r['smlmida']]=' '.join(r['shmmida'].split())
foods={}
for r in csv.DictReader(open(src+'d18ad221-moh_mitzrachim.csv',encoding='utf-8-sig')):
    foods[r['Code']]=r
un=collections.defaultdict(dict)
for r in csv.DictReader(open(src+'a4f2ef5f-moh_yehidot_mida_lemitzrachim.csv',encoding='utf-8-sig')):
    un[r['mmitzrach']][r['mida']]=float(r['mishkal'])
def f(x):
    try: return round(float(x),1)
    except: return None
rows=[];skip=0
for c,r in foods.items():
    n=r['shmmitzrach'].strip()
    if n.startswith('FFQ'): skip+=1;continue
    k,p,cb,fa=f(r['food_energy']),f(r['protein']),f(r['carbohydrates']),f(r['total_fat'])
    if k is None or p is None or cb is None or fa is None: skip+=1;continue
    us=[];seen=set()
    for m,g in sorted(un.get(c,{}).items(),key=lambda t:(int(t[0]))):
        if m in('700','2000') or m not in UN or g<=0 or g>5000: continue
        nm=UN[m]
        us.append([nm,round(g,1)])
    # disambiguate duplicate names with grams
    cnt=collections.Counter(x[0] for x in us)
    us=[[x[0]+(' ('+('%g'%x[1])+' גרם)' if cnt[x[0]]>1 else ''),x[1]] for x in us][:12]
    rows.append([n,G.get(r['smlmitzrach'][:2],'שונות'),k,p,cb,fa,us])
import re
RAW=re.compile(r'לא\s*מבושל|לא\s*בושל|לא\s*מוכן|גולמי|\bנא\b|ללא בישול|לפנ הבישול')
COOK=re.compile(r'מבושל|אפוי|אפויה|מטוגן|מאודה|קלוי|צלוי|מוקפץ|מבושלת|בגריל|מוכן')
NEED={'בשר ועוף','דגים','דגנים ולחמים','קטניות ושונות','ירקות עמילניים','ביצים'}
def raw(r):
    n,c=r[0],r[1]
    if c not in NEED: return False
    if RAW.search(n) and not re.search(r'שיבולת שועל',n): return True
    if c=='ירקות עמילניים' and re.search(r'טרי|נא',n) and not COOK.search(n): return True
    if c=='קטניות ושונות' and re.search(r'יבש(ה|ים|ות)?\b',n) and not COOK.search(n): return True
    return False
dropped=[r for r in rows if raw(r)]
rows=[r for r in rows if not raw(r)]
print(len(dropped),'uncooked foods dropped');open('/tmp/dropped.txt','w').write('\n'.join(r[1]+' | '+r[0] for r in dropped))
rows=[r+['m'] for r in rows]
NO_MOH=True  # Tzameret removed for now: keep only retailer (Victory) and Open Food Facts products
if NO_MOH: rows=[]
def norm(n):
    n=re.sub(r'\s*[·|].*$','',n) if False else n
    n=re.sub(r"[\"'`׳״\u05f3()\[\].,/\\\-–·:*]",' ',n.lower())
    n=re.sub(r'\b\d+([.,]\d+)?\s*(x\s*\d+\s*)?(גרם|גר|ג|קג|ק"ג|מל|מ"ל|ל|ליטר|יח|יחידות|gr|g|ml|l|kg)?\b',' ',n)
    return re.sub(r'\s+',' ',n).strip()
def clean(n):
    n=n.strip().lstrip("'\"`׳ ")
    n=re.sub(r"\s*\(?\d+\s*[xX×]\s*\d+(\.\d+)?\s*(גרם|גר|ג)?\)?\s*$",'',n)
    n=re.sub(r"\s+\d+([.,]\d+)?\s*(גרם|גר'?|ג'?|קג|ק\"ג|מ\"ל|מל|ל'|ליטר|ל|יח'?)\s*(?=\s*·|$)",'',n)
    n=re.sub(r'\s*·\s*',' · ',n)
    n=re.sub(r'\s*\d+\s*[*xX×]\s*\d+(\.\d+)?\s*(גרם|גר|ג|מל)?(?![א-ת])','',n)
    n=re.sub(r'\s+חדש(?=\s|$)','',n)
    n=re.sub(r"\s+",' ',n).strip(' ·-')
    return n
CATS0=[('משקאות',r'משקה|מיץ|נקטר|סודה|קולה|בירה|יין|שוופס|פיוז|תה|קפה|מים|מיספרייט|פאנטה|סירופ לשתייה|אנרגיה|קרח'),
('חלב ומוצריו',r'חלב|יוגורט|גבינ|קוטג|שמנת|לבן|לאבנה|חמאה|מעדן|דנונה|שוקו|אשל|מילקי|פודינג|גלידה|קפיר|בולגרית|מוצרלה|ריקוטה|פרמזן'),
('ביצים',r'ביצ'),
('בשר ועוף',r'עוף|הודו|בקר|נקניק|פסטרמה|שניצל|קבב|המבורגר|כבד|בשר|נקניקיות|נגטס|כנפיים|סטייק|טחון'),
('דגים',r'דג|טונה|סלמון|סרדין|הרינג|שנית|פילה אמנון|מושט|בקלה|אנשובי'),
('פירות',r'פירות|תפוח|בננה|תמר|צימוק|משמש|תאנ|ענבים|אבטיח|מנגו|אננס|דובדבן|פירה פירות'),
('ירקות',r'ירקות|גזר|עגבני|מלפפון|בצל|שום|פלפל|חסה|כרוב|ברוקולי|תירס|אפונה|חצילים|זיתים|מלפפונים|סלק|פטריות|שעועית|קישוא'),
('דגנים ולחמים',r'לחם|פיתה|חלה|לחמני|טורטיה|פסטה|אטריות|ספגטי|אורז|קוסקוס|בורגול|קורנפלקס|דגני|גרנולה|שיבולת|קמח|פתיתים|קרקר|פריכיות|לחמניה|בייגל|נודלס|מקרוני|פוסילי|קינואה'),
('שומנים ואגוזים',r'שמן|שקדים|אגוז|בוטנ|קשיו|פיסטוק|טחינה|גרעינ|פקאן|שומשום|חמאת|מרגרינה|אגוזי|פיצוחים|צנוברים'),
('קטניות ושונות',r'חומוס|עדשים|שעועית|פול |גרגרי|טופו|סויה|סייטן|קטניות'),
('רטבים וממתיקים',r'רוטב|קטשופ|מיונז|חרדל|חומץ|דבש|ריבה|סילאן|סוכר|ממתיק|שוקולד|סוכריות|מרשמלו|ממרח|תבלין|מלח|פלפל שחור|אבקת|קקאו|מסטיק|חלווה|פרלינ'),
('מאפים וחטיפים',r'עוגי|עוגה|חטיף|במבה|ביסלי|צ.יפס|פופקורן|וופל|ביסקוויט|קרקר|פיצה|בורקס|בצק|מאפה|קרואסון|דוריטוס|פרינגלס|ופל|פחזנית|קפיץ'),]
ORDER=['ביצים','בשר ועוף','דגים','רטבים וממתיקים','שומנים ואגוזים','קטניות ושונות','מאפים וחטיפים','דגנים ולחמים','ירקות','פירות','חלב ומוצריו','משקאות']
CATS=sorted(CATS0,key=lambda t:ORDER.index(t[0]))
def cat(n):
    head=' '.join(re.sub(r'\s*[·].*$','',n).split()[:2])
    for scope in (head,re.sub(r'\s*[·].*$','',n)):
        for c,p in CATS:
            if re.search(r'(?<![א-ת])(?:'+p+')',scope): return c
    return 'מוצרים ארוזים'
if len(sys.argv)>4:
    # Victory (GS1 data from the retailer) takes priority over Open Food Facts
    keys={norm(r[0]) for r in rows}
    vic=[];vk=set()
    for r in json.load(open(sys.argv[4],encoding='utf-8')):
        n=clean(r[0]);k=norm(n)
        if not n or k in keys or k in vk: continue
        vk.add(k);vic.append([n,cat(n)]+r[2:6]+[r[6],'v'])
    rows+=vic;keys|=vk;print(len(vic),'Victory products added')
SITE={'מוצרי חלב  וביצים':'חלב ומוצריו','מוצרי חלב וביצים':'חלב ומוצריו','פירות וירקות':'ירקות','בשר, עוף ודגים':'בשר ועוף','משקאות, יין ואלכוהול':'משקאות','לחמים ומאפים':'דגנים ולחמים'}
if len(sys.argv)>5:
    # Yochananof (retailer data) - second priority after Victory
    yk=0
    for r in json.load(open(sys.argv[5],encoding='utf-8')):
        n=clean(r[0]);k=norm(n)
        if not n or k in keys: continue
        c=cat(n)
        if c=='מוצרים ארוזים': c=SITE.get(r[7].strip(),c)
        keys.add(k);rows.append([n,c]+r[2:6]+[r[6],'y']);yk+=1
    print(yk,'Yochananof products added')
if len(sys.argv)>6:
    # Shufersal (retailer site data) - after Victory and Yochananof
    sk=0
    SS={'חלב וגבינות':'חלב ומוצריו','פירות וירקות':'ירקות','בשר עוף ודגים':'בשר ועוף','משקאות':'משקאות','מאפיה ולחם':'דגנים ולחמים'}
    for r in json.load(open(sys.argv[6],encoding='utf-8')):
        n=clean(r[0]);k=norm(n)
        if not n or k in keys: continue
        c=cat(n)
        if c=='מוצרים ארוזים': c=SS.get(r[7].strip(),c)
        keys.add(k);rows.append([n,c]+r[2:6]+[r[6],'s']);sk+=1
    print(sk,'Shufersal products added')
if len(sys.argv)>8:
    # Rami Levy (retailer data incl. barcode) - after Shufersal
    rk=0
    for r in json.load(open(sys.argv[8],encoding='utf-8')):
        n=clean(r[0]);k=norm(n)
        if not n or k in keys: continue
        keys.add(k);rows.append([n,cat(n)]+r[2:6]+[r[6],'r']);rk+=1
    print(rk,'Rami Levy products added')
if len(sys.argv)>3:
    n0=len(rows)
    for r in json.load(gzip.open(sys.argv[3],'rt',encoding='utf-8')):
        k,p,c,f=r[2:6];est=4*p+4*c+9*f;nk=norm(r[0])
        if abs(k-est)>max(60,0.5*est) or nk in keys: continue
        keys.add(nk);rows.append(r+['o'])
    print(len(rows)-n0,'Open Food Facts products added')
print(len(rows),'foods',skip,'skipped')
# --- barcodes: ean -> row index (only valid GTIN-8/12/13/14 check digits; other ids are ignored)
def gtin_ok(c):
    if not c.isdigit() or len(c) not in (8,12,13,14): return False
    d=[int(x) for x in c[::-1]];return (10-(sum(d[1::2])*3+sum(d[2::2]))%10)%10==d[0]
if len(sys.argv)>7:
    kmap={}
    for i,r in enumerate(rows): kmap.setdefault(norm(r[0]),i)
    bcs={};bad=0
    for a in (4,5,6,8):
        if len(sys.argv)<=a: continue
        for r in json.load(open(sys.argv[a],encoding='utf-8')):
            if len(r)<9: continue
            c=str(r[8]).strip().lstrip('0') if False else str(r[8]).strip()
            if not gtin_ok(c): bad+=1;continue
            i=kmap.get(norm(clean(r[0])))
            if i is not None: bcs.setdefault(c,i)
    print(len(bcs),'barcodes mapped,',bad,'ids ignored (not valid barcodes)')
    json.dump(bcs,gzip.open(sys.argv[7],'wt',encoding='utf-8',compresslevel=9),separators=(',',':'))
json.dump(rows,gzip.open(out,'wt',encoding='utf-8',compresslevel=9),ensure_ascii=False,separators=(',',':'))
import os;print(os.path.getsize(out)//1024,'KB gz')
