import S from './story.js';
const KEY='pull.box',MAXQ=4,SCRIPTED=2,REVEAL=3;
const RISE=1.1,FALL=.65,FADE=.25,TYPE=16,PAIR=.6,AMB=1.4,RING=1.1,ESC=2.6,SMR=1.16,FLARE=1.6,LOG=12,KEEP=.45,GAP=1.2,ENDS=2.5,REACH=.75,CARD=.8,EDGE=24;
const GLY='#%&*+=<>/\\|[]{}?!$^~:;01';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mouse=matchMedia('(hover: hover)').matches;
addEventListener('pointermove',e=>{mouse=e.pointerType==='mouse';});
const QA=new Float32Array(MAXQ*8),QB=new Float32Array(MAXQ*8);
const INK=document.createElement('canvas');INK.width=512;INK.height=80;
const words=t=>t.toLowerCase().match(/[a-z0-9%]+/g)??[];
function parse(r){const burn=new Set(),all=new Set();
  const lines=r.lines.map(raw=>{const rng=[];let txt='';
    for(const [i,part] of raw.split(/[{}]/).entries()){if(i%2){rng.push([txt.length,txt.length+part.length,part]);burn.add(part);}txt+=part;}
    words(txt).forEach(w=>all.add(w));return {txt,rng};});
  words(r.h).forEach(w=>all.add(w));return {...r,lines,burn,words:all};}
const RECS=S.records.map(parse),FINAL=parse(S.final),N=RECS.length,LIST=S.records.findIndex(r=>r.list);
let C=null,have=[],known=new Map(),guess={},locked=new Set(),lastGrep=null,endAt=-1;
let Q=[],grab=null,tried=false,out=null,lastF=null,openAt=-1,nextAt=0,ambAt=0,tex=null,inkKey='',ghosted=reduce,tugged=false,cue=1,sc=1,heat=0,flareAt=-99,seed=0,lastA=-Math.PI/2;
let read,head,body,log,echo,inp,count,strip,lines=[],lastEnd=0;

const pad=n=>String(n).padStart(2,'0');
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ease=x=>x*x*(3-2*x);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const hash=(a,b,c=0)=>{const x=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return x-Math.floor(x);};
const tug=(t,j)=>{if(reduce)return 0;const x=(t*.22+j*.37)%1/.3;return x<1?Math.sin(Math.PI*x)**2:0;};
const waiting=t=>Q.find(q=>q.sm&&t-q.t0>PAIR);
const inside=(F,x,y)=>Math.abs(x-F.x)<F.hw+8&&Math.abs(y-F.y)<F.hh+8;
const div=c=>{const e=document.createElement('div');e.className=c;return e;};

function load(){let v={};try{v=JSON.parse(localStorage.getItem(KEY))??{};}catch{}
  have=Array.isArray(v.have)?[...new Set(v.have.filter(i=>Number.isInteger(i)&&i>=0&&i<N))]:[];
  known=new Map((Array.isArray(v.known)?v.known:[]).filter(w=>typeof w==='string').map(w=>[w,-1e9]));
  guess={};for(const c of S.crew)if(S.places.includes(v.guess?.[c.id]))guess[c.id]=v.guess[c.id];
  locked=new Set(S.crew.filter(c=>Array.isArray(v.locked)&&v.locked.includes(c.id)&&guess[c.id]===c.fate).map(c=>c.id));}
function save(){try{localStorage.setItem(KEY,JSON.stringify({have,known:[...known.keys()],guess,locked:[...locked]}));}catch{}}
const solved=()=>locked.size===S.crew.length;
const burnLeft=r=>[...r.burn].some(w=>!known.has(w));
const steerable=()=>have.length>=SCRIPTED;
function nextRec(){const left=RECS.map((_,i)=>i).filter(i=>!have.includes(i));
  return (steerable()&&lastGrep?left.find(i=>RECS[i].words.has(lastGrep)):null)??left[0];}

function geometry(ctx){
  const m=Math.min(ctx.W,ctx.H),{x:cx,y:cy,R}=ctx.hole,o=ease(clamp((ctx.e-.5)/.5));
  return {cx,cy,o,Rh:R*(1+(sc-1)*o),D:Math.min(200,Math.max(110,m*.22))};
}

