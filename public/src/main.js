import { VS, FS, WVS, WFS, BFS } from './shaders.js';
import { startCometFeed, nextComet, ago, loadCraters, saveCraters } from './comets.js';
import { ISL, PLN, APPN, SUP, FACTS, SCAPS, STRATA, MEM } from './content.js';
import { renderFallback } from './fallback.js';


const cv = document.getElementById('c');
const gl = cv.getContext('webgl2', {antialias: false, premultipliedAlpha: false});
if (!gl) { renderFallback(); throw new Error('WebGL2 unavailable: showing the plain version'); }

/* ---------- shaders: every mark is a point, positioned and shaded on the GPU ---------- */



function sh(t,s){const x=gl.createShader(t);gl.shaderSource(x,s);gl.compileShader(x);
  if(!gl.getShaderParameter(x,gl.COMPILE_STATUS))throw gl.getShaderInfoLog(x);return x;}
const pr=gl.createProgram();
gl.attachShader(pr,sh(gl.VERTEX_SHADER,VS));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(pr);
gl.useProgram(pr);
// ---------- worlds: Starlee's surface and Camille's strata render into a low-res pixel buffer, then blit as square pixels ----------



function mk(vs,fs){const p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,vs));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);return p;}
const wpr=mk(WVS,WFS),bpr=mk(WVS,BFS),WU={},BU={};
for(const n of['w_res','w_scr','w_cam','w_cell','w_t','w_mode','w_fade','w_e','w_depth','w_y0','w_dpr','w_rev','w_ctr','w_lbx','w_cr','w_mono','w_monoS','w_monoV','w_monoB','w_mn','w_mf','w_lay','w_fos','w_fosS','w_atl','w_logo','w_tm'])WU[n]=gl.getUniformLocation(wpr,n);
for(const n of['b_tex','b_cell'])BU[n]=gl.getUniformLocation(bpr,n);
const wvao=gl.createVertexArray(),wtex=gl.createTexture(),wfb=gl.createFramebuffer();let wCols=1,wRows=1,wCell=4;
function makeFBO(){wCell=Math.round(SBD);wCols=Math.ceil(cv.width/wCell);wRows=Math.ceil(cv.height/wCell);
  gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,wtex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,wCols,wRows,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER,wfb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,wtex,0);
  gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.activeTexture(gl.TEXTURE0);}
const U={};for(const n of['u_gal','u_gz','u_wv','u_bsp','u_gslot','u_res','u_c','u_dpr','u_sea','u_spin','u_pdot','u_bdot','u_rb','u_spp','u_t','u_s','u_rot','u_dot','u_ring','u_e','u_bigA','u_foc','u_wait','u_cam','u_orb','u_pl','u_big','u_isl','u_islP','u_L','u_sun','u_moon','u_moonP','u_hl','u_mv','u_mv2','u_mring','u_tex','u_img','u_rmv','u_fl','u_bh','u_bhs','u_bz','u_rt','u_mrb','u_moonS','u_cr','u_crP','u_act','u_comet','u_comet2','u_m','u_ck','u_bhc','u_feed','u_near'])U[n]=gl.getUniformLocation(pr,n);

/* ---------- scene, in design units (mockup is ~2000 × 1125) ---------- */
const ORB=[[222,90],[318,128],[428,172],[540,217],[660,265]];
const ROT=-0.03,SUN=19;
const HIDE_PL=4;   /* Lab was removed: its slot stays in the tables but is never drawn or reachable */
const PL=[ // orbit, start angle, radius, angular speed, spin speed
  {o:3,a0:2.565,r:68,w:.04,spin:.2,ph:0,moff:0,bl:1},
  {o:0,a0:-1.29,r:42,w:.2,spin:.28,ph:1,moff:0,bl:1},
  {o:1,a0:-0.47,r:46,w:.09,spin:.24,ph:2,moff:0,bl:1},
  {o:2,a0:3.7,r:54,w:.06,spin:.16,ph:3,moff:0,bl:1},
  {o:4,a0:1.15,r:38,w:.03,spin:.12,ph:4,moff:0,bl:1}
];
// one island per window; lon/lat on the planet, angular radius
// ---- portfolio content: every moon is a project. SAMPLE CONTENT — replace titles, text, links and images with your own.
// imgs: file paths published next to this page (e.g. 'img/tidepool-1.jpg'); leave empty to use the generated placeholder art.
// status: 'archive' starts in the black hole, 'wip' starts in the asteroid belt.
// Work's gallery: every image of every Work project, in order
const GT=[];ISL.forEach((it,i)=>{if(it.p===0)for(let g=0;g<2;g++)GT.push({i,g});});
// what each planet calls its moons, and its subtitle
const islU=new Float32Array(24),islP=new Float32Array(6).fill(-9);
ISL.forEach((s,i)=>{const c=Math.cos(s.lat);s.dir=[Math.sin(s.lon)*c,Math.sin(s.lat),Math.cos(s.lon)*c];
  });   // islands retired: windows are moons now

// one moon per window, orbiting its planet on a small tilted ellipse
const MOONS=ISL.map((s,i)=>{const nth=ISL.filter((t,j)=>t.p===s.p&&j<i).length;
  return {p:s.p,slot:nth,sl:nth,r:nth===0?12.5:11,ang:nth*2.3+i};});
const moonU=new Float32Array(48),moonP=new Float32Array(12),moonPos=[];
MOONS.forEach((mo,i)=>moonP[i]=mo.p);
const RG={p:[0,0],m:[],v:[0,0],h:[0,0]};const BH_CENTER=true;const feedW=new Float32Array(5),nearW=new Float32Array(5);   /* experiment: the black hole replaces the sun at the centre */
let GT_T=300,GT_G=40,galStart=0,galCount=0,RMV=100,RT=60,NARROW=false,W,H,S,DPR,CX,CY,SP,SPP,SPB,SPD,SBD,RB,countBase=0,count=0;
const vao=gl.createVertexArray(),buf=gl.createBuffer(),sbuf=gl.createBuffer();
const BAY8=(()=>{let m=[[0]];for(let n=1;n<8;n*=2){const r=[];for(let y=0;y<n*2;y++){r.push([]);for(let x=0;x<n*2;x++){const q=[0,2,3,1][(y>=n)*2+(x>=n)];r[y].push(4*m[y%n][x%n]+q);}}m=r;}return m;})();
const bay=(i,j)=>(BAY8[((j%8)+8)%8][((i%8)+8)%8]+.5)/64;

function rnd(i){const x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function grid(add,r0,kind,extra,sp){
  const n=Math.ceil(r0/sp);
  for(let j=-n;j<=n;j++)for(let i=-n;i<=n;i++){
    const qx=i*sp/r0,qy=j*sp/r0;if(qx*qx+qy*qy>1)continue;
    add(qx,qy,kind,extra,bay(i,j));
  }
}
function build(){
  const A=[],B=[];let seed=1;
  const add=(x,y,k,e,s)=>{A.push(x,y,k,e);B.push(s);};
  for(let i=0;i<260;i++)add(rnd(i),rnd(i+500),0,rnd(i+900),rnd(i+77));
  ORB.forEach(([rx,ry],oi)=>{if(oi===PL[HIDE_PL].o)return;
    let th=rnd(oi+40)*6.283,end=th+6.283;
    while(th<end){
      const len=2+Math.floor(rnd(seed)*3),sp=2.3/Math.max(S,.5);
      for(let d=0;d<len;d++){add(oi,th,1,0,seed++*.37);th+=sp/Math.hypot(rx*Math.sin(th),ry*Math.cos(th));}
      let gap=4+rnd(seed+.5)*5;if(rnd(seed+.7)<.06)gap+=8+rnd(seed+1)*10;
      th+=gap/Math.hypot(rx*Math.sin(th),ry*Math.cos(th));
    }
  });
  PL.forEach((pl,k)=>{if(k!==HIDE_PL)grid(add,pl.r*S,2,k,SPP);});
  const rr=PL[2].r*S;
  {const n=Math.ceil(rr*1.6/SPP);
   for(let j=-n;j<=n;j++)for(let i=-n;i<=n;i++){
     const qx=i*SPP/rr,qy=j*SPP/rr,d=Math.hypot(qx,qy);
     if(d>1.2&&d<1.2+2.6*SPP/rr)add(qx,qy,3,0,rnd(i*31+j));
     else if(Math.abs(d-1.46)<.55*SPP/rr&&rnd(i*17+j*7)>.3)add(qx,qy,3,1,rnd(i+j*13));
   }}
  // sun: one pixel grid (same pitch as the planets) covering core + corona; the shader dithers it
  if(!BH_CENTER){const rs=SUN*S,ext=1.75,n=Math.ceil(rs*ext/SPP);
   for(let j=-n;j<=n;j++)for(let i=-n;i<=n;i++){const qx=i*SPP/rs,qy=j*SPP/rs;if(qx*qx+qy*qy>ext*ext)continue;
     add(qx,qy,4,0,bay(i,j));}
   // plus loose pixels streaming outward, like before, but snapped to the grid at full opacity
   for(let i=0;i<520;i++)add(rnd(i+1200)*6.2832,rnd(i+1700),4,1,rnd(i+2100));}
  // moons (windows): a tiny pixel grid each
  // radius snapped to n+0.45 pixels: small pixel circles only look round at those sizes
  MOONS.forEach((mo,i)=>{mo.rp=(Math.max(2,Math.round(mo.r*S/SPP))+.45)*SPP;grid(add,mo.rp,6,i,SPP);});
  // big moon grids for the landed view, sized against the landed planet
  const MB=[];MOONS.forEach((mo,i)=>{mo.rb=(Math.round(RB*(mo.r/PL[mo.p].r)*.95/SPB)+.45)*SPB;MB.push([mo.rb,i]);});
  // black hole: disk + photon ring
  {const R0=BH_CENTER?Math.max(12,30*S):Math.max(8,19*S),sp=SPP/R0,nx=Math.ceil(3.6/sp),ny=Math.ceil(2.1/sp);
   for(let j=-ny;j<=ny;j++)for(let i=-nx;i<=nx;i++)add(i*sp,j*sp,13,0,bay(i,j));}
  // asteroid belt
  for(let i=0;i<700;i++)add(rnd(i+6100)*6.2832,1+(rnd(i+6300)+rnd(i+6400)-1)*.05,12,rnd(i+6500),rnd(i+6700));
  // moon click ring
  for(let i=0;i<64;i++)add(i,0,9,0,rnd(i+4400));
  // comet tail
  for(let i=0;i<42;i++)add(i,0,7,0,rnd(i+3300));
  countBase=B.length;
  RG.p=[B.length];grid(add,RB,5,0,SPB);RG.p.push(B.length-RG.p[0]);
  RG.m=MOONS.map((mo,i)=>{const s0=B.length;grid(add,mo.rb,8,i,SPB);return [s0,B.length-s0];});
  RG.v=[B.length];grid(add,RMV,10,0,SPB);RG.v.push(B.length-RG.v[0]);RG.h=[B.length];
  {const sp=SBD/DPR/RT,nx=Math.ceil(3.6/sp),ny=Math.ceil(2.1/sp);        // fine black hole for its own view
   for(let j=-ny;j<=ny;j++)for(let i=-nx;i<=nx;i++)add(i*sp,j*sp,13,1,bay(i,j));}
  count=B.length;RG.h.push(count-RG.h[0]);
  // gallery pixels (drawn only while Work's gallery is open)
  galStart=B.length;
  GT.forEach((t,ti)=>{const n=Math.max(40,Math.round(GT_T/SPB));for(let j=0;j<n;j++)for(let i=0;i<n;i++)add(i/(n-1),j/(n-1),14,ti,bay(i,j));});
  galCount=B.length-galStart;
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(A),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,0,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,sbuf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(B),gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,1,gl.FLOAT,false,0,0);
}
let _rsKey='';
function resize(){
  const small=innerWidth<120||innerHeight<240;   /* a collapsed viewport (app sheet animating) would bake tiny grids: keep checking until it's real */
  if(small){setTimeout(()=>resize(),150);if(W)return;}
  {const k=innerWidth+'x'+innerHeight+'@'+(window.devicePixelRatio||1);if(k===_rsKey&&W)return;if(!small)_rsKey=k;}
  setTimeout(()=>{try{if(wz.k>=0&&curW()==='strata')measureGlyphs();}catch(e){}},0);   /* label sizes change with the window */
  DPR=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;
  cv.width=W*DPR;cv.height=H*DPR;gl.viewport(0,0,cv.width,cv.height);
  NARROW=W<700;
  S=NARROW?Math.min(W/1420,(H-160)/640):Math.min(W/1640,(H-140)/640);
  CX=Math.round(W/2*DPR)/DPR;CY=Math.round(H/2*DPR)/DPR;SP=Math.max(2.4,4*S);
  // planets get a much finer grid so even the smallest stays round; device pixels set the floor
  // spacing is a whole number of device pixels, so the pixel grid stays crisp with no moiré
  SPD=Math.max(3,Math.round(Math.min(2.6*S,1.3)*DPR));SBD=Math.max(4,Math.round(Math.min(2.8*S,1.4)*DPR));SPP=SPD/DPR;SPB=SBD/DPR;   /* dot size stays the same on big windows: larger screens get more dots, not bigger ones */
  RB=NARROW?Math.min(W*.36,H*.3):Math.min(W*.25,H*.34);RT=Math.min(W,H)*(NARROW?.095:.1);RMV=NARROW?Math.min(W*.33,H*.2):Math.min(RB*.95,H*.33);
  GT_T=NARROW?W*.68:Math.min(H*.5,W*.3);GT_G=NARROW?W*.1:GT_T*.16;
  build();
}
const _rs=resize;resize=function(){_rs();makeFBO();};
const ro=new ResizeObserver(()=>resize());ro.observe(document.body);
addEventListener('resize',()=>resize());if(window.visualViewport)visualViewport.addEventListener('resize',()=>resize());   /* phones and in-app viewers resize the window without resizing the body */
resize();

/* ---------- labels ---------- */
const labs=[0,1,2,3,4].map(i=>document.getElementById('l'+i));
const islBox=document.getElementById('isls');
islBox.innerHTML=ISL.map((s,i)=>`<div class="lab isl" id="i${i}"><i></i><div><div class="n">${s.t}</div><div${s.p===4?' class="w"':''}>${s.d}</div></div></div>`).join('');
const islList=document.getElementById('islList');let listFor=-2;
const islLabs=ISL.map((s,i)=>document.getElementById('i'+i));
const mtip=document.getElementById('mtip');
// comets: a notification streaks in and hits its planet
const comet={on:false,t:0,dur:2.3,sx:0,sy:0,k:0,bend:0,next:3,hx:0,hy:0,ang:0,pr:null};
const COMET_PLANET=0,MERGE_SLOT=30;   // pushes land on Work
function launch(k,pr){comet.pr=pr||null;
  const side=Math.random()*4|0,r=Math.random();
  [comet.sx,comet.sy]=[[r*W,-20],[W+20,r*H],[r*W,H+20],[-20,r*H]][side];
  Object.assign(comet,{on:true,t:0,k,bend:(Math.random()<.5?-1:1)*(.18+Math.random()*.2)});
}
const CR_MT=3.2;   // seconds the meteor spends flying in
let crSite=null,crRep=0,crYaw=0,crYawT=0,crZoom=0;
// where a crater sits on screen right now (it turns with its planet); null if it's on the far side or faded
function craterScreen(c){const k=c.p,P=pos[k];if(!P)return null;
  const ph=PL[k].ph,cs=Math.cos(ph),sn=Math.sin(ph),[dx,dy,dz]=c.d,nx=cs*dx-sn*dz,nz=sn*dx+cs*dz;
  if(nz<.25)return null;return {x:P.x+nx*P.r,y:P.y+dy*P.r,r:Math.max(16,P.r*.24)};}
