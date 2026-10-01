# VoiceMaster — מדריך מלא לחיבור Hugging Face Storage

## מטרת המערכת

המטרה היא להעביר את נתוני VoiceMaster מאחסון בדפדפן ל־Hugging Face Storage Bucket פרטי.

המערכת המומלצת:

~~~text
דפדפן
  ↓
Vercel API / Server Function
  ↓
Hugging Face Storage Bucket
~~~

Hugging Face Storage Buckets הם Object Storage בסגנון S3: הם מתאימים לקבצי אודיו, JSON ונתונים משתנים, אך אינם Database רלציוני עם Transactions.  
מקורות רשמיים: https://huggingface.co/docs/hub/storage-buckets ו־https://huggingface.co/docs/hub/storage-buckets-s3

---

## 1. יצירת Bucket

פתח:

https://huggingface.co/storage

בחר **Create a Bucket**.

מומלץ ליצור Bucket בשם:

~~~text
voicemaster-data
~~~

ולבחור **Private**.

אפשר ליצור גם דרך CLI:

~~~bash
hf buckets create voicemaster-data --private
~~~

לאחר מכן הכתובת תהיה בסגנון:

~~~text
hf://buckets/YOUR_USERNAME/voicemaster-data
~~~

כאשר YOUR_USERNAME הוא שם המשתמש שלך ב־Hugging Face.

---

## 2. מבנה התיקיות

המבנה המומלץ:

~~~text
voicemaster-data/
├── _system/
│   ├── stats.json
│   ├── settings.json
│   └── daily/
│       └── 2026-10-01.json
│
└── users/
    ├── USER_ID_1/
    │   ├── profile.json
    │   ├── stats.json
    │   └── voiceovers/
    │       ├── VOICEOVER_ID_1/
    │       │   ├── metadata.json
    │       │   └── audio.mp3
    │       └── VOICEOVER_ID_2/
    │           ├── metadata.json
    │           └── audio.mp3
    │
    └── USER_ID_2/
        ├── profile.json
        ├── stats.json
        └── voiceovers/
            └── ...
~~~

כך לכל משתמש יש אזור נפרד.

---

## 3. יצירת הרשאות

Hugging Face מאפשרת גישה ל־Storage Buckets דרך S3-compatible API.

ב־Hugging Face:

1. פתח Settings.
2. היכנס ל־Access Tokens.
3. צור Token עם ההרשאות הנדרשות.
4. מתוך תפריט ה־Token בחר **Generate S3 credentials**.
5. שמור את:
   - Access Key ID
   - Secret Access Key

ה־Secret Access Key מוצג רק פעם אחת.

תיעוד רשמי:
https://huggingface.co/docs/hub/storage-buckets-s3

---

## 4. חשוב מאוד — הסודות נשארים בשרת

אסור להכניס את ה־S3 credentials לקוד React.

אסור למשל ליצור:

~~~text
VITE_HF_S3_SECRET_ACCESS_KEY
~~~

משתני VITE עלולים להגיע לקוד שנשלח לדפדפן.

במקום זאת:

~~~text
דפדפן
  ↓
API של Vercel
  ↓
S3 API של Hugging Face
~~~

כך המשתמש אינו מקבל את הסודות.

---

## 5. משתני הסביבה ב־Vercel

ב־Vercel פתח:

**Project → Settings → Environment Variables**

הוסף:

| משתנה | ערך |
|---|---|
| HF_S3_ACCESS_KEY_ID | ה־Access Key ID של Hugging Face |
| HF_S3_SECRET_ACCESS_KEY | ה־Secret Access Key |
| HF_STORAGE_NAMESPACE | שם המשתמש או הארגון ב־Hugging Face |
| HF_STORAGE_BUCKET | voicemaster-data |
| HF_S3_REGION | us-east-1 |
| HF_S3_ENDPOINT | https://s3.hf.co |

דוגמה:

~~~text
HF_S3_ACCESS_KEY_ID=HFAKxxxxxxxx
HF_S3_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxx
HF_STORAGE_NAMESPACE=YOUR_HF_USERNAME
HF_STORAGE_BUCKET=voicemaster-data
HF_S3_REGION=us-east-1
HF_S3_ENDPOINT=https://s3.hf.co
~~~

את הערכים האמיתיים לא מכניסים ל־GitHub.

