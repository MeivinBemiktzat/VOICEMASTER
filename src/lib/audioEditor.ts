export type ClipEffect =
  | "none" | "echo" | "reverb" | "fade" | "chorus" | "flanger" | "phaser"
  | "distortion" | "telephone" | "lowpass" | "highpass" | "robot" | "pitch"
  | "compressor" | "stereo" | "reverse" | "vinyl" | "radio";

export type AudioClip = {
  id: string; name: string; blob: Blob; start: number; trimStart: number; trimEnd: number;
  duration: number; volume: number; speed: number; effect: ClipEffect; fadeIn: number;
  fadeOut: number; track: number; waveform?: number[]; source?: "narration" | "upload" | "music" | "effect";
};

export const EFFECTS: {value: ClipEffect; label: string}[] = [
 {value:"none",label:"ללא אפקט"},{value:"echo",label:"הד / Echo"},{value:"reverb",label:"הדהוד / Reverb"},
 {value:"chorus",label:"מקהלה / Chorus"},{value:"flanger",label:"Flanger"},{value:"phaser",label:"Phaser"},
 {value:"distortion",label:"עיוות / Distortion"},{value:"telephone",label:"טלפון"},{value:"lowpass",label:"מסנן נמוכים"},
 {value:"highpass",label:"מסנן גבוהים"},{value:"robot",label:"רובוט"},{value:"pitch",label:"גוון חד"},
 {value:"compressor",label:"דחיסה / Compressor"},{value:"stereo",label:"הרחבת סטריאו"},
 {value:"reverse",label:"הפוך"},{value:"vinyl",label:"תקליט וינטג׳"},{value:"radio",label:"רדיו"}
];