function pickCrater(x,y){let best=null,bd=1e9;for(const c of craters){const q=craterScreen(c);if(!q)continue;const d=Math.hypot(x-q.x,y-q.y);if(d<q.r&&d<bd){bd=d;best=c;}}return best;}
let crPend=null;
function enterCrater(c){if(!c.ack){c.ack=true;c.t=performance.now()/1000-1.5;syncCraters();}   // seen: now it can cool
  const q=craterScreen(c)||{x:CX,y:CY};const u=c.u;
  crSite={t:c.t,sx:q.x,sy:q.y,slot:MERGE_SLOT,u,p:c.p};crRep=.3;crYaw=crYawT=.6;crZoom=0;   /* meteor already on its way as the scene fades in */
  closeFacts();wz.k=c.p;wz.mode='crater';wz.target=1;wTouched=false;
  const esc=t=>String(t).replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[ch]);
  worldEl.innerHTML=`<div class="imp"><div class="k">pushed · ${esc(u.name)} · ${esc(u.branch)} · ${ago(u.at)}</div><div class="n">${esc(u.title)}</div>${u.line?`<div class="x">${esc(u.line)}</div>`:''}`+
    `<div class="b">${u.url?`<a href="${esc(u.url)}" target="_blank" rel="noopener">view on GitHub ↗</a>`:''}<button id="rp">↺ replay impact</button></div></div><div class="wh">drag to circle the crater</div>`;
  worldEl.querySelector('#rp').onclick=e=>{e.stopPropagation();crRep=0;};}
const MAX_CRATERS=5,COOL_AGE=10,craters=[],crU=new Float32Array(24),crP=new Float32Array(6).fill(-9);
const ACT0=[1,.6,.15,.5,.35],act=[...ACT0];
function syncCraters(){
  while(craters.length>MAX_CRATERS)craters.shift();
  crU.fill(0);crP.fill(-9);craters.forEach((c,i)=>{crU.set([...c.d,c.t],i*4);crP[i]=c.p;});
  saveCraters(craters.map(({p,d,u,ack})=>({p,d,u,ack:!!ack})));}
function impact(k){
  const P=pos[k];ck.x=P.x;ck.y=P.y;ck.t0=performance.now()/1000;
  // crater where the comet struck: the side of the sphere facing its approach, stored in the planet's own frame so it spins with it
  {let nx=-Math.cos(comet.ang)*.8,ny=-Math.sin(comet.ang)*.8,nz=.6;const l=Math.hypot(nx,ny,nz);nx/=l;ny/=l;nz/=l;
   const ph=PL[k].ph,cs=Math.cos(ph),sn=Math.sin(ph);
   craters.push({p:k,d:[cs*nx+sn*nz,ny,-sn*nx+cs*nz],t:performance.now()/1000,u:comet.pr});syncCraters();}
  act[k]=Math.min(2,act[k]+.9);
  if(k===4)setWaiting(true);
  else{const d=labs[k].lastElementChild,old=d.dataset.o||(d.dataset.o=d.textContent);
    d.textContent=old.replace(/· .*$/,'· updated');d.classList.add('w');
    clearTimeout(d._t);d._t=setTimeout(()=>{d.classList.remove('w');},4000);}
}

/* ---------- state + interaction ---------- */
const m={x:-999,y:-999,tx:-999,ty:-999,s:0,ts:0};
const ck={x:0,y:0,t0:-99};
const zoom={z:0,target:0,focus:-1,pending:-1};
let sunH=0,sunT=0,sunA=0,waiting=false,ring=1,simT=0,last=performance.now(),hover=-1;
const pos=[],islPos=[];
const hint=document.getElementById('hint'),back=document.getElementById('back');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

function zoomTo(k){killWorld();closeFacts();bz.target=0;bz.z=0;
  if(cardI>=0&&ISL[cardI].p!==k)closeCard();mz.target=0;
  if(zoom.focus===k){zoom.target=1;return;}
  if(zoom.focus<0){zoom.focus=k;zoom.target=1;}
  else{zoom.pending=k;zoom.target=0;}
  setNav(k);
}
function zoomOut(){killWorld();clearHash();closeFacts();zoom.pending=-1;zoom.target=0;mz.target=0;mz.pending=-1;closeCard();setNav('here');}
function setNav(k){document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('on',b.dataset.k===String(k)));}
function setWaiting(on){if(on||!document.getElementById('navdot'))return;   /* the 'new experiment' state left with Lab */
  waiting=on;const d=document.getElementById('dw');d.classList.toggle('w',on);
  setTimeout(updCounts);
  document.getElementById('navdot').style.display=on?'':'none';
  const t=islLabs[4].querySelector('.n').nextElementSibling;t.textContent=on?'new':'2026';ISL[4].d=on?'new':'2026';t.classList.toggle('w',on);listFor=-2;
}

addEventListener('pointermove',e=>{m.tx=e.clientX;m.ty=e.clientY;if(m.x<-900){m.x=m.tx;m.y=m.ty;}m.ts=grab.k>=0?0:1;hint.style.opacity=0;});
document.addEventListener('pointerout',e=>{if(!e.relatedTarget)m.ts=0;});
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')m.ts=0;});
// drag to spin: the whole system in orbit view, the planet when landed; a tap without movement is a click
const drag={on:false,moved:false,x0:0,y0:0,lx:0,t:0,planet:-1};
const grab={k:-1,x:0,y:0,hl:-1,hv:0};
const WORB=[.2,.09,.06,.04,.03];   // inner orbits move faster
let sysA=0,sysV=0,spinV=0;
cv.addEventListener('pointerdown',e=>{
  monoFly=null;Object.assign(drag,{axis:null,zh:[],on:true,moved:false,x0:e.clientX,y0:e.clientY,lx:e.clientX,ly:e.clientY,wt:performance.now(),t:performance.now(),planet:zoom.focus<0&&zoom.z===0?pick(e.clientX,e.clientY):-1});
  sysV=0;spinV=0;drag.ang=null;drag.hist=[];m.tx=e.clientX;m.ty=e.clientY;m.ts=1;
  try{cv.setPointerCapture(e.pointerId);}catch(_){}
});
cv.addEventListener('pointermove',e=>{
  if(!drag.on)return;
  const dx=e.clientX-drag.lx;drag.lx=e.clientX;
  if(!drag.moved&&Math.hypot(e.clientX-drag.x0,e.clientY-drag.y0)>6){drag.moved=true;hint.style.opacity=0;}
  if(!drag.moved)return;
  if(wz.k>=0&&wz.target===1){const dy=e.clientY-drag.ly;drag.ly=e.clientY;const nw=performance.now(),wd=Math.max(8,nw-drag.wt)/1000;drag.wt=nw;worldDrag(dx,dy,wd);m.ts=curW()==='gallery'?1:0;return;}
  if(drag.planet>=0){                                   // carrying a planet: it follows you, the nearest orbit lights up
    if(grab.k<0){grab.k=drag.planet;const P=pos[grab.k];grab.x=P.x;grab.y=P.y;}
    grab.tx=e.clientX;grab.ty=e.clientY;grab.hl=nearestOrbit(e.clientX,e.clientY);m.ts=0;return;}
  const now=performance.now(),dt=Math.max(8,now-drag.t)/1000;drag.t=now;
  const F=zoom.focus;
  if(bz.target===1&&mz.target===0){const d=-dx/Math.max(20,bhScr.R*1.6);bhSpin+=d;bhSpinV=bhSpinV*.4+d/dt*.6;return;}
  if(F>=0){if(zoom.target!==1)return;const d=-dx/pos[F].r;PL[F].ph+=d;PL[F].moff+=d;spinV=spinV*.4+d/dt*.6;}
  else{
    const ax=e.clientX-CX,ay=(e.clientY-CY)/(.4*flY),rr=Math.hypot(ax,ay);
    let d;
    if(rr>40){const a=Math.atan2(ay,ax);d=drag.ang==null?0:Math.atan2(Math.sin(a-drag.ang),Math.cos(a-drag.ang));drag.ang=a;}
    else{d=-dx/(ORB[2][0]*S);drag.ang=null;}                  // too close to the centre for angles: fall back to sideways
    sysA+=d;drag.hist.push([performance.now(),sysA]);while(drag.hist.length>12)drag.hist.shift();
    sysV=sysV*.5+d/dt*.5;}
});
function endDrag(e){if(drag.on&&performance.now()-drag.t>90)bhSpinV*=.3;
  if(!drag.on)return;drag.on=false;
  const nowR=performance.now();
  if(drag.hist&&drag.hist.length>1){const last=drag.hist[drag.hist.length-1];let first=last;
    for(let i=drag.hist.length-1;i>=0;i--){if(last[0]-drag.hist[i][0]>130)break;first=drag.hist[i];}
    const span=(last[0]-first[0])/1000;sysV=nowR-last[0]>180?0:span>.012?(last[1]-first[1])/span:sysV;}
  if(nowR-drag.t>180){spinV=0;}
  sysV=Math.max(-6,Math.min(6,sysV));spinV=Math.max(-6,Math.min(6,spinV));
  if(wz.k>=0&&drag.moved&&performance.now()-drag.wt>120){galVel=0;camV=0;depthV=0;}
  if(wz.k>=0&&curW()==='surface'&&drag.moved&&drag.zh.length>1){const nw=performance.now(),last=drag.zh[drag.zh.length-1];let first=last;
    for(let i=drag.zh.length-1;i>=0;i--){if(last[0]-drag.zh[i][0]>130)break;first=drag.zh[i];}
    const sp=(last[0]-first[0])/1000;camV=nw-last[0]>180?0:sp>.012?Math.max(-30,Math.min(30,(last[1]-first[1])/sp)):0;}
  if(wz.k>=0&&curW()==='gallery'&&drag.moved)galT=Math.max(0,Math.min(GT.length-1,Math.round(galX+Math.max(-1,Math.min(1,galVel*.18)))));
  if(wz.k<0&&mz.target===1&&drag.moved&&Math.abs(e.clientX-drag.x0)>40)galStep(e.clientX<drag.x0?1:-1);
  if(grab.k>=0){drop(grab.k,grab.x,grab.y);grab.k=-1;grab.hl=-1;}
  if(!drag.moved&&e.type==='pointerup')tap(e.clientX,e.clientY);
}
cv.addEventListener('pointerup',endDrag);cv.addEventListener('pointercancel',endDrag);
// ---- moon view (third zoom level) + window card ----
const mz={z:0,target:0,i:-1,pending:-1},mvPos={x:0,y:0,r:0};
const ring2={i:-1,t0:-99};const mpulse=[0,0,0,0,0,0,0].map(()=>-99);
const card=document.getElementById('card'),cApp=document.getElementById('cApp'),cTtl=document.getElementById('cTtl'),cMeta=document.getElementById('cMeta');
const cFocus=document.getElementById('cFocus'),cOpen=document.getElementById('cOpen'),mtitle=document.getElementById('mtitle');
let cardI=-1;
function flash(el){el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');}
function clickMoon(i){mpulse[i]=performance.now()/1000;ring2.i=i;ring2.t0=mpulse[i];openCard(i);flash(islLabs[i]);flash(mtip);}
// ---- fact sheets ----
const factsEl=document.getElementById('facts');let factsK=-1,factsT0=0,factsRows=[];
const ORD=['inner','2nd','3rd','4th','outer'];
function openFacts(k){
  factsK=k;factsT0=performance.now();const f=FACTS[k],pl=PL[k],n=MOONS.filter(m=>m.p===k&&m.st==='moon').length;
  const yr=Math.round(2*Math.PI/pl.w);
  const rows=[['class',f.cls],['mass',f.mass],['day',f.day],['year',yr>=60?Math.floor(yr/60)+' min '+(yr%60)+' s':yr+' s'],['moons',n?n+' · one per '+(PLN[k].noun||'thing')+(k===3?' · incl. Lumi':''):'none'],['orbit',ORD[pl.o]],['air',f.air],['surface',f.temp],['carbon life',f.life]];
  factsEl.innerHTML=`<div class="h">${APPN[k]}<sup>${SUP[k]}</sup> — field notes</div>`+rows.map(()=>'<div><span class="k"></span><span class="v"></span></div>').join('')+'<div class="q"></div>';
  factsRows=rows.map(([k2,v],i)=>{const d=factsEl.children[i+1];return [d.firstChild,(k2+' ').padEnd(13,'·')+' ',d.lastChild,v];});
  factsRows.push([factsEl.lastChild,'“'+f.q+'”',null,'']);
  // lock the width to the fully typed sheet so nothing shifts while it streams in
  factsEl.style.width='';
  factsRows.forEach(([ke,kt,ve,vt])=>{ke.textContent=kt;if(ve)setFactValue(ve,vt);});
  factsEl.style.width=Math.ceil(factsEl.getBoundingClientRect().width+12)+'px';
  factsRows.forEach(([ke,kt,ve])=>{ke.textContent='';if(ve)ve.textContent='';});
  factsEl.classList.add('show');
}
function setFactValue(el,s){const i=s.indexOf('⊕');if(i<0){el.textContent=s;return;}
  const e=document.createElement('span');e.className='earth';e.textContent='⊕';el.textContent=s.slice(0,i);el.append(e,s.slice(i+1));}
function closeFacts(){factsK=-1;factsEl.classList.remove('show');}
function factsTick(){
  if(factsK<0)return;let n=Math.floor((performance.now()-factsT0)/12);
  factsEl.querySelectorAll('.cur').forEach(c=>c.remove());
  for(const [ke,kt,ve,vt] of factsRows){
    const a=Math.max(0,Math.min(kt.length,n));ke.textContent=kt.slice(0,a);n-=kt.length;
    if(ve){const b=Math.max(0,Math.min(vt.length,n));setFactValue(ve,vt.slice(0,b));n-=vt.length;
      if(n<0&&a+b>0){const c=document.createElement('span');c.className='cur';(b>0?ve:ke).appendChild(c);break;}}
    else if(n<0&&a>0){const c=document.createElement('span');c.className='cur';ke.appendChild(c);break;}
  }
}
const typer={t0:0,lines:[]};
function fillCard(retype){
  const i=cardI,s=ISL[i],w=i===4&&waiting;
  const st=MOONS[i].st,away=st==='belt'||st==='toBelt';
  cFocus.style.display=cMin.style.display=cClose.style.display='none';cOpen.style.display='';cOpen.innerHTML='<b>→</b> Open';
  const meta=APPN[s.p].toLowerCase()+' · '+(away?'work in progress':s.d);
  cMeta.className='meta'+(w?' w':'');
  document.getElementById('ret').classList.toggle('w',w);
  typer.lines=[[cTtl,s.t],[cMeta,meta]];
  if(retype!==false){typer.t0=performance.now();card.classList.remove('done');}
  else{cTtl.textContent=s.t;cMeta.textContent=meta;}
}
// type the readout out a character at a time, with a block cursor
function typeTick(){
  if(cardI<0||card.classList.contains('done'))return;
  let n=Math.floor((performance.now()-typer.t0)/16);
  for(const [el,txt] of typer.lines){
    const k=Math.max(0,Math.min(txt.length,n));n-=txt.length;
    el.textContent=txt.slice(0,k);
    if(k<txt.length&&k>=0&&n<0){const c=document.createElement('span');c.className='cur';el.appendChild(c);n=-1e9;}
  }
  if(n>=0)card.classList.add('done');
}
function openCard(i){cardI=i;fillCard();card.classList.add('show');}
function closeCard(){cardI=-1;card.classList.remove('show','done');card.style.opacity='';document.getElementById('cLead').style.opacity=0;document.getElementById('ret').style.opacity=0;}
cFocus.addEventListener('click',()=>{const i=cardI;if(i<0)return;if(MOONS[i].st==='belt'){restore(i);return;}if(i===4&&waiting)setWaiting(false);focusWindow(i);mpulse[i]=performance.now()/1000;ring2.i=i;ring2.t0=mpulse[i];fillCard();});
cOpen.addEventListener('click',()=>{const i=cardI;if(i<0)return;
  if(mz.target===1&&mz.i===i){mz.target=0;fillCard();return;}
  const p=ISL[i].p;
  // one continuous zoom: land on the planet and open the moon at the same time
  if(zoom.focus!==p||zoom.z<1)zoomTo(p);
  mz.i=i;mz.target=1;
  fillCard();});
// ---- planet worlds: tap a landed planet again to go inside ----
const WT={0:'gallery',3:'surface',2:'strata'};
const curW=()=>wz.mode||WT[wz.k];
const WHINT={gallery:'tap the planet · open the gallery',surface:'tap the planet · land on it',strata:'tap the planet · dig in'};
// SAMPLE CONTENT for the worlds — replace with your own
const SLOOP=88;
// Starlee's monoliths: moments about the two of you. Replace each line, and give img a photo (any URL or data: URL) to put it on the stone.
const MEM_SLOT=20;   // their pictures live in atlas slots 20+
// Starlee's monoliths float over the sea, one after another
let MONO=[],monoFly=null,wPend=-1;
// ---- a memory, opened: its photo dithers in at the centre of the screen; tap anywhere (or Esc) to let it go ----
const memv=document.getElementById('memv'),mcv=memv.querySelector('canvas'),mcx=mcv.getContext('2d');let memS=null;
function openMem(i){const m=MEM[i];if(!m)return;const im=new Image();im.onload=()=>{
  const cell=DPR>=2?1.5:2,gw=Math.min(W*.92,620,(H*.76)*(1.55/2.15)),   /* bigger, and much finer dots so faces resolve */cols=Math.round(gw/cell),rows=Math.round(cols*2.15/1.55);
  const c=document.createElement('canvas');c.width=cols;c.height=rows;const g=c.getContext('2d');g.drawImage(im,0,0,cols,rows);const px=g.getImageData(0,0,cols,rows).data;
  mcv.width=cols*cell*DPR;mcv.height=rows*cell*DPR;mcv.style.width=cols*cell+'px';mcv.style.height=rows*cell+'px';
  memv.querySelector('.t').textContent=m.t;memv.querySelector('.s').textContent=m.s;memv.querySelector('.d').textContent=m.d||'';
  memS={px,cols,rows,cell,p:0,dir:1,t0:performance.now()};memv.classList.add('on');requestAnimationFrame(()=>memv.classList.add('dim'));memTick();};im.src=m.full||m.img;}
function closeMem(){if(!memS)return;memS.dir=-1;memS.t0=performance.now()-(1-memS.p)*650;memv.classList.remove('txt','dim');memTick();}
function memTick(){const S2=memS;if(!S2)return;const k=Math.min(1,(performance.now()-S2.t0)/650);S2.p=S2.dir>0?k:1-k;
  const {px,cols,rows,cell}=S2,dp=DPR,sz=Math.max(1,Math.round(cell*dp)-(cell*dp>=3?1:0));mcx.clearRect(0,0,mcv.width,mcv.height);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const o=(y*cols+x)*4,r=px[o]/255,gg=px[o+1]/255,b=px[o+2]/255,lum=.3*r+.59*gg+.11*b;
    const L=Math.pow(lum,1.2)*.9+.03,th=(BAY8[y%8][x%8]+.5)/64;if(L<=th*.95+.04)continue;
    const sw=(x/cols*.7+y/rows*.3),rv=rnd(x*31+y*7)*.35+sw*.65;if(rv>S2.p*1.35-.02)continue;   // swept in, a little ragged
    const sh=.76+.29*Math.min(1,L),f=(v,bn)=>Math.round(Math.min(255,((bn*.2)+(v*1.15+.04)*.8)*sh*255));
    mcx.fillStyle=`rgb(${f(r,.96)},${f(gg,.94)},${f(b,.9)})`;mcx.fillRect(Math.round(x*cell*dp),Math.round(y*cell*dp),sz,sz);}
  if(S2.dir>0&&S2.p>.55)memv.classList.add('txt');
  if(k<1)requestAnimationFrame(memTick);else if(S2.dir<0){memS=null;memv.classList.remove('on');}}
