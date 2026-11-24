import S from './story.js';
const N=S.fragments.length,PAGE=Math.ceil(N/2),KEY='pull.page',MAXQ=4;
const RISE=1.1,FALL=.65,FADE=.25,TYPE=16,PAIR=.6,AMB=1.4,RING=1.1,ESC=2.6,SMR=1.16,DECODE=1.5,FLARE=1.6,LOG=8;
const GLY='#%&*+=<>/\\|[]{}?!$^~:;01';
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mouse=matchMedia('(hover: hover)').matches;
addEventListener('pointermove',e=>{mouse=e.pointerType==='mouse';});
const QA=new Float32Array(MAXQ*8),QB=new Float32Array(MAXQ*8);
const INK=document.createElement('canvas');INK.width=512;INK.height=80;
let C=null,got=0,Q=[],grab=null,tried=false,out=null,lastF=null,openAt=-1,nextAt=0,ambAt=0,tex=null,inkKey='',ghosted=reduce,pulled=false,cue=1,sc=1,heat=0,flareAt=-99,flashed=false,seed=0;
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

function load(){try{const n=JSON.parse(localStorage.getItem(KEY))?.n;return Number.isInteger(n)?clamp(n,0,N):0;}catch{return 0;}}
function save(){try{localStorage.setItem(KEY,JSON.stringify({n:got}));}catch{}}

function geometry(ctx){
  const m=Math.min(ctx.W,ctx.H),{x:cx,y:cy,R}=ctx.hole,o=ease(clamp((ctx.e-.5)/.5));
  return {cx,cy,o,Rh:R*(1+(sc-1)*o),D:Math.min(200,Math.max(110,m*.22))};
}

function spawn(t,sm){const s=Math.random()*1e3,side=hash(s,1)<.5?-1:1;
  Q.push({s,t0:t,a:sm?-Math.PI/2+(hash(s,2)-.5)*.4:-.28+side*Math.PI/2+(hash(s,2)-.5)*1.6,r:RING,p:0,da:0,hv:0,gh:-1,al:1,sm});}
function step(t,dt){
  for(const q of Q){if(grab?.q===q)continue;const age=t-q.t0,f=reduce?1:1-Math.exp(-dt*6);
    if(ghosted||q.gh<0)q.p-=q.p*f;q.da-=q.da*f;
    if(q.sm||age<PAIR)continue;const x=(age-PAIR)/AMB;
    q.r=reduce?RING+.2:RING+(ESC-RING)*x*x;q.al=1-clamp(x);}
  Q=Q.filter(q=>q.al>0);}
function smear(ctx,G,q){const k=ease(Math.min(1,q.p)),g=reduce?1:ease(clamp((ctx.t-q.t0-PAIR)/.5));
  const h=G.Rh*(.15+.17*k),R=G.Rh*SMR+h+q.p*G.D+G.Rh*(.07*tug(ctx.t,q.s)+.05*q.hv)*(1-k),a=q.a+q.da;
  return {a,R,h,w:G.Rh*(1-.15*k)*g/R,x:G.cx+Math.cos(a)*R,y:G.cy+Math.sin(a)*R};}
function hit(ctx,G,x,y,tol){const q=waiting(ctx.t);if(!q)return null;
  const M=smear(ctx,G,q),along=(Math.abs(wrap(Math.atan2(y-G.cy,x-G.cx)-M.a))-M.w)*M.R,across=Math.abs(Math.hypot(x-G.cx,y-G.cy)-M.R)-M.h;
  return Math.max(along,0)+Math.max(across,0)<tol?q:null;}
function ink(gl,t){const tk=reduce?0:Math.floor(t*6),f=S.fragments[got],key=got+'.'+tk;if(!f||key===inkKey)return;inkKey=key;
  let s='';for(let i=0;i<Math.min(f.length,14);i++)s+=got<PAGE&&f[i]!==' '?glyph(got+1,i,tk,f[i]):f[i];
  const g=INK.getContext('2d');g.fillStyle='#222';g.fillRect(0,0,INK.width,INK.height);g.fillStyle='#fff';
  g.font='800 78px ui-monospace,Menlo,monospace';g.textBaseline='middle';g.save();g.scale(INK.width/g.measureText(s).width,1);g.fillText(s,0,INK.height/2);g.restore();
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,INK);}
function catchQ(ctx,G,q){const P=smear(ctx,G,q);Q.splice(Q.indexOf(q),1);grab=null;pulled=true;ghosted=true;
  got++;save();nextAt=ctx.t+2.5-1.5*got/N;tiles();open(ctx,got===PAGE?'page':got-1,P.x,P.y);
  const wh=ctx.el.querySelector('.wh');if(wh&&got>=N)wh.textContent=S.hintEnd;}