Hugging Face מתעדת את endpoint, region ו־path-style הנדרשים עבור S3.  
https://huggingface.co/docs/hub/storage-buckets-s3

---

## 6. חיבור השרת ל־Hugging Face

הפרויקט הנוכחי הוא Vite + React.

לכן צריך להוסיף שכבת Server/API ב־Vercel. החלק הזה חייב לרוץ בצד השרת ולא בתוך React.

החיבור ל־S3 צריך להשתמש בערכים:

~~~text
endpoint = https://s3.hf.co/YOUR_HF_USERNAME
region = us-east-1
addressing style = path
~~~

וה־credentials מתוך משתני הסביבה.

---

## 7. SDK מומלץ

אפשר להשתמש ב־AWS SDK עבור S3:

~~~bash
npm install @aws-sdk/client-s3
~~~

ה־SDK הוא רק הלקוח שמדבר עם ה־S3-compatible API. הנתונים עצמם נשמרים ב־Hugging Face.

---

## 8. נתונים כלליים

קובץ:

~~~text
_system/stats.json
~~~

יכול להכיל לדוגמה:

~~~json
{
  "users": 0,
  "voiceoversCreated": 0,
  "voiceoversToday": 0,
  "totalCharacters": 0,
  "lastUpdated": "2026-10-01T12:30:00.000Z"
}
~~~

אפשר להוסיף בעתיד נתונים כגון:

- מספר משתמשים
- מספר קריינויות
- מספר קריינויות היום
- מספר תווים שנקריינו
- שימוש לפי קול
- נתונים יומיים
- נתונים חודשיים

---

## 9. נתונים אישיים של משתמש

לכל משתמש צריך להיות מזהה יציב וייחודי.

לדוגמה:

~~~text
users/550e8400-e29b-41d4-a716-446655440000/
~~~

בתוך התיקייה:

~~~text
profile.json
stats.json
voiceovers/
~~~

אין להשתמש בשם תצוגה בתור מזהה אבטחה.

---

## 10. שמירת פרופיל

לדוגמה:

~~~json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "createdAt": "2026-10-01T12:00:00.000Z",
  "updatedAt": "2026-10-01T12:30:00.000Z"
}
~~~

יש לשמור רק מידע שבאמת נדרש לאתר.

---

## 11. שמירת קריינויות

במקום לשמור קריינויות ב־localStorage, ה־Frontend צריך לשלוח אותן ל־API.

לדוגמה:

~~~text
POST /api/voiceovers
~~~

ה־API יקבל נתונים כגון:

~~~json
{
  "text": "הטקסט לקריינות",
  "voice": "VOICE_NAME",
  "createdAt": "2026-10-01T12:30:00.000Z"
}
~~~

השרת ייצור מזהה קריינות וישמור:

~~~text
users/USER_ID/voiceovers/VOICEOVER_ID/metadata.json
~~~

ואם רוצים לשמור גם את קובץ האודיו:

~~~text
users/USER_ID/voiceovers/VOICEOVER_ID/audio.mp3
~~~

---

## 12. טעינת הקריינויות

במקום לקרוא מ־localStorage:

~~~text
GET /api/voiceovers
~~~

השרת יזהה את המשתמש ויחזיר רק את הקריינויות שלו.

כך היסטוריית הקריינויות תהיה זמינה גם ממכשיר אחר, ולא רק מהדפדפן שבו היא נוצרה.

---

## 13. API מומלץ

מומלץ לבנות בהמשך את ה־API כך:

~~~text
GET    /api/voiceovers
POST   /api/voiceovers
GET    /api/voiceovers/:id
DELETE /api/voiceovers/:id

GET    /api/stats
GET    /api/users/me
DELETE /api/users/me
~~~

אם האפליקציה תאפשר עריכת קריינויות:

~~~text
PUT /api/voiceovers/:id
~~~

---

## 14. אבטחת משתמשים

השרת חייב לבדוק שהמשתמש מורשה לגשת ל־USER_ID המבוקש.

אסור לסמוך רק על פרמטר שהגיע מהדפדפן, למשל:

~~~text
/api/voiceovers?userId=USER_ID
~~~

השרת צריך לקבוע את המשתמש מתוך מערכת ההתחברות/הזדהות של האתר.

רק לאחר שהשרת אימת את המשתמש ניתן לגשת לנתיב:

