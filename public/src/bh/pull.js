const MAX=16,TAU=Math.PI*2,RISE=1.1,FALL=.65,FADE=.25,TYPE=16;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
let mouse=matchMedia('(hover: hover)').matches;
addEventListener('pointermove',e=>{mouse=e.pointerType==='mouse';});
const S=new Float32Array(MAX*4),M=new Float32Array(MAX*4);
const st=new Map();
let grab=null,tried=false,sel=0,label=null,read=null,lines=[],typeT0=0,spin=0,out=null,openAt=-1,ghosted=reduce,pulled=false,cue=1;

const year=d=>{const y=parseInt(d,10);return Number.isFinite(y)?y:9999;};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ease=x=>x*x*(3-2*x);
const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
const tug=(t,j)=>{if(reduce)return 0;const x=(t*.22+j*.37)%1/.3;return x<1?Math.sin(Math.PI*x)**2:0;};

function geometry(ctx){
  const m=Math.min(ctx.W,ctx.H),hole=ctx.hole||{x:ctx.W/2,y:ctx.H/2,R:m*.1};
  const Rh=hole.R+(m*(ctx.narrow?.2:.17)-hole.R)*ease(Math.min(1,ctx.e));
  return {cx:hole.x,cy:hole.y,Rh,D:Math.min(240,Math.max(110,m*.3)),hs:Rh*(ctx.narrow?1:.92)};
}

function layout(ctx,G){
  const P=ctx.projects().slice().sort((a,b)=>year(a.d)-year(b.d)).slice(-MAX),n=P.length;
  return P.map((p,j)=>{
    const s=st.get(p.i)||st.set(p.i,{p:0,da:0,hv:0}).get(p.i);
    const age=n>1?1-j/(n-1):.3,k=ease(Math.min(1,s.p));
    const h0=G.Rh*(.13-.04*age),h=h0+(G.Rh*.55-h0)*k;
    const R=G.Rh*(1.012+.05*(1-age))+h+s.p*G.D+G.Rh*(.07*tug(ctx.t,j)+.05*s.hv)*(1-k);
    const w0=Math.min(.55,Math.PI/n*.8)*(1+.3*age);
    const arc=w0*R+(h-w0*R)*k;
    return {p,s,age,h,R,a:-Math.PI/2+j*TAU/n+spin+s.da,w:arc/R};
  });
}

function hit(L,G,x,y){
  const r=Math.hypot(x-G.cx,y-G.cy),t=Math.atan2(y-G.cy,x-G.cx);let best=null,bd=1e9;
  for(const d of L){if(out&&d.p.i===out.i)continue;
    const along=Math.abs(wrap(t-d.a))*d.R-d.w*d.R,across=Math.abs(r-d.R)-d.h;
    const dist=Math.max(along,0)+Math.max(across,0);if(dist<28&&dist<bd){bd=dist;best=d;}}
  return best;
}

function plate(ctx,G){const b=reduce?0:(1-Math.cos(ctx.t*1.3))/2;
  return {x:G.cx+out.ox,y:G.cy+out.oy+b*G.Rh*.015,hw:G.hs,hh:G.hs*(1+b*.012),b};}
const inside=(P,x,y)=>Math.abs(x-P.x)<P.hw+8&&Math.abs(y-P.y)<P.hh+8;
function inRead(x,y){if(!read||+read.style.opacity<.5)return false;const r=read.getBoundingClientRect();
  return x>r.left-8&&x<r.right+8&&y>r.top-8&&y<r.bottom+8;}

function rescue(ctx,d){pulled=true;ghosted=true;grab=null;
  out={i:d.p.i,p:d.p,ph:'rise',t0:ctx.t,f:{a:d.a,R:d.R,h:d.h,w:d.w,st:.5*Math.min(1,d.s.p)},ox:0,oy:0,k:0,k0:1};
  d.s.p=0;d.s.da=0;}
function drop(ctx){if(!out||out.ph==='fall')return;out.k0=out.k;out.ph='fall';out.t0=ctx.t;lines=[];}

