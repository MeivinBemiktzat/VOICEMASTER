export type MusicNote={instrument:string;note:number;start:number;duration:number;velocity:number};
export type MusicPlan={tempo:number;length:number;notes:MusicNote[]};
const freq=(m:number)=>440*Math.pow(2,(m-69)/12);
export function planToMidi(plan:MusicPlan){
 const ppq=480,tempo=Math.max(50,Math.min(180,Number(plan.tempo)||90));
 const micros=Math.round(60000000/tempo);
 const instrumentPrograms:Record<string,number>={piano:0,bass:33,strings:48,synth:81,flute:73,guitar:24,drum:0,bell:10};
 const channelFor:Record<string,number>={};let nextChannel=0;
 const events:{tick:number;order:number;bytes:number[]}[]=[];
 events.push({tick:0,order:0,bytes:[0xff,0x51,3,(micros>>16)&255,(micros>>8)&255,micros&255]});
 events.push({tick:0,order:1,bytes:[0xff,0x58,4,4,2,24,8]});
 const valid=(plan.notes||[]).filter(n=>Number.isFinite(n.note)&&Number.isFinite(n.start)&&Number.isFinite(n.duration)&&n.duration>0);
 for(const n of valid){
   let ch:number;
   if(n.instrument==="drum")ch=9;
   else {if(channelFor[n.instrument]===undefined){while(nextChannel===9)nextChannel++;channelFor[n.instrument]=nextChannel++%16;}ch=channelFor[n.instrument];}
   const program=instrumentPrograms[n.instrument]??0;
   if(n.instrument!=="drum"&&!events.some(e=>e.tick===0&&e.order===2&&e.bytes[0]===(0xc0|ch)))events.push({tick:0,order:2,bytes:[0xc0|ch,program]});
   const startTick=Math.max(0,Math.round(Math.max(0,n.start)*tempo/60*ppq));
   const endTick=startTick+Math.max(1,Math.round(n.duration*tempo/60*ppq));
   const note=Math.max(0,Math.min(127,Math.round(n.note))),velocity=Math.max(1,Math.min(127,Math.round(n.velocity||45)));
   events.push({tick:startTick,order:3,bytes:[0x90|ch,note,velocity]});
   events.push({tick:endTick,order:0,bytes:[0x80|ch,note,0]});
 }
 events.sort((a,b)=>a.tick-b.tick||a.order-b.order);
 const vlq=(value:number)=>{let n=Math.max(0,Math.floor(value));const out=[n&127];while((n=Math.floor(n/128))>0)out.unshift((n&127)|128);return out;};
 const track:number[]=[];let lastTick=0;
 for(const event of events){track.push(...vlq(event.tick-lastTick),...event.bytes);lastTick=event.tick;}
 track.push(0,0xff,0x2f,0);
 const length=track.length;
 const bytes=[77,84,104,100,0,0,0,6,0,0,0,1,(ppq>>8)&255,ppq&255,77,84,114,107,(length>>>24)&255,(length>>>16)&255,(length>>>8)&255,length&255,...track];
 return new Blob([new Uint8Array(bytes)],{type:"audio/midi"});
}
function hash(s:string){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h;}
export async function renderMusic(plan:MusicPlan,durationSec?:number){const duration=Math.max(8,durationSec||plan.length||30);const ctx=new OfflineAudioContext(2,44100*Math.ceil(duration),44100);for(const n of plan.notes){const osc=ctx.createOscillator();const gain=ctx.createGain();osc.type=n.instrument.includes("piano")?"triangle":n.instrument.includes("bass")?"sine":n.instrument.includes("drum")?"square":"sawtooth";osc.frequency.value=freq(n.note);const start=Math.max(0,n.start),end=Math.min(duration,start+n.duration);gain.gain.setValueAtTime(0, start);gain.gain.linearRampToValueAtTime(Math.min(.16,n.velocity/1000),start+.02);gain.gain.linearRampToValueAtTime(0,end);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(end+.03);}const rendered=await ctx.startRendering();return audioBufferToWav(rendered);}
function audioBufferToWav(b:AudioBuffer){const ch=b.numberOfChannels,len=b.length*ch*2+44;const buf=new ArrayBuffer(len),v=new DataView(buf);const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};ws(0,"RIFF");v.setUint32(4,len-8,true);ws(8,"WAVE");ws(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,ch,true);v.setUint32(24,b.sampleRate,true);v.setUint32(28,b.sampleRate*ch*2,true);v.setUint16(32,ch*2,true);v.setUint16(34,16,true);ws(36,"data");v.setUint32(40,len-44,true);let o=44;for(let i=0;i<b.length;i++)for(let c=0;c<ch;c++){let s=Math.max(-1,Math.min(1,b.getChannelData(c)[i]));v.setInt16(o,s<0?s*32768:s*32767,true);o+=2;}return new Blob([buf],{type:"audio/wav"});}
