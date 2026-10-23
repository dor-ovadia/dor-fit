# usage: python3 build_ex.py free-exercise-db.json filtered.json he.txt out.gz tips.txt
# row: [hebrewName, group, equipment, imageFolderId, englishName, tip]
# he.txt lines: idx|hebrew name (idx = position in filtered.json)
import sys,json,gzip
f=json.load(open(sys.argv[2])); he={}
for l in open(sys.argv[3],encoding='utf-8'):
    l=l.strip()
    if '|' in l:
        i,n=l.split('|',1); he[int(i)]=n.strip()
G={'chest':'חזה','lats':'גב','middle back':'גב','lower back':'גב','traps':'גב','shoulders':'כתפיים',
 'quadriceps':'רגליים','hamstrings':'רגליים','glutes':'רגליים','calves':'רגליים','adductors':'רגליים','abductors':'רגליים',
 'biceps':'יד קדמית','forearms':'יד קדמית','triceps':'יד אחורית','abdominals':'בטן','neck':'אחר'}
E={'barbell':'מוט','dumbbell':'משקולות','cable':'כבלים','machine':'מכונה','body only':'משקל גוף','bands':'גומיות',
 'kettlebells':'קטלבל','e-z curl bar':'מוט EZ','exercise ball':'כדור פיזיו','medicine ball':'כדור כוח','other':'אחר',None:'אחר'}
AL={'לחיצת חזה במשקולות בשיפוע':'Incline Dumbbell Press','פרפר בכבלים':'Cable Crossover','לחיצת כתפיים בישיבה':'Seated Dumbbell Press',
 'הרמות צד':'Side Lateral Raise','הרמות אחוריות (כתף אחורית)':'Seated Bent-Over Rear Delt Raise','משיכת פולי עליון':'Wide-Grip Lat Pulldown',
 'חתירה עם מוט':'Bent Over Barbell Row','חתירה במשקולת ביד אחת':'One-Arm Dumbbell Row','סקוואט':'Barbell Squat','מכרעים':'Dumbbell Lunges',
 'יישור ברכיים':'Leg Extensions','הרמות עקבים (תאומים)':'Standing Calf Raises','גשר אגן (היפ תראסט)':'Barbell Hip Thrust',
 'כפיפת מרפקים עם משקולות':'Dumbbell Bicep Curl','כפיפת פטישים':'Hammer Curls','פשיטת מרפקים בכבל':'Triceps Pushdown',
 'לחיצה צרפתית':'EZ-Bar Skullcrusher','הרמות רגליים בתלייה':'Hanging Leg Raise'}
tips={}
if len(sys.argv)>5:
    for l in open(sys.argv[5],encoding='utf-8'):
        if '|' in l:
            i,t=l.split('|',1); tips[int(i)]=t.strip()
tipid={f[i]['id']:t for i,t in tips.items()}
rows=[];seen=set()
for i,x in enumerate(f):
    n=he.get(i)
    if not n or n in seen: continue
    seen.add(n)
    rows.append([n,G.get(x['primaryMuscles'][0],'אחר'),E.get(x['equipment'],'אחר'),x['id'],x['name'],tips.get(i,'')])
byen={x['name']:x for x in f}
for n,en in AL.items():
    x=byen[en]; seen.add(n); rows.append([n,G.get(x['primaryMuscles'][0],'אחר'),E.get(x['equipment'],'אחר'),x['id'],x['name'],tipid.get(x['id'],'')])
with gzip.open(sys.argv[4],'wt',encoding='utf-8',compresslevel=9) as o: json.dump(rows,o,ensure_ascii=False,separators=(',',':'))
print(len(rows))