function morph(ctx,G,L){
  const d=L.find(d=>d.p.i===out.i);if(!d){out=null;return null;}
  const x=clamp((ctx.t-out.t0)/(reduce?FADE:out.ph==='rise'?RISE:FALL));let k=1,fade=1,vis=0;
  if(out.ph==='rise'){if(reduce)fade=x;else k=1-(1-x)**3;if(x>=1){out.ph='held';out.t0=ctx.t;fill(out.p,ctx.t);}}
  else if(out.ph==='held')k=1-.45*clamp(Math.hypot(out.ox,out.oy)/(G.Rh*1.2));
  else{if(reduce){fade=1-x;vis=x;k=out.k0;}else k=out.k0*(1-x*x);if(x>=1){out=null;return null;}}
  out.k=k;
  const P=plate(ctx,G),f=out.ph==='rise'?out.f:{a:d.a,R:d.R,h:d.h,w:d.w,st:0},e=ease(k);
  const x0=G.cx+Math.cos(f.a)*f.R,y0=G.cy+Math.sin(f.a)*f.R;
  return {d,vis,fade,k,P,x:x0+(P.x-x0)*e,y:y0+(P.y-y0)*e,a:f.a+wrap(-Math.PI/2-f.a)*e,c:(1-k)**2/f.R,
    hw:f.w*f.R+(P.hw-f.w*f.R)*e,hh:f.h+(P.hh-f.h)*e,st:f.st+(1-f.st)*k};
}

function fill(p,t){read.textContent='';read.classList.remove('done');lines=[];typeT0=t;
  const add=(c,txt)=>{if(!txt)return;const e=document.createElement('div');e.className=c;read.appendChild(e);lines.push([e,txt]);};
  add('n',p.t);add('m',[p.role,p.d].filter(Boolean).join(' · '));add('m',p.tools);add('x',p.desc);
  const ls=(p.links||[]).filter(l=>l.url);if(!ls.length)return;
  const b=document.createElement('div');b.className='b';
  for(const l of ls){const a=document.createElement('a');a.href=l.url;a.target='_blank';a.rel='noopener';a.textContent=l.label+' ↗';b.appendChild(a);}
  read.appendChild(b);}
function type(t){let n=Math.floor((t-typeT0)*1000/TYPE);
  for(const [el,txt] of lines){const k=clamp(n,0,txt.length);n-=txt.length;el.textContent=txt.slice(0,k);
    if(k<txt.length&&n<0){const c=document.createElement('span');c.className='cur';el.appendChild(c);n=-1e9;}}
  if(n>=0)read.classList.add('done');}