// Each smear comes out somewhere new round the ring, at least GAP radians from the last one.
function spawn(t,sm){const s=Math.random()*1e3,side=hash(s,1)<.5?-1:1;
  if(sm)lastA=wrap(lastA+GAP+hash(s,2)*(2*Math.PI-2*GAP));
  Q.push({s,t0:t,a:sm?lastA:-.28+side*Math.PI/2+(hash(s,2)-.5)*1.6,r:RING,p:0,da:0,hv:0,gh:-1,al:1,sm});}
function step(t,dt){
  for(const q of Q){if(grab?.q===q)continue;const age=t-q.t0,f=reduce?1:1-Math.exp(-dt*6);
    if(ghosted||q.gh<0)q.p-=q.p*f;q.da-=q.da*f;
    if(q.sm||age<PAIR)continue;const x=(age-PAIR)/AMB;
    q.r=reduce?RING+.2:RING+(ESC-RING)*x*x;q.al=1-clamp(x);}
  Q=Q.filter(q=>q.al>0);}
function edge(ctx,G,a){const c=Math.cos(a),s=Math.sin(a);
  return Math.min(c>0?(ctx.W-G.cx)/c:c<0?-G.cx/c:1e9,s>0?(ctx.H-G.cy)/s:s<0?-G.cy/s:1e9);}
function resistedStretch(ctx,G,a,base,h,p){const L=Math.max(16,Math.min(G.Rh*.3,edge(ctx,G,a)-base-h-EDGE));
  return L*(1-Math.exp(-3*p))/(1-Math.exp(-3));}
function smear(ctx,G,q){const p=Math.min(1,q.p),k=ease(p),g=reduce?1:ease(clamp((ctx.t-q.t0-PAIR)/.5)),a=q.a+q.da;
  const h0=G.Rh*(.15+.09*k),base=G.Rh*SMR+h0,st=resistedStretch(ctx,G,a,base,h0,p)/2,h=h0+st;
  const R=base+st+G.Rh*(.07*tug(ctx.t,q.s)+.05*q.hv)*(1-k);
  return {a,R,h,w:G.Rh*(1-.15*k)*g/R,x:G.cx+Math.cos(a)*R,y:G.cy+Math.sin(a)*R};}
function hit(ctx,G,x,y,tol){const q=waiting(ctx.t);if(!q)return null;
  const M=smear(ctx,G,q),along=(Math.abs(wrap(Math.atan2(y-G.cy,x-G.cx)-M.a))-M.w)*M.R,across=Math.abs(Math.hypot(x-G.cx,y-G.cy)-M.R)-M.h;
  return Math.max(along,0)+Math.max(across,0)<tol?q:null;}
function ink(gl,t){const tk=reduce?0:Math.floor(t*6),ri=nextRec(),key=ri+'.'+tk;if(ri==null||key===inkKey)return;inkKey=key;
  const f=RECS[ri].lines[0].txt;let s='';for(let i=0;i<Math.min(f.length,14);i++)s+=f[i]===' '?' ':glyph(ri+1,i,tk,f[i]);
  const g=INK.getContext('2d');g.fillStyle='#222';g.fillRect(0,0,INK.width,INK.height);g.fillStyle='#fff';
  g.font='800 78px ui-monospace,Menlo,monospace';g.textBaseline='middle';g.save();g.scale(INK.width/g.measureText(s).width,1);g.fillText(s,0,INK.height/2);g.restore();
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,INK);}
const cardK=P=>clamp(.15+.85*(P-1)/CARD);
function detach(ctx,G,q,x,y){const P=smear(ctx,G,q),ri=nextRec();Q.splice(Q.indexOf(q),1);tugged=true;ghosted=true;
  out={w:have.length,ri,r:RECS[ri],ph:'drag',q,t0:ctx.t,dx:x,dy:y,ax0:P.x,ay0:P.y,px:P.x,py:P.y,ox:0,oy:0,k:.15,k0:.15,to:null};
  fill(ctx);}
