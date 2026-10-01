import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";

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
    </div>
  );
}
