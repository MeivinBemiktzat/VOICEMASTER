import { KeyRound, ShieldCheck, Sparkles, Users } from "lucide-react";

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-black text-ink sm:text-3xl">אודות VoiceMaster Studio</h1>
        <p className="mt-3 text-sm text-mute sm:text-base">
          VoiceMaster Studio הוא כלי ליצירת קריינות ופודקאסטים בעברית באמצעות מודלי הבינה המלאכותית של
          Gemini מבית Google. האתר רץ כולו בצד הלקוח (בדפדפן בלבד) — הטקסט, הקולות וההגדרות שלכם לא
          נשלחים לשום שרת מלבד ישירות ל-API של Gemini באמצעות המפתח שלכם.
        </p>
      </div>

      <div className="card rounded-2xl p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-brand">
          <KeyRound size={18} />
          <h2 className="text-sm font-black text-ink">איך מקבלים מפתח API?</h2>
        </div>
        <p className="text-xs text-mute sm:text-sm">
          היכנסו ל-Google AI Studio, צרו מפתח API חינמי, והדביקו אותו בכפתור "הגדר מפתח" שבראש העמוד.
          המפתח נשמר מקומית בדפדפן שלכם בלבד (ב-localStorage) ואינו נשלח לשום מקום אחר.
        </p>
      </div>

      <div className="card rounded-2xl p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-brand">
          <ShieldCheck size={18} />
          <h2 className="text-sm font-black text-ink">פרטיות ואבטחה</h2>
        </div>
        <p className="text-xs text-mute sm:text-sm">
          ניתן לשמור כמה מפתחות API ולעבור ביניהם. אם מפתח מגיע למגבלת שימוש, המערכת עוברת אוטומטית
          למפתח הבא השמור ברשימה. ההקלטות עצמן נשמרות בזיכרון הדפדפן בלבד למשך הסשן הנוכחי ונעלמות
          ברענון העמוד — הקפידו להוריד הקלטות חשובות.
        </p>
      </div>

      <div className="card rounded-2xl p-5 sm:p-6">
        <div className="mb-2 flex items-center gap-2 text-brand">
          <Sparkles size={18} />
          <h2 className="text-sm font-black text-ink">כלי העריכה החכמים</h2>
        </div>
        <p className="text-xs text-mute sm:text-sm">
          בסטודיו הקריינות תוכלו לייצר טקסט מאפס, לרכך או להפוך אותו לשיווקי, לקצר, לתרגם לעברית טבעית,
          לסכם, להוסיף ניקוד דקדוקי מלא, ואפילו לתת ל-AI לבחור עבורכם את סגנון ההקראה המתאים ביותר לטקסט.
        </p>
      </div>

      <div className="card rounded-2xl border border-brand/20 p-5 sm:p-7">
        <div className="mb-3 flex items-center gap-2 text-brand"><Users size={19}/><h2 className="text-base font-black text-ink">היוצרים של VoiceMaster</h2></div>
        <p className="text-sm leading-7 text-mute">VoiceMaster נבנה בהשקעה רבה, עם מחשבה על כל פרט בחוויית השימוש — מתכנון הממשק ועיצובו, דרך פיתוח כלי הקריינות, הפודקאסט ועריכת האודיו, ועד לבדיקות, שיפורים ותוספות שנועדו להפוך את העבודה עם קול ושמע לנוחה, מקצועית ונגישה. האתר נבנה על ידי <strong className="text-ink">אריה AI</strong> ו<strong className="text-ink">מייבין במקצת</strong>, בשיתוף פעולה ובמסירות ליצירת סביבת עבודה עשירה ושימושית.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-soft/60 p-4"><h3 className="mb-2 font-black text-ink">אריה AI</h3><div className="flex flex-col gap-2 text-sm font-bold"><a className="text-brand hover:underline" href="https://mitmachim.top/user/%D7%90%D7%A8%D7%99%D7%94-ai" target="_blank" rel="noreferrer">אריה AI במתמחים טופ</a><a className="text-brand hover:underline" href="https://f2.freeivr.co.il/user/%D7%90%D7%A8%D7%99%D7%94-ai" target="_blank" rel="noreferrer">אריה AI בפורום ימות</a><a className="text-brand hover:underline" href="mailto:a0733641352@gmail.com">יצירת קשר במייל</a></div></div>
          <div className="rounded-xl bg-soft/60 p-4"><h3 className="mb-2 font-black text-ink">מייבין במקצת</h3><div className="flex flex-col gap-2 text-sm font-bold"><a className="text-brand hover:underline" href="https://mitmachim.top/user/%D7%9E%D7%99%D7%99%D7%91%D7%99%D7%9F-%D7%91%D7%9E%D7%A7%D7%A6%D7%AA" target="_blank" rel="noreferrer">מייבין במקצת במתמחים טופ</a><a className="text-brand hover:underline" href="https://f2.freeivr.co.il/user/%D7%9E%D7%99%D7%99%D7%91%D7%99%D7%9F-%D7%91%D7%9E%D7%A7%D7%A6%D7%AA" target="_blank" rel="noreferrer">מייבין במקצת בפורום ימות</a></div></div>
        </div>
      </div>
    </div>
  );
}