function reset(){got=0;save();Q=[];nextAt=C.t+2;inkKey='';flareAt=-99;flashed=false;strip.classList.remove('fl');tiles();
  const wh=C.el.querySelector('.wh');if(wh)wh.textContent=S.hint;}

function open(ctx,w,x,y){if(out&&out.ph!=='fall'&&out.w===w)return;
  out={w,ph:'rise',t0:ctx.t,x0:x,y0:y,ox:0,oy:0,k:0,k0:1,to:null};fill(ctx);}
function drop(ctx){if(!out||out.ph==='fall')return;
  const b=typeof out.w==='number'?strip.children[out.w]:null,r=(b||count).getBoundingClientRect();
  out.to={x:r.left+r.width/2,y:r.top+r.height/2};out.k0=out.k;out.ph='fall';out.t0=ctx.t;inp.blur();}
function rect(ctx){const w=Math.min(340,ctx.W-32),h=read.offsetHeight,vv=visualViewport,{x:cx,y:cy,R}=ctx.hole;
  const bot=Math.max(12,Math.min(ctx.H-124,vv?vv.offsetTop+vv.height-12:ctx.H)-h),sx=cx+R*1.35;
  if(ctx.W-sx-20>=w)return {x:sx,y:clamp(cy-h/2,12,bot),w,h};
  return {x:(ctx.W-w)/2,y:clamp(cy+R*1.2,12,bot),w,h};}
function morph(ctx){
  const x=clamp((ctx.t-out.t0)/(reduce?FADE:out.ph==='rise'?RISE:FALL));let k=1,fade=1;
  if(out.ph==='rise'){if(reduce)fade=x;else k=1-(1-x)**3;
    if(x>=1){out.ph='held';out.t0=ctx.t;if(mouse)inp.focus({preventScroll:true});}}
  else if(out.ph==='fall'){if(reduce){fade=1-x;k=out.k0;}else k=out.k0*(1-x*x);if(x>=1){out=null;return null;}}
  out.k=k;
  const R=rect(ctx),A=out.ph==='fall'?out.to:{x:out.x0,y:out.y0},e=ease(k);
  const tx=R.x+R.w/2+out.ox,ty=R.y+R.h/2+out.oy,kx=ease(clamp(k/.55)),ky=ease(clamp((k-.45)/.55));
  return {R,fade,k,x:A.x+(tx-A.x)*e,y:A.y+(ty-A.y)*e,hw:2+(R.w/2-2)*kx,hh:2+(R.h/2-2)*ky};
}

function fill(ctx){const t0=ctx.t+(reduce?FADE:RISE),w=out.w;
  head.textContent=w==='page'?`${S.label} ${pad(PAGE)}/${pad(N)}`:`${S.card} ${pad(w+1)}/${pad(N)}`;
  body.textContent='';log.textContent='';lines=[];lastEnd=t0;read.classList.remove('done');
  if(w==='page'){const rz=t0+DECODE;flareAt=rz;flashed=false;strip.classList.remove('fl');
    S.fragments.slice(0,PAGE).forEach((f,j)=>add(body,'f',f,{scr:true,at:-1e9,pre:pad(j+1)+' ',rz,sd:j+1}));
    lastEnd=rz+1.2;S.page.forEach(l=>add(body,'m',l));}
  else{add(body,'f',S.fragments[w],{scr:got<PAGE,sd:w+1});if(w===N-1&&got>=N)S.final.forEach(l=>add(body,'m',l));}}
function add(par,cls,txt,{scr=false,at,pre='',rz=null,sd}={}){
  const e=div(cls);par.appendChild(e);
  const L={e,txt,pre,scr,rz,sd:sd??(seed+=7.3),at:at??Math.max(lastEnd,C.t),k:''};
  if(at==null)lastEnd=L.at+txt.length*TYPE/1000;lines.push(L);
  if(par===log)while(log.children.length>LOG){const d=log.firstChild;lines=lines.filter(l=>l.e!==d);d.remove();}}