function reattach(q,P){out=null;q.p=P;Q.push(q);}
function land(ctx){have.push(out.ri);if(!RECS.some((r,i)=>!have.includes(i)&&r.words.has(lastGrep)))lastGrep=null;save();nextAt=ctx.t+2.5-1.5*have.length/N;tiles();
  Object.assign(out,{ph:'rise',t0:ctx.t,x0:out.px,y0:out.py,k0:out.k,q:null});grab=null;fill(ctx);
  const wh=ctx.el.querySelector('.wh');if(wh&&have.length>=N)wh.textContent=S.hintEnd;}
function slip(ctx){const q=out.q;q.p=0;q.da=0;Q.push(q);const M=smear(ctx,geometry(ctx),q);
  Object.assign(out,{ph:'fall',t0:ctx.t,k0:out.k,fx:out.px,fy:out.py,to:{x:M.x,y:M.y},q:null});grab=null;}
function letGo(ctx){if(out?.ph==='drag'){if(out.k>=KEEP)land(ctx);else slip(ctx);}}
function catchQ(ctx,G,q){detach(ctx,G,q,0,0);out.k=0;land(ctx);}
function reset(){have=[];known=new Map();guess={};locked=new Set();lastGrep=null;endAt=-1;save();Q=[];nextAt=C.t+2;inkKey='';flareAt=-99;tiles();
  const wh=C.el.querySelector('.wh');if(wh)wh.textContent=S.hint;}

function open(ctx,w,x,y){if(out&&out.ph!=='fall'&&out.w===w||out?.ph==='drag')return;
  out={w,r:w==='end'?FINAL:RECS[have[w]],ph:'rise',t0:ctx.t,x0:x,y0:y,ox:0,oy:0,k:0,k0:0,to:null};fill(ctx);}
function openTile(j){const b=strip.children[j],r=b.getBoundingClientRect();open(C,j,r.left+r.width/2,r.top+r.height/2);}
function drop(ctx){if(!out||out.ph==='fall')return;
  const b=typeof out.w==='number'?strip.children[out.w]:null,r=(b||count).getBoundingClientRect();
  out.to={x:r.left+r.width/2,y:r.top+r.height/2};out.fx=out.px;out.fy=out.py;out.k0=out.k;out.ph='fall';out.t0=ctx.t;inp.blur();}
function rect(ctx){const w=Math.min(340,ctx.W-32),h=read.offsetHeight,vv=visualViewport,{x:cx,y:cy,R}=ctx.hole;
  const bot=Math.max(12,Math.min(ctx.H-124,vv?vv.offsetTop+vv.height-12:ctx.H)-h),sx=cx+R*1.35;
  if(ctx.W-sx-20>=w)return {x:sx,y:clamp(cy-h/2,12,bot),w,h};
  return {x:(ctx.W-w)/2,y:clamp(cy+R*1.2,12,bot),w,h};}
const box=(R,k)=>({hw:2+(R.w/2-2)*ease(clamp(k/.55)),hh:2+(R.h/2-2)*ease(clamp((k-.45)/.55))});
function morph(ctx){
  if(out.ph==='drag'){const R=rect(ctx),k=out.k,e=ease(k),hw=6+(R.w/2-6)*e,hh=6+(R.h/2-6)*e;
    const lx=(out.dx-out.ax0)*.12,ly=(out.dy-out.ay0)*.12,l=Math.hypot(lx,ly),s=l>24?24/l:1;
    const x=clamp(out.ax0+lx*s,hw+12,ctx.W-hw-12),y=clamp(out.ay0+ly*s,hh+12,ctx.H-hh-12);
    out.px=x;out.py=y;return {R,fade:1,k,x,y,hw,hh};}
  const x=clamp((ctx.t-out.t0)/(reduce?FADE:out.ph==='rise'?RISE:FALL));let k=1,fade=1,m=1;
  if(out.ph==='rise'){if(reduce)fade=x;else{m=1-(1-x)**3;k=out.k0+(1-out.k0)*m;}
    if(x>=1){out.ph='held';out.t0=ctx.t;if(mouse)inp.focus({preventScroll:true});}}
  else if(out.ph==='fall'){if(reduce){fade=1-x;k=out.k0;}else k=out.k0*(1-x*x);if(x>=1){out=null;return null;}}
  out.k=k;
  const R=rect(ctx),tx=R.x+R.w/2+out.ox,ty=R.y+R.h/2+out.oy;let x2,y2;
  if(out.ph==='fall'){const e=ease(out.k0>0?k/out.k0:0);x2=out.to.x+(out.fx-out.to.x)*e;y2=out.to.y+(out.fy-out.to.y)*e;}
  else{const e=out.ph==='held'||reduce?1:m;x2=out.x0+(tx-out.x0)*e;y2=out.y0+(ty-out.y0)*e;}
  out.px=x2;out.py=y2;return {R,fade,k,x:x2,y:y2,...box(R,k)};
}

