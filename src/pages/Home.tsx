import { Link } from "react-router-dom";
import { Mic, Podcast, History, Sparkles, KeyRound, ArrowLeft } from "lucide-react";
import { uniqueVoiceCount } from "../lib/catalogs";

const FEATURES = [
  {
    icon: Sparkles,
    title: "כתיבה חכמה בעזרת AI",
    text: "כתיבת טקסט אוטומטית, ריכוך, קיצור, תרגום, סיכום וניקוד — הכל בלחיצת כפתור.",
  },
  {
    icon: Mic,
    title: `+${uniqueVoiceCount} קולות קריינות`,
    text: "מבחר עצום של קולות גבריים ונשיים בעברית, עם עשרות סגנונות הגשה שונים.",
  },
  {
    icon: Podcast,
    title: "סטודיו פודקאסט",
    text: "יצירת תסריט דו-שיח אוטומטי והפקת אודיו עם שני דוברים וקולות נפרדים.",
  },
  {
    icon: History,
    title: "היסטוריית הקלטות",
    text: "כל ההפקות שלך נשמרות במהלך הסשן, מוכנות להאזנה ולהורדה בכל רגע.",
  },
];

export default function Home() {
  return (
    <div className="space-y-14 sm:space-y-20">
      <section className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        <div>
          <span className="luxury-chip mb-4 inline-block">בינה מלאכותית · קריינות בעברית</span>
          <h1 className="font-display text-3xl font-black leading-tight text-ink sm:text-5xl">
            הפכו כל טקסט לקריינות מקצועית <span className="text-brand">תוך שניות</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm text-mute sm:text-base">
            VoiceMaster Studio הוא סטודיו קריינות ופודקאסטים מבוסס בינה מלאכותית של Gemini. כתבו, ערכו,
            נקדו ותרגמו טקסט בעברית, ואז הפיקו קריינות איכותית במבחר עצום של קולות וסגנונות.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/narration" className="btn btn-primary">
              <Mic size={18} />
              התחל להקליט קריינות
              <ArrowLeft size={16} />
            </Link>
            <Link to="/podcast" className="btn btn-outline">
              <Podcast size={18} />
              צור פודקאסט
            </Link>
          </div>
        </div>
        <div className="card relative overflow-hidden rounded-[2rem] p-6 sm:p-10">
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-sun/20 blur-3xl" />
          <div className="relative space-y-4">
            <div className="flex items-center gap-3">
              {[0.4, 0.9, 0.55, 1, 0.35, 0.75, 0.5].map((h, i) => (
                <span
                  key={i}
                  className="wave-bar w-2 rounded-full bg-gradient-to-t from-brand to-sun"
                  style={{ height: `${h * 60 + 20}px`, animationDelay: `${i * 0.12}s` }}
                />
              ))}
            </div>
            <p className="text-sm font-bold text-ink">"ברוכים הבאים ל-VoiceMaster, הסטודיו החכם שלכם לקריינות..."</p>
            <p className="text-xs text-mute">קול: Kore · סגנון: מקצועי</p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-6 text-center font-display text-2xl font-black text-ink sm:text-3xl">
          כל מה שצריך כדי להישמע מקצועי
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card rounded-2xl p-5 sm:p-6">
              <div className="mb-3 inline-flex rounded-xl bg-brand/10 p-2.5 text-brand">
                <f.icon size={22} />
              </div>
              <h3 className="mb-1.5 text-sm font-black text-ink">{f.title}</h3>
              <p className="text-xs text-mute">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card flex flex-col items-center gap-4 rounded-[2rem] p-8 text-center sm:p-12">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand">
          <KeyRound size={26} />
        </div>
        <h2 className="font-display text-xl font-black text-ink sm:text-2xl">מתחילים בשני צעדים פשוטים</h2>
        <p className="max-w-lg text-xs text-mute sm:text-sm">
          הגדירו מפתח Gemini API משלכם בכפתור "הגדר מפתח" בראש העמוד, ולאחר מכן גשו לסטודיו הקריינות או
          הפודקאסט כדי להתחיל ליצור.
        </p>
        <Link to="/narration" className="btn btn-primary mt-1">
          למעבר לסטודיו הקריינות
          <ArrowLeft size={16} />
        </Link>
      </section>
    </div>
  );
}