~~~text
users/USER_ID/
~~~

---

## 15. מונים וסטטיסטיקות

יש לשים לב ש־Storage Bucket אינו Database עם Transactions.

פעולה כמו:

~~~text
קרא stats.json
↓
הוסף 1
↓
שמור stats.json
~~~

עלולה ליצור התנגשות אם שתי בקשות מתבצעות במקביל.

לכן עבור מערכת גדולה יותר מומלץ לשמור אירועים או נתונים יומיים, למשל:

~~~text
_system/daily/2026-10-01.json
_system/daily/2026-10-02.json
~~~

או:

~~~text
_system/events/2026-10-01/EVENT_ID.json
~~~

ואז לחשב את הסטטיסטיקות מהאירועים.

עבור מערכת קטנה, אפשר להתחיל עם stats.json בצד השרת ולשפר את המנגנון בהמשך.

---

## 16. בדיקת החיבור

לפני שמעבירים את כל המערכת, מומלץ ליצור endpoint זמני:

~~~text
GET /api/storage-test
~~~

הוא יבצע:

1. כתיבת JSON קטן.
2. קריאת ה־JSON.
3. בדיקת התוכן.
4. מחיקת קובץ הבדיקה.
5. החזרת תשובה:

~~~json
{
  "ok": true
}
~~~

רק לאחר שהבדיקה עובדת כדאי לחבר את מערכת הקריינויות.

---

## 17. מחיקת משתמש

כדאי לתכנן מראש מחיקה מלאה של נתוני משתמש:

~~~text
DELETE /api/users/me
~~~

הפעולה תמחק את:

~~~text
users/USER_ID/
~~~

כולל:

- profile
- stats
- היסטוריית קריינויות
- קבצי אודיו
- נתונים נוספים שהאתר יוסיף בעתיד

---

## 18. פרטיות

מומלץ לא לשמור נתונים שאין בהם צורך.

אם נשמר טקסט שהמשתמש ביקש לקריין, יש להתייחס אליו כאל מידע שעשוי להיות אישי.

לכן ה־Bucket צריך להיות **Private**.

אין להפוך את תיקיית המשתמשים לציבורית רק כדי להקל על טעינת קבצים.

---

## 19. קבצי אודיו

אם הקריינות נוצרת כבר באמצעות שירות חיצוני ומתקבל קובץ אודיו, אפשר להעלות את הקובץ ל־Bucket.

לדוגמה:

~~~text
users/USER_ID/voiceovers/VOICEOVER_ID/audio.mp3
~~~

את ה־metadata אפשר לשמור בנפרד:

~~~text
users/USER_ID/voiceovers/VOICEOVER_ID/metadata.json
~~~

לדוגמה:

~~~json
{
  "id": "VOICEOVER_ID",
  "text": "הטקסט",
  "voice": "VOICE_NAME",
  "createdAt": "2026-10-01T12:30:00.000Z",
  "audioKey": "users/USER_ID/voiceovers/VOICEOVER_ID/audio.mp3"
}
~~~

---

## 20. מבנה סופי מומלץ

~~~text
voicemaster-data/
│
├── _system/
│   ├── stats.json
│   ├── settings.json
│   ├── daily/
│   │   └── 2026-10-01.json
│   └── events/
│       └── ...
│
└── users/
    ├── USER_ID_1/
    │   ├── profile.json
    │   ├── stats.json
    │   └── voiceovers/
    │       ├── VOICEOVER_ID_1/
    │       │   ├── metadata.json
    │       │   └── audio.mp3
    │       └── VOICEOVER_ID_2/
    │           ├── metadata.json
    │           └── audio.mp3
    │
    └── USER_ID_2/
        ├── profile.json
        ├── stats.json
        └── voiceovers/
            └── ...
~~~

---

## 21. קישורים רשמיים

Hugging Face Storage:
https://huggingface.co/storage

Storage Buckets:
https://huggingface.co/docs/hub/storage-buckets

S3 Compatibility:
https://huggingface.co/docs/hub/storage-buckets-s3

Access Patterns:
https://huggingface.co/docs/hub/storage-buckets-access

User Access Tokens:
https://huggingface.co/docs/hub/security-tokens

---

## 22. רשימת פעולות לביצוע

