const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAXC=8,GRAV=reduce?0:.32,FRICTION=2.2,WHEEL=.009,KEY=1.4,PUSH_OUT=1.2,TWIST=.15,VMAX=8;
const sstep=(a,b,x)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};
const year=p=>{const n=parseInt(p.d,10);return Number.isNaN(n)?Infinity:n;};
let S=null;

function label(ctx,lines){const el=document.createElement('div');el.className='gl';el.style.transformOrigin='50% 0';
  lines.forEach(([cls,txt])=>{const l=document.createElement('div');l.className=cls;l.textContent=txt;el.appendChild(l);});
  ctx.el.appendChild(el);return el;}

function depthEnd(){return Math.max(2.5,S.list.length+(S.sing?1:0));}

function view(ctx){const e=ctx.e,h=ctx.hole,R1=Math.min(ctx.W,ctx.H)*.42*(.3+.7*e);
  return {R1,cx:h.x+(ctx.W/2-h.x)*e,cy:h.y+(ctx.H/2-h.y)*e};}

function cards(ctx,V){const out=[],st=1+Math.min(reduce?.4:1.8,Math.abs(S.v)*.6);
  S.list.forEach((p,j)=>{const dz=j+1-S.z;if(dz<.18||dz>7)return;
    const th=j*2.39996+S.z*TWIST,k=V.R1/dz,nx=Math.cos(th),ny=Math.sin(th),x=V.cx+nx*.55*k,y=V.cy+ny*.55*k,h=.2*k;
    if(x+h*st<0||x-h*st>ctx.W||y+h*st<0||y-h*st>ctx.H)return;
    out.push({p,j,dz,x,y,h,st,nx,ny,a:sstep(7,4.5,dz)*sstep(.18,.4,dz)});});
  return out.sort((a,b)=>a.dz-b.dz).slice(0,MAXC);}

function deeper(ctx,amt){if(amt>0&&S.atBot>=0&&ctx.t-S.atBot>.5)S.push+=amt;}

function hitCard(c,x,y){let dx=x-c.x,dy=y-c.y;const r=(dx*c.nx+dy*c.ny)*(1-1/c.st);dx-=c.nx*r;dy-=c.ny*r;
  const ext=c.h*(1+(c.st-1)*Math.abs(c.ny));
  return (Math.abs(dx)<c.h+10&&Math.abs(dy)<c.h+10)||(Math.abs(x-c.x)<80&&y>c.y+ext&&y<c.y+ext+44);}

export default {
  hint:'scroll or drag to fall · tap to open',
  enter(ctx){const P=[...ctx.projects()].sort((a,b)=>year(b)-year(a));
    S={list:P.slice(0,Math.max(0,P.length-1)),sing:P.length?P[P.length-1]:null,z:-.8,v:reduce?0:1.2,push:0,atBot:-1,out:false,left:-1,drag:false,vis:[]};
    S.els=S.list.map(p=>label(ctx,[['n',p.t],['s',p.d]]));
    S.sEl=label(ctx,S.sing?[['n',S.sing.t],['s',S.sing.d],['s','tap the point · fall through to leave']]:[['s','nothing archived yet · fall through to leave']]);},
  leave(ctx){S.left=ctx.t;S.v=Math.min(S.v,0)-3;},
  frame(ctx,dt){if(!S)return;dt=Math.min(dt,.05);const end=depthEnd(),stop=end-.4,V=view(ctx),gone=ctx.leaving;
    if(gone)S.v-=dt*6;
    else if(!S.drag)S.v=S.v*Math.exp(-dt*FRICTION)+GRAV*dt;
    if(!S.drag||gone)S.z+=S.v*dt;
    if(!gone){if(S.z<-.8){S.z=-.8;S.v=Math.max(S.v,0);}if(S.z>stop){S.z=stop;S.v=Math.min(S.v,0);}}
    S.atBot=S.z>=stop-.001?(S.atBot<0?ctx.t:S.atBot):-1;
    S.push*=Math.exp(-dt*1.6);
    if(S.push>PUSH_OUT&&!S.out&&!gone){S.out=true;document.getElementById('back')?.click();}
    const vis=S.vis=cards(ctx,V),p=new Float32Array(MAXC*4),q=new Float32Array(MAXC*4),D=ctx.DPR,show=gone?0:sstep(.85,1,ctx.e);
    [...vis].reverse().forEach((c,j)=>{p.set([c.x*D,c.y*D,c.h*D,c.p.slots[0]??0],j*4);q.set([c.a,c.st,c.nx,c.ny],j*4);});
    const tf=(x,y,st)=>`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translateX(-50%) scale(1,${st.toFixed(2)}) perspective(900px)`;
    S.els.forEach(el=>{el.style.opacity=0;});
    vis.forEach(c=>{const el=S.els[c.j],ext=c.h*(1+(c.st-1)*Math.abs(c.ny));
      el.style.opacity=(c.a*sstep(2.4,1.4,c.dz)*show).toFixed(2);el.style.transform=tf(c.x,c.y+ext+8,Math.min(c.st,2.2));});
    const near=sstep(end-2,stop,S.z);
    S.sEl.style.opacity=(sstep(end-1.4,stop,S.z)*show).toFixed(2);S.sEl.style.transform=tf(V.cx,V.cy+22,1);
    const gl=ctx.gl;gl.uniform4fv(ctx.u('plunge_p'),p);gl.uniform4fv(ctx.u('plunge_q'),q);gl.uniform1f(ctx.u('plunge_n'),vis.length);
    gl.uniform2f(ctx.u('plunge_c'),V.cx*D,V.cy*D);gl.uniform1f(ctx.u('plunge_R'),V.R1*D);gl.uniform1f(ctx.u('plunge_z'),S.z);
    gl.uniform1f(ctx.u('plunge_v'),reduce?Math.max(-1,Math.min(1,S.v)):S.v);gl.uniform1f(ctx.u('plunge_x'),S.left<0?-1:ctx.t-S.left);
    gl.uniform2f(ctx.u('plunge_s'),near,Math.min(1,S.push/PUSH_OUT));},
  wheel(ctx,e){if(!S)return;const k=e.deltaMode===1?16:1,d=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*k*WHEEL;
    S.v=Math.max(-VMAX,Math.min(VMAX,S.v+d));deeper(ctx,d);},
  drag(ctx,dx,dy,dt){if(!S)return;const u=-dy/(ctx.H*.35);S.drag=true;S.z+=u;
    S.v=Math.max(-VMAX,Math.min(VMAX,S.v*.5+u/Math.max(dt,.008)*.5));deeper(ctx,u);},
  release(){if(S)S.drag=false;},
  key(ctx,e){if(!S)return;const k=e.key,dn=k==='ArrowDown'||k==='PageDown'||k===' ',up=k==='ArrowUp'||k==='PageUp';
    if(!dn&&!up)return;e.preventDefault();S.v=Math.max(-VMAX,Math.min(VMAX,S.v+(dn?KEY:-KEY)));if(dn)deeper(ctx,.5);},
  tap(ctx,x,y){if(!S)return;const c=S.vis.find(c=>c.a>.3&&hitCard(c,x,y));if(c){ctx.open(c.p.i);return;}
    const V=view(ctx);
    if(S.sing&&S.z>depthEnd()-1.4&&(Math.hypot(x-V.cx,y-V.cy)<40||(Math.abs(x-V.cx)<110&&y>V.cy&&y<V.cy+80)))ctx.open(S.sing.i);},
};