function glyph(sd,i,tk,c){if(hash(sd,i,tk*1.7+3)<1/30)return c;
  return GLY[Math.floor((tk&&hash(sd,i,tk)<.25?hash(sd,i,tk+.5):hash(sd,i))*GLY.length)];}
function render(t){const tk=reduce?0:Math.floor(t*11);let typing=false;
  for(const L of lines){const len=L.txt.length,n=clamp(Math.floor((t-L.at)*1000/TYPE),0,len);
    const rs=!L.scr?len:L.rz==null||t<L.rz?0:reduce?len:Math.floor((t-L.rz)*1000/TYPE);
    const cur=n<len?(t>=L.at?n:-1):rs<len&&L.rz!=null&&t>=L.rz?rs:-1;if(n<len)typing=true;
    let a='',b='';for(let i=0;i<n;i++){const c=L.txt[i],g=i<rs||c===' '?c:glyph(L.sd,i,tk,c);if(cur<0||i<cur)a+=g;else b+=g;}
    const u=L.txt.slice(n),k=a+'\0'+cur+b+'\0'+u;if(k===L.k)continue;L.k=k;
    L.e.textContent=L.pre+a;
    if(cur>=0){const s=document.createElement('span');s.className='cur';L.e.appendChild(s);}
    if(b)L.e.append(b);
    if(u){const s=document.createElement('span');s.className='u';s.textContent=u;L.e.appendChild(s);}}
  read.classList.toggle('done',!typing);}
function run(raw){const cmd=raw.trim().slice(0,60);add(log,'e','> '+cmd,{at:-1e9});if(!cmd)return;
  const [name,...args]=cmd.toLowerCase().split(/\s+/),c=Object.hasOwn(S.commands,name)?S.commands[name]:null;
  const st={got,N,page:PAGE,fragments:S.fragments.slice(0,got)},scr=got<PAGE;
  for(const l of c?typeof c==='function'?c(st,args):c:S.unknown(name))add(log,'o',l,{scr});
  if(name==='reset')reset();}
function tiles(){strip.textContent='';
  for(let j=0;j<got;j++){const b=document.createElement('button');b.textContent=pad(j+1);b.setAttribute('aria-label',`${S.card} ${j+1}`);
    b.addEventListener('click',()=>{if(!C||C.leaving)return;if(out?.w===j&&out.ph!=='fall'){drop(C);return;}
      const r=b.getBoundingClientRect();open(C,j,r.left+r.width/2,r.top+r.height/2);});
    strip.appendChild(b);}
  count.textContent=`${S.label} ${pad(got)}/${pad(N)}`;}