memv.addEventListener('click',e=>{e.stopPropagation();closeMem();});
addEventListener('keydown',e=>{if(e.key==='Escape'&&memS){closeMem();e.stopImmediatePropagation();}});const MSP=32,MZ0=18,MST=()=>NARROW?14:12.5;   // spacing between monoliths, and how far back you rest from one
const monoB=()=>NARROW?[1.35,1.85,.14]:[1.55,2.15,.16];
const stationZ=j=>MZ0+j*MSP-MST();
function monoPos(j,nowS){const L=MONO.length*MSP,st=stationZ(j),z0=MZ0+j*MSP,z=z0+L*Math.round((camZ-st)/L);
  const sx=NARROW?.15:2.6,al=0,   /* no squaring up: each monolith keeps its own angle as you fly in */x=(j%2?sx:-sx)*(1-al),y=4.35+Math.sin(nowS*.6+j*1.7)*.14;return [x,y,z,(j%2?-.28:.28)*(1-al)];}
// CSS matrix3d that maps a w×h element onto a screen quad (perspective-correct)
function quadMatrix(w,h,Q){const [p0,p1,p2,p3]=Q,dx1=p1.x-p2.x,dx2=p3.x-p2.x,dx3=p0.x-p1.x+p2.x-p3.x,dy1=p1.y-p2.y,dy2=p3.y-p2.y,dy3=p0.y-p1.y+p2.y-p3.y;
  const den=dx1*dy2-dx2*dy1,g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den;
  const a=p1.x-p0.x+g*p1.x,b=p3.x-p0.x+hh*p3.x,d=p1.y-p0.y+g*p1.y,e=p3.y-p0.y+hh*p3.y;
  return `matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${p0.x},${p0.y},0,1)`;}
function camBasis(nowS){const e=ew,alt=5+(32-5)*(1-e),pitch=-.13+(-1.3+.13)*(1-e),yw=yaw;
  const ro=[Math.sin(nowS*.06)*.25,alt,camZ],fw=[Math.sin(yw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yw)*Math.cos(pitch)];
  let rt=[fw[2],0,-fw[0]];const rl=Math.hypot(...rt);rt=rt.map(v=>v/rl);const up=[fw[1]*rt[2]-fw[2]*rt[1],fw[2]*rt[0]-fw[0]*rt[2],fw[0]*rt[1]-fw[1]*rt[0]];return {ro,fw,rt,up};}