function fill(ctx){const {w,r}=out;
  head.textContent=w==='end'?`day ${r.at}  ${r.h}`:`${pad(w+1)}/${pad(N)}  day ${r.at}  ${r.h}`;
  body.textContent='';log.textContent='';lines=[];lastEnd=ctx.t+(reduce?FADE:RISE);read.classList.remove('done');
  r.lines.forEach((l,i)=>add(body,'f',l.txt,{rng:l.rng,sd:i*13.1+(w==='end'?99:w)}));
  if(w===0&&have.length<=1)add(log,'m',S.firstCard);}
function add(par,cls,txt,{at,rng=[],sd}={}){
  const e=div(cls);par.appendChild(e);
  const L={e,txt,rng,sd:sd??(seed+=7.3),at:at??Math.max(lastEnd,C.t),k:''};
  if(at==null)lastEnd=L.at+txt.length*TYPE/1000;lines.push(L);
  if(par===log)while(log.children.length>LOG){const d=log.firstChild;lines=lines.filter(l=>l.e!==d);d.remove();}}
function glyph(sd,i,tk,c){if(hash(sd,i,tk*1.7+3)<1/30)return c;
  return GLY[Math.floor((tk&&hash(sd,i,tk)<.25?hash(sd,i,tk+.5):hash(sd,i))*GLY.length)];}
function burnt(L,i,t){for(const [a,b,w] of L.rng)if(i>=a&&i<b){const kt=known.get(w);return kt==null||!reduce&&t<kt+(i-a)*TYPE*REVEAL/1000;}return false;}
function render(t){const tk=reduce?0:Math.floor(t*11);let typing=false;
  for(const L of lines){const len=L.txt.length,n=clamp(Math.floor((t-L.at)*1000/TYPE),0,len),cur=n<len&&t>=L.at;if(n<len)typing=true;
    let a='';for(let i=0;i<n;i++)a+=burnt(L,i,t)?glyph(L.sd,i,tk,L.txt[i]):L.txt[i];
    const u=L.txt.slice(n),k=a+'\0'+cur+'\0'+u;if(k===L.k)continue;L.k=k;
    L.e.textContent=a;
    if(cur){const s=document.createElement('span');s.className='cur';L.e.appendChild(s);}
    if(u){const s=document.createElement('span');s.className='u';s.textContent=u;L.e.appendChild(s);}}
  read.classList.toggle('done',!typing);}