- [ ] ליצור Bucket פרטי בשם voicemaster-data
- [ ] ליצור Hugging Face Access Token
- [ ] ליצור ממנו S3 credentials
- [ ] להוסיף את משתני הסביבה ב־Vercel
- [ ] להתקין @aws-sdk/client-s3
- [ ] להוסיף API בצד השרת
- [ ] ליצור endpoint לבדיקת Storage
- [ ] ליצור מערכת זיהוי משתמשים
- [ ] להעביר שמירת קריינויות מ־localStorage ל־API
- [ ] להוסיף טעינת היסטוריה מהשרת
- [ ] להוסיף מחיקת קריינויות
- [ ] להוסיף stats כלליים
- [ ] להוסיף מחיקת משתמש ונתוניו
- [ ] לבדוק שה־S3 credentials לעולם אינם מגיעים לדפדפן

## הערה לגבי VoiceMaster הנוכחי

VoiceMaster הוא פרויקט Vite + React. לכן את חיבור Hugging Face צריך לבצע דרך שכבת Server/API של Vercel ולא ישירות מתוך קוד React.

המסמך הזה הוא מדריך ההקמה והארכיטקטורה. לאחר יצירת ה־Bucket והגדרת משתני הסביבה, ניתן לבצע את השלב הבא: להוסיף בפועל ל־VoiceMaster את ה־API, את שכבת ה־S3, את מערכת המשתמשים ולהחליף את localStorage במערכת שמירה קבועה.


# הטמעה שבוצעה בפועל

הפרויקט כולל כעת שכבת Storage/API ב־Vercel:

~~~text
api/_storage.ts
api/voiceovers.ts
api/voiceovers/[id].ts
api/voiceovers/complete.ts
api/stats.ts
~~~

ה־Frontend כבר משתמש ב־API הזה במקום לשמור את הקריינויות בזיכרון הדפדפן.

## איך משתמש מזוהה כרגע

ל־VoiceMaster לא הייתה מערכת התחברות לפני ההטמעה. לכן ההטמעה הנוכחית יוצרת לכל דפדפן מזהה משתמש אקראי, ושומרת אותו ב־HttpOnly cookie חתום.

כלומר:

- לכל דפדפן יש תיקיית משתמש משלו.
- הקריינויות חוזרות לאחר רענון הדף.
- הן זמינות שוב מאותו דפדפן.
- עדיין אין חשבון משתמש עם התחברות ממכשירים שונים.

אם בעתיד תתווסף מערכת התחברות, אפשר להחליף את מזהה ה־cookie ב־user ID של מערכת החשבונות.

## מה נשמר

עבור כל קריינות נשמרים:

- מזהה קריינות.
- כותרת.
- קול.
- סגנון.
- סוג: narration או podcast.
- זמן יצירה.
- הטקסט/התסריט, עד 20,000 תווים.
- קובץ האודיו.
- מצב ההעלאה.

מבנה לדוגמה:

~~~text
users/USER_ID/
├── profile.json
└── voiceovers/
    └── VOICEOVER_ID/
        ├── metadata.json
        └── audio.wav
~~~

נתונים כלליים נשמרים ב:

~~~text
_system/stats.json
~~~

וכוללים בין היתר:

~~~text
users
voiceoversCreated
voiceoversToday
totalCharacters
lastUpdated
~~~

## אבטחה

ה־Access Key וה־Secret נשארים ב־Vercel בלבד.

השרת יוצר URL זמני להעלאת קובץ האודיו ישירות ל־Hugging Face. כך קובץ האודיו אינו עובר דרך גוף בקשת ה־Vercel Function.

זה חשוב במיוחד משום ש־Vercel מגבילה את גוף הבקשה של Functions ל־4.5MB. העלאה ישירה ל־Storage מונעת את המגבלה הזו עבור קבצי האודיו. ראו:
https://vercel.com/docs/errors/function_payload_too_large

## הגדרות S3

הקוד כבר משתמש בהגדרות המתאימות ל־Hugging Face:

~~~text
endpoint = https://s3.hf.co/YOUR_NAMESPACE
region = us-east-1
forcePathStyle = true
requestChecksumCalculation = WHEN_REQUIRED
responseChecksumValidation = WHEN_REQUIRED
~~~

אלה תואמות לתיעוד הרשמי של Hugging Face עבור S3-compatible Storage Buckets:
https://huggingface.co/docs/hub/storage-buckets-s3

