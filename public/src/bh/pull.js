const MAX=16,TAU=Math.PI*2;
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const S=new Float32Array(MAX*4),M=new Float32Array(MAX*3);
const st=new Map();
let grab=null,tried=false,sel=0,label=null,opened=false,spin=0;

const year=d=>{const y=parseInt(d,10);return Number.isFinite(y)?y:9999;};
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const ease=x=>x*x*(3-2*x);

function geometry(ctx){
  const m=Math.min(ctx.W,ctx.H),hole=ctx.hole||{x:ctx.W/2,y:ctx.H/2,R:m*.1};
  const Rh=hole.R+(m*(ctx.narrow?.2:.17)-hole.R)*ease(Math.min(1,ctx.e));
  return {cx:hole.x,cy:hole.y,Rh,D:Math.min(240,Math.max(110,m*.3))};
}

function layout(ctx,G){
  const P=ctx.projects().slice().sort((a,b)=>year(a.d)-year(b.d)).slice(-MAX),n=P.length;
  return P.map((p,j)=>{
    const s=st.get(p.i)||st.set(p.i,{p:0,da:0}).get(p.i);
    const age=n>1?1-j/(n-1):.3,k=ease(Math.min(1,s.p));
    const h=G.Rh*(.09-.04*age)+(G.Rh*.55-G.Rh*(.09-.04*age))*k;
    const Rrest=G.Rh*(1.012+.05*(1-age))+h;
    const R=Rrest+s.p*G.D;
    const w0=Math.min(.55,Math.PI/n*.8)*(1+.3*age);
    const arc=w0*R+(h-w0*R)*k;
    return {p,s,age,h,R,a:-Math.PI/2+j*TAU/n+spin+s.da,w:arc/R};
  });
}

function hit(L,G,x,y){
  const r=Math.hypot(x-G.cx,y-G.cy),t=Math.atan2(y-G.cy,x-G.cx);let best=null,bd=1e9;
  for(const d of L){const along=Math.abs(wrap(t-d.a))*d.R-d.w*d.R,across=Math.abs(r-d.R)-d.h;
    const dist=Math.max(along,0)+Math.max(across,0);if(dist<28&&dist<bd){bd=dist;best=d;}}
  return best;
}

function openIfPulled(ctx,d){if(!opened&&d.s.p>=1){opened=true;grab=null;ctx.open(d.p.i);}}

export default {
  hint:'drag a smear outward to pull it free',
  enter(ctx){
    opened=false;grab=null;tried=false;sel=0;spin=0;st.clear();
    const empty=!ctx.projects().length,wh=ctx.el.querySelector('.wh');
    if(empty&&wh)wh.textContent='nothing has crossed yet · drop a moon into the void';
    label=document.createElement('div');label.className='pull-l';
    label.style.cssText='text-align:center;white-space:nowrap';
    label.innerHTML='<span class="n"></span> · <span class="y"></span>';
    ctx.el.appendChild(label);
  },
  leave(){grab=null;},
  frame(ctx,dt){
    const G=geometry(ctx);
    if(!reduce)spin+=dt*.012;
    if(!ctx.pointer.down){grab=null;tried=false;}
    let L=layout(ctx,G);
    for(const {p,s} of L){if(grab&&grab.i===p.i)continue;
      const fall=reduce?1:1-Math.exp(-dt*(1.2+5*s.p));s.p-=s.p*fall;s.da-=s.da*fall;}
    L=layout(ctx,G);
    const k=ctx.DPR;S.fill(0);M.fill(0);
    L.forEach((d,j)=>{S.set([d.a,d.R*k,d.h*k,d.w],j*4);
      M.set([d.p.slots.length?d.p.slots[0]:-1,Math.min(1,d.s.p),d.age],j*3);});
    const gl=ctx.gl;
    gl.uniform4fv(ctx.u('pull_s'),S);gl.uniform3fv(ctx.u('pull_m'),M);gl.uniform1f(ctx.u('pull_n'),L.length);
    gl.uniform3f(ctx.u('pull_h'),G.cx*k,G.cy*k,G.Rh*k);gl.uniform1f(ctx.u('pull_t'),reduce?0:ctx.t);
    const top=L.reduce((b,d)=>!b||d.s.p>b.s.p?d:b,null);
    if(label){const show=top&&top.s.p>.12?ease(Math.min(1,(top.s.p-.12)/.4)):0;label.style.opacity=ctx.leaving?0:show;
      if(top){label.querySelector('.n').textContent=top.p.t;label.querySelector('.y').textContent=top.p.d;
        const rr=top.R+top.h+18,x=G.cx+Math.cos(top.a)*rr,y=G.cy+Math.sin(top.a)*rr;
        label.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`;}}
  },
  drag(ctx){const G=geometry(ctx),{x,y}=ctx.pointer,r=Math.hypot(x-G.cx,y-G.cy),t=Math.atan2(y-G.cy,x-G.cx);
    if(!grab&&!tried&&!ctx.leaving){tried=true;const d=hit(layout(ctx,G),G,x,y);if(d)grab={i:d.p.i,r0:r,t0:t,p0:d.s.p,da0:d.s.da};}
    const d=grab&&layout(ctx,G).find(d=>d.p.i===grab.i);if(!d)return;
    d.s.p=Math.max(0,grab.p0+(r-grab.r0)/G.D);d.s.da=grab.da0+wrap(t-grab.t0)*.7;openIfPulled(ctx,d);},
  release(){grab=null;tried=false;},
  tap(ctx,x,y){const G=geometry(ctx),d=hit(layout(ctx,G),G,x,y);if(d)d.s.p=Math.max(d.s.p,.3);},
  key(ctx,e){const G=geometry(ctx),L=layout(ctx,G);if(!L.length)return;
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){sel=(sel+(e.key==='ArrowRight'?1:L.length-1))%L.length;L[sel].s.p=Math.max(L[sel].s.p,.2);}
    else if(e.key==='ArrowUp'||e.key==='Enter'){const d=L[sel%L.length];d.s.p+=e.key==='Enter'?1:.35;openIfPulled(ctx,d);}},
};
