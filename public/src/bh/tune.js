const TAU=Math.PI*2,MAX_SLOTS=16,DECODE_OFFSET=.7;
const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
const sstep=(a,b,x)=>{const t=Math.min(Math.max((x-a)/(b-a),0),1);return t*t*(3-2*t);};
const turn=a=>((a%TAU)+TAU*1.5)%TAU-Math.PI;

let P=[],yaw=0,vel=0,settle=false,cap=null,shown=-1,lock={j:-1,d:Math.PI,c:0,prox:0};
const slots=new Float32Array(MAX_SLOTS);let nSlots=0;

const sphere=ctx=>({x:ctx.W/2,y:ctx.H*.44,R:Math.min(ctx.W*(ctx.narrow?.42:.36),ctx.H*.3)});
const decodeAngle=j=>(j+.5)/P.length*TAU+DECODE_OFFSET;
const snapWidth=()=>Math.min(.2,Math.PI/P.length*.6);

function nearest(){
  if(!P.length)return {j:-1,d:Math.PI,c:0,prox:0};
  let j=0,d=Infinity;
  P.forEach((_,k)=>{const dk=Math.abs(turn(yaw-decodeAngle(k)));if(dk<d){d=dk;j=k;}});
  const w=snapWidth();
  return {j,d,c:1-sstep(w*.2,w,d),prox:1-d/(Math.PI/P.length)};
}

function open(ctx){if(lock.j>=0&&lock.c>.6)ctx.open(P[lock.j].i);}

export default {
  hint:'drag to turn the horizon · tap a picture to open',
  enter(ctx){
    P=ctx.projects();vel=0;shown=-1;settle=false;
    yaw=P.length?decodeAngle(0)-Math.PI/P.length:0;
    nSlots=0;for(const p of P)for(const s of p.slots)if(nSlots<MAX_SLOTS)slots[nSlots++]=s;
    cap=document.createElement('div');cap.className='cap';cap.dataset.testid='tune-cap';
    cap.innerHTML='<div class="n"></div><div class="s"></div>';ctx.el.appendChild(cap);
    if(!P.length){
      cap.querySelector('.n').textContent='Nothing archived yet';
      cap.querySelector('.s').textContent='the horizon holds only static';
      ctx.el.querySelector('.wh').textContent='drag to turn the horizon';
    }
  },
  leave(){vel=0;},
  frame(ctx,dt){
    const g=sphere(ctx),{gl,u,DPR}=ctx;
    if(!ctx.pointer.down){
      if(!still){yaw+=vel*dt;vel*=Math.exp(-dt*2.6);}else vel=0;
      const n=nearest();
      if(settle&&n.j>=0&&n.c>0&&Math.abs(vel)<.8){const to=turn(decodeAngle(n.j)-yaw);yaw+=still?to:to*Math.min(1,dt*7);}
    }
    lock=nearest();
    gl.uniform3f(u('tune_ctr'),g.x*DPR,g.y*DPR,g.R*DPR);
    gl.uniform1f(u('tune_yaw'),yaw);
    gl.uniform1fv(u('tune_sl'),slots);
    gl.uniform1f(u('tune_ns'),nSlots);
    gl.uniform1f(u('tune_hs'),lock.j>=0?P[lock.j].slots[0]:-1);
    gl.uniform1f(u('tune_c'),lock.c);
    gl.uniform1f(u('tune_prox'),lock.prox);
    gl.uniform1f(u('tune_still'),still?1:0);
    if(!cap)return;
    if(P.length&&lock.j!==shown&&lock.c>0){shown=lock.j;const p=P[shown];
      cap.querySelector('.n').textContent=p.t;cap.querySelector('.s').textContent=p.d;}
    const vis=P.length?lock.c*lock.c:1;
    cap.style.top=(g.y+g.R+28)+'px';cap.style.bottom='auto';
    cap.style.opacity=sstep(.85,1,ctx.e)*(ctx.leaving?0:vis)*(P.length?.9:.75);
  },
  drag(ctx,dx,dy,dt){const R=sphere(ctx).R,dyaw=-dx/R;yaw+=dyaw;vel=vel*.5+dyaw/dt*.5;settle=false;},
  release(){if(still)vel=0;settle=true;},
  tap(ctx,x,y){const g=sphere(ctx);if(Math.hypot(x-g.x,y-g.y)<g.R*1.1)open(ctx);},
  key(ctx,e){
    if(e.key==='ArrowLeft'||e.key==='ArrowRight'){yaw+=e.key==='ArrowLeft'?.06:-.06;vel=0;settle=false;}
    else if(e.key==='Enter'||e.key===' ')open(ctx);
  },
};