const T=S.say;
const CMD={
  help:()=>T.help,
  ls:()=>have.length?have.map((ri,j)=>[RECS[ri].at,T.ls(j+1,RECS[ri].h,RECS[ri].at)]).sort().map(x=>x[1]):T.lsNone,
  cat:([n])=>{if(!n)return T.catUsage;const j=parseInt(n,10)-1;if(!(j>=0&&j<have.length))return T.catNone(n);openTile(j);return [];},
  grep:([raw])=>{const w=(raw??'').replace(/[^a-z0-9%]/g,'');if(!w)return T.grepUsage;const o=[];
    if(!known.has(w)&&RECS.some(r=>r.burn.has(w))){known.set(w,C.t);save();tiles();o.push(T.grepBurned(w));}
    have.forEach((ri,j)=>{if(RECS[ri].words.has(w))o.push(T.grepHit(j+1,RECS[ri].h));});
    const k=RECS.filter((r,i)=>!have.includes(i)&&r.words.has(w)).length;if(k){lastGrep=w;o.push(T.grepInside(k,steerable()));}
    return o.length?o:T.grepNone(w);},
  who:()=>have.includes(LIST)?S.crew.map(c=>T.who(c,guess[c.id],locked.has(c.id))):T.whoNone,
  places:()=>[S.places.join('  ')],
  fate:a=>{if(!have.includes(LIST))return T.whoNone;if(a.length<2)return T.fateUsage;
    const p=a.at(-1),ns=a.slice(0,-1).map(x=>x.replace(/^[a-z]\./,'')).filter(Boolean),c=S.crew.find(c=>ns.some(n=>n===c.first||n===c.last));
    if(!c)return T.fateWho(ns.join(' '));if(!S.places.includes(p))return T.fatePlace(p);if(locked.has(c.id))return T.fateLocked(c);
    guess[c.id]=p;const o=[...T.fateNoted(c,p)],right=S.crew.filter(x=>!locked.has(x.id)&&guess[x.id]===x.fate);
    const lock=right.slice(0,right.length-right.length%2);
    if(lock.length){lock.forEach(x=>locked.add(x.id));o.push(...T.fatePair(lock));flareAt=C.t;}
    if(solved()&&lock.length){o.push(...T.fateDone);endAt=C.t+ENDS;}
    save();return o;},
  reset:()=>{reset();return [];},
};
function run(raw){const cmd=raw.trim().slice(0,60);
  if(cmd.toLowerCase()==='clear'){log.textContent='';lines=lines.filter(l=>l.e.parentNode===body);return;}
  add(log,'e','> '+cmd,{at:-1e9});if(!cmd)return;
  const [name,...args]=cmd.toLowerCase().split(/\s+/);
  for(const l of Object.hasOwn(CMD,name)?CMD[name](args):T.unknown(name))add(log,'o',l);}
function tiles(){strip.textContent='';
  const tile=(w,txt,label,ok)=>{const b=document.createElement('button');b.textContent=txt;b.setAttribute('aria-label',label);b.classList.toggle('ok',ok);
    b.addEventListener('click',()=>{if(!C||C.leaving)return;if(out?.w===w&&out.ph!=='fall'){drop(C);return;}
      const r=b.getBoundingClientRect();open(C,w,r.left+r.width/2,r.top+r.height/2);});
    strip.appendChild(b);};
  have.forEach((ri,j)=>tile(j,pad(j+1),`record ${j+1}`,!burnLeft(RECS[ri])));
  if(solved())tile('end','--',`day ${FINAL.at} ${FINAL.h}`,true);
  count.textContent=`${S.label} ${pad(have.length)}/${pad(N)}`;}