function project(B,P){const d=[P[0]-B.ro[0],P[1]-B.ro[1],P[2]-B.ro[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],z=dot(d,B.fw);if(z<=.1)return null;
  const ux=dot(d,B.rt)/(z*1.15),uy=dot(d,B.up)/(z*1.15);
  return {x:(ux*wRows+wCols/2)*wCell/DPR,y:H-(uy*wRows+wRows/2)*wCell/DPR,z,k:wRows*wCell/DPR/(z*1.15)};}
const wz={k:-1,z:0,target:0};let ew=0,camZ=0,camV=0,yaw=0,yawT=0,depth=0,depthV=0,galX=0,galT=0,galVel=0,wAcc=0,wTouched=false;
const worldEl=document.getElementById('world'),lhint=document.getElementById('lhint');
const SL=()=>{const y0=NARROW?H*.24:H*.3,LH=Math.max(H*.85,560);return {y0,LH,max:4*LH-H*.2};};
let labH=150,labW=270,stEls={sl:[],fc:[]},tmKey='';const revC={x:0,y:0};const FOS=()=>{const {LH}=SL(),fs=NARROW?W*.5:Math.min(W*.2,LH*.3,260);
  const lx=NARROW?20:Math.max(28,W*.08);
  return STRATA.map((l,j)=>l.lg==null?null:{lg:l.lg,u:l.u,t:l.t,x:NARROW?(W-fs)/2:lx,y:LH*j+(NARROW?LH*.44:(j?44:30)+labH+40),s:fs}).filter(Boolean);};
function enterWorld(k){closeFacts();wz.k=k;wz.target=1;MONO=MEM.map((_,i)=>i);camZ=stationZ(0)-9;camV=0;yaw=yawT=0;depth=0;depthV=0;galX=galT=0;wTouched=false;
  const t=WT[k];let h='';
  if(t==='gallery')h=GT.map((g,ti)=>`<div class="gl" data-t="${ti}"><span class="n">${ISL[g.i].t}</span> · ${ISL[g.i].d}<div class="s"></div></div>`).join('');
  if(t==='surface')h=`<div class="cap mono"><div class="n"></div><div class="s"></div><div class="o"></div></div>`;
  if(t==='strata')h=STRATA.map(l=>`<div class="sl"><div class="y">${l.y}</div><div class="n">${l.t}</div><div class="x">${l.x}</div></div>`).join('')+
    FOS().map(f=>`<div class="fc">${f.u?`<b>${f.u.replace(/^https?:\/\/(www\.)?/,'')}</b> ↗`:''}</div>`).join('');
  h+=`<div class="wh">${{gallery:'drag to browse · tap to open',surface:'drag up to fly · tap a monolith to open it',strata:'scroll to dig ↓'}[t]}</div>`;
  worldEl.innerHTML=h;if(t==='strata'){const e=[...worldEl.querySelectorAll('.sl')];if(e.length)labH=Math.max(...e.map(x=>x.offsetHeight));measureGlyphs();}}
function measureGlyphs(){for(const el of worldEl.querySelectorAll('.sl,.fc')){const r0=el.getBoundingClientRect(),g=[];
  const tw=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const cs=getComputedStyle(n.parentElement),up=cs.textTransform==='uppercase',font=`${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    for(let i=0;i<n.data.length;i++){const ch=n.data[i];if(!ch.trim())continue;const rg=document.createRange();rg.setStart(n,i);rg.setEnd(n,i+1);const b=rg.getClientRects()[0];if(!b)continue;
      g.push({c:up?ch.toUpperCase():ch,x:b.left-r0.left+b.width/2,y:b.top-r0.top+b.height/2,f:font});}}
  el.__g=g;el.__w=el.offsetWidth;el.__h=el.offsetHeight;}
  stEls={sl:[...worldEl.querySelectorAll('.sl')],fc:[...worldEl.querySelectorAll('.fc')]};labW=stEls.sl[0]?stEls.sl[0].__w:270;tmKey='';}
const TM=document.createElement('canvas'),tmx=TM.getContext('2d'),tmTex=gl.createTexture();
function drawGlyphMask(){const els=[...stEls.sl,...stEls.fc],key=wCols+'x'+wRows+':'+els.map(e=>e.style.opacity>0?e.__x+','+e.__y:'-').join('|');
  if(key===tmKey){gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tmTex);gl.uniform1i(WU.w_tm,3);gl.activeTexture(gl.TEXTURE0);return;}tmKey=key;
  if(TM.width!==wCols||TM.height!==wRows){TM.width=wCols;TM.height=wRows;}const k=DPR/wCell;
  tmx.setTransform(1,0,0,1,0,0);tmx.clearRect(0,0,wCols,wRows);tmx.setTransform(k,0,0,k,0,0);tmx.textAlign='center';tmx.textBaseline='middle';tmx.fillStyle=tmx.strokeStyle='#fff';tmx.lineWidth=3;
  for(const el of els){if(!el.__g||+el.style.opacity<=0||el.__x==null)continue;tmx.globalAlpha=1;
    for(const c of el.__g){tmx.font=c.f;tmx.fillText(c.c,el.__x+c.x,el.__y+c.y);tmx.strokeText(c.c,el.__x+c.x,el.__y+c.y);}}
  gl.activeTexture(gl.TEXTURE3);gl.bindTexture(gl.TEXTURE_2D,tmTex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,TM);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(WU.w_tm,3);gl.activeTexture(gl.TEXTURE0);}
function exitWorld(){wz.target=0;if(memS){memS=null;memv.classList.remove('on','dim','txt');}}
function killWorld(){wz.mode=null;crPend=null;wz.target=0;wz.z=0;wz.k=-1;ew=0;worldEl.innerHTML='';document.body.classList.remove('inworld');}
// open a project from inside a world: leave the world, then fly to its moon (or the archive, if it was retired)
function openFromWorld(i){const mo=MOONS[i];exitWorld();
  setTimeout(()=>{if(mo.st==='gone'){zoomOut();setTimeout(()=>{bz.target=1;},1300);}
    else if(mo.st!=='moon'){zoomOut();}
    else if(ISL[i].p===zoom.focus){mz.i=i;mz.target=1;}
    else{zoomTo(ISL[i].p);mz.pending=i;}},1250);}
function worldDrag(dx,dy,dt){wTouched=true;const t=curW();
  if(t==='crater'){crYawT+=dx*.006;crZoom=Math.max(-.6,Math.min(1,crZoom-dy*.004));return;}
  if(t==='gallery'){const d=-dx/(GT_T+GT_G);galX=Math.max(-.4,Math.min(GT.length-.6,galX+d));galVel=galVel*.5+d/dt*.5;galT=galX;}
  if(t==='surface'){if(!drag.axis)drag.axis=Math.abs(dy)>=Math.abs(dx)*.8?'y':'x';
    if(drag.axis==='y'){camZ+=-dy*(MSP*1.8/H);camV=0;(drag.zh=drag.zh||[]).push([performance.now(),camZ]);while(drag.zh.length>12)drag.zh.shift();}
    else yawT=Math.max(-.45,Math.min(.45,yawT+dx*.0022));}
  if(t==='strata'){const {max}=SL();depth=Math.max(0,Math.min(max,depth-dy));depthV=depthV*.5+(-dy/dt)*.5;}}
function worldTap(x,y){const t=curW();
  if(t==='crater'){const u=crSite.u;if(!u.url)return;   /* tapping the shard opens the push on GitHub */const af=NARROW?1.65:1,yw=crYaw,dist=(7.6-1.8*crZoom)*af,ro=[Math.sin(yw)*dist,(4.6+.8*crZoom)*af,-Math.cos(yw)*dist],
      f=[-ro[0],-.2-ro[1],-ro[2]],fl=Math.hypot(...f),fw=f.map(v=>v/fl);let rt=[fw[2],0,-fw[0]];const rl=Math.hypot(...rt);rt=rt.map(v=>v/rl);
      const up=[fw[1]*rt[2]-fw[2]*rt[1],fw[2]*rt[0]-fw[0]*rt[2],fw[0]*rt[1]-fw[1]*rt[0]],q=project({ro,fw,rt,up},[0,.2,0]);
    if(q&&Math.hypot(x-q.x,y-q.y)<1.4*q.k)window.open(u.url,'_blank','noopener');return;}
  if(t==='gallery'){const T=GT_T,gy=NARROW?CY-30:CY-24;
    for(let ti=0;ti<GT.length;ti++){const cx=CX+(ti-galX)*(T+GT_G);if(Math.abs(x-cx)<T/2&&Math.abs(y-gy)<T/2){
      if(Math.abs(ti-galX)>.35)galT=ti;else openFromWorld(GT[ti].i);return;}}}
  if(t==='surface'){const B=camBasis(performance.now()/1000),b=monoB();let hit=-1,hz=1e9;
    MONO.forEach((i,j)=>{const P=monoPos(j,performance.now()/1000),q=project(B,P);if(!q||q.z>40)return;
      if(Math.abs(x-q.x)<b[0]*q.k+10&&Math.abs(y-q.y)<b[1]*q.k+10&&q.z<hz){hz=q.z;hit=i;}});
    if(hit>=0){camV=0;openMem(hit);}return;}
  if(t==='strata'){const {y0}=SL();for(const f of FOS()){const fy=y0+f.y-depth;if(x>f.x&&x<f.x+f.s&&y>fy&&y<fy+f.s){if(f.u)window.open(f.u,'_blank','noopener');return;}}}}
// ---- trackpad / wheel spinning: one place for direction and feel, shared by every view that spins ----
const SPIN_X=-1,SPIN_Y=1;                              // flip one to reverse sideways or up/down spinning everywhere
function wheelAmount(e){const k=e.deltaMode===1?16:1,dx=e.deltaX*k,dy=e.deltaY*k;return Math.abs(dx)>Math.abs(dy)?SPIN_X*dx:SPIN_Y*dy;}
// what can spin right now, and how a nudge of d (in radians) moves it; null if nothing should
function spinTarget(){
  if(drag.on||wz.k>=0||mz.target===1)return null;
  if(bz.target===1)return {scale:1/Math.max(20,bhScr.R*1.6)*.5,max:14,nudge:d=>{bhSpin+=d;bhSpinV=Math.max(-14,Math.min(14,bhSpinV*.85+d*10));}};
  const F=zoom.focus;
  if(F>=0&&zoom.target===1)return {scale:.6/Math.max(60,pos[F].r),nudge:d=>{PL[F].ph+=d;PL[F].moff+=d;spinV=Math.max(-6,Math.min(6,spinV*.85+d*8));}};
  if(F<0&&zoom.target===0)return {scale:.0016,nudge:d=>{sysA+=d;sysV=Math.max(-6,Math.min(6,sysV*.85+d*7.5));}};
  return null;}
addEventListener('wheel',e=>{
  {const T=spinTarget();if(T){e.preventDefault();T.nudge(wheelAmount(e)*T.scale);return;}}
  if(wz.k<0||wz.target!==1)return;monoFly=null;e.preventDefault();wTouched=true;const t=curW(),d=e.deltaY+e.deltaX;
  if(t==='crater'){crZoom=Math.max(-.6,Math.min(1,crZoom-e.deltaY*.002));crYawT-=SPIN_X*e.deltaX*.004;}   // the camera circles, so the ground turns the way the planets do
  if(t==='surface')camV=Math.max(-30,Math.min(30,camV+d*.025));
  if(t==='strata'){depthV+=d*2.6;}
  if(t==='gallery'){   // one card per swipe. A swipe's coasting tail is a run of shrinking deltas; a new swipe starts the moment they grow again
    const nw=performance.now(),k=e.deltaMode===1?16:1,dd=(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY)*k,ad=Math.abs(dd);
    if(nw-galWT>120||(galLock&&nw-galLT>90&&ad>galLA*1.4+3)||(galLock&&Math.sign(dd)!==galDir&&ad>4)){galLock=false;wAcc=0;}
    galWT=nw;galLA=ad;
    if(galLock)return;wAcc+=dd;if(Math.abs(wAcc)>24){galDir=Math.sign(wAcc);galT=Math.max(0,Math.min(GT.length-1,Math.round(galT)+galDir));wAcc=0;galLock=true;galLT=nw;}}},{passive:false});
let galWT=0,galLock=false,galLA=0,galLT=0,galDir=0;
// ---- project page in the moon view ----
const projEl=document.getElementById('proj');
const nImg=i=>ISL[i].logo!=null?1:Math.max(1,Math.min(2,ISL[i].imgs.length||2));
const slotOf=(i,g)=>i*2+g;
function fillProj(i){
  const s=ISL[i],k=s.p,n=nImg(i);projI=i;gal=0;imgSwap={cur:slotOf(i,0),prev:slotOf(i,0),t0:-9};
  projEl.innerHTML=`<div class="k2">${APPN[k]}<sup>${SUP[k]}</sup> · ${s.d}</div><div class="t">${s.t}</div><div class="r">${s.role}</div>`+
    `<div class="d">${s.desc}</div><div class="k2">${s.tools}</div>`+
    (s.links.length?`<div class="lk">${s.links.map(l=>l.url?`<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`:`<span>${l.label} ↗</span>`).join('')}</div>`:'')+
    (n>1?`<div class="gal"><button id="gp" aria-label="Previous image">‹</button><span id="gd"></span><button id="gn" aria-label="Next image">›</button></div>`:'');
  [...projEl.children].forEach((c,j)=>c.style.transitionDelay=(j*70+150)+'ms');
  if(n>1){projEl.querySelector('#gp').onclick=()=>galStep(-1);projEl.querySelector('#gn').onclick=()=>galStep(1);}
  galDots();
  try{history.replaceState(null,'','#'+s.slug);}catch(_){}
}
function galDots(){const d=projEl.querySelector('#gd');if(d)d.innerHTML=[...Array(nImg(projI))].map((_,j)=>`<i class="${j===gal?'on':''}"></i>`).join('');}
function galStep(dir){if(projI<0)return;const n=nImg(projI);if(n<2)return;gal=(gal+dir+n)%n;
  imgSwap={cur:slotOf(projI,gal),prev:imgSwap.cur,t0:performance.now()/1000};galDots();
  mpulse[projI]=performance.now()/1000;}
function clearHash(){try{history.replaceState(null,'',location.pathname+location.search);}catch(_){}}
function openBySlug(){const slug=(location.hash||'').slice(1),i=ISL.findIndex(x=>x.slug===slug);
  if(i<0||MOONS[i].st==='gone'||MOONS[i].st==='belt')return;if(zoom.focus!==ISL[i].p||zoom.z<1)zoomTo(ISL[i].p);mz.i=i;mz.target=1;}
addEventListener('hashchange',openBySlug);
function moonBack(){clearHash();mz.target=0;if(cardI>=0&&zoom.focus>=0)closeCard();}
// bring a window to the front: its moon moves to the innermost slot and reads "now"
// ---- windows leaving and returning: asteroid belt (minimize) and black hole (close) ----
MOONS.forEach(m=>{m.st='moon';m.t=1;});
const mrb=new Float32Array(12),moonS=new Float32Array(12),swallowed=[];let bhPulse=-99,bhScr={x:0,y:0,R:0};
let monoF=-1,projI=-1,gal=0,imgSwap={cur:0,prev:0,t0:-9},sysS=0,flX=1,flY=1,fShift=0,bhSpin=0,bhSpinV=0,bhS=0,vMoonA=0,vMoonV=.22;const BSP=.05,bz={z:0,target:0};
function arrived(i){const t=performance.now()/1000,P=pos[MOONS[i].p];
  mpulse[i]=t;ring2.i=i;ring2.t0=t;if(P){ck.x=P.x;ck.y=P.y;ck.t0=t;}flash(labs[MOONS[i].p]);flash(islLabs[i]);}
function restoreFromHole(i){const j=swallowed.indexOf(i);if(j<0)return;swallowed.splice(j,1);
  const q=moonPos[i]||{x:bhScr.x,y:bhScr.y,r:0},Rb=Math.max(1,bhScr.R);
  Object.assign(MOONS[i],{st:'fromHole',t:0,slot:99,ox:(q.x-bhScr.x)/Rb,oy:(q.y-bhScr.y)/Rb,or:(q.r||0)/Rb});reslot(MOONS[i].p);bhPulse=performance.now()/1000;updCounts();
  if(!swallowed.length)setTimeout(()=>{if(!swallowed.length)bz.target=0;},1100);}
function reslot(p){MOONS.filter(o=>o.p===p&&o.st!=='belt'&&o.st!=='gone'&&o.st!=='toBelt'&&o.st!=='toHole').sort((a,b)=>a.slot-b.slot).forEach((o,j)=>o.slot=j);}
function updCounts(){
  PL.forEach((_,k)=>{const n=MOONS.filter(o=>o.p===k&&(o.st==='moon'||o.st==='fromBelt'||o.st==='fromHole')).length,d=labs[k].lastElementChild,P=PLN[k];
    d.textContent=(P.noun?n+' '+P.noun+(n===1?'':'s')+' · ':'')+(k===4&&!waiting?'2026':P.sub);});
  const nb=MOONS.filter(o=>o.st==='belt'||o.st==='toBelt').length,nh=swallowed.length;
  document.getElementById('beltc').textContent=nb?'asteroid belt · '+nb+' in progress':'';
  document.getElementById('bhc').textContent=nh?nh+' closed · tap to restore':'nothing closed';
  listFor=-2;
}
function minimize(i){const mo=MOONS[i],q=moonPos[i];if(mo.st!=='moon')return;
  const now=performance.now()/1000,th=Math.atan2((q.y-CY)/(600*S*.4015),(q.x-CX)/(600*S));
  Object.assign(mo,{st:'toBelt',t:0,sx:q.x,sy:q.y,ba0:th-now*BSP-sysA});reslot(mo.p);updCounts();if(cardI===i)fillCard(false);}
function restore(i){const mo=MOONS[i];if(mo.st!=='belt')return;Object.assign(mo,{st:'fromBelt',t:0,slot:99});reslot(mo.p);updCounts();if(cardI===i)closeCard();}
function closeWin(i){const mo=MOONS[i],q=moonPos[i];if(mo.st==='gone'||mo.st==='toHole')return;
  if(cardI===i)closeCard();if(i===4&&waiting)setWaiting(false);
  Object.assign(mo,{st:'toHole',t:0,sx:q.x,sy:q.y});swallowed.push(i);reslot(mo.p);updCounts();}
function unswallow(){const i=swallowed.pop();if(i==null)return;const mo=MOONS[i];
  Object.assign(mo,{st:'fromHole',t:0,slot:99});reslot(mo.p);bhPulse=performance.now()/1000;updCounts();}
const cMin=document.getElementById('cMin'),cClose=document.getElementById('cClose');
cMin.addEventListener('click',()=>{if(cardI>=0)minimize(cardI);});
cClose.addEventListener('click',()=>{if(cardI>=0)closeWin(cardI);});
function focusWindow(i){
  const mo=MOONS[i],old=mo.slot;
  MOONS.forEach(o=>{if(o.p===mo.p&&o.slot<old)o.slot++;});mo.slot=0;
  ISL[i].d='now';const t=islLabs[i].querySelector('.n').nextElementSibling;t.textContent='now';listFor=-2;
}
function nearestOrbit(x,y){let best=0,bd=1e9;
  ORB.forEach(([rx,ry],i)=>{const r=Math.hypot((x-CX)/(rx*S),(y-CY)/(ry*S)),d=Math.abs(r-1)*rx;if(d<bd){bd=d;best=i;}});return best;}
function angOn(o,x,y){const [rx,ry]=ORB[o];return Math.atan2((y-CY)/(ry*S),(x-CX)/(rx*S));}
// drop a planet onto the nearest orbit; whoever lived there swaps onto the planet's old orbit
function drop(k,x,y){
  const pl=PL[k],o2=nearestOrbit(x,y),o1=pl.o,j=PL.findIndex((q,i)=>i!==k&&q.o===o2);
  if(j>=0&&o2!==o1){const q=PL[j],P=pos[j],th=angOn(o2,P.x,P.y);
    q.o=o1;q.w=WORB[o1];q.a0=th-q.w*simT-sysA;q.from={x:P.x,y:P.y};q.bl=0;}
  pl.o=o2;pl.w=WORB[o2];pl.a0=angOn(o2,x,y)-pl.w*simT-sysA;pl.from={x,y};pl.bl=0;
  ck.x=x;ck.y=y;ck.t0=performance.now()/1000;
}
function pickMoon(x,y){for(let i=0;i<moonPos.length;i++){const q=moonPos[i];if(q&&q.vis&&Math.hypot(x-q.x,y-q.y)<Math.max(10,q.r*1.6))return i;}return -1;}
function tap(x,y){
  ck.x=x;ck.y=y;ck.t0=performance.now()/1000;
  if(wz.k>=0){if(wz.target===1)worldTap(x,y);return;}
  const mi=pickMoon(x,y);
  if(mz.target===1){                                  // moon view: tap the moon to pulse it, anywhere else to go back
    if(Math.hypot(x-mvPos.x,y-mvPos.y)<mvPos.r*1.05)clickMoon(mz.i);else moonBack();
    return;
  }
  if(bz.target===1){                                  // inside the black hole: tap a moon to zoom into it, anywhere else to leave
    if(mi>=0&&MOONS[mi].st==='gone'){mpulse[mi]=performance.now()/1000;ring2.i=mi;ring2.t0=mpulse[mi];mz.i=mi;mz.target=1;}
    else if(Math.hypot(x-bhScr.x,y-bhScr.y)>bhScr.R*6)bz.target=0;
    return;
  }
  if(zoom.focus<0&&zoom.z===0&&Math.hypot(x-bhScr.x,y-bhScr.y)<Math.max(26,bhScr.R*3)){closeCard();bz.target=1;return;}
  {const c=mi<0&&mz.target===0?pickCrater(x,y):null;
   if(c){if(zoom.focus===c.p&&zoom.z>=1)enterCrater(c);else{zoomTo(c.p);crPend=c;}return;}}
  if(mi>=0&&zoom.focus>=0&&zoom.target===1){        // landed: pulse, then open the moon straight away
    mpulse[mi]=performance.now()/1000;ring2.i=mi;ring2.t0=mpulse[mi];flash(islLabs[mi]);
    mz.i=mi;mz.target=1;closeFacts();return;}
  if(mi>=0){clickMoon(mi);return;}                    // orbit view: pulse, ring, and its window card
  if(cardI>=0){closeCard();if(zoom.focus>=0||pick(x,y)<0)return;}   // tapping away closes the card; tapping a planet also goes to it
  if(zoom.focus>=0&&zoom.target===1){
    if(Math.hypot(x-CX,y-CY)>RB*1.08)zoomOut();
    else if(WT[zoom.focus]){if(zoom.z>=1)enterWorld(zoom.focus);else wPend=zoom.focus;}   // tapped while still zooming in: open as soon as it lands
    return;
  }
  if(zoom.focus<0){const k=pick(x,y);if(k>=0)zoomTo(k);}
}
function pick(x,y){for(let k=0;k<PL.length;k++){if(k===HIDE_PL)continue;const p=pos[k];if(p&&Math.hypot(x-p.x,y-p.y)<p.r*1.2)return k;}return -1;}
function pickIsland(x,y){const i=pickMoon(x,y);return i>=0&&moonPos[i].foc?i:-1;}
document.querySelectorAll('#nav button').forEach(b=>b.addEventListener('click',()=>{
  b.dataset.k==='here'?zoomOut():zoomTo(+b.dataset.k);}));
back.addEventListener('click',()=>wz.k>=0&&wz.target===1?exitWorld():mz.target===1?moonBack():bz.target===1?(bz.target=0):zoomOut());
document.getElementById('rest').addEventListener('click',()=>{const i=mz.i;if(i<0||MOONS[i].st!=='gone')return;
  const t=performance.now()/1000;mpulse[i]=t;ring2.i=i;ring2.t0=t;flash(mtitle);
  setTimeout(()=>{mz.target=0;},380);                                    // 1. pulse, then pull back to the black hole
  setTimeout(()=>{restoreFromHole(i);bz.target=0;},380+1050);            // 2. it breaks free and flies home as the camera pulls out
});
addEventListener('keydown',e=>{if(wz.k>=0&&wz.target===1){const t=curW();wTouched=true;
    if(e.key==='Escape')exitWorld();
    if(t==='gallery'&&(e.key==='ArrowRight'||e.key==='ArrowLeft'))galT=Math.max(0,Math.min(GT.length-1,Math.round(galT)+(e.key==='ArrowRight'?1:-1)));
    if(t==='gallery'&&e.key==='Enter'){const ti=Math.round(galX);if(GT[ti])openFromWorld(GT[ti].i);}
    if(t==='strata'&&(e.key==='ArrowDown'||e.key==='ArrowUp'))depthV+=(e.key==='ArrowDown'?1:-1)*900;
    if(t==='surface'&&(e.key==='ArrowUp'||e.key==='ArrowDown'))camV+=(e.key==='ArrowUp'?1:-1)*3;
    return;}if(mz.target===1&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){galStep(e.key==='ArrowRight'?1:-1);return;}if(e.key==='Escape'&&mz.target===1&&bz.target===1){moonBack();return;}if(e.key==='Escape'&&bz.target===1){bz.target=0;return;}if(cardI>=0&&e.key==='Enter'){cOpen.click();return;}if(cardI>=0&&e.key==='ArrowRight'){cOpen.click();return;}if(e.key==='n'&&!comet.on&&zoom.focus<0)launch(waiting?(Math.random()*2|0):2);const map={'1':0,'2':1,'3':3,'4':2,'5':4};if(e.key in map)zoomTo(map[e.key]);
  if(e.key==='Escape'&&cardI>=0&&mz.target!==1)closeCard();if(e.key==='0'||e.key==='Escape'){if(mz.target===1)moonBack();else zoomOut();}
});

/* ---------- clock ---------- */
const fD=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Los_Angeles',weekday:'short',day:'numeric',month:'short'});
const fT=new Intl.DateTimeFormat('en-GB',{timeZone:'America/Los_Angeles',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
function tick(){const d=new Date();document.getElementById('date').textContent=fD.format(d).replace(',','');
  document.getElementById('clock').textContent=fT.format(d);}
tick();setInterval(tick,1000);

/* ---------- frame ---------- */
const orbU=new Float32Array(10),plU=new Float32Array(20),lU=new Float32Array(15);
ORB.forEach(([a,b],i)=>{orbU[i*2]=a;orbU[i*2+1]=b;});
gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const sstep=(a,b,x)=>{const t=Math.min(Math.max((x-a)/(b-a),0),1);return t*t*(3-2*t);};

function frame(now){
  const dt=Math.min((now-last)/1000,.05);last=now;
  simT+=dt*(reduce?0:1);
  // springs instead of easing: the scatter overshoots and wobbles back when you move off
  m.vx=(m.vx||0)+(m.tx-m.x)*140*dt;m.vy=(m.vy||0)+(m.ty-m.y)*140*dt;m.vx*=Math.exp(-dt*15);m.vy*=Math.exp(-dt*15);
  m.x+=m.vx*dt;m.y+=m.vy*dt;
  m.sv=(m.sv||0)+(m.ts-m.s)*70*dt;m.sv*=Math.exp(-dt*6.5);m.s+=m.sv*dt;
  // sun hover: eases in, speeds up its clock a little, and remembers where you are
  {const dx=m.x-CX,dy=m.y-CY,near=zoom.focus<0&&m.ts>0&&Math.hypot(dx,dy)<SUN*S*3.2;
   sunH+=((near?1:0)-sunH)*.06;sunT+=dt*(1+1.6*sunH+3*sysS);if(near)sunA=Math.atan2(dy,dx);}
  ring=1;   /* Resume's red outline is always on */
  for(let i=0;i<5;i++)act[i]+=(ACT0[i]-act[i])*Math.min(1,dt*.08);

  // fling inertia
  if(!drag.on){sysA+=sysV*dt;bhSpin+=bhSpinV*dt;}
  // moons in the void ease toward the disk's speed instead of following your finger directly
  vMoonV+=((.22+.3*bhSpinV)-vMoonV)*Math.min(1,dt*1.5);vMoonA+=vMoonV*dt;
  bhSpinV*=Math.exp(-dt*(drag.on?0:.9));bhSpinV=Math.max(-14,Math.min(14,bhSpinV));
  sysS+=(Math.min(1,Math.abs(sysV)/3)-sysS)*Math.min(1,dt*3);flX=1-.04*sysS;flY=1-.38*sysS;
  sysV*=Math.exp(-dt*(drag.on?0:.75));spinV*=Math.exp(-dt*1.8);
  // zoom: ease in/out over ~1.1s; switching planets goes out, then in
  zoom.z=Math.min(1,Math.max(0,zoom.z+(zoom.target?1:-1)*dt/1.1));
  if(zoom.z===0&&zoom.target===0){if(zoom.pending>=0){zoom.focus=zoom.pending;zoom.pending=-1;zoom.target=1;}else zoom.focus=-1;}
  const F=zoom.focus,e=F>=0?ease(zoom.z):0;
  {const want=factsK>=0&&NARROW?Math.min(Math.max(0,CY-RB-96),Math.max(0,RB+28+factsEl.offsetHeight-(H-48-CY))):0;fShift+=(want-fShift)*Math.min(1,dt*6);}
  bz.z=Math.min(1,Math.max(0,bz.z+(bz.target?1:-1)*dt/1.2));const eB=F<0?ease(bz.z):0;
  // black hole parked off the outer orbit, lower right (system space, before the camera)
  const BH0=BH_CENTER?{x:CX,y:CY,R:Math.max(12,30*S)}:(()=>{const Rh=Math.max(8,19*S);let bx=CX+660*S*.96,by=CY+265*S*1.55;bx=Math.min(W-Rh*3.4,bx);by=Math.min(H-Rh*3-46,Math.max(70,by));return {x:bx,y:by,R:Rh};})();

  // planet positions before the camera
  const P0=PL.map((pl,k)=>{
    const th=pl.a0+pl.w*simT+sysA,[rx,ry]=ORB[pl.o];
    const ex=rx*Math.cos(th)*S*flX,ey=ry*Math.sin(th)*S*flY,c=Math.cos(ROT),s=Math.sin(ROT);
    pl.ph+=pl.spin*dt*(reduce?.2:1)*(k===F?1-.75*e:1)+(k===F&&!drag.on?spinV*dt:0);
    if(k===F&&!drag.on)pl.moff+=spinV*dt;   // moons turn with the planet when you spin it
    // light: the orbit plane is seen from ~24° above, so the sun direction tips toward/away from the viewer
    const tl=ry/rx,ct=Math.sqrt(1-tl*tl);
    // mostly sunlight, plus a fill from the viewer's side so no planet goes fully dark
    let lx=-Math.cos(th)*.8-.28,ly=-Math.sin(th)*tl*.8-.3,lz=-Math.sin(th)*ct*.8+.75;
    if(k===F){const w=e;lx+=(-.48-lx)*w;ly+=(-.48-ly)*w;lz+=(.74-lz)*w;}
    const ln=Math.hypot(lx,ly,lz)||1;lU.set([lx/ln,ly/ln,lz/ln],k*3);
    let x=CX+c*ex-s*ey,y=CY+s*ex+c*ey;
    if(grab.k===k){grab.x+=(grab.tx-grab.x)*.35;grab.y+=(grab.ty-grab.y)*.35;x=grab.x;y=grab.y;}
    else if(pl.bl<1&&pl.from){pl.bl=Math.min(1,pl.bl+dt/.7);const q=ease(pl.bl);x=pl.from.x+(x-pl.from.x)*q;y=pl.from.y+(y-pl.from.y)*q;}
    if(grab.k===k||pl.bl<1){   // light from the real position while off the orbit
      let cx=(x-CX)/(rx*S),cy=(y-CY)/(ry*S);const cl=Math.hypot(cx,cy)||1;cx/=cl;cy/=cl;
      let lx=-cx*.8-.28,ly=-cy*tl*.8-.3,lz=-cy*ct*.8+.75;const ln=Math.hypot(lx,ly,lz)||1;lU.set([lx/ln,ly/ln,lz/ln],k*3);}
    return {x,y,r:pl.r*S};
  });
  // camera: focused planet slides to centre while the view scales up around it
  let k=1,fx=CX,fy=CY,ps=null;
  if(F>=0){const P=P0[F];k=Math.exp(e*Math.log(RB/P.r));
    ps={x:P.x+(CX-P.x)*e,y:P.y+(CY-fShift-P.y)*e};fx=P.x-(ps.x-CX)/k;fy=P.y-(ps.y-CY)/k;}
  else if(eB>0){   // fall into the black hole: it slides to the centre and grows until its disk fills the middle of the screen
    k=Math.exp(eB*Math.log(RT/BH0.R));
    const bx2=BH0.x+(CX-BH0.x)*eB,by2=BH0.y+(CY-BH0.y)*eB;fx=BH0.x-(bx2-CX)/k;fy=BH0.y-(by2-CY)/k;}
  const snap=v=>Math.round(v*DPR)/DPR;
  P0.forEach((P,i)=>{pos[i]={x:snap(CX+(P.x-fx)*k),y:snap(CY+(P.y-fy)*k),r:P.r*k};plU.set([pos[i].x,pos[i].y,pos[i].r,PL[i].ph],i*4);});
  const bigA=F>=0?sstep(.03,.28,e):0;
  const beltPt=th=>{const ex=Math.cos(th)*600*S*flX,ey=Math.sin(th)*600*S*.4015*flY,c=Math.cos(ROT),s=Math.sin(ROT);return {x:CX+(CX+c*ex-s*ey-fx)*k,y:CY+(CY+s*ex+c*ey-fy)*k};};
  // moon view zoom
  mz.z=Math.min(1,Math.max(0,mz.z+(mz.target?1:-1)*dt/1.1));
  if(mz.pending>=0&&zoom.focus===ISL[mz.pending].p&&zoom.z>=1){mz.i=mz.pending;mz.pending=-1;mz.target=1;if(cardI>=0)fillCard();}
  if(mz.z===0&&mz.target===0)mz.i=-1;
  const e2=mz.i>=0?ease(mz.z):0,mvA=mz.i>=0?sstep(.15,.45,e2):0;

  // planet labels
  labs.forEach((L,i)=>{
    const p=pos[i],foc=i===F;
    let op=(foc?(e<.5?1-2*e:2*e-1):1-e)*(1-e2)*(1-eB);
    const left=foc?e>.5:p.x<CX;
    L.style.opacity=op;
    L.classList.toggle('hot',hover===i||foc);
    if(NARROW){L.classList.remove('right');L.classList.toggle('wait',i===4&&waiting);
      const hw=L.offsetWidth/2+8,lx=Math.min(Math.max(p.x,hw),W-hw);
      const rr=i===2?p.r*1.45:p.r,ly=foc&&e>.5?p.y-p.r-34:(p.y<CY?p.y-rr-22:p.y+rr+6);
      L.style.transform=`translate(${lx}px,${ly}px) translateX(-50%)`;return;}
    if(foc&&e>.5){L.classList.remove('right');L.style.textAlign='center';
      L.style.transform=`translate(${p.x}px,${p.y-p.r-30}px) translate(-50%,-100%)`;return;}
    L.style.textAlign='';
    L.classList.toggle('right',left);
    const gap=(i===2&&!foc?p.r*1.52+4:p.r+8);
    L.style.transform=left?`translate(${p.x-gap}px,${p.y}px) translate(-100%,-50%)`:`translate(${p.x+gap}px,${p.y}px) translateY(-50%)`;
  });

  // narrow screens: islands listed under the planet instead of pointing at it
  if(NARROW&&F>=0){
    if(listFor!==F){listFor=F;islList.innerHTML=ISL.filter((s,i)=>s.p===F&&MOONS[i].st==='moon').map(s=>`<div><span>${s.t}</span> · <b style="font-weight:400" class="${s.p===4&&waiting?'w':''}">${s.d}</b></div>`).join('');}
    islList.style.top=(pos[F].y+pos[F].r+22)+'px';islList.style.opacity=sstep(.6,1,e)*(1-e2);
  } else islList.style.opacity=0;
  // black hole: parked off the outer orbit, lower right; scales away with the camera
  {const Rh=BH0.R;
   bhScr={x:CX+(BH0.x-fx)*k,y:CY+(BH0.y-fy)*k,R:Rh*k};
   {const bl=document.getElementById('bloom'),w=bhScr.R*9,h=bhScr.R*4.4,pulse=Math.pow(Math.max(0,1-(performance.now()/1000-bhPulse)/1.6),1.5);
    const sc=(1+.15*pulse)*(1-.3*bhS);bl.style.width=w*sc+'px';bl.style.height=h*sc+'px';
    bl.style.opacity=Math.min(1,Math.max(1-Math.max(e,eB),eB)*(1-e2)*(.42+.08*Math.sin(performance.now()/700)+.3*pulse)).toFixed(3);
    bl.style.transform=`translate(${bhScr.x-w*sc/2}px,${bhScr.y-h*sc/2}px) rotate(-16deg)`;}
   const bl=document.getElementById('bhl');bl.style.opacity=(1-e)*(1-eB)*(F<0?1:0);bl.classList.add('right');
   bl.style.transform=`translate(${Math.round(bhScr.x-Rh*3.3)}px,${Math.round(bhScr.y+Rh*1.2)}px) translate(-100%,0)`;
   document.getElementById('beltl').style.opacity=0;}
  // moons: in orbit view they ride along with the camera; on the landed planet they get a wider orbit and a bigger, finer grid
  const nowS=performance.now()/1000;
  const raw=MOONS.map((mo,i)=>{
    mo.sl+=(mo.slot-mo.sl)*Math.min(1,dt*4);                 // glide to a new slot when a window is focused
    mo.ang+=dt*(reduce?.1:1)*.5/(1+mo.sl*.5)*(1-.85*e2);
    const P=pos[mo.p],ang=mo.ang+PL[mo.p].moff,foc=mo.p===F,nth=mo.sl;
    const aD=(PL[mo.p].r+(mo.p===2?44:30)+nth*17)*S*(1+.35*sysS);   // flung outward when you spin the system fast
    const A=foc?aD+(RB*(1.38+.24*nth)-aD)*e:aD*k;
    const pa=Math.max(0,Math.min(1,(performance.now()/1000-mpulse[i])/.35)),pulse=pa>0&&pa<1?Math.sin(pa*Math.PI)*.22:0;
    const rad=(foc?mo.rp+(mo.rb-mo.rp)*e:mo.rp*k)*(1+pulse);
    let x=P.x+Math.cos(ang)*A,y=P.y+Math.sin(ang)*A*.38-Math.cos(ang)*A*.06,r2=rad,front=Math.sin(ang)>0||i===mz.i;
    if(mo.st!=='moon'){
      const hole=mo.st==='toHole'||mo.st==='fromHole';mo.t=Math.min(1,mo.t+dt/(hole?2.2:1.3));
      const q=ease(mo.t),bp=beltPt(mo.ba0+nowS*BSP+sysA),H0=bhScr;front=true;
      if(mo.st==='toBelt'){x=mo.sx+(bp.x-mo.sx)*q;y=mo.sy+(bp.y-mo.sy)*q;r2*=1-.45*q;if(mo.t>=1)mo.st='belt';}
      else if(mo.st==='belt'){x=bp.x;y=bp.y;}   // keep its own round pixel size
      else if(mo.st==='fromBelt'){x=bp.x+(x-bp.x)*q;y=bp.y+(y-bp.y)*q;r2*=.55+.45*q;if(mo.t>=1){mo.st='moon';arrived(i);}}
      else if(mo.st==='toHole'){   // spiral in, faster and tighter as it falls
        const d0=Math.hypot(mo.sx-H0.x,mo.sy-H0.y),a0=Math.atan2(mo.sy-H0.y,mo.sx-H0.x),u=mo.t;
        const rr=d0*Math.pow(1-u,1.5),aa=a0+Math.pow(u,3)*Math.PI*1.6;   // falls straight in, curls only once it's close
        x=H0.x+Math.cos(aa)*rr;y=H0.y+Math.sin(aa)*rr;r2*=Math.pow(1-u,.6);
        if(mo.t>=1){mo.st='gone';bhPulse=nowS;}}
      else if(mo.st==='fromHole'){   // unwinds out of the black hole, growing as it heads home
        // starts exactly where it was circling (anchored to the black hole as the camera pulls out) and arcs home
        const u=ease(mo.t),sx=H0.x+mo.ox*H0.R,sy=H0.y+mo.oy*H0.R,sr=mo.or*H0.R;
        const dx=x-sx,dy=y-sy,d=Math.hypot(dx,dy)||1,arc=Math.sin(u*Math.PI)*d*.22;
        x=sx+dx*u-dy/d*arc;y=sy+dy*u+dx/d*arc;r2=sr+(r2-sr)*u;
        if(mo.t>=1){mo.st='moon';arrived(i);}}
      else if(mo.st==='gone'){
        if(eB>0){   // inside the black hole view: swallowed moons circle just outside the disk
          const j=swallowed.indexOf(i),n=Math.max(1,swallowed.length);
          const Rr=Math.min(H0.R*4.6,W/2-Math.min(mo.rb,H0.R*.75)-16);
          const aa=vMoonA+j*6.2832/n;   // carried along smoothly by the disk's spin   // one shared orbit, evenly spaced, so they never bunch up
          const ex=Math.cos(aa)*Rr,ey=Math.sin(aa)*Rr*.36,tl=-.28;x=H0.x+Math.cos(tl)*ex-Math.sin(tl)*ey;y=H0.y+Math.sin(tl)*ex+Math.cos(tl)*ey;
          r2=Math.min(mo.rb,H0.R*.75)*eB;
        } else r2=0;}
    }
    moonS[i]=mo.st==='moon'?0:mo.st==='gone'?2:mo.st==='fromHole'?3+mo.t:1;
    return {x,y,rad:r2,front,foc:foc&&mo.st==='moon',st:mo.st};
  });
  // moon view camera: the opened moon slides to the centre and grows; everything else scales past and fades
  if(e2>0){const TX=NARROW?CX:CX-Math.min(W*.17,250),TY=NARROW?Math.max(RMV+96,H*.3):CY;   // moon slides left (desktop) or up (phone) to make room for the project
    const M=raw[mz.i],RM=RMV,k2=Math.exp(e2*Math.log(RM/M.rad)),mx=M.x+(TX-M.x)*e2,my=M.y+(TY-M.y)*e2;
    const f2x=M.x-(mx-CX)/k2,f2y=M.y-(my-CY)/k2,T=(x,y)=>[CX+(x-f2x)*k2,CY+(y-f2y)*k2];
    pos.forEach((p,i)=>{[p.x,p.y]=T(p.x,p.y);p.r*=k2;plU.set([p.x,p.y,p.r,PL[i].ph],i*4);});
    raw.forEach(q=>{[q.x,q.y]=T(q.x,q.y);q.rad*=k2;});
    mvPos.x=Math.round(raw[mz.i].x*DPR)/DPR;mvPos.y=Math.round(raw[mz.i].y*DPR)/DPR;mvPos.r=raw[mz.i].rad;}
  MOONS.forEach((mo,i)=>{
    const q=raw[i],P=pos[mo.p],foc=q.foc,rad=q.rad,front=q.front;
    const x=Math.round(q.x*DPR)/DPR,y=Math.round(q.y*DPR)/DPR;
    moonU.set([x,y,rad,(front?1:-1)*rad/mo.rp],i*4);
    const hidden=!front&&Math.hypot(x-P.x,y-P.y)<P.r+rad*.6;
    moonPos[i]={x,y,r:rad,foc,vis:q.st==='gone'?bz.target===1&&bz.z===1:q.st==='belt'?F<0&&zoom.z===0&&bz.z===0:q.st==='moon'&&!hidden&&mz.z===0&&(F<0||(foc&&e>.9))};
    const L=islLabs[i];
    L.classList.remove('wipT');
    if(q.st==='gone'&&eB>.5&&e2<.02){   // name tags for swallowed windows
      const fl=x<CX;L.style.opacity=sstep(.6,1,eB)*(front?1:.35);L.classList.toggle('flip',fl);L.firstChild.style.width='10px';
      L.classList.toggle('under',NARROW);if(NARROW){L.classList.remove('flip');const hw=L.offsetWidth/2+8;   // phones: name tag under the moon, kept on screen
        L.style.transform=`translate(${Math.round(Math.min(Math.max(x,hw),W-hw))}px,${Math.round(y+rad+8)}px) translateX(-50%)`;return;}
      L.style.transform=fl?`translate(${Math.round(x-rad-4)}px,${Math.round(y)}px) translate(-100%,-50%)`:`translate(${Math.round(x+rad+4)}px,${Math.round(y)}px) translateY(-50%)`;return;}
    if(!foc||NARROW||e<.6||e2>.02||q.st!=='moon'){L.style.opacity=0;return;}
    L.style.opacity=(hidden?.15:1)*sstep(.6,1,e);
    L.classList.toggle('hot',pickMoon(m.tx,m.ty)===i||cardI===i);
    // label sits outside the planet's edge, with a dashed leader back to the moon
    let flip=x<P.x,edge=Math.max(P.r,Math.abs(x-P.x)+rad)+22,lead=Math.max(14,edge-Math.abs(x-P.x)-rad-4);
    {const tw=L.lastChild.offsetWidth+8,room=flip?x-rad-4-12:W-(x+rad+4)-12;   // keep long names on screen: shorten the leader, then switch sides
     if(lead+tw>room){lead=Math.max(6,room-tw);if(lead+tw>room){L.classList.remove('flip');L.classList.add('under');L.firstChild.style.width='0px';
       const hw=tw/2+4;L.style.transform=`translate(${Math.round(Math.min(Math.max(x,hw+8),W-hw-8))}px,${Math.round(y+rad+8)}px) translateX(-50%)`;return;}}}   // no room beside it: name goes under the moon
    L.classList.remove('under');L.classList.toggle('flip',flip);L.firstChild.style.width=lead+'px';
    L.style.transform=flip?`translate(${x-rad-4}px,${y}px) translate(-100%,-50%)`:`translate(${x+rad+4}px,${y}px) translateY(-50%)`;
  });
    if(wPend>=0){if(zoom.focus!==wPend||zoom.target!==1)wPend=-1;else if(zoom.z>=1){const k=wPend;wPend=-1;enterWorld(k);}}
  {const F2=zoom.focus,on=F2>=0&&zoom.target===1&&zoom.z>=1&&mz.z===0&&mz.target===0&&wz.k<0&&bz.z===0;   // every planet's field notes stream in on their own once you land
   if(on&&factsK!==F2)openFacts(F2);}   // field notes are simply part of a landed planet: no toggle
  // fact sheet: bottom left on desktop, under the planet on phones
  if(factsK>=0){
    factsTick();
    const P=pos[factsK],fw=factsEl.offsetWidth,fh=factsEl.offsetHeight;
    let fx,fy;
    if(NARROW){fx=(W-fw)/2;fy=Math.min(H-fh-48,P.y+P.r+28);}
    else{fx=28;fy=H-fh-44;}                                             // desktop: bottom left, sitting just above the clock
    factsEl.style.transform=`translate(${Math.round(fx)}px,${Math.round(Math.max(56,fy))}px)`;
    if(NARROW){islLabs.forEach(L=>L.style.opacity=Math.min(+L.style.opacity||0,.12));islList.style.opacity=0;}
  }
  // project page beside the opened moon
  {const on=mz.target===1&&mz.i>=0&&e2>.55;
   if(mz.target===1&&mz.i>=0&&projI!==mz.i)fillProj(mz.i);
   if(mz.target===0&&mz.z===0&&projI>=0){projI=-1;}
   projEl.classList.toggle('show',on);
   if(projI>=0){
     if(NARROW){projEl.style.left='22px';projEl.style.right='22px';projEl.style.transform=`translate(0,${Math.round(mvPos.y+mvPos.r+26)}px)`;}
     else{const ph=projEl.offsetHeight;projEl.style.right='';projEl.style.transform=`translate(${Math.round(mvPos.x+mvPos.r+56)}px,${Math.round(mvPos.y-ph/2)}px)`;}}
  }
  // moon view title
  mtitle.style.opacity=e2>.3?0:(eB>.5?(eB-.5)*2:0);
  if(eB>0&&e2<.5){const n=swallowed.length;mtitle.firstChild.textContent='Void';
    mtitle.lastChild.textContent=n?'archive · '+n+(n===1?' project':' projects'):'archive · empty';}
  if(mz.i>=0&&(eB===0||e2>=.5)){const s2=ISL[mz.i];mtitle.firstChild.innerHTML=`${APPN[s2.p]}<sup>${SUP[s2.p]}</sup>`;mtitle.lastChild.textContent=s2.t;}
  // window card: follows its moon, or docks beside the big moon in moon view
  if(cardI>=0&&(zoom.focus>=0||zoom.z>0||bz.z>0))closeCard();   // the window card is an orbit-view (HERE) thing only
  if(cardI>=0){
    typeTick();
    const q=moonPos[cardI],cw=card.offsetWidth,ch=card.offsetHeight,lineH=18;
    const lead=document.getElementById('cLead');lead.style.opacity=1;
    if(NARROW){
      // phones: the readout sits in the clear sky above the system, with a vertical leader down to the moon
      const right=q.x<W/2;card.classList.toggle('flip',!right);
      let cx=right?q.x-6:q.x+6-cw;cx=Math.max(12,Math.min(W-cw-12,cx));
      const cy=Math.max(60,CY-ORB[2][1]*S-ch-34);
      card.style.transform=`translate(${Math.round(cx)}px,${Math.round(cy)}px)`;
      const top=cy+ch+6,bot=q.y-q.r-7;
      lead.style.borderTop='0';lead.style.borderLeft='1px dashed #6b6963';lead.style.width='0';lead.style.height=Math.max(0,bot-top)+'px';
      lead.style.transform=`translate(${Math.round(q.x)}px,${Math.round(top)}px)`;
    } else {
    // readout on whichever side has room; first line level with the moon
    const right=q.x+q.r+22+cw<W-10||q.x<W/2;
    card.classList.toggle('flip',!right);
    let cx=right?q.x+q.r+22:q.x-q.r-22-cw,cy=q.y-lineH/2;
    cx=Math.max(8,Math.min(W-cw-8,cx));cy=Math.max(52,Math.min(H-ch-40,cy));
    card.style.transform=`translate(${Math.round(cx)}px,${Math.round(cy)}px)`;
    const a=right?q.x+q.r+7:cx+cw+4,bx=right?cx-4:q.x-q.r-7;
    lead.style.borderLeft='0';lead.style.borderTop='1px dashed #6b6963';lead.style.height='0';
    lead.style.transform=`translate(${Math.round(Math.min(a,bx))}px,${Math.round(cy+lineH/2)}px)`;lead.style.width=Math.max(0,Math.abs(bx-a))+'px';
    }
    const ret=document.getElementById('ret'),rs=Math.round(q.r*2+10);
    ret.style.opacity=1;ret.style.width=ret.style.height=rs+'px';ret.style.transform=`translate(${Math.round(q.x-rs/2)}px,${Math.round(q.y-rs/2)}px)`;
  }
  // comet
  // comets only fly for real pushes, one at a time, a few seconds apart, and only while you're looking at the whole system
  if(!comet.on){comet.next-=dt;if(comet.next<=0&&F<0&&bz.z===0&&!reduce&&!document.hidden){const pr=nextComet();if(pr)launch(COMET_PLANET,pr);comet.next=pr?5+Math.random()*3:2;}}
  else{
    comet.t+=dt;const u=Math.min(1,comet.t/comet.dur),uu=u*u*(1.6-.6*u);
    const T=pos[comet.k],mx=(comet.sx+T.x)/2,my=(comet.sy+T.y)/2,dx=T.x-comet.sx,dy=T.y-comet.sy;
    const cx=mx-dy*comet.bend,cy=my+dx*comet.bend;
    const hx=(1-uu)*(1-uu)*comet.sx+2*(1-uu)*uu*cx+uu*uu*T.x,hy=(1-uu)*(1-uu)*comet.sy+2*(1-uu)*uu*cy+uu*uu*T.y;
    const tx=2*(1-uu)*(cx-comet.sx)+2*uu*(T.x-cx),ty=2*(1-uu)*(cy-comet.sy)+2*uu*(T.y-cy);
    Object.assign(comet,{hx,hy,ang:Math.atan2(ty,tx)});
    if(u>=1){comet.on=false;impact(comet.k);}
  }
  // moon tooltip
  {let mi=F<0&&zoom.z===0?pickMoon(m.tx,m.ty):-1;if(mi===cardI)mi=-1;
   if(NARROW||cardI>=0||mz.target===1||mz.z>0||bz.target===1||bz.z>0)mi=-1;
   if(mi>=0){const s=ISL[mi],q=moonPos[mi];mtip.firstChild.textContent=s.t;
     const dd=mtip.lastChild;dd.textContent=s.d;dd.className=mi===4&&waiting?'w':'';
     mtip.style.opacity=1;mtip.style.transform=`translate(${q.x+q.r+8}px,${q.y}px) translateY(-50%)`;}
   else mtip.style.opacity=0;}
  hover=F<0?pick(m.tx,m.ty):-1;
  cv.style.cursor=drag.on&&drag.moved?'grabbing':(hover>=0||(wz.k<0&&mz.z===0&&pickCrater(m.tx,m.ty))||(F<0&&pickMoon(m.tx,m.ty)>=0)||(F>=0&&pickIsland(m.tx,m.ty)>=0)||(F>=0&&zoom.z===1&&Math.hypot(m.tx-CX,m.ty-CY)<RB))?'pointer':'grab';
  back.classList.toggle('show',zoom.target===1||bz.target===1);
  document.getElementById('rest').classList.toggle('show',mz.target===1&&mz.i>=0&&MOONS[mz.i].st==='gone'&&mz.z>.6);
  {const t=mz.target===1&&mz.i>=0?(MOONS[mz.i].st==='gone'?'← Back to void':'← Back to '+APPN[ISL[mz.i].p]):'← Back to orbit';if(back.textContent!==t)back.textContent=t;}
  document.getElementById('where').style.opacity=ew>.03?1:1-e*.6;   /* full strength over the bright worlds */

  // ---------- planet worlds ----------
  if(wz.k>=0){
    wz.z=Math.min(1,Math.max(0,wz.z+(wz.target?1:-1)*dt/(curW()==='strata'?1.1:1.8)));
    if(wz.z===0&&wz.target===0){wz.k=-1;wz.mode=null;worldEl.innerHTML='';}
  }
  ew=wz.k>=0?ease(wz.z):0;
  document.body.classList.toggle('inworld',ew>.03);
  if(wz.k>=0){
    const t=curW(),P=pos[wz.k];
    if(wz.target===1){const t2='← Back to '+APPN[wz.k];if(back.textContent!==t2)back.textContent=t2;}
    const kids=[...worldEl.children],wh=worldEl.querySelector('.wh');
    if(wh)wh.style.opacity=wTouched?0:.8*sstep(.85,1,ew);
    if(t==='surface'){   // the planet swells toward you as you fall into it
      const g=1+2.4*ew;P.r*=g;plU[wz.k*4+2]=P.r;
      if(!drag.on||drag.axis!=='y'){camZ+=camV*dt;camV*=Math.exp(-dt*1.8);
        if(monoFly!=null&&!drag.on){camZ+=(monoFly-camZ)*Math.min(1,dt*2.2);if(Math.abs(monoFly-camZ)<.05)monoFly=null;}}   // only when you tapped a monolith: no drifting on its own
      if(!drag.on)yawT*=Math.exp(-dt*.8);
      yaw+=(yawT+Math.sin(simT*.08)*.05-yaw)*Math.min(1,dt*3);
      const cap=worldEl.querySelector('.cap'),nS=now/1000,B=camBasis(nS),bx=monoB();let best=-1,bz2=1e9,bq=null;
      MONO.forEach((i,j)=>{const P=monoPos(j,nS),q=project(B,[P[0],P[1]-bx[1]-.35,P[2]]);if(q&&q.z<bz2&&q.z>4){bz2=q.z;best=j;bq=q;}});
      monoF=best;
      if(cap&&best>=0&&bq){const i=MONO[best],it=MEM[i];if(cap.dataset.i!=i){cap.dataset.i=i;cap.children[0].textContent=it.t;cap.children[1].textContent=it.s;cap.children[2].textContent=it.d;}
        const op=sstep(.9,1,ew)*sstep(5,6.8,bq.z)*(1-sstep(MST()+5,MST()+11,bq.z));   // fully readable all the way in, gone only as the monolith dissolves
        const P=monoPos(best,nS),cw=cap.offsetWidth,ch=cap.offsetHeight,hw=bx[0]*1.8,hh2=hw*2*ch/cw,top=-bx[1]-.22,c=Math.cos(P[3]),sn=Math.sin(P[3]);
        const W3=(lx,ly)=>{const lz=-bx[2];return [P[0]+c*lx-sn*lz,P[1]+ly,P[2]+sn*lx+c*lz];};
        const Q=[W3(-hw,top),W3(hw,top),W3(hw,top-hh2),W3(-hw,top-hh2)].map(v=>project(B,v));
        if(Q.every(Boolean)){const m=quadMatrix(cw,ch,Q);cap.style.transform=m;cap.style.opacity=op.toFixed(3);}else cap.style.opacity=0;}
    }
    if(t==='strata'){
      const L=SL();if(!drag.on){depth+=depthV*dt;depthV*=Math.exp(-dt*3.2);}
      if(depth<0){depth=0;depthV=0;}if(depth>L.max){depth=L.max;depthV=0;}
      const sls=stEls.sl,fcs=stEls.fc,fo=FOS(),lx=NARROW?20:Math.max(28,W*.08),vis=1;
      const revR=ew*Math.max(Math.hypot(revC.x,revC.y),Math.hypot(W-revC.x,revC.y),Math.hypot(revC.x,H-revC.y),Math.hypot(W-revC.x,H-revC.y))*1.02,inRev=(x,y)=>wz.z>.3+.65*((x/W)+.35*(y/H))/1.35;   /* shown once the sweep has fully passed this spot */
      sls.forEach((el,j)=>{const y=L.y0+L.LH*j-depth+(j?44:30);el.style.opacity=(y>-200&&y<H&&vis&&inRev(lx+el.__w/2,y+el.__h/2)?vis:0).toFixed(3);el.__x=Math.round(lx);el.__y=Math.round(y);el.style.transform=`translate(${el.__x}px,${el.__y}px)`;});
      fcs.forEach((el,j)=>{const f=fo[j],y=L.y0+f.y-depth+f.s+12;el.style.opacity=(y>0&&y<H&&vis&&inRev(f.x,y)?vis:0).toFixed(3);el.__x=Math.round(f.x);el.__y=Math.round(y);el.style.transform=`translate(${el.__x}px,${el.__y}px)`;});
    }
    if(t==='gallery'){
      if(!drag.on)galX+=(galT-galX)*Math.min(1,dt*7);
      const gy=NARROW?CY-30:CY-24,gz=ew;
      worldEl.querySelectorAll('.gl').forEach((el,ti)=>{const x=CX+(ti-galX)*(GT_T+GT_G),d=Math.abs(ti-galX);
        el.style.opacity=((1-Math.min(.7,d*.6))*sstep(.85,1,gz)).toFixed(3);el.style.transform=`translate(${Math.round(x)}px,${Math.round(gy+GT_T/2+14)}px) translateX(-50%)`;
        const s2=el.lastChild,i=GT[ti].i,txt=d<.3?(MOONS[i].st==='gone'?'in the archive ↗':MOONS[i].st==='belt'?'still in progress':'tap to open ↗'):'';if(s2.textContent!==txt)s2.textContent=txt;});
    }
  }
  if(crPend&&zoom.focus===crPend.p&&zoom.z>=1&&zoom.target===1){const c=crPend;crPend=null;enterCrater(c);}
  if(wz.k>=0&&curW()==='crater'){crRep+=dt*1.5;if(!drag.on)crYawT+=dt*.05;crYaw+=(crYawT-crYaw)*Math.min(1,dt*4);
    const el=worldEl.querySelector('.imp'),wh=worldEl.querySelector('.wh');const blast=sstep(CR_MT+.1,CR_MT+.9,crRep);   // text arrives with the explosion
    if(el){const op=sstep(.85,1,ew)*blast;el.style.opacity=op.toFixed(3);el.classList.toggle('live',op>.97&&crRep>CR_MT+1.8);}   // links wake once the impact's dust settles
    if(wh)wh.style.opacity=wTouched?0:.8*sstep(.85,1,ew)*blast;
    const tw=(wz.target===1)?'← Back to '+APPN[wz.k]:back.textContent;if(back.textContent!==tw)back.textContent=tw;}
  // hint under the landed planet's name, for planets with a world inside
  {const show=F>=0&&WT[F]&&zoom.z>=1&&zoom.target===1&&wz.k<0&&mz.z===0&&factsK<0;
   lhint.style.opacity=show?.85:0;
   if(F>=0&&WT[F]){if(lhint.dataset.k!=F){lhint.dataset.k=F;lhint.textContent=WHINT[WT[F]];}
     lhint.style.transform=`translate(${Math.round(pos[F].x)}px,${Math.round(pos[F].y-pos[F].r-22)}px) translateX(-50%)`;}}
  gl.useProgram(pr);gl.viewport(0,0,cv.width,cv.height);
  gl.clearColor(.106,.106,.106,1);gl.clear(gl.COLOR_BUFFER_BIT);
  gl.uniform2f(U.u_res,W,H);gl.uniform2f(U.u_c,CX,CY);gl.uniform1f(U.u_dpr,DPR);gl.uniform1f(U.u_t,now/1000);
  gl.uniform1f(U.u_s,S);gl.uniform1f(U.u_rot,ROT);gl.uniform1f(U.u_dot,Math.max(1.5,SP*.52));gl.uniform1f(U.u_pdot,(SPD-1)/DPR);gl.uniform1f(U.u_rb,RB);gl.uniform1f(U.u_spp,SPP);gl.uniform1f(U.u_bdot,(SBD-1)/DPR);
  gl.uniform1f(U.u_ring,ring);gl.uniform1f(U.u_spin,sysA);gl.uniform1f(U.u_sea,1);gl.uniform1f(U.u_e,Math.max(e,eB));bhS+=(Math.min(1,Math.abs(bhSpinV)/5)-bhS)*Math.min(1,dt*2.5);gl.uniform2f(U.u_fl,flX,flY);{const gz=wz.k>=0&&curW()==='gallery'?ew:0;gl.uniform1f(U.u_gz,gz);gl.uniform1f(U.u_wv,ew);gl.uniform1f(U.u_bsp,SPB);
  gl.uniform4f(U.u_gal,galX,GT_T,GT_G,NARROW?CY-30:CY-24);gl.uniform1fv(U.u_gslot,new Float32Array(8).map((_,j)=>GT[j]?slotOf(GT[j].i,GT[j].g):0));}gl.uniform1f(U.u_rmv,RMV);gl.uniform3f(U.u_img,imgSwap.cur,imgSwap.prev,Math.min(1,(performance.now()/1000-imgSwap.t0)/.7));gl.uniform1i(U.u_tex,0);gl.uniform3f(U.u_bhs,bhSpin,bhS,bhSpinV<-.3?-1:1);gl.uniform3f(U.u_bz,eB,k,sstep(.03,.28,eB));gl.uniform1f(U.u_rt,RT);MOONS.forEach((m,i)=>mrb[i]=m.rb);gl.uniform1fv(U.u_mrb,mrb);gl.uniform1f(U.u_bigA,bigA);gl.uniform1f(U.u_foc,F);
  gl.uniform1f(U.u_wait,ISL.findIndex(s=>s.slug==='bytebot'));
  gl.uniform3f(U.u_cam,fx,fy,k);
  gl.uniform2fv(U.u_orb,orbU);gl.uniform4fv(U.u_pl,plU);
  gl.uniform4f(U.u_big,F>=0?pos[F].x:0,F>=0?pos[F].y:0,F>=0?pos[F].r:0,F>=0?PL[F].ph:0);
  gl.uniform4fv(U.u_isl,islU);gl.uniform1fv(U.u_islP,islP);gl.uniform3fv(U.u_L,lU);gl.uniform3f(U.u_sun,sunH,sunA,sunT);grab.hv+=((grab.k>=0?1:0)-grab.hv)*.15;gl.uniform4f(U.u_mv,mvPos.x,mvPos.y,mvPos.r,mz.i);gl.uniform2f(U.u_mv2,e2,mvA);
  {const q=moonPos[ring2.i]||{x:0,y:0,r:0};gl.uniform4f(U.u_mring,q.x,q.y,performance.now()/1000-ring2.t0,q.r);}
  craters.forEach((c,i)=>{crU[i*4+3]=now/1000-(c.ack?Math.min(COOL_AGE,now/1000-c.t):1.5);});   // unseen craters stay red-hot
  gl.uniform2f(U.u_hl,grab.hl,grab.hv);gl.uniform4fv(U.u_moon,moonU);gl.uniform1fv(U.u_moonS,moonS);gl.uniform4f(U.u_bh,bhScr.x,bhScr.y,bhScr.R,Math.max(0,1-(performance.now()/1000-bhPulse)/1.6));gl.uniform4fv(U.u_cr,crU);gl.uniform1fv(U.u_crP,crP);gl.uniform1fv(U.u_act,act);gl.uniform1fv(U.u_moonP,moonP);
  gl.uniform1f(U.u_bhc,BH_CENTER?1:0);{let ck=-1,cd=1e9;PL.forEach((_,k)=>{const q=P0[k];if(k===HIDE_PL||!q||k===zoom.focus)return;const d=Math.hypot(q.x-BH0.x,q.y-BH0.y)-PL[k].r*S;if(d<cd){cd=d;ck=k;}});for(let k=0;k<5;k++)feedW[k]+=((k===ck?1:0)-feedW[k])*Math.min(1,dt*(k===ck?1.2:6));gl.uniform1fv(U.u_feed,feedW);
   for(let k=0;k<5;k++){const q=P0[k];nearW[k]=0;if(!q||k===HIDE_PL||!BH_CENTER)continue;const d=Math.hypot(q.x-BH0.x,q.y-BH0.y);nearW[k]=Math.max(0,Math.min(1,1-(d-PL[k].r*S-BH0.R*1.3)/(BH0.R*8)))*feedW[k];}
   gl.uniform1fv(U.u_near,nearW);}gl.uniform4f(U.u_comet,comet.hx,comet.hy,comet.ang,comet.on?Math.min(1,comet.t*4):0);
  {const T=pos[comet.k];gl.uniform4f(U.u_comet2,T.x,T.y,T.r*.9,0);}
  gl.uniform3f(U.u_m,m.x,m.y,m.s);
  const age=now/1000-ck.t0;gl.uniform4f(U.u_ck,ck.x,ck.y,age,age<1.2&&!reduce?1:0);
  gl.bindVertexArray(vao);
  const fullWorld=wz.k>=0&&curW()!=='gallery'&&ew>=1;
  if(!fullWorld){
    if(MOONS.some(m=>m.st==='fromHole'))gl.drawArrays(gl.POINTS,0,count);   // rare restore animation: everything, as before
    else{gl.drawArrays(gl.POINTS,0,countBase);
      if(bigA>0||eB>0){   /* same gate as before the optimization: these grids only exist once you've landed or entered the void */
      if(bigA>0)gl.drawArrays(gl.POINTS,RG.p[0],RG.p[1]);                     // the landed planet
      MOONS.forEach((mo,i)=>{if((bigA>0&&ISL[i].p===zoom.focus)||moonS[i]>1.5)gl.drawArrays(gl.POINTS,RG.m[i][0],RG.m[i][1]);});
      if(mz.i>=0&&e2>0)gl.drawArrays(gl.POINTS,RG.v[0],RG.v[1]);              // the opened moon
      if(eB>0)gl.drawArrays(gl.POINTS,RG.h[0],RG.h[1]);}}}             // the black hole's own view
  if(wz.k>=0&&curW()==='gallery'&&ew>0)gl.drawArrays(gl.POINTS,galStart,galCount);
  if(wz.k>=0&&curW()!=='gallery'&&ew>0){
    const t=curW(),P=pos[wz.k],L=SL();
    gl.bindFramebuffer(gl.FRAMEBUFFER,wfb);gl.viewport(0,0,wCols,wRows);gl.disable(gl.BLEND);
    gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(wpr);gl.bindVertexArray(wvao);
    gl.uniform2f(WU.w_res,wCols,wRows);gl.uniform2f(WU.w_scr,cv.width,cv.height);gl.uniform1f(WU.w_cell,wCell);gl.uniform1f(WU.w_t,now/1000);gl.uniform1f(WU.w_dpr,DPR);
    gl.uniform1f(WU.w_mode,t==='surface'?1:t==='crater'?5:3);gl.uniform1f(WU.w_fade,t==='strata'?wz.z:sstep(.15,.7,ew));   /* Resume sweeps in and out on a straight clock */   /* Resume leaves on a straight clock: pixels start going the instant you press back */gl.uniform1f(WU.w_e,ew);gl.uniform2f(WU.w_cam,camZ,yaw);
    if(t==='crater'){const c=crSite;gl.uniform3f(WU.w_cr,crRep-(CR_MT-.6),Math.max(.12,1-(now/1000-c.t)/90),c.slot);gl.uniform2f(WU.w_cam,crZoom,crYaw);}
    {const cx=t==='crater'?crSite.sx:P.x,cy=t==='crater'?crSite.sy:P.y;revC.x=cx;revC.y=cy;gl.uniform3f(WU.w_ctr,cx*DPR,cy*DPR,P.r*DPR);}{const cx2=(t==='crater'?crSite.sx:P.x)*DPR,cy2=(t==='crater'?crSite.sy:P.y)*DPR,rm=t==='strata'?1e6:Math.max(Math.hypot(cx2,cy2),Math.hypot(cv.width-cx2,cy2),Math.hypot(cx2,cv.height-cy2),Math.hypot(cv.width-cx2,cv.height-cy2));gl.uniform1f(WU.w_rev,ew*rm*1.02);}   /* just covers the screen at full: leaving starts shrinking at once, no dead time */
    if(t==='surface'){const mv=new Float32Array(32),ms=new Float32Array(8),mvis=new Float32Array(8),nS=now/1000;MONO.slice(0,8).forEach((i,j)=>{const P=monoPos(j,nS);mv.set(P,j*4);ms[j]=MEM_SLOT+i;
        const dz=P[2]-camZ;mvis[j]=dz<=1.2||dz>100?0:Math.min(1,Math.pow((dz-1.2)/5.3,1.5));});gl.uniform1fv(WU.w_monoV,mvis);
      gl.uniform4fv(WU.w_mono,mv);gl.uniform1fv(WU.w_monoS,ms);gl.uniform3f(WU.w_monoB,...monoB());gl.uniform1f(WU.w_mn,Math.min(8,MONO.length));gl.uniform1f(WU.w_mf,monoF);}
    gl.uniform1f(WU.w_y0,L.y0*DPR);gl.uniform3f(WU.w_lbx,(NARROW?20:Math.max(28,W*.08))*DPR,labW*DPR,labH*DPR);gl.uniform1f(WU.w_depth,depth*DPR);
    gl.uniform1fv(WU.w_lay,new Float32Array([0,L.LH,2*L.LH,3*L.LH,4*L.LH,1e7].map(v=>v*DPR)));
    {const fo=FOS(),fv=new Float32Array(16),fsl=new Float32Array(4);fo.forEach((f,j)=>{fv.set([f.x*DPR,f.y*DPR,f.s*DPR,f.s*DPR],j*4);fsl[j]=f.lg;});
     gl.uniform4fv(WU.w_fos,fv);gl.uniform1fv(WU.w_fosS,fsl);}
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(WU.w_atl,0);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,ltex);gl.uniform1i(WU.w_logo,2);if(curW()==='strata')drawGlyphMask();
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,cv.width,cv.height);
    gl.useProgram(bpr);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,wtex);gl.uniform1i(BU.b_tex,1);gl.uniform1f(BU.b_cell,wCell);
    gl.drawArrays(gl.TRIANGLES,0,3);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.enable(gl.BLEND);gl.useProgram(pr);
  }
  requestAnimationFrame(frame);
}
// ---- project image atlas: 4×4 slots of 256px, two per project. Generated placeholder art until real images are given. ----
const ATL=document.createElement('canvas');ATL.width=1024;ATL.height=2048;const ag=ATL.getContext('2d');
const tex=gl.createTexture();
function uploadAtlas(){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,ATL);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
// ---- resume logos: 2×2 slots of 256px (0 ByteBot, 1 Keysight, 2 Studio 2 Stadium), drawn light on black so they dither bright ----
const LOG=document.createElement('canvas');LOG.width=LOG.height=512;const lg2=LOG.getContext('2d');const ltex=gl.createTexture();
function uploadLogos(){if(typeof ag!=='undefined')logosToAtlas();gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,ltex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,LOG);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.activeTexture(gl.TEXTURE0);}
function logoSlot(k,draw){lg2.save();lg2.translate((k%2)*256,Math.floor(k/2)*256);lg2.beginPath();lg2.rect(0,0,256,256);lg2.clip();lg2.fillStyle='#000';lg2.fillRect(0,0,256,256);draw(lg2);lg2.restore();}
lg2.fillStyle='#000';lg2.fillRect(0,0,512,512);
logoSlot(0,g=>{g.textAlign='center';g.textBaseline='middle';g.fillStyle='#f4efe6';   /* stand-in wordmark until the real file loads */
  g.font='600 34px ui-monospace,Menlo,monospace';g.fillText('</>',128,100);g.font='700 46px system-ui,Helvetica,Arial,sans-serif';g.fillText('BYTE BOT',128,160);});
logoSlot(2,()=>{});{const im=new Image();im.onload=()=>{logoSlot(2,g=>g.drawImage(im,0,0,256,256));uploadLogos();};im.src='assets/logos/studio2stadium.png';}   // Studio 2 Stadium's mark
{const im=new Image();im.onload=()=>{logoSlot(3,g=>g.drawImage(im,0,0,256,256));uploadLogos();};im.src='assets/logos/cu-boulder.svg';}   // CU Boulder's interlocking CU
uploadLogos();
// a logo image (any colours, on white or transparent) becomes light-on-black so it dithers as bright marks
function loadLogo(k,src){const im=new Image();im.crossOrigin='anonymous';im.onload=()=>{const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const sc=Math.min(208/im.width,208/im.height);g.fillStyle='#fff';g.fillRect(0,0,256,256);g.drawImage(im,(256-im.width*sc)/2,(256-im.height*sc)/2,im.width*sc,im.height*sc);
  let d;try{d=g.getImageData(0,0,256,256);}catch(e){return;}const p=d.data;
  for(let i=0;i<p.length;i+=4){const a=Math.min(1,(1-Math.min(p[i],p[i+1],p[i+2])/255)*1.3);for(let ch=0;ch<3;ch++)p[i+ch]=(p[i+ch]+(255-p[i+ch])*.5)*a;p[i+3]=255;}
  g.putImageData(d,0,0);logoSlot(k,gg=>gg.drawImage(c,0,0));uploadLogos();};im.src=src;}
{const im=new Image();im.onload=()=>{logoSlot(0,g=>g.drawImage(im,0,0,256,256));uploadLogos();};im.src='assets/logos/bytebot.svg';}   // ByteBot's own mark, stacked
logoSlot(1,()=>{});{const im=new Image();im.onload=()=>{logoSlot(1,g=>g.drawImage(im,0,0,256,256));uploadLogos();};im.src='assets/logos/keysight.png';}
function logosToAtlas(){try{ISL.forEach((it,i)=>{if(it.logo==null)return;const k=it.logo;for(let g=0;g<2;g++){const sl=slotOf(i,g);
  ag.save();ag.translate((sl%4)*256,Math.floor(sl/4)*256);ag.fillStyle='#000';ag.fillRect(0,0,256,256);ag.drawImage(LOG,(k%2)*256,Math.floor(k/2)*256,256,256,38,38,180,180);ag.restore();}});uploadAtlas();}catch(e){}}
function art(g,kind,v){
  g.fillStyle='#050505';g.fillRect(0,0,256,256);
  const R2=n=>{let x=Math.sin(n*91.7+v*13.1)*43758.5;return x-Math.floor(x);};
  const circ=(x,y,r,c)=>{g.fillStyle=c;g.beginPath();g.arc(x,y,r,0,7);g.fill();};
  const rg=(x,y,r,a,b)=>{const q=g.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);q.addColorStop(0,a);q.addColorStop(1,b);return q;};
  if(kind==='waves'){circ(v?70:186,v?150:62,v?40:28,'#fff3d6');
    for(let i=0;i<9;i++){g.beginPath();for(let x=0;x<=256;x+=4){const y=(v?40:80)+i*20+Math.sin(x*.028+i*.8+v*2)*9*(1+i*.18);x?g.lineTo(x,y):g.moveTo(x,y);}
      g.lineTo(256,256);g.lineTo(0,256);g.fillStyle=`rgba(${110+i*12},${150+i*9},${205},.28)`;g.fill();}}
  else if(kind==='grid'){const cs=['#f2efe6','#c9c3b4','#8d877b','#57534b','#e88a4f','#f2c46d'];
    for(let i=0;i<(v?6:12);i++){const x=v?20+(i%3)*76:16+(i%4)*60,y=v?130+Math.floor(i/3)*60:120+Math.floor(i/4)*44;g.fillStyle=cs[(i+v)%cs.length];g.fillRect(x,y,v?64:48,v?48:34);}
    g.fillStyle='#fff';g.font=`600 ${v?70:96}px Georgia,serif`;g.fillText(v?'Ag 12':'Aa',v?18:22,v?92:100);}
  else if(kind==='type'){g.fillStyle='#fff';const w=v?['week 12','the same','trail']:['FIELD','NOTES','no. 3'];
    w.forEach((t,i)=>{g.font=`${i===1?'italic ':''}700 ${[64,52,38][i]}px Georgia,serif`;g.fillText(t,18,76+i*62);});
    g.fillStyle='#e0603a';g.fillRect(18,212,v?160:90,10);}
  else if(kind==='sphere'){g.fillStyle=rg(v?150:128,v?110:118,v?80:92,'#ffffff','#202020');g.beginPath();g.arc(v?150:128,v?110:118,v?80:92,0,7);g.fill();
    const q=g.createLinearGradient(16,0,240,0);q.addColorStop(0,'#000');q.addColorStop(1,'#fff');g.fillStyle=q;g.fillRect(16,v?214:226,224,18);}
  else if(kind==='orbits'){g.strokeStyle='#d8d2c4';g.lineWidth=2;
    for(let i=1;i<6;i++){g.beginPath();g.ellipse(128,128,i*22,i*22*(v?.45:.8),v?-.3:0,0,7);g.stroke();}
    circ(128,128,14,'#fff1d0');for(let i=0;i<40;i++)circ(R2(i)*256,R2(i+50)*256,1+R2(i+9)*2,'#fff');}
  else if(kind==='moon'){circ(128,124,82,'#f4eedf');circ(v?160:96,v?108:112,76,'#050505');
    for(let i=0;i<26;i++)circ(R2(i)*256,R2(i+30)*256,R2(i+3)*1.8+.6,'#fff');}
  else {for(let i=0;i<14;i++){const x=R2(i)*256,y=R2(i+20)*256,r=30+R2(i+40)*60;g.fillStyle=rg(x,y,r,`rgba(255,${180+R2(i)*70|0},${120+R2(i+5)*90|0},.85)`,'rgba(0,0,0,0)');g.fillRect(0,0,256,256);}}
}
ISL.forEach((it,i)=>{for(let k=0;k<2;k++){const sl=slotOf(i,k);ag.save();ag.translate((sl%4)*256,Math.floor(sl/4)*256);ag.beginPath();ag.rect(0,0,256,256);ag.clip();art(ag,it.art,k);ag.restore();}});
// the shard in a PR's crater: a merge glyph (two branches joining)
{const sl=MERGE_SLOT;ag.save();ag.translate((sl%4)*256,Math.floor(sl/4)*256);ag.fillStyle='#050505';ag.fillRect(0,0,256,256);
 ag.strokeStyle='#f4efe6';ag.fillStyle='#f4efe6';ag.lineWidth=16;ag.lineCap='round';
 ag.beginPath();ag.moveTo(92,62);ag.lineTo(92,194);ag.stroke();
 ag.beginPath();ag.moveTo(92,78);ag.bezierCurveTo(92,130,168,110,168,166);ag.stroke();
 for(const [x,y] of [[92,62],[92,194],[168,180]]){ag.beginPath();ag.arc(x,y,20,0,7);ag.fill();}
 ag.fillStyle='#050505';for(const [x,y] of [[92,62],[92,194],[168,180]]){ag.beginPath();ag.arc(x,y,8,0,7);ag.fill();}ag.restore();}
logosToAtlas();MEM.forEach((m,j)=>{const sl=MEM_SLOT+j;ag.save();ag.translate((sl%4)*256,Math.floor(sl/4)*256);ag.beginPath();ag.rect(0,0,256,256);ag.clip();art(ag,m.art,j%2);ag.restore();
  if(m.img){const im=new Image();im.onload=()=>{const sc=Math.max(256/im.width,256/im.height);ag.save();ag.translate((sl%4)*256,Math.floor(sl/4)*256);ag.fillStyle='#000';ag.fillRect(0,0,256,256);ag.drawImage(im,(256-im.width*sc)/2,(256-im.height*sc)/2,im.width*sc,im.height*sc);ag.restore();uploadAtlas();};im.src=m.img;}});
uploadAtlas();
// real images, when given, replace the placeholders (cover-fit into the slot)
ISL.forEach((it,i)=>it.imgs.slice(0,2).forEach((src,k)=>{const im=new Image();im.onload=()=>{const sl=slotOf(i,k),sc=Math.max(256/im.width,256/im.height);
  ag.save();ag.translate((sl%4)*256,Math.floor(sl/4)*256);ag.fillStyle='#000';ag.fillRect(0,0,256,256);
  ag.drawImage(im,(256-im.width*sc)/2,(256-im.height*sc)/2,im.width*sc,im.height*sc);ag.restore();uploadAtlas();};im.src=src;}));
// starting states from the content: archived projects begin in the black hole, works in progress in the belt
ISL.forEach((it,i)=>{const mo=MOONS[i];if(it.status==='archive'){mo.st='gone';swallowed.push(i);}else if(it.status==='wip'){mo.st='belt';mo.ba0=i*1.7;}});
PL.forEach((_,k)=>reslot(k));updCounts();setTimeout(openBySlug,700);
for(const c of loadCraters())craters.push({...c,t:performance.now()/1000-(c.ack?90:0)});syncCraters();startCometFeed();
requestAnimationFrame(frame);
requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.remove('loading')));