export default {
  hint:'drag a red smear outward to pull it free',
  enter(ctx){
    grab=null;tried=false;sel=0;spin=0;out=null;openAt=-1;lines=[];st.clear();
    const empty=!ctx.projects().length,wh=ctx.el.querySelector('.wh');
    if(empty&&wh)wh.textContent='nothing has crossed yet · drop a moon into the void';
    label=document.createElement('div');label.className='pull-l';
    label.style.cssText='text-align:center;white-space:nowrap';
    label.innerHTML='<span class="n"></span> · <span class="y"></span>';
    read=document.createElement('div');read.className='pull-r';
    ctx.el.append(label,read);
  },
  leave(){grab=null;},
  frame(ctx,dt){
    const G=geometry(ctx),t=ctx.t,{x:px,y:py,down}=ctx.pointer;
    if(!reduce)spin+=dt*.012;
    if(!down){grab=null;tried=false;}
    if(openAt<0&&ctx.e>.95)openAt=t;
    let L=layout(ctx,G),gd=null;
    for(const d of L){if(grab&&grab.i===d.p.i)continue;
      const fall=reduce?1:1-Math.exp(-dt*(1.2+5*d.s.p));d.s.p-=d.s.p*fall;d.s.da-=d.s.da*fall;}
    if(!ghosted&&openAt>=0&&L.length&&!out){const g=t-openAt-.8;
      if(g>=1.65)ghosted=true;
      else if(g>0){gd=L[0];gd.s.p=.45*(g<.55?ease(g/.55):g<1.05?1:1-ease((g-1.05)/.6));}}
    const hv=mouse&&!down&&!ctx.leaving?hit(L,G,px,py):null;
    for(const d of L){const to=d===hv?1:0;d.s.hv+=reduce?to-d.s.hv:(to-d.s.hv)*Math.min(1,dt*10);}
    if(out&&out.ph==='held'&&!grab?.plate){const f=Math.exp(-dt*9);out.ox*=f;out.oy*=f;}
    L=layout(ctx,G);
    const F=out?morph(ctx,G,L):null;
    if(pulled)cue=Math.max(0,cue-dt*1.5);
    const k=ctx.DPR;S.fill(0);M.fill(0);
    L.forEach((d,j)=>{S.set([d.a,d.R*k,d.h*k,d.w],j*4);
      M.set([d.p.slots.length?d.p.slots[0]:-1,Math.min(1,d.s.p),d.age,F&&F.d===d?F.vis:1],j*4);});
    const gl=ctx.gl;
    gl.uniform4fv(ctx.u('pull_s'),S);gl.uniform4fv(ctx.u('pull_m'),M);gl.uniform1f(ctx.u('pull_n'),L.length);
    gl.uniform3f(ctx.u('pull_h'),G.cx*k,G.cy*k,G.Rh*k);gl.uniform1f(ctx.u('pull_t'),reduce?0:t);
    gl.uniform1f(ctx.u('pull_c'),cue*clamp((ctx.e-.6)/.4));
    if(F){gl.uniform4f(ctx.u('pull_pc'),F.x*k,F.y*k,F.a,F.c/k);
      gl.uniform4f(ctx.u('pull_ps'),F.hw*k,F.hh*k,F.st,F.d.p.slots.length?F.d.p.slots[0]:-1);
      gl.uniform4f(ctx.u('pull_pf'),F.fade,F.k,1,clamp((F.k-.75)/.25)*(.6+.4*F.P.b));}
    else gl.uniform4f(ctx.u('pull_pf'),0,0,0,0);
    const held=!ctx.leaving&&out?.ph==='held';
    read.style.opacity=held?1:0;
    if(held){const ringR=G.Rh*1.55,sx=G.cx+ringR+24,room=ctx.W-sx-20;
      if(room>=240){read.style.width=Math.min(340,room)+'px';read.style.transform=`translate(${sx}px,${G.cy-G.hs}px)`;}
      else{const w=Math.min(340,ctx.W-40),y=Math.max(G.cy+G.hs+14,Math.min(G.cy+ringR+12,ctx.H-210));
        read.style.width=w+'px';read.style.transform=`translate(${G.cx-w/2}px,${y}px)`;}
      if(!read.classList.contains('done'))type(t);}
    const g=grab&&!grab.plate?L.find(d=>d.p.i===grab.i):null;
    const top=L.reduce((b,d)=>out&&d.p.i===out.i?b:!b||d.s.p>b.s.p?d:b,null),f=g||hv||gd||top;
    label.style.opacity=!f||ctx.leaving?0:f===hv?1:ease(clamp((f.s.p-.05)/.3));
    if(f){label.querySelector('.n').textContent=f.p.t;label.querySelector('.y').textContent=f.p.d;
      const rr=f.R+f.h+18+26*cue*(1-clamp(f.s.p*3)),x=G.cx+Math.cos(f.a)*rr,y=G.cy+Math.sin(f.a)*rr;
      label.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;}
    if(!ctx.leaving)document.getElementById('c').style.cursor=grab?'grabbing':hv||(held&&inside(F.P,px,py))?'grab':'default';
  },
  drag(ctx){const G=geometry(ctx),{x,y}=ctx.pointer,r=Math.hypot(x-G.cx,y-G.cy),t=Math.atan2(y-G.cy,x-G.cx);
    if(!grab&&!tried&&!ctx.leaving){tried=true;ghosted=true;
      if(out?.ph==='held'&&inside(plate(ctx,G),x,y))grab={plate:true,x0:x,y0:y,ox:out.ox,oy:out.oy};
      else{const d=hit(layout(ctx,G),G,x,y);if(d){drop(ctx);grab={i:d.p.i,r0:r,t0:t,p0:d.s.p,da0:d.s.da};}}}
    if(!grab)return;
    if(grab.plate){if(out?.ph!=='held'){grab=null;return;}out.ox=grab.ox+(x-grab.x0)*.8;out.oy=grab.oy+(y-grab.y0)*.8;return;}
    const d=layout(ctx,G).find(d=>d.p.i===grab.i);if(!d)return;
    d.s.p=Math.max(0,grab.p0+(r-grab.r0)/G.D);d.s.da=grab.da0+wrap(t-grab.t0)*.7;if(d.s.p>=1)rescue(ctx,d);},
  release(ctx){if(grab?.plate&&out&&Math.hypot(out.ox,out.oy)>geometry(ctx).Rh*.4)drop(ctx);grab=null;tried=false;},
  tap(ctx,x,y){const G=geometry(ctx);
    if(out&&out.ph!=='fall'){if(out.ph==='held'&&inside(plate(ctx,G),x,y)||inRead(x,y))return;drop(ctx);}
    const d=hit(layout(ctx,G),G,x,y);if(d)d.s.p=Math.max(d.s.p,.3);},
  key(ctx,e){const G=geometry(ctx),L=layout(ctx,G);if(!L.length)return;ghosted=true;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){drop(ctx);sel=(sel+(e.key==='ArrowRight'?1:L.length-1))%L.length;L[sel].s.p=Math.max(L[sel].s.p,.2);}
    else if(e.key==='ArrowUp'||e.key==='Enter'){const d=L[sel%L.length];if(out&&out.i===d.p.i&&out.ph!=='fall')return;
      drop(ctx);d.s.p+=e.key==='Enter'?1:.35;if(d.s.p>=1)rescue(ctx,d);}},
  back(ctx){if(!out)return false;drop(ctx);return true;},
};