export default {
  hint:S.hint,
  enter(ctx){
    C=ctx;load();Q=[];inkKey='';grab=null;tried=false;out=null;lastF=null;openAt=-1;flareAt=-99;endAt=-1;lastGrep=null;lines=[];
    sc=1-.2*have.length/N;heat=have.length/N;
    const wh=ctx.el.querySelector('.wh');if(wh&&have.length>=N)wh.textContent=S.hintEnd;
    read=div('pull-r');
    read.innerHTML='<div class="h"></div><div class="b"></div><div class="o"></div><label class="in"><span>&gt; </span><span class="v"></span><span class="cur"></span>'+
      '<input type="text" name="cmd" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send" maxlength="60" aria-label="terminal"></label>';
    [head,body,log]=read.children;echo=read.querySelector('.v');inp=read.querySelector('input');
    inp.addEventListener('input',()=>{echo.textContent=inp.value;});
    inp.addEventListener('keydown',e=>{if(e.key==='Escape')return;e.stopPropagation();
      if(e.key==='Enter'&&out?.ph==='held'){run(inp.value);inp.value='';echo.textContent='';}});
    count=div('pull-c');strip=div('pull-s');
    if(!tex){const gl=ctx.gl;tex=gl.createTexture();gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,tex);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,INK);
      for(const [n,v] of [[gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR],[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE]])gl.texParameteri(gl.TEXTURE_2D,n,v);
      gl.activeTexture(gl.TEXTURE0);}
    ctx.el.append(read,count,strip);tiles();
  },
  leave(){if(out?.ph==='drag')out=null;grab=null;inp?.blur();},
  frame(ctx,dt){
    const t=ctx.t,{x:px,y:py,down}=ctx.pointer,k=ctx.DPR,gl=ctx.gl;
    if(!down){letGo(ctx);grab=null;tried=false;}
    if(openAt<0&&ctx.e>.95){openAt=t;nextAt=t+1.2;ambAt=t+3;}
    const sm=reduce?1:Math.min(1,dt*2),f=have.length/N;sc+=(1-.2*f-sc)*sm;heat+=(f-heat)*sm;
    const G=geometry(ctx);
    if(endAt>0&&t>=endAt&&out?.ph!=='drag'){endAt=-1;open(ctx,'end',G.cx,G.cy);}
    if(openAt>=0&&!ctx.leaving&&have.length<N){if(t>=nextAt&&!Q.some(q=>q.sm)&&out?.ph!=='drag')spawn(t,true);
      if(t>=ambAt&&Q.length<MAXQ-1){spawn(t,false);ambAt=t+4-2*f+2*Math.random();}}
    step(t,dt);
    if(!ghosted&&openAt>=0&&!out){const q=waiting(t-.4);
      if(q){if(q.gh<0)q.gh=t;const g=t-q.gh;
        if(g>=1.65)ghosted=true;else q.p=.45*(g<.55?ease(g/.55):g<1.05?1:1-ease((g-1.05)/.6));}}
    const hv=mouse&&!down&&!ctx.leaving?hit(ctx,G,px,py,30):null;
    for(const q of Q){const to=q===hv?1:0;q.hv+=reduce?to-q.hv:(to-q.hv)*Math.min(1,dt*10);}
    if(out&&out.ph==='held'&&!grab?.plate){const f=Math.exp(-dt*9);out.ox*=f;out.oy*=f;}
    if(tugged)cue=Math.max(0,cue-dt*1.5);
    read.style.width=Math.min(340,ctx.W-32)+'px';
    const F=lastF=out?morph(ctx):null;
    QA.fill(0);QB.fill(0);let n=0;const cv=cue*clamp((ctx.e-.6)/.4);
    for(const q of Q){const age=t-q.t0;if(q.sm&&age>=PAIR)continue;
      const R=G.Rh*q.r,a=q.a,fl=reduce||age>=PAIR||hash(Math.floor(t*24),q.s)>.3?1:.3;
      QA.set([(G.cx+Math.cos(a)*R)*k,(G.cy+Math.sin(a)*R)*k,a,(age<PAIR?0:(R-G.Rh*RING)*.45)*k],n*4);QB.set([q.al*fl,0,0,0],n*4);n++;
      if(age<PAIR){const x=clamp((age-PAIR*.5)/(PAIR*.5)),r=G.Rh*(RING-.12)*(reduce?1:1-ease(x));
        QA.set([(G.cx+Math.cos(a)*r)*k,(G.cy+Math.sin(a)*r)*k,a+Math.PI,G.Rh*.5*(reduce?0:x)*k],n*4);QB.set([(reduce?1-x:1-x*x)*fl,1,0,0],n*4);n++;}}
    const sq=waiting(t);
    if(sq){const M=smear(ctx,G,sq);gl.uniform4f(ctx.u('pull_sm'),M.a,M.R*k,M.h*k,M.w);
      gl.uniform4f(ctx.u('pull_smm'),Math.min(1,sq.p),1+.25*sq.hv,cv*(1-clamp(sq.p*3)),0);}
    else gl.uniform4f(ctx.u('pull_smm'),0,0,0,0);
    gl.activeTexture(gl.TEXTURE4);gl.bindTexture(gl.TEXTURE_2D,tex);ink(gl,t);gl.uniform1i(ctx.u('pull_tx'),4);gl.activeTexture(gl.TEXTURE0);
    gl.uniform4fv(ctx.u('pull_q'),QA);gl.uniform4fv(ctx.u('pull_qm'),QB);gl.uniform1f(ctx.u('pull_n'),n);
    gl.uniform3f(ctx.u('pull_h'),G.cx*k,G.cy*k,G.Rh*k);gl.uniform3fv(ctx.u('pull_spin'),ctx.spin);gl.uniform1f(ctx.u('pull_t'),reduce?0:t);
    const fx=t<flareAt?0:Math.max(0,1-(t-flareAt)/FLARE),scr=!!out&&burnLeft(out.r);
    gl.uniform2f(ctx.u('pull_heat'),heat*G.o,(reduce?.5:1)*fx);
    if(F)gl.uniform4f(ctx.u('pull_pc'),F.x*k,F.y*k,F.hw*k,F.hh*k);
    gl.uniform4f(ctx.u('pull_pf'),F?F.fade:0,F?F.k:0,F?1:0,!F?0:out.ph!=='held'?1:scr?.5:.15);
    const held=!ctx.leaving&&out?.ph==='held';
    read.style.opacity=held?1:0;
    if(F){const tk=Math.floor(t*12),j=!reduce&&scr&&hash(tk,3)<.08?(hash(tk,4)-.5)*4:0;
      read.style.transform=`translate(${F.R.x+out.ox+j}px,${F.R.y+out.oy}px)`;render(t);}
    if(!held&&document.activeElement===inp)inp.blur();
    const ui=ctx.leaving?0:clamp((ctx.e-.6)/.4);count.style.opacity=ui;strip.style.opacity=ui;strip.style.visibility=ui>0?'':'hidden';
    if(!ctx.leaving)document.getElementById('c').style.cursor=grab?'grabbing':hv||(held&&inside(F,px,py))?'grab':'default';
  },
  drag(ctx){const G=geometry(ctx),{x,y}=ctx.pointer,t=Math.atan2(y-G.cy,x-G.cx);
    if(!grab&&!tried&&!ctx.leaving){tried=true;ghosted=true;
      if(out?.ph==='held'&&lastF&&inside(lastF,x,y))grab={plate:true,x0:x,y0:y,ox:out.ox,oy:out.oy};
      else{const q=hit(ctx,G,x,y,40);if(q)grab={q,x0:x,y0:y,t0:t,p0:q.p,da0:q.da};}}
    if(!grab)return false;
    if(grab.plate){if(out?.ph!=='held'){grab=null;return true;}out.ox=grab.ox+(x-grab.x0)*.8;out.oy=grab.oy+(y-grab.y0)*.8;return true;}
    // pull in any direction that isn't back into the hole; sideways only swings the smear a little, never round the ring
    const q=grab.q,dx=x-grab.x0,dy=y-grab.y0,d=Math.hypot(dx,dy),a=q.a+grab.da0,c=d?(dx*Math.cos(a)+dy*Math.sin(a))/d:1;
    const P=Math.max(0,grab.p0+d*clamp((c+.6)/.9)/(G.D*REACH));
    if(out?.ph==='drag'&&out.q===q){out.dx=x;out.dy=y;if(P>=1)out.k=cardK(P);else reattach(q,P);return true;}
    if(!Q.includes(q)){grab=null;return true;}
    q.p=P;q.da=grab.da0+Math.tanh(wrap(t-grab.t0)*1.5)*.3;
    if(q.p>=1)detach(ctx,G,q,x,y);return true;},
  release(ctx){letGo(ctx);if(grab?.plate&&out&&Math.hypot(out.ox,out.oy)>ctx.hole.R*.4)drop(ctx);
    grab=null;tried=false;},
  tap(ctx,x,y){
    if(out?.ph==='drag')return;
    if(out&&out.ph!=='fall'){if(out.ph==='held'&&lastF&&inside(lastF,x,y)){inp.focus({preventScroll:true});return;}drop(ctx);}
    const q=hit(ctx,geometry(ctx),x,y,34);if(q)q.p=Math.max(q.p,.3);},
  key(ctx,e){if(e.key!=='Enter'&&e.key!=='ArrowUp'||e.target.closest?.('button'))return;
    const q=waiting(ctx.t);if(!q)return;ghosted=true;
    q.p+=e.key==='Enter'?1:.35;if(q.p>=1)catchQ(ctx,geometry(ctx),q);},
  back(ctx){if(!out||out.ph==='fall')return false;if(out.ph==='drag')slip(ctx);else drop(ctx);return true;},
};
