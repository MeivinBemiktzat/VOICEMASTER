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
    <div className="home-landing space-y-14 sm:space-y-20">
      <section className="hero-section flex items-center rounded-[2rem]">
        <div className="max-w-3xl">
          <span className="luxury-chip hero-kicker mb-4 inline-block">בינה מלאכותית · קריינות בעברית</span>
          <h1 className="hero-title font-display text-3xl font-black leading-tight text-ink sm:text-5xl">
            הפכו כל טקסט לקריינות מקצועית <span className="hero-gradient-text">תוך שניות</span>
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
      </section>

      <section>
        <h2 className="mb-6 text-center font-display text-2xl font-black text-ink sm:text-3xl">
          כל מה שצריך כדי להישמע מקצועי
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card rounded-2xl p-5 transition-transform duration-200 hover:-translate-y-1 sm:p-6">
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