## משתני סביבה חובה

ב־Vercel יש להגדיר:

~~~text
HF_S3_ACCESS_KEY_ID
HF_S3_SECRET_ACCESS_KEY
HF_STORAGE_NAMESPACE
HF_STORAGE_BUCKET
HF_S3_REGION
HF_S3_ENDPOINT
VOICEMASTER_SESSION_SECRET
~~~

דוגמה נמצאת בקובץ:

~~~text
.env.example
~~~

### HF_STORAGE_NAMESPACE

שם המשתמש או הארגון שמחזיק את ה־Bucket.

לדוגמה:

~~~text
my-huggingface-user
~~~

### HF_STORAGE_BUCKET

השם המדויק של ה־Bucket בלבד, ללא namespace.

לדוגמה:

~~~text
voicemaster-data
~~~

### HF_S3_ENDPOINT

צריך להיות:

~~~text
https://s3.hf.co
~~~

הקוד מוסיף בעצמו את ה־namespace, ולכן אין להכניס אותו שוב למשתנה.

### HF_S3_REGION

צריך להיות:

~~~text
us-east-1
~~~

### VOICEMASTER_SESSION_SECRET

מחרוזת אקראית ארוכה וייחודית.

לדוגמה ניתן ליצור אחת עם:

~~~bash
openssl rand -hex 32
~~~

אין להשתמש בערך הדוגמה ב־.env.example.

## יצירת ה־Bucket

פתח:

https://huggingface.co/new-bucket

צור Bucket פרטי בשם:

~~~text
voicemaster-data
~~~

Hugging Face מתעדת יצירת Bucket פרטי גם דרך הממשק וגם דרך CLI:
https://huggingface.co/docs/hub/storage-buckets

## יצירת S3 Credentials

פתח את Access Tokens ב־Hugging Face, צור Token מתאים, ואז בתפריט שלו בחר:

**Generate S3 credentials**

תקבל:

~~~text
Access Key ID
Secret Access Key
~~~

הכנס אותם ל־Vercel בלבד.

תיעוד:
https://huggingface.co/docs/hub/storage-buckets-s3

## אחרי הוספת המשתנים

בצע Redeploy ב־Vercel.

לאחר מכן האתר יוכל:

1. ליצור משתמש דפדפן.
2. ליצור תיקיית משתמש ב־Bucket.
3. להעלות metadata.
4. לקבל URL זמני לאודיו.
5. להעלות את האודיו ישירות ל־Hugging Face.
6. לאמת שהאודיו אכן קיים.
7. לסמן את הקריינות כ־ready.
8. לעדכן את הסטטיסטיקות.
9. להציג את ההיסטוריה לאחר רענון.
10. למחוק קריינויות מה־Bucket.

## API שנוסף

~~~text
GET    /api/voiceovers
POST   /api/voiceovers
POST   /api/voiceovers/complete
DELETE /api/voiceovers/:id
GET    /api/stats
~~~

## בדיקת מערכת

אחרי ה־Redeploy:

1. פתח את האתר.
2. צור קריינות קצרה.
3. המתן להודעת ההצלחה.
4. רענן את הדף.
5. בדוק שהקריינות עדיין מופיעה.
6. הורד/נגן אותה.
7. מחק אותה.
8. בדוק שהיא נעלמה גם לאחר רענון.

אם ההיסטוריה לא נטענת, בדוק קודם את Logs של Vercel ואת משתני הסביבה.

## הערה על API Keys

מפתחות Gemini ממשיכים להישמר מקומית בדפדפן בכוונה. אין להעלות אותם ל־Hugging Face כטקסט רגיל: אלה סודות גישה, ושמירתם ב־Bucket האישי של המשתמש אינה נדרשת כדי לשמור את היסטוריית הקריינויות.

## מגבלת הסטטיסטיקות

Storage Bucket הוא Object Storage ולא מסד נתונים רלציוני עם Transactions. לכן המונה ב־_system/stats.json מתאים להתחלה, אבל בעומס מקבילי גבוה עלולים להיות עדכונים מתחרים.

אם VoiceMaster יגדל משמעותית, כדאי להעביר את מוני הסטטיסטיקה למנגנון Atomic/Database ייעודי, או לשמור Events יומיים ולחשב מהם את הסטטיסטיקות.

