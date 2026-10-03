import { useEffect, useState } from "react";
import { Bell, MessageCircle, Reply, Send, Bold, Italic, Underline, List, Quote, Code, Link as LinkIcon } from "lucide-react";
import { useAuth } from "../lib/AuthContext";

type Comment = { id: string; userId: string; username: string; body: string; createdAt: string; replyTo?: string };
type Topic = { id: string; title: string; body: string; createdAt: string; updatedAt: string; authorId: string; authorName: string; comments: Comment[] };

function formatText(text: string) {
  const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\`(.+?)\`/g, "<code>$1</code>")
    .replace(/^&gt; (.*)$/gm, "<blockquote>$1</blockquote>")
    .replace(/\n/g, "<br />");
}

function Editor({ value, setValue, placeholder }: { value: string; setValue: (value: string) => void; placeholder: string }) {
  const wrap = (before: string, after: string) => {
    const element = document.querySelector('textarea[data-editor="updates"]') as HTMLTextAreaElement | null;
    if (!element) return;
    const start = element.selectionStart;
    const end = element.selectionEnd;
    setValue(value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end));
    setTimeout(() => {
      element.focus();
      element.setSelectionRange(start + before.length, end + before.length);
    }, 0);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-bg/60">
      <div className="flex flex-wrap gap-1 border-b border-line bg-soft/50 p-2">
        <button type="button" onClick={() => wrap("**", "**")} className="rounded-lg p-2 text-mute hover:bg-soft" title="מודגש"><Bold size={16} /></button>
        <button type="button" onClick={() => wrap("*", "*")} className="rounded-lg p-2 text-mute hover:bg-soft" title="נטוי"><Italic size={16} /></button>
        <button type="button" onClick={() => wrap("__", "__")} className="rounded-lg p-2 text-mute hover:bg-soft" title="קו תחתון"><Underline size={16} /></button>
        <button type="button" onClick={() => wrap("`", "`")} className="rounded-lg p-2 text-mute hover:bg-soft" title="קוד"><Code size={16} /></button>
        <button type="button" onClick={() => wrap("> ", "")} className="rounded-lg p-2 text-mute hover:bg-soft" title="ציטוט"><Quote size={16} /></button>
        <button type="button" onClick={() => wrap("- ", "")} className="rounded-lg p-2 text-mute hover:bg-soft" title="רשימה"><List size={16} /></button>
        <button type="button" onClick={() => wrap("[טקסט](", ")")} className="rounded-lg p-2 text-mute hover:bg-soft" title="קישור"><LinkIcon size={16} /></button>
      </div>
      <textarea data-editor="updates" value={value} onChange={(event) => setValue(event.target.value)} placeholder={placeholder} className="min-h-32 w-full resize-y bg-transparent p-4 text-sm leading-7 text-ink outline-none" />
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("he-IL", { dateStyle: "medium", timeStyle: "short" });
}

export default function Updates() {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<string | undefined>();
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false); const [editingTopic,setEditingTopic]=useState<string|null>(null); const [editTitle,setEditTitle]=useState(""); const [editBody,setEditBody]=useState("");

  const load = async () => {
    const response = await fetch("/api/updates");
    const data = await response.json();
    if (response.ok) setTopics(data.topics || []);
  };

  useEffect(() => { void load(); }, []);

  const send = async (topicId: string) => {
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (!comment.trim()) return;
    setSending(true);
    try {
      const response = await fetch("/api/updates", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId, body: comment, replyTo }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "לא ניתן לשלוח תגובה");
      setComment("");
      setReplyTo(undefined);
      await load();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "שגיאה");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mx-auto max-w-4xl">
      <div className="mb-7 flex items-start gap-4">
        <div className="rounded-2xl bg-brand/10 p-3 text-brand"><Bell size={26} /></div>
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[.18em] text-brand">מה חדש</p>
          <h1 className="font-display text-3xl font-black text-ink sm:text-4xl">עדכונים</h1>
          <p className="mt-2 text-sm text-mute">חידושים באתר, תגובות ודיונים סביב העדכונים.</p>
        </div>
      </div>

      {topics.length === 0 ? (
        <div className="card rounded-[2rem] p-10 text-center text-mute">עדיין לא פורסמו עדכונים.</div>
      ) : (
        <div className="space-y-5">
          {topics.map((topic) => (
            <article key={topic.id} className="card overflow-hidden rounded-[2rem]">
              <button className="w-full p-5 text-right sm:p-7" onClick={() => setOpen(open === topic.id ? null : topic.id)}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2"><h2 className="font-display text-xl font-black text-ink">{topic.title}</h2>{user?.role==="admin"&&<span className="text-xs text-brand">ניהול</span>}</div>
                    <p className="mt-1 text-xs text-mute">מאת {topic.authorName} · {formatDate(topic.createdAt)}</p>
                  </div>
                  <MessageCircle className="shrink-0 text-brand" />
                </div>
                {open === topic.id && (editingTopic===topic.id ? <div className="mt-5 space-y-3 border-t border-line pt-5"><input value={editTitle} onChange={e=>setEditTitle(e.target.value)} className="field w-full"/><textarea value={editBody} onChange={e=>setEditBody(e.target.value)} className="field min-h-40 w-full"/><div className="flex gap-2"><button type="button" className="btn btn-primary" onClick={async()=>{const r=await fetch("/api/updates",{method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({topicId:topic.id,action:"edit",title:editTitle,body:editBody})});if(r.ok){setEditingTopic(null);await load()}else{const d=await r.json();alert(d.error||"שגיאה")}}}>שמירה</button><button type="button" className="btn btn-outline" onClick={()=>setEditingTopic(null)}>ביטול</button></div></div> : <div className="mt-5 border-t border-line pt-5 text-sm leading-7 text-ink" dangerouslySetInnerHTML={{ __html: formatText(topic.body) }}/>) }
              </button>

              {open === topic.id && (
                <div className="border-t border-line bg-soft/30 p-5 sm:p-7">
                  <div className="mb-4 space-y-3">
                    {topic.comments.map((item) => (
                      <div key={item.id} className={"rounded-2xl border border-line bg-bg p-4 " + (item.replyTo ? "ms-6 sm:ms-10" : "")}>
                        <div className="flex items-center justify-between gap-3">
                          <b className="text-sm text-ink">{item.username}</b>
                          <span className="text-[11px] text-mute">{formatDate(item.createdAt)}</span>
                        </div>
                        <div className="mt-2 text-sm leading-6 text-ink" dangerouslySetInnerHTML={{ __html: formatText(item.body) }} />
                        <div className="mt-3 flex items-center gap-3"><button onClick={() => { setReplyTo(item.id); setComment(""); }} className="inline-flex items-center gap-1 text-xs font-bold text-brand">
                          <Reply size={14} />השב להודעה
                        </button>
                      </div>
                    ))}
                  </div>

                  {user ? (
                    <>
                      <div className="mb-2 flex items-center justify-between"><p className="text-xs font-bold text-mute">{replyTo ? "תגובה להודעה" : "תגובה חדשה"}</p>{replyTo&&<button type="button" onClick={()=>setReplyTo(undefined)} className="text-xs text-mute">ביטול תגובה</button>}</div>
                      <Editor value={comment} setValue={setComment} placeholder="כתבו תגובה..." />
                      <div className="mt-3 flex justify-end">
                        <button disabled={sending || !comment.trim()} onClick={() => void send(topic.id)} className="btn btn-primary">
                          <Send size={16} />{sending ? "שולח..." : "שליחת תגובה"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl bg-bg p-4 text-center text-sm text-mute">כדי להגיב לעדכון יש להתחבר.</div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
