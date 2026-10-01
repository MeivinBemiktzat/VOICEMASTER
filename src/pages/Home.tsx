import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpLeft, AudioLines, Clock3, KeyRound, Mic2, Podcast, Sparkles, WandSparkles } from "lucide-react";
import { uniqueVoiceCount } from "../lib/catalogs";

const FEATURES = [
  { icon: WandSparkles, kicker: "01", title: "כתיבה שעובדת בשבילכם", text: "נסחו, קצרו, תרגמו וחדדו כל טקסט בעזרת כלי AI מדויקים." },
  { icon: AudioLines, kicker: "02", title: `${uniqueVoiceCount} קולות טבעיים`, text: "מצאו את הטון הנכון למותג שלכם מתוך ספריית קולות עשירה בעברית." },
  { icon: Podcast, kicker: "03", title: "פודקאסט בשיחה אחת", text: "הפכו רעיון לתסריט דו־שיח והפיקו ממנו אודיו מוכן לפרסום." },
  { icon: Clock3, kicker: "04", title: "כל הפרויקטים במקום אחד", text: "האזינו, הורידו וחזרו לכל הפקה שנוצרה במהלך הסשן." },
];

export default function Home() {
  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot" /> סטודיו קולי חכם בעברית</div>
          <h1>הקול של הרעיון שלכם<br /><span>מתחיל כאן.</span></h1>
          <p>VoiceMaster הוא סביבת עבודה מקצועית ליצירת קריינות, פודקאסטים ותוכן קולי. פחות התעסקות, יותר יצירה שנשמעת מצוין.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link to="/narration" className="btn btn-primary"><Mic2 size={17} /> התחילו ליצור <ArrowLeft size={16} /></Link><Link to="/podcast" className="btn btn-ghost"><Podcast size={17} /> סטודיו פודקאסט</Link></div>
          <div className="hero-meta"><div><strong>01</strong><span>כתבו רעיון</span></div><div><strong>02</strong><span>בחרו קול</span></div><div><strong>03</strong><span>הפיקו אודיו</span></div></div>
        </div>
        <div className="hero-visual" aria-label="תצוגת גל קול פעיל"><div className="visual-top"><span className="live-pill"><span /> LIVE SESSION</span><span className="visual-time">00:24</span></div><div className="orbital-mark"><img src="/voicemaster-icon.png" alt="" /></div><div className="waveform">{[24, 38, 62, 92, 48, 72, 34, 84, 56, 98, 42, 76, 30, 64, 48, 88, 36, 70, 52, 30].map((height, index) => <span key={index} style={{ height: `${height}px` }} />)}</div><div className="visual-bottom"><div><small>PROJECT</small><strong>Brand story / intro</strong></div><div className="visual-status"><Sparkles size={15} /> Ready to generate</div></div></div>
      </section>

      <section className="section-block"><div className="section-heading"><div><span className="section-index">THE WORKFLOW</span><h2>כל מה שצריך כדי<br /><em>להישמע מקצועי.</em></h2></div><p>כלים פשוטים וחכמים שמחברים בין רעיון, טקסט וקול — במקום אחד.</p></div><div className="feature-grid">{FEATURES.map((feature) => <article key={feature.kicker} className="feature-card"><div className="feature-card-top"><span>{feature.kicker}</span><feature.icon size={21} /></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div></section>

      <section className="cta-panel"><div className="cta-icon"><KeyRound size={23} /></div><div><span className="section-index">READY WHEN YOU ARE</span><h2>הכניסו את הקול שלכם<br /><em>לתוך הסיפור.</em></h2><p>חברו מפתח Gemini והתחילו ליצור קריינות מקורית כבר עכשיו.</p></div><Link to="/narration" className="btn btn-primary cta-action">לסטודיו <ArrowUpLeft size={16} /></Link></section>
    </div>
  );
}