export async function durationOf(blob: Blob) {
 const ctx = new AudioContext();
 try { const b = await ctx.decodeAudioData(await blob.arrayBuffer()); return b.duration; }
 finally { await ctx.close(); }
}
export async function waveformOf(blob: Blob, points = 240): Promise<number[]> {
 const ctx = new AudioContext();
 try {
  const b = await ctx.decodeAudioData(await blob.arrayBuffer());
  const data = b.getChannelData(0), step = Math.max(1, Math.floor(data.length / points)), peaks:number[]=[];
  for(let i=0;i<points;i++){let peak=0;for(let j=i*step;j<Math.min(data.length,(i+1)*step);j+=1)peak=Math.max(peak,Math.abs(data[j]));peaks.push(peak);}
  return peaks;
 } finally { await ctx.close(); }
}
function wav(buffer: AudioBuffer) {
 const channels=buffer.numberOfChannels,len=44+buffer.length*channels*2,ab=new ArrayBuffer(len),v=new DataView(ab);
 const ws=(o:number,s:string)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
 ws(0,"RIFF");v.setUint32(4,len-8,true);ws(8,"WAVE");ws(12,"fmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,channels,true);v.setUint32(24,buffer.sampleRate,true);v.setUint32(28,buffer.sampleRate*channels*2,true);v.setUint16(32,channels*2,true);v.setUint16(34,16,true);ws(36,"data");v.setUint32(40,len-44,true);
 let p=44;for(let i=0;i<buffer.length;i++)for(let c=0;c<channels;c++){const x=Math.max(-1,Math.min(1,buffer.getChannelData(c)[i]));v.setInt16(p,x<0?x*32768:x*32767,true);p+=2;}return new Blob([ab],{type:"audio/wav"});
}
function makeDistortion(ctx: BaseAudioContext) {
 const node=ctx.createWaveShaper(),curve=new Float32Array(44100);
 for(let i=0;i<curve.length;i++){const x=i*2/curve.length-1;curve[i]=(Math.PI+18)*x/(Math.PI+18*Math.abs(x));}
 node.curve=curve;node.oversample="4x";return node;
}
export async function exportMix(clips: AudioClip[]) {
 const end=Math.max(1,...clips.map(c=>c.start+Math.max(0,c.duration-c.trimStart-c.trimEnd)/c.speed+((c.effect==="echo"||c.effect==="reverb")?1.5:0)));
 const ctx=new OfflineAudioContext(2,Math.min(600,Math.ceil(end*44100)),44100);
 for(const c of clips){
  const b=await ctx.decodeAudioData(await c.blob.arrayBuffer()),src=ctx.createBufferSource();src.buffer=b;src.playbackRate.value=c.speed;
  const gain=ctx.createGain();gain.gain.value=Math.max(0,c.volume);
  const nodes:AudioNode[]=[src];
  if(["lowpass","telephone","radio","vinyl"].includes(c.effect)){const f=ctx.createBiquadFilter();f.type="lowpass";f.frequency.value=c.effect==="telephone"?3200:c.effect==="radio"?3800:c.effect==="vinyl"?9000:1200;nodes.push(f);}
  if(c.effect==="highpass"){const f=ctx.createBiquadFilter();f.type="highpass";f.frequency.value=850;nodes.push(f);}
  if(c.effect==="telephone"||c.effect==="radio"){const f=ctx.createBiquadFilter();f.type="highpass";f.frequency.value= c.effect==="telephone"?450:250;nodes.push(f);}
  if(c.effect==="distortion"){nodes.push(makeDistortion(ctx));}
  if(c.effect==="compressor"){const comp=ctx.createDynamicsCompressor();comp.threshold.value=-26;comp.ratio.value=5;nodes.push(comp);}
  if(c.effect==="robot"){const lfo=ctx.createOscillator(),lg=ctx.createGain();lfo.frequency.value=28;lg.gain.value=.45;lfo.connect(lg);lg.connect(gain.gain);lfo.start(c.start);lfo.stop(end);}
  if(c.effect==="echo"||c.effect==="flanger"||c.effect==="phaser"||c.effect==="chorus"){
   const delay=ctx.createDelay(2);delay.delayTime.value=c.effect==="flanger"?.012:c.effect==="chorus"?.028:c.effect==="phaser"?.004:.28;
   const wet=ctx.createGain();wet.gain.value=c.effect==="echo"?.3:c.effect==="phaser"?.45:.25;
   const feedback=ctx.createGain();feedback.gain.value=c.effect==="echo"?.22:.12;
   let chain: AudioNode = src;
   for (const node of nodes.slice(1)) { chain.connect(node); chain = node; }
   chain.connect(gain);gain.connect(ctx.destination);gain.connect(delay);delay.connect(wet);wet.connect(ctx.destination);
   if(c.effect==="echo"){delay.connect(feedback);feedback.connect(delay);}
  } else {
   nodes.reduce((a,n)=>{a.connect(n);return n;},src);nodes[nodes.length-1].connect(gain);gain.connect(ctx.destination);
   if(c.effect==="reverb"){const d=ctx.createDelay(2),wet=ctx.createGain();d.delayTime.value=.075;wet.gain.value=.4;gain.connect(d);d.connect(wet);wet.connect(ctx.destination);}
   if(c.effect==="stereo"){const p=ctx.createStereoPanner();p.pan.value=.65;gain.connect(p);p.connect(ctx.destination);}
  }
  const visible=Math.max(.01,c.duration-c.trimStart-c.trimEnd);
  if(c.fadeIn>0){gain.gain.setValueAtTime(0,c.start);gain.gain.linearRampToValueAtTime(c.volume,c.start+Math.min(c.fadeIn,visible/c.speed));}
  if(c.fadeOut>0){gain.gain.setValueAtTime(c.volume,Math.max(c.start,c.start+visible/c.speed-c.fadeOut));gain.gain.linearRampToValueAtTime(0,c.start+visible/c.speed);}
  src.start(c.start,c.trimStart,visible);
 }
 return wav(await ctx.startRendering());
}
export async function createSoundEffect(kind:string, seconds=2):Promise<Blob>{
 const duration=Math.max(.35,Math.min(5,seconds)),rate=44100,ctx=new OfflineAudioContext(2,Math.ceil(rate*duration),rate);
 const gain=ctx.createGain();gain.gain.setValueAtTime(.0001,0);gain.gain.exponentialRampToValueAtTime(.45,Math.min(.12,duration*.2));gain.gain.exponentialRampToValueAtTime(.0001,duration);gain.connect(ctx.destination);
 if(kind==="ווש"||kind==="רוח"||kind==="עלייה"||kind==="ירידה"||kind==="רעש"){
  const size=Math.ceil(rate*duration),buf=ctx.createBuffer(1,size,rate),data=buf.getChannelData(0);for(let i=0;i<size;i++)data[i]=(Math.random()*2-1)*(1-i/size);
  const src=ctx.createBufferSource();src.buffer=buf;const filter=ctx.createBiquadFilter();filter.type="lowpass";filter.frequency.setValueAtTime(kind==="עלייה"?300:450,0);filter.frequency.linearRampToValueAtTime(kind==="ירידה"?180:8000,duration);src.connect(filter);filter.connect(gain);src.start();
 }else{
  const osc=ctx.createOscillator();osc.type=kind==="אזעקה"?"square":kind==="פעמון"?"sine":"sawtooth";
  const base:Record<string,number>={"ביפ":880,"פעמון":1046,"אזעקה":520,"מכה":90,"טיק":1800,"קליק":1300,"פעימה":65,"מדע בדיוני":340,"לייזר":1400,"בועה":220,"התראה":740,"תוף":110,"צחוק אלקטרוני":280};
  osc.frequency.setValueAtTime(base[kind]||330,0);
  if(kind==="לייזר"||kind==="ירידה")osc.frequency.exponentialRampToValueAtTime(80,duration);
  if(kind==="אזעקה"){osc.frequency.setValueAtTime(800,.25);osc.frequency.setValueAtTime(520,.5);osc.frequency.setValueAtTime(800,.75);}
  osc.connect(gain);osc.start();osc.stop(duration);
 }
 return wav(await ctx.startRendering());
}