export default {
  hint:S.hint,
  enter(ctx){
    C=ctx;got=load();Q=[];inkKey='';grab=null;tried=false;out=null;lastF=null;openAt=-1;flareAt=-99;flashed=false;lines=[];
    sc=1-.55*got/N;heat=got/N;
    const wh=ctx.el.querySelector('.wh');if(wh&&got>=N)wh.textContent=S.hintEnd;
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
  leave(){grab=null;inp?.blur();},
  frame(ctx,dt){
    const t=ctx.t,{x:px,y:py,down}=ctx.pointer,k=ctx.DPR,gl=ctx.gl;
    if(!down){grab=null;tried=false;}
    if(openAt<0&&ctx.e>.95){openAt=t;nextAt=t+1.2;ambAt=t+3;}
    const sm=reduce?1:Math.min(1,dt*2);sc+=(1-.55*got/N-sc)*sm;heat+=(got/N-heat)*sm;
    const G=geometry(ctx);
    if(openAt>=0&&!ctx.leaving&&got<N){if(t>=nextAt&&!Q.some(q=>q.sm))spawn(t,true);
      if(t>=ambAt&&Q.length<MAXQ-1){spawn(t,false);ambAt=t+4-2*got/N+2*Math.random();}}
    step(t,dt);
    if(!ghosted&&openAt>=0&&!out){const q=waiting(t-.4);
      if(q){if(q.gh<0)q.gh=t;const g=t-q.gh;
        if(g>=1.65)ghosted=true;else q.p=.45*(g<.55?ease(g/.55):g<1.05?1:1-ease((g-1.05)/.6));}}
    const hv=mouse&&!down&&!ctx.leaving?hit(ctx,G,px,py,30):null;
    for(const q of Q){const to=q===hv?1:0;q.hv+=reduce?to-q.hv:(to-q.hv)*Math.min(1,dt*10);}
    if(out&&out.ph==='held'&&!grab?.plate){const f=Math.exp(-dt*9);out.ox*=f;out.oy*=f;}
    if(pulled)cue=Math.max(0,cue-dt*1.5);
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
    const fx=t<flareAt?0:Math.max(0,1-(t-flareAt)/FLARE),scr=!!out&&(got<PAGE||out.w==='page'&&t<flareAt);
    gl.uniform2f(ctx.u('pull_heat'),heat*G.o,(reduce?.5:1)*fx);
    if(F)gl.uniform4f(ctx.u('pull_pc'),F.x*k,F.y*k,F.hw*k,F.hh*k);
    gl.uniform4f(ctx.u('pull_pf'),F?F.fade:0,F?F.k:0,F?1:0,!F?0:out.ph!=='held'?1:scr?(out.w==='page'?1.6:1):.15);
    const held=!ctx.leaving&&out?.ph==='held';
    read.style.opacity=held?1:0;
    if(F){const tk=Math.floor(t*12),j=!reduce&&scr&&hash(tk,3)<.08?(hash(tk,4)-.5)*4:0;
      read.style.transform=`translate(${F.R.x+out.ox+j}px,${F.R.y+out.oy}px)`;render(t);}
    if(!held&&document.activeElement===inp)inp.blur();
    const ui=ctx.leaving?0:clamp((ctx.e-.6)/.4);count.style.opacity=ui;strip.style.opacity=ui;strip.style.visibility=ui>0?'':'hidden';
    strip.classList.toggle('d',got>=PAGE&&t>=flareAt);
    if(!flashed&&flareAt>0&&t>=flareAt){flashed=true;strip.classList.add('fl');}
    if(!ctx.leaving)document.getElementById('c').style.cursor=grab?'grabbing':hv||(held&&inside(F,px,py))?'grab':'default';
  },
  drag(ctx){const G=geometry(ctx),{x,y}=ctx.pointer,r=Math.hypot(x-G.cx,y-G.cy),t=Math.atan2(y-G.cy,x-G.cx);
    if(!grab&&!tried&&!ctx.leaving){tried=true;ghosted=true;
      if(out?.ph==='held'&&lastF&&inside(lastF,x,y))grab={plate:true,x0:x,y0:y,ox:out.ox,oy:out.oy};
      else{const q=hit(ctx,G,x,y,40);if(q)grab={q,r0:r,t0:t,p0:q.p,da0:q.da};}}
    if(!grab)return false;
    if(grab.plate){if(out?.ph!=='held'){grab=null;return true;}out.ox=grab.ox+(x-grab.x0)*.8;out.oy=grab.oy+(y-grab.y0)*.8;return true;}
    const q=grab.q;if(!Q.includes(q)){grab=null;return true;}
    q.p=Math.max(0,grab.p0+(r-grab.r0)/G.D);q.da=grab.da0+wrap(t-grab.t0)*.7;if(q.p>=1)catchQ(ctx,G,q);return true;},
  release(ctx){if(grab?.plate&&out&&Math.hypot(out.ox,out.oy)>ctx.hole.R*.4)drop(ctx);
    grab=null;tried=false;},
  tap(ctx,x,y){
    if(out&&out.ph!=='fall'){if(out.ph==='held'&&lastF&&inside(lastF,x,y)){inp.focus({preventScroll:true});return;}drop(ctx);}
    const q=hit(ctx,geometry(ctx),x,y,34);if(q)q.p=Math.max(q.p,.3);},
  key(ctx,e){if(e.key!=='Enter'&&e.key!=='ArrowUp'||e.target.closest?.('button'))return;
    const q=waiting(ctx.t);if(!q)return;ghosted=true;
    q.p+=e.key==='Enter'?1:.35;if(q.p>=1)catchQ(ctx,geometry(ctx),q);},
  back(ctx){if(!out||out.ph==='fall')return false;drop(ctx);return true;},
};
