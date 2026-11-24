import PULL from './bh/pull.glsl.js';
// GLSL for every program on the page. VS/FS draw the point sprites (stars, orbits, planets, moons, black hole),
// WVS/WFS render the planet worlds into a low-res buffer, BFS blits that buffer as square pixels.

export const VS = `#version 300 es
precision highp float;
layout(location=0) in vec4 a;   // x, y, kind, extra
layout(location=1) in float b;  // seed / bayer index
uniform vec2 u_res, u_c; uniform float u_spp, u_rb, u_pdot, u_bdot, u_spin, u_sea, u_dpr, u_t, u_s, u_rot, u_dot, u_ring, u_e, u_bigA, u_foc, u_wait;
uniform vec3 u_cam;        // focus x, focus y, scale
uniform vec2 u_orb[5];
uniform vec4 u_pl[5];      // screen x, y, radius, spin phase
uniform vec4 u_big;        // focused planet, high-res grid
uniform vec4 u_moon[12];     // moon centre x, y, radius, depth (+front / -behind)
uniform float u_moonP[12];   // parent planet of each moon
uniform vec4 u_comet;       // head x, y, heading, opacity
uniform vec4 u_comet2;      // target planet x, y, radius
uniform vec4 u_gal;         // gallery: centre tile index, tile size, gap, centre y
uniform float u_gz, u_wv, u_bsp;   // gallery progress, any-world fade, landed grid spacing
uniform float u_gslot[8];
uniform sampler2D u_tex;     // 4×4 atlas of project images
uniform vec3 u_img;         // current slot, previous slot, swap amount
uniform float u_rmv;        // moon radius in the moon view
uniform vec2 u_fl;          // orbit plane squash while you spin the system (x, y)
uniform vec3 u_sun;         // hover amount, cursor angle from the sun, sun clock
uniform vec4 u_mv;          // moon view: x, y, radius, which moon
uniform vec2 u_mv2;         // moon-view zoom amount, dissolve amount
uniform vec3 u_bhs;         // black hole spin: accumulated angle, speed (0..1)
uniform vec3 u_bz;          // black-hole view amount, camera scale, fine-grid swap
uniform float u_rt;         // black hole radius in the black-hole view
uniform float u_mrb[12];     // each moon's fine-grid radius
uniform float u_bhc; uniform float u_feed[5]; uniform float u_near[5];   // pull on each planet, worked out in orbit space so it survives zooming in   // which planet the hole is feeding on (eased, so the hand-off is smooth)
      // 1 when the black hole sits at the centre instead of the sun
uniform vec4 u_bh;          // black hole: screen x, y, horizon radius, swallow pulse
uniform float u_moonS[12];   // 1 while a moon is away from its planet (belt, black hole, in transit)
uniform vec4 u_mring;       // moon click ring: x, y, age, radius
uniform vec2 u_hl;          // highlighted orbit while carrying a planet, strength
uniform vec4 u_cr[6];       // craters: body-space direction, birth time
uniform float u_crP[6];
uniform float u_act[5];     // activity per planet (drives the weather)
uniform vec3 u_L[5];        // direction to the sun, per planet, in view space
uniform vec4 u_isl[6];     // island direction xyz, angular radius
uniform float u_islP[6];   // which planet each island is on
uniform vec3 u_m;          // mouse x, y, strength
uniform vec4 u_ck;         // click x, y, age, on
out vec4 v;

float h(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float nz(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);
  return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z);}
float rnd(float s){return fract(sin(s*91.7)*43758.5);}
vec2 cam(vec2 p){return u_c+(p-u_cam.xy)*u_cam.z;}
vec2 orbit(int i,float th){vec2 e=vec2(u_orb[i].x*cos(th)*u_fl.x,u_orb[i].y*sin(th)*u_fl.y)*u_s;
  float c=cos(u_rot),s=sin(u_rot);return u_c+vec2(c*e.x-s*e.y,s*e.x+c*e.y);}

// planet surface: islands (one per window) on a sparse sea, lit from the upper left, ordered dither
// black hole, seen from slightly above: a tilted, swirling accretion disk; its far half hides behind the dark horizon, its near half crosses in front
float bhI(vec2 q,bool big){
  float s=u_bhs.y; q/=1.-.3*s;                                         // spinning: the whole thing pulls in, the hole shrinks
  float tl=.28, cx=cos(tl)*q.x-sin(tl)*q.y, cy=sin(tl)*q.x+cos(tl)*q.y;   // undo the tilt
  vec2 d=vec2(cx,cy/.3); float rd=length(d), th=atan(d.y,d.x), r=length(q);
  float rg=rd;   // on-screen radius: grooves are spaced by this, so they stay distinct while the disk tightens
  rd=1.25+max(rd-1.25,0.)*(1.+.6*s)+min(rd-1.25,0.);                 // and the disk narrows into a tight band
  float I=0.;
  float ro=3.;
  if(rd>1.25&&rd<ro){
    bool far=d.y<0.;
    if(!(far&&r<1.03)){
      float ph=th-(u_t*1.7+u_bhs.x*2.2)/pow(rd,1.5);                   // inner rings turn faster; dragging spins it up
      float sw=nz(vec3(cos(ph)*rd*1.8,sin(ph)*rd*1.8,rd*2.5))*.6+nz(vec3(cos(ph*2.)*rd*4.,sin(ph*2.)*rd*4.,1.))*.4;
      sw=smoothstep(.25,.8,sw);                                        // high-contrast streaks so the spin reads clearly
      {float band=floor(rg*15./6.2832+.25), arcs=1.+step(.5,fract(band*.618));   // at speed the streaks settle into grooves...
       float a=fract(ph*arcs/6.2832+fract(band*.7548));                 // ...that are bright at the head and taper off behind it,
       if(u_bhs.z<0.)a=1.-a;                                            // tail always trails the way it's turning
       float tail=.12+.88*pow(a,1.8);                                    // so each ring reads as a streak racing round
       float gr=smoothstep(.3,.7,.5+.5*sin(rg*15.));                    // crisper groove edges
       sw=mix(sw*mix(.55,1.,gr),gr*tail,.65+.25*s);}                    // the tapered streaks stay at rest too; spinning just sharpens them                            // grooves show through even at rest, so the rings read
      float heat=1.-smoothstep(1.35,ro,rd)*.85, dop=.78+.22*cos(th);        // the side coming toward you is brighter
      I=heat*dop*(.38+1.15*sw)*(1.55+.25*s)*smoothstep(1.25,1.4,rd)*smoothstep(ro,ro-.4,rd);   // a crisper outer edge
    }
  }
  I=max(I,exp(-pow((r-1.1)/(big?.045:.055),2.))*(1.+.25*sin(u_t*4.)));   // photon ring, breathing
  float halo=(.13*exp(-pow((rd-2.1)/.8,2.))*smoothstep(3.3,2.7,rd)+.12*exp(-pow((r-1.2)/.17,2.))*step(1.,r))*(1.+.4*u_bh.w);   // less glow bleeding past the disk
  I=max(I,halo*(big?1.:.55)*(.8+.4*sin(u_t*1.3))*step(1.03,r));                    // never inside the shadow                                   // dithered glow hugging the disk
  float sh=1.-u_bh.w; I=max(I,exp(-pow((rd-1.3-sh*2.1)/(big?.06:.12),2.))*u_bh.w*.55);   // shockwave when it swallows or lets go        // photon ring hugging the horizon
  return I<.08?0.:I;
}
float g_hot, g_city;
// fine grids keep a fixed pixel pitch: things grow or shrink by revealing pixels, never by stretching the spacing (stretching is what drew the criss-cross seams)
float gPitch(){return u_bdot+1./u_dpr;}
vec2 gSnap(vec2 c){float sz=max(1.,floor(u_bdot*u_dpr+.5));return floor(c*u_dpr+.5)/u_dpr+mod(sz,2.)*.5/u_dpr;}
float bay2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float bay4(vec2 a){return bay2(.5*a)*.25+bay2(a);}
float bay8(vec2 a){return bay4(.5*a)*.25+bay2(a);}   // set by surf(): how much this pixel is a fresh, still-glowing crater
float surf(vec2 q,int k,float ph,float bi,float seaK,out float ring,out float lit){
  float z=sqrt(max(0.,1.-dot(q,q))); vec3 n=vec3(q,z);
  float cs=cos(ph),sn=sin(ph);
  vec3 r=vec3(cs*n.x+sn*n.z,n.y,-sn*n.x+cs*n.z);
  float tex=nz(r*3.+float(k)*7.)*.6+nz(r*8.+3.)*.4;
  float m=0.; ring=0.;
  for(int i=0;i<6;i++){
    if(int(u_islP[i]+.5)!=k) continue;
    vec4 I=u_isl[i]; if(I.w<=0.) continue;
    float d=acos(clamp(dot(r,I.xyz),-1.,1.));
    float edge=I.w*(.72+.55*nz(r*4.5+float(i)*5.1));
    m=max(m,smoothstep(edge,edge*.78,d));
    if(abs(float(i)-u_wait)<.5) ring=max(ring,1.-step(.032,abs(d-I.w*1.3)));
  }
  vec3 L=u_L[k]; float dif=max(dot(n,L),0.);
  float edge=pow(1.-z,4.)*.1+.13*(1.-dif)*(.7+.6*tex);   // limb + soft night-side glow   // faint limb so the night side still reads as round
  float rim=smoothstep(.0,.35,z);
  // slow-drifting darker terrain so the spin is visible without being busy
  float mare=smoothstep(.5,.72,nz(r*2.1+float(k)*11.))*.42+smoothstep(.62,.8,nz(r*5.+float(k)*3.))*.18;
  float base=(pow(dif,1.4)*1.35*(1.-mare)+.12*(tex-.5)*dif)*mix(.6,1.,rim)+edge;
  float sea=base*seaK;
  float land=(pow(dif,1.15)*1.05+.1+.3*(tex-.5)*dif)*mix(.6,1.,rim)+edge;
  lit=mix(sea,land,m*(1.2-seaK));
  // activity weather: bright churn drifting on its own, faster and denser the busier the app; reads mostly on the night side
  float act=u_act[k];
  float wx=smoothstep(.58,.8,nz(r*3.4+vec3(u_t*.18*act,0.,u_t*.11*act)+float(k)*5.));
  lit+=wx*act*.38*(1.-.6*dif)*rim;
  // carbon life: on Starlee's night side, clusters of warm lights twinkle like cities, denser the busier it is
  g_city=0.;
  if(k==3){
    float night=1.-smoothstep(.03,.3,dif);
    float cl=smoothstep(.55,.75,nz(r*6.+3.))*smoothstep(.3,.62,nz(r*19.+9.));
    float tw=.8+.2*sin(u_t*2.6+dot(r,vec3(41.,23.,57.))*3.);
    g_city=step(bi*.75+.18,cl*mix(.62,1.,night)*tw*(.75+.5*act)*rim);
  }
  // notification craters: dark floor, bright rim, red-hot for the first few seconds
  g_hot=0.;
  for(int i=0;i<6;i++){
    if(int(u_crP[i]+.5)!=k) continue;
    vec4 C=u_cr[i]; float age=u_t-C.w; if(age<0.||age>60.) continue;
    float life=1.-smoothstep(35.,60.,age);
    float d=acos(clamp(dot(r,C.xyz),-1.,1.)), R=.15;
    float floorM=1.-smoothstep(R*.75,R,d), rimM=(1.-smoothstep(0.,.05,abs(d-R*1.1)));
    lit=mix(lit,lit*.2,floorM*life); lit+=rimM*.45*life;
    g_hot=max(g_hot,(floorM+rimM)*(1.-smoothstep(1.,5.,age)));
  }
  return lit-bi;
}

void main(){
  int kind=int(a.z+.5);
  vec2 p; float size=u_dot, alpha=.8, push=0.; vec3 col=vec3(.91,.89,.84);
  bool show=true;

  if(kind==0){                                   // stars, slight parallax on zoom
    p=u_c+(a.xy*u_res-u_c)*(1.+.25*u_e); size=1.2+a.w*1.1;
    alpha=.25+.45*a.w*(.75+.25*sin(u_t*.9+b*40.));
    {vec2 d=p-u_bh.xy;float l=length(d)+1e-3,Rh=u_bh.z*max(1.-u_e,u_bz.x);
     if(l<Rh*1.2) show=false; p+=d/l*min(Rh*Rh*2.5/l,Rh*1.6);}   // gravitational lensing
  } else if(kind==1){                            // orbit dots
    int oi=int(a.x+.5); p=cam(orbit(oi,a.y+u_spin)+(vec2(rnd(b),rnd(b+3.))-.5)*.9*u_s);
    alpha=.9*(1.-u_e); size=u_dot*.85;
    if(abs(float(oi)-u_hl.x)<.5){alpha=mix(alpha,1.,u_hl.y);size*=1.+.35*u_hl.y;col=mix(col,vec3(1.),u_hl.y);}
    else alpha*=1.-.45*u_hl.y;
    for(int k=0;k<5;k++){float r=u_pl[k].z*(k==2?1.45:1.15);if(distance(p,u_pl[k].xy)<r)show=false;}
  } else if(kind==2){                            // planets in the orbit view
    int k=int(a.w+.5); vec4 P=u_pl[k]; float ring,lit;
    bool rim=false;
    if(surf(a.xy,k,P.w,b,1.,ring,lit)<0.&&g_city<.5){float lr=smoothstep(.7,1.,length(a.xy));if(h(vec3(a.xy*31.,8.))<lr*.65)rim=true;else show=false;}   // the dark side keeps a faint outline, so the planet stays round
    push=1.; p=P.xy+a.xy*P.z;
    for(int j=0;j<12;j++){vec4 M=u_moon[j];if(M.w>0.&&u_moonS[j]<.5&&int(u_moonP[j]+.5)==k&&distance(p,M.xy)<M.z+u_spp*.8)show=false;} size=min(u_pdot+(u_cam.z-1.)*u_spp,64.); col=vec3(.96,.94,.9)*mix(.78,1.04,clamp(lit,0.,1.)); col=mix(col,vec3(1.,.38,.16),g_hot); if(g_city>.5)col=vec3(1.,.8,.42);
    if(rim)col*=mix(.26,.44,smoothstep(.7,1.,length(a.xy)));   // lighter at the very edge, fading in toward the middle
    if(abs(float(k)-u_foc)<.5){alpha=1.;if(h(vec3(a.xy*97.,1.))<max(u_bigA,u_mv2.x*3.))show=false;}
    else alpha=1.-u_e;
    vec2 dv=u_bh.xy-P.xy; float dl=max(length(dv),1.);
    float near=u_bhc>.5?u_near[k]:0.;   // only the closest planet, more the closer it is
    if(near>.02){                                     // stretched toward the hole, its near side bleeding off in a stream
      vec2 dn=dv/dl, pr=vec2(-dn.y,dn.x);
      float along=dot(a.xy,dn), perp=dot(a.xy,pr), tide=.09*near;
      p=P.xy+(dn*along*(1.+tide)+pr*perp*(1.-tide*.45))*P.z;
      float hs=h(vec3(a.xy*53.,3.));
      if(hs<.14){                               // a fixed set of pixels feeds the stream; how close the planet is only sets how bright it is, so nothing snaps back
        float t=fract(u_t*.16+hs*7.3);
        vec2 st=P.xy+(dn*(1.+tide)+pr*perp*.6)*P.z, tg=u_bh.xy+pr*u_bh.z*1.3, md=mix(st,tg,.5)+pr*dl*.32;
        p=mix(mix(st,md,t),mix(md,tg,t),t); alpha*=(1.-t*t)*smoothstep(.02,.6,near); col=mix(col,vec3(1.,.62,.3),smoothstep(.1,.8,t)); size=u_pdot; push=0.;}
    }
  } else if(kind==3){                            // discord "waiting" ring
    vec4 P=u_pl[2]; p=P.xy+a.xy*P.z; size=min(u_pdot+(u_cam.z-1.)*u_spp,64.);
    if(a.w<.5){col=vec3(1.,.31,.13);alpha=(.9+.1*sin(u_t*3.))*u_ring;}
    else{alpha=.85*u_ring;if(b<.5+.5*sin(u_t*2.+a.x*9.)*.3)show=false;}
    alpha*=max(0.,1.-u_e*4.);   // the ring gets out of the way early when zooming in
  } else if(kind==4){                            // sun swirl
    vec2 sc=cam(u_c); float rs=19.*u_s; col=vec3(1.,.88,.68);   // warm amber core
    float d=length(a.xy), I;
    if(a.w>.5){                                   // streaming pixels
      float life=fract(a.y+u_sun.z*.07), ang=a.x+u_spin+u_sun.z*.05;
      // on hover, pixels bend toward the cursor as they drift out and reach a little further that way
      float dA=atan(sin(u_sun.y-ang),cos(u_sun.y-ang));
      ang+=dA*u_sun.x*.55*life;
      float tw=pow(max(0.,cos(dA)),4.)*u_sun.x;
      float flick=nz(vec3(cos(ang)*3.,sin(ang)*3.,u_sun.z*.8));
      float rf=1.55+life*life*(1.6+1.1*tw)+flick*.2;
      vec2 off=vec2(cos(ang),sin(ang))*rs*rf;
      p=sc+floor(off/u_spp+.5)*u_spp; size=u_pdot; alpha=1.; col=mix(vec3(.78,.36,.22),vec3(1.,.74,.5),(1.-life)*(.4+.6*flick))*mix(.45,1.,1.-life);   // cools from orange to ember red as it drifts
      if((1.-life)*(.5+.8*flick)<b*.9) show=false;
    } else {
    if(d<=1.){                                    // core: solid, with slow granulation
      float g=nz(vec3(a.xy*3.,u_sun.z*.35));
      I=1.25-.45*smoothstep(.55,.8,g)*(1.+.6*u_sun.x)-.3*pow(d,6.);
      // hover: the hot spot slides toward the cursor, the far side thins out, and soft pulses ripple outward
      vec2 hc=.28*u_sun.x*vec2(cos(u_sun.y),sin(u_sun.y));
      float hd=length(a.xy-hc);
      I-=.42*u_sun.x*smoothstep(.35,1.25,hd);
      float rp=fract(u_sun.z*.7);
      I-=.6*u_sun.x*(1.-rp)*(1.-smoothstep(0.,.08,abs(hd-rp*1.2)));
      col=mix(col,vec3(1.,.95,.78),u_sun.x*(1.-smoothstep(0.,.6,hd)));
    } else {                                      // corona: dithered glow with rays drifting outward
      float ang=atan(a.y,a.x)+u_spin;
      float ray=nz(vec3(cos(ang)*2.2,sin(ang)*2.2,d*1.6-u_t*.35));
      float px=u_spp/rs;                          // one grid pixel, in sun radii
      float fall=pow(max(0.,1.-(d-1.)/.75),1.8);
      I=fall*(.3+.8*ray);
      float gw=1.6+1.1*u_sun.x;                   // hover: the ring lifts off by a pixel and brightens
      if(d<1.+gw*px) I=0.;                        // thin dark gap
      else if(d<1.+(gw+1.2)*px){I=.7+.3*ray+.35*u_sun.x;col=mix(vec3(1.,.68,.42),vec3(1.,.8,.56),u_sun.x);} // slight ring hugging the core
      else{I*=.8;col=vec3(.95,.62,.4);}
    }
    if(I<b) show=false;
    p=sc+a.xy*rs; size=u_pdot; alpha=1.;
    }
    alpha*=1.-u_e;
  } else if(kind==6){                            // moons: one per window, lit like their planet
    int mi=int(a.w+.5); vec4 M=u_moon[mi]; int pk=int(u_moonP[mi]+.5);
    float z=sqrt(max(0.,1.-dot(a.xy,a.xy))); vec3 n=vec3(a.xy,z);
    float dif=max(dot(n,u_L[pk]),0.);
    // too small to dither cleanly: keep every pixel so the outline stays round, shade with brightness instead
    float I=clamp(pow(dif,1.1)*1.2+.12,0.,1.);
    col*=mix(.22,1.05,I);
        p=M.xy+a.xy*M.z; size=min(u_pdot+(abs(M.w)-1.)*u_spp,64.);   // no scatter, so moons stay easy to hover
    bool det=u_moonS[mi]>.5; if(M.z<.01) show=false;
    if(!det&&abs(float(pk)-u_foc)<.5){alpha=1.;if(h(vec3(a.xy*97.,3.+float(mi)))<u_bigA)show=false;} else alpha=1.-u_e;
    if(!det&&M.w<0.&&distance(p,u_pl[pk].xy)<u_pl[pk].z*1.04) show=false;   // tucked behind its planet
    if(u_moonS[mi]>.5&&u_moonS[mi]<1.5&&u_e<.5){col=mix(col,vec3(1.,.72,.38),.75);col*=.85+.25*sin(u_t*2.2+float(mi));}
    if(u_moonS[mi]>2.9){alpha=1.;if(h(vec3(a.xy*97.,3.+float(mi)))>=smoothstep(.82,1.,u_moonS[mi]-3.))show=false;}
    else if(u_moonS[mi]>1.5){alpha=u_bz.x;if(h(vec3(a.xy*97.,3.+float(mi)))<u_bz.z)show=false;}   // swallowed: only seen inside the black hole view
    if(abs(float(mi)-u_wait)<.5) col=mix(col,vec3(1.,.36,.16)*max(col.r,max(col.g,col.b))*1.05,u_ring);   // the waiting window glows red
  } else if(kind==7){                            // comet: a head and a tail of grid pixels
    float i=a.x; vec2 dir=vec2(cos(u_comet.z),sin(u_comet.z));
    float fl=rnd(b+floor(u_t*12.));
    vec2 off=-dir*i*u_spp*1.5+vec2(-dir.y,dir.x)*(fl-.5)*i*.32*u_spp;
    p=floor((u_comet.xy+off)/u_spp+.5)*u_spp;
    float fade=i/42.;
    if(u_comet.w<=0.||rnd(b+1.7+floor(u_t*8.)*.13)<fade*1.05||distance(p,u_comet2.xy)<u_comet2.z) show=false;
    col=mix(vec3(1.,.97,.9),vec3(1.,.31,.13),smoothstep(.05,.55,fade))*mix(1.,.55,fade);
    size=u_pdot*(i<1.5?1.7:1.); alpha=u_comet.w*(1.-u_e);
  } else if(kind==13){                           // black hole on the pixel grid: small in orbit view, fine in the black-hole view
    bool big=a.w>.5; vec2 q=a.xy; float I=bhI(q,big); if(I>0.)I+=u_bh.w*.12;
    if(I<b) show=false;
    // impact: the disk's pixels physically react. A ripple runs outward through the disk plane,
    // the inner disk twists inward, and loose pixels shimmer as they get pulled
    float w=u_bh.w; push=big?1.:.6;
    if(w>0.){
      float tl=.28, cx=cos(tl)*q.x-sin(tl)*q.y, cy=(sin(tl)*q.x+cos(tl)*q.y)/.3;
      float rd=max(length(vec2(cx,cy)),.01), wr=1.25+(1.-w)*2.4;
      float rip=sin((rd-wr)*7.)*exp(-pow((rd-wr)/.4,2.))*w*.32;                 // ripple, in disk radii
      float tw=w*w*1.1/pow(rd,1.6);                                             // twist, strongest near the hole
      vec2 dd=vec2(cx,cy)/rd*(rd+rip);
      float ca=cos(tw),sa=sin(tw); dd=vec2(ca*dd.x-sa*dd.y,sa*dd.x+ca*dd.y);
      dd.y*=.3; q=vec2(cos(-tl)*dd.x-sin(-tl)*dd.y,sin(-tl)*dd.x+cos(-tl)*dd.y);
      if(I>0.&&h(vec3(a.xy*53.,floor(u_t*18.)))<w*.3) show=false;               // shimmer
    }
    p=u_bh.xy+q*u_bh.z;
    if(big){ if(h(vec3(q*31.,5.))>=u_bz.z) show=false; size=max(u_bdot*u_bh.z/u_rt,.5); alpha=1.-u_mv2.x; }
    else { if(h(vec3(q*31.,6.))<u_bz.z) show=false; size=min(u_pdot+(u_bz.y-1.)*u_spp,64.); alpha=max(1.-u_e,u_bz.x); }
    {float c=clamp(I*.72+u_bh.w*.06,0.,1.);col=c<.5?mix(vec3(.95,.34,.08),vec3(1.,.66,.24),c*2.):mix(vec3(1.,.66,.24),vec3(1.,.97,.86),c*2.-1.);}
  } else if(kind==12){                           // asteroid belt between the 4th and 5th orbits
    float rf=a.y, th=a.x+u_t*.05/pow(rf,1.5)+u_spin;
    vec2 e=vec2(cos(th)*u_fl.x,sin(th)*.4015*u_fl.y)*600.*u_s*rf; float c=cos(u_rot),sn=sin(u_rot);
    p=cam(u_c+vec2(c*e.x-sn*e.y,sn*e.x+c*e.y));
    size=u_pdot*.8; col=vec3(.62,.59,.54)*(.55+.45*b); alpha=.38*(1.-u_e);   // faint, so minimized moons stand out
    for(int k=0;k<5;k++){if(distance(p,u_pl[k].xy)<u_pl[k].z*1.08)show=false;}
  } else if(kind==8){                            // landed: the focused planet's moons, dithered like a planet
    int mi=int(a.w+.5); vec4 M=u_moon[mi]; int pk=int(u_moonP[mi]+.5);
    bool fly=u_moonS[mi]>2.9, gone=u_moonS[mi]>1.5&&!fly;
    if(fly){if(h(vec3(a.xy*97.,4.+float(mi)))<smoothstep(.82,1.,u_moonS[mi]-3.)) show=false;}
    else if(gone){if(h(vec3(a.xy*97.,4.+float(mi)))>=u_bz.z) show=false;}
    else if(abs(float(pk)-u_foc)>.5||h(vec3(a.xy*97.,4.+float(mi)))>=u_bigA||u_moonS[mi]>.5) show=false;
    bool open_=abs(float(mi)-u_mv.w)<.5;
    if(open_&&h(vec3(a.xy*97.,6.))<u_mv2.y) show=false;
    vec2 a2=a.xy, gq=a.xy*M.z; bool fixedP=!fly;
    if(fixedP){float pt=gPitch();gq=floor(a.xy*u_mrb[mi]/pt+.5)*pt;a2=gq/clamp(M.z,1.,u_mrb[mi]);if(dot(a2,a2)>1.)show=false;}
    float z=sqrt(max(0.,1.-dot(a2,a2))); vec3 n=vec3(a2,z);
    float dif=max(dot(n,u_L[pk]),0.);
    float I=pow(dif,1.3)*1.35+.13*(1.-dif)+pow(1.-z,4.)*.12;
    if(I<b) show=false;
    p=fixedP?gSnap(M.xy)+gq:M.xy+a.xy*M.z; size=fly?max(u_bdot*M.z/u_mrb[mi],.5):u_bdot; alpha=gone||fly||open_?1.:(1.-u_mv2.x)*(1.-u_wv);
    if(!gone&&!fly&&!open_&&M.w<0.&&distance(p,u_pl[pk].xy)<u_pl[pk].z*1.01) show=false;
    if(abs(float(mi)-u_wait)<.5) col=mix(col,vec3(1.,.36,.16)*max(col.r,max(col.g,col.b))*1.05,u_ring);
  } else if(kind==9){                            // ripple ring when you click a moon
    float ang=a.x*6.2832/64.; float age=u_mring.z;
    float rr=u_mring.w*1.25+age*70.;
    p=floor((u_mring.xy+vec2(cos(ang),sin(ang))*rr)/u_spp+.5)*u_spp;
    if(age>.8||rnd(b+floor(age*20.))<age*1.25) show=false;
    size=u_pdot; alpha=1.-u_e*0.;
  } else if(kind==10){                           // moon view: the opened moon, full size
    int mi=int(u_mv.w+.5); int pk=int(u_moonP[mi]+.5);
    if(u_mv.w<0.||h(vec3(a.xy*97.,7.))>=u_mv2.y) show=false;
    float pt=gPitch(); vec2 gq=floor(a.xy*u_rmv/pt+.5)*pt, a2=gq/clamp(u_mv.z,1.,u_rmv); if(dot(a2,a2)>1.) show=false;
    float z=sqrt(max(0.,1.-dot(a2,a2))); vec3 n=vec3(a2,z);
    // the project's image, wrapped over the moon's face (arcsine mapping makes it bulge like a sphere), then dithered
    vec2 uv=asin(clamp(a2,-.999,.999))/1.5708*.5+.5;
    float sl=h(vec3(a.xy*61.,9.))<u_img.z?u_img.x:u_img.y;
    vec4 tx=textureLod(u_tex,(vec2(mod(sl,4.),floor(sl/4.))+clamp(uv,.004,.996))/vec2(4.,8.),0.);
    float lum=dot(tx.rgb,vec3(.3,.59,.11));
    float dif=max(dot(n,normalize(vec3(-.35,-.4,.85))),0.);
    float I=lum*(.6+.55*dif)*mix(.5,1.,smoothstep(0.,.3,z))+.035+pow(1.-z,4.)*.12;
    if(I<b) show=false;
    push=1.; p=gSnap(u_mv.xy)+gq; size=u_bdot; alpha=1.;
    col=mix(vec3(.96,.94,.9),tx.rgb*1.05+.1,.38)*mix(.78,1.05,clamp(I,0.,1.));
    if(abs(float(mi)-u_wait)<.5) col=mix(col,vec3(1.,.36,.16)*max(col.r,max(col.g,col.b))*1.05,u_ring);
  } else if(kind==14){                           // Work's gallery: planet pixels stream out and rebuild as dithered project images
    int ti=int(a.w+.5); vec2 uv=a.xy; float sd=a.x*71.3+a.y*37.9+a.w*5.1;
    // where it starts: a cell of the landed planet, lit exactly like the planet
    float rr=sqrt(rnd(sd)), an=rnd(sd+3.)*6.2832; vec2 q=vec2(cos(an),sin(an))*rr*.985;
    float pt=gPitch(), Rb=clamp(u_big.z,1.,u_rb); vec2 cl=floor(q*Rb/pt+.5); q=cl*pt/Rb;   // starts exactly on a pixel of the planet you're looking at
    float ring,lit; bool srcOn=surf(q,int(u_foc+.5),u_big.w,bay8(cl),u_sea,ring,lit)>=0.;
    vec2 src=gSnap(u_big.xy)+cl*pt;
    // where it ends: its spot in a tile of the gallery strip
    float T=u_gal.y; vec2 dst=vec2(u_c.x+(float(ti)-u_gal.x)*(T+u_gal.z)+(uv.x-.5)*T, u_gal.w+(uv.y-.5)*T);
    float sl=u_gslot[ti]; vec4 tx=textureLod(u_tex,(vec2(mod(sl,4.),floor(sl/4.))+clamp(uv,.003,.997))/vec2(4.,8.),0.);
    float lum=dot(tx.rgb,vec3(.3,.59,.11)); bool dstOn=lum*1.12+.035>b;
    float dl=rnd(sd+7.)*.42, tt=clamp((u_gz-dl)/.58,0.,1.), ee=tt*tt*(3.-2.*tt);
    vec2 dv=dst-src; p=mix(src,dst,ee)+vec2(-dv.y,dv.x)*sin(ee*3.1416)*.22*(rnd(sd+9.)-.35);   // each pixel arcs on its own path
    show=(ee<.5?srcOn&&tt>0.:dstOn)&&u_gz>0.;   // until it actually leaves, the planet's own pixel stands in for it (no extra layer on top)
    col=ee<.5?vec3(.96,.94,.9)*mix(.72,1.04,clamp(lit,0.,1.)):mix(vec3(.96,.94,.9),tx.rgb*1.05+.1,.35)*mix(.78,1.05,clamp(lum,0.,1.));
    size=u_bdot; alpha=1.; push=1.;
    if(p.x<-40.||p.x>u_res.x+40.) show=false;
  } else {                                       // focused planet, dense grid
    int k=int(u_foc+.5); float ring,lit;
    float pt=gPitch(); vec2 gq=floor(a.xy*u_rb/pt+.5)*pt; float Rb=clamp(u_big.z,1.,u_rb); vec2 a2=gq/Rb;
    bool spare=dot(a2,a2)>1.;   // grid pixels just outside the planet: free to become the stream, so the surface never gets holes
    if(spare) show=false;
    else if(u_foc<0.||surf(a2,k,u_big.w,b,u_sea,ring,lit)<0.&&ring<.5&&g_city<.5) show=false;
    push=1.; p=gSnap(u_big.xy)+gq;
    if(u_mv2.x>.01&&h(vec3(a.xy*97.,8.))<u_mv2.x*2.2) show=false;
    for(int j=0;j<12;j++){vec4 M=u_moon[j];if(M.w>0.&&u_moonS[j]<.5&&abs(u_moonP[j]-u_foc)<.5&&distance(p,M.xy)<M.z+u_spp*1.5)show=false;}   // a moon in front hides the planet behind it
    size=u_bdot; alpha=1.;
    if(h(vec3(a.xy*97.,2.))>=u_bigA||h(vec3(a.xy*61.,4.))<smoothstep(0.,.5,u_gz)) show=false;   // opening the gallery: the planet thins out gradually as its pixels fly off
    col=vec3(.96,.94,.9)*mix(.72,1.04,clamp(lit,0.,1.)); col=mix(col,vec3(1.,.38,.16),g_hot); if(g_city>.5)col=vec3(1.,.8,.42);
    if(ring>.5){col=vec3(1.,.31,.13);alpha=.9+.1*sin(u_t*3.);if(b>.5)show=false;}
    // the overview's stream, seen up close: same path, same colours, same timing (it uses the real hole on screen, so zooming is seamless).
    // Up close the pixels visibly break off: each one leaves its own spot on the side facing the hole, so that limb crumbles away.
  }
  if(alpha<.01) show=false;

  // pointer: push dots away, with a little swirl and per-dot variation
  vec2 d=p-u_m.xy; float dist=length(d)+1e-3;
  // push pixels away from the cursor with a soft edge; a little jitter keeps it grainy
  float R=(42.+58.*u_s)*(1.+.3*u_e);
  float f=max(0.,1.-dist/R); f=f*f*(3.-2.*f);
  float sd=b*13.1+a.x*71.3+a.y*37.7, ang=rnd(sd)*6.2832;
  vec2 dir=d/dist;
  float amt=(3.6+6.4*u_s)*u_m.z*push*(.7+.6*rnd(sd+5.));   // about half the original
  p+=(dir*.7+vec2(-dir.y,dir.x)*.15+vec2(cos(ang),sin(ang))*.35)*f*amt;   // more grain, less hole
  // click ripple: small and quick
  if(u_ck.w>0.){vec2 dc=p-u_ck.xy;float dl=length(dc)+1e-3;float wr=u_ck.z*220.;
    float w=exp(-pow((dl-wr)/12.,2.))*exp(-u_ck.z*3.5)*6.*push;p+=dc/dl*w;}

  vec2 clip=p/u_res*2.-1.; clip.y=-clip.y;
  gl_Position=show?vec4(clip,0,1):vec4(2,2,2,1);
  gl_PointSize=show?max(1.,floor(size*u_dpr+.5)):0.;
  v=vec4(col,alpha);
}`;

export const FS = `#version 300 es
precision mediump float;
in vec4 v; out vec4 o;
void main(){vec2 c=abs(gl_PointCoord-.5);float d=max(c.x,c.y);o=vec4(v.rgb,v.a*step(d,.5));}`;

export const WVS = `#version 300 es
void main(){vec2 p=vec2((gl_VertexID<<1)&2,gl_VertexID&2);gl_Position=vec4(p*2.-1.,0,1);}`;

export const WFS = `#version 300 es
precision highp float;
uniform vec2 w_res,w_scr,w_cam; uniform float w_cell,w_t,w_mode,w_fade,w_e,w_depth,w_y0,w_dpr,w_rev;
uniform vec3 w_ctr,w_lbx; uniform float w_lay[6]; uniform vec4 w_fos[4]; uniform float w_fosS[4];
uniform sampler2D w_atl,w_logo,w_tm;
uniform vec3 w_cr;          // crater: replay clock, heat (cools with real age), shard image slot
uniform vec4 w_mono[8]; uniform float w_monoS[8],w_monoV[8]; uniform vec3 w_monoB; uniform float w_mn,w_mf;   // floating monoliths: position + turn, image slot, half size, count, focused
out vec4 o;
float hh(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float n2(vec2 x){vec2 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(hh(i),hh(i+vec2(1,0)),f.x),mix(hh(i+vec2(0,1)),hh(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<3;i++){s+=a*n2(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s/.875;}
float b2(vec2 a){a=floor(a);return fract(dot(a,vec2(.5,a.y*.75)));}
float b4(vec2 a){return b2(.5*a)*.25+b2(a);}
float b8(vec2 a){return b4(.5*a)*.25+b2(a);}
const vec3 BONE=vec3(.96,.94,.9);
// ---- Starlee: an ocean world at dusk, islands lit by cities, Lumi in the sky ----
const vec3 SUN=vec3(-.2,.09,.97);
float hmap(vec2 p){return (fbm(p*.07)-.55)*14.;}
float sky(vec3 rd,out vec3 c){
  float hz=pow(1.-max(rd.y,0.),14.), s=max(dot(rd,normalize(SUN)),0.);
  float L=.015+.3*hz+pow(s,60.)*.6+pow(s,8.)*.08+smoothstep(.9986,.9992,s)*1.4;
  c=mix(BONE,vec3(1.,.64,.34),clamp(hz*.75+pow(s,6.)*.7,0.,1.));
  if(rd.y>.06){vec2 g=floor(vec2(atan(rd.x,rd.z),rd.y)*170.);if(hh(g)>.988)L+=.55*hh(g+3.);}
  vec3 lu=normalize(vec3(.42,.36,1.)),u=normalize(cross(lu,vec3(0,1,0))),v=cross(u,lu);
  vec2 q=vec2(dot(rd,u),dot(rd,v))/.075;
  if(dot(rd,lu)>0.&&dot(q,q)<1.){vec3 n=vec3(q,sqrt(1.-dot(q,q)));L=max(dot(n,normalize(vec3(-.7,-.1,.45))),0.)*1.15+.06;c=BONE;}
  return L;
}
// floating monoliths, one per project. As you fly through one it dissolves into dithered dots: each pixel's ray skips it once its share has faded
vec2 gCell;bool mOn[8];
float monoD(vec3 p,out int id,out vec3 lq){float best=1e9;id=-1;
  for(int j=0;j<8;j++){if(float(j)>=w_mn)break;if(!mOn[j])continue;vec4 M=w_mono[j];vec3 q=p-M.xyz;float c=cos(M.w),s=sin(M.w);q=vec3(c*q.x+s*q.z,q.y,-s*q.x+c*q.z);
    vec3 d=abs(q)-w_monoB;float sd=length(max(d,0.))+min(max(d.x,max(d.y,d.z)),0.);if(sd<best){best=sd;id=j;lq=q;}}
  return best;}
vec4 surface(vec2 cell){
  gCell=cell;for(int j=0;j<8;j++)mOn[j]=w_monoV[j]>0.&&hh(cell*.913+float(j)*7.1)<=w_monoV[j];   // each pixel decides once, not every step
  vec2 uv=(cell+.5-w_res*.5)/w_res.y;
  float e=w_e, alt=mix(32.,5.,e), pitch=mix(-1.3,-.13,e), yaw=w_cam.y;
  vec3 ro=vec3(sin(w_t*.06)*.25,alt,w_cam.x);
  vec3 fw=vec3(sin(yaw)*cos(pitch),sin(pitch),cos(yaw)*cos(pitch)),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*1.15+uv.y*up*1.15);
  vec3 col; float L,t=.3; bool hit=false; int mid=-1; vec3 p=ro,lq;
  for(int i=0;i<110;i++){p=ro+rd*t;int id;vec3 q;float dm=monoD(p,id,q);
    if(dm<.0015*t+.002){mid=id;lq=q;break;}
    if(rd.y>=0.&&p.y>8.)break;                                         // above everything: it's sky
    bool hi=p.y>6.5;float d=hi?p.y-6.35:p.y-max(hmap(p.xz),0.);if(!hi&&d<.012*t){hit=true;break;}   // islands never rise above 6.3: up high, skip the noise and never count it as ground
    t+=max(min(d*.55,dm*.95),dm<.6?.008:.05);if(t>95.)break;}   // small steps near a monolith so its edges don't chip
  if(mid>=0){                                     // a monolith: the project's image on its face, a glowing rim, dark stone elsewhere
    vec3 B=w_monoB,a=abs(lq)/B;bool front=a.z>a.x&&a.z>a.y&&lq.z<0.;
    if(front){vec2 u=vec2(lq.x/B.x*.5+.5,.5-lq.y/B.y*.5);float sl=w_monoS[mid];
      vec2 ui=u;                                                       // photos are stored already fitted to the stone's proportions
      vec4 tx=texture(w_atl,(vec2(mod(sl,4.),floor(sl/4.))+clamp(ui,.004,.996))/vec2(4.,8.));
      L=pow(dot(tx.rgb,vec3(.3,.59,.11)),1.2)*.9+.03;col=mix(BONE,tx.rgb*1.15+.04,.8);   // highlights stay below pure white, and the photo keeps its own colour
      vec2 ed=min(u,1.-u)*B.xy*2.;if(min(ed.x,ed.y)<.07)L=abs(float(mid)-w_mf)<.5?1.2:.85;}
    else{float sd=max(dot(normalize(sign(lq)*step(a.yzx,a)*step(a.zxy,a)),normalize(SUN)),0.);L=.04+sd*.5;col=vec3(1.,.8,.6);}
    float fog=(1.-exp(-t*.024))*(front?smoothstep(14.,45.,t):1.);   // no haze over a photo you've flown up tovec3 fc;float fL=sky(normalize(vec3(rd.x,.015,rd.z)),fc);L=mix(L,fL,fog);col=mix(col,fc,fog);   // less haze over the photo itself
  }
  else if(!hit) L=sky(rd,col);
  else{
    float h=hmap(p.xz);
    if(h<=0.){                                    // water: waves reflect the dusk sky, the sun leaves a glittering road
      vec2 w=p.xz;
      vec3 n=normalize(vec3((n2(w*1.2+vec2(w_t*.5,w_t*.2))-.5)*.25,1.,(n2(w*1.7-vec2(0.,w_t*.6))-.5)*.25));
      vec3 sc,rr=reflect(rd,n);float sL=sky(rr,sc),fr=.2+.8*pow(1.-max(dot(-rd,n),0.),5.);
      L=sL*fr*.6+.01+smoothstep(-.6,0.,h)*.1+smoothstep(.6,.72,n2(vec2(w.x*.45,w.y*1.8)+vec2(0.,w_t*.5)))*.16+pow(max(dot(rr,normalize(SUN)),0.),220.)*1.6;col=sc;   // glittering road toward the sun
      for(int j=0;j<8;j++){if(float(j)>=w_mn)break;vec2 dd=(w-w_mono[j].xz)/vec2(1.6,2.4);float gl=exp(-dot(dd,dd))*.55*w_monoV[j]*(.7+.3*n2(w*2.+w_t));L+=gl;col=mix(col,vec3(1.,.85,.6),min(1.,gl*1.5));}   // each monolith lights the water under it
    } else {                                      // islands, with city lights on the side turned from the sun
      vec2 ex=vec2(.09,0.);
      vec3 n=normalize(vec3(hmap(p.xz-ex.xy)-hmap(p.xz+ex.xy),.18,hmap(p.xz-ex.yx)-hmap(p.xz+ex.yx)));
      float dif=max(dot(n,normalize(SUN)),0.);
      L=.02+dif*1.3+pow(1.-abs(n.y),3.)*dif*.4;col=mix(BONE,vec3(1.,.8,.6),.35);   // dusk: islands mostly silhouettes
      vec2 g=floor(p.xz*3.2);
      if(dif<.45&&hh(g)>.8&&n2(p.xz*.5)>.4){L=.85+.3*sin(w_t*3.+hh(g)*40.);col=vec3(1.,.77,.4);}
    }
    float fog=1.-exp(-t*.024);vec3 fc;float fL=sky(normalize(vec3(rd.x,.015,rd.z)),fc);
    L=mix(L,fL,fog);col=mix(col,fc,fog);
  }
  // keep text readable: a soft dark clearing behind the caption, and quieter bands under the nav and footer
  {vec2 u=(cell+.5)/w_res; float ex=length(vec2((u.x-.5)*w_res.x/w_res.y/.4,(u.y-.19)/.085));
   L*=mix(.7,1.,smoothstep(.0,.12,u.y))*mix(.7,1.,smoothstep(1.,.9,u.y));}
  if(hh(cell*.731+2.)>w_fade) return vec4(0);                       // dithered dissolve in from the planet
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
// ---- Camille: cut open into layers of time, scroll to dig toward the core ----
vec4 strata(vec2 cell){
  // coming and going: a ragged front sweeps across the screen; pixels right at the front are caught by the wind and drift ahead of it
  {vec2 u=(cell+.5)/w_res; float sw=(u.x+.35*(1.-u.y))/1.35, v=hh(cell*.731+2.)*.35+sw*.65, dd=w_fade-v;
   if(dd<0.) return vec4(0);
   if(dd<.12&&w_fade<.999) cell-=floor(vec2(1.,-.35)*pow(1.-dd/.12,2.)*7.+.5);}
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  float r=distance(s,w_ctr.xy);
  float d=w_dpr, x=s.x, wy=s.y-w_y0+w_depth, L; vec3 col=BONE;
  if(wy<0.){
    float g=-(fbm(vec2(x*.0035/d,1.3))*.75+.25)*48.*d;
    if(wy>g){L=.42+.45*n2(vec2(x/d*.05,wy/d*.2))+(wy-g<2.5*w_cell?.35:0.);col=vec3(1.,.9,.74);}
    else{L=hh(cell)>.991?.6:0.;}
  } else {
    int li=0; float top=0.;
    {int k=clamp(int(wy/w_lay[1]),0,4);   // boundaries wobble ±40px, far less than an era's height: only k and k+1 can matter
     float bk=k>0?w_lay[k]+(fbm(vec2(x*.0022/d,float(k)*3.1))-.5)*80.*d:0.;
     if(wy>=bk){li=k;top=bk;}else{li=k-1;top=k-1>0?w_lay[k-1]+(fbm(vec2(x*.0022/d,float(k-1)*3.1))-.5)*80.*d:0.;}
     if(k<4){float b1=w_lay[k+1]+(fbm(vec2(x*.0022/d,float(k+1)*3.1))-.5)*80.*d;if(wy>=b1){li=k+1;top=b1;}}}
    float lx=x/d, ly=wy/d, dT=wy-top;
    if(li==0){L=.44+.24*sin(ly*.32+fbm(vec2(lx*.01,ly*.02))*6.)+.1*n2(vec2(lx,ly)*.08);col=vec3(1.,.92,.8);}
    else if(li==1){float v=n2(vec2(lx,ly)*.055);L=.26+.55*smoothstep(.56,.63,v)+.12*fbm(vec2(lx,ly)*.02);col=vec3(.99,.85,.68);}
    else if(li==2){L=.3+.26*sin(lx*.07+ly*.15+fbm(vec2(lx,ly)*.01)*4.)+.08*n2(vec2(lx,ly)*.1);col=vec3(.96,.8,.62);}
    else if(li==3){vec2 g=floor(vec2(lx/26.+floor(ly/14.)*.5,ly/14.));vec2 f=fract(vec2(lx/26.+floor(ly/14.)*.5,ly/14.));
      L=(f.x<.06||f.y<.1)?.05:.18+.34*hh(g);col=vec3(.9,.74,.62);}
    else{float k=smoothstep(0.,700.*d,dT);L=.32+.25*sin(ly*.07-w_t*1.4+fbm(vec2(lx*.01,ly*.01))*5.)+k*.55;col=mix(vec3(1.,.6,.3),vec3(1.,.9,.7),k);}
    if(li>0&&dT<2.6*w_cell)L=.03;                                       // dark seam between eras
    else if(li>0&&dT<4.*w_cell)L=.8;                                    // with a bright lip under it
    if(li<4)L*=mix(.58,.42,float(li)/3.);                             // keep the rock dim so the story reads over it
    if(li>0&&dT<2.6*w_cell)L=.03; else if(li>0&&dT<4.*w_cell)L=.8;
    for(int j=0;j<4;j++){vec4 F=w_fos[j];if(F.z<=0.)continue;          // fossils: your work, set into its era
      vec2 u=(vec2(x,wy)-F.xy)/F.zw, pad=3.*w_cell/F.zw;
      if(u.x>-pad.x&&u.x<1.+pad.x&&u.y>-pad.y&&u.y<1.+pad.y){
        if(u.x<0.||u.x>1.||u.y<0.||u.y>1.){L=.02;}
        else{float sl=w_fosS[j];vec4 tx=texture(w_logo,(vec2(mod(sl,2.),floor(sl/2.))+clamp(u,.003,.997))/2.);
          L=max(tx.r,max(tx.g,tx.b))*1.05+.03;col=mix(BONE,tx.rgb/max(.2,max(tx.r,max(tx.g,tx.b))),.6);
          vec2 eu=min(u,1.-u)*F.zw;if(min(eu.x,eu.y)<1.6*w_cell)L=.95;}}}
  }
  if(r>w_rev-3.*w_cell){L=.95;col=vec3(1.,.88,.7);}                    // bright cut edge of the planet
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
// ---- impact site: the comet's crater, seen from above, with the update it carried embedded at the centre ----
const vec3 CSUN=vec3(-.55,.42,.72);
float cGrow(){return 1.-pow(1.-smoothstep(.6,2.1,w_cr.x),3.);}   // the shard falls first (0–.34s), then the crater blooms
float chm(vec2 p){
  float r=length(p),a=atan(p.y,p.x),R=3.*cGrow();
  float g=fbm(p*.22)*1.1+fbm(p*1.3)*.1;                               // rolling dunes, soft relief
  if(R<.01)return g;
  float bowl=-1.45*(1.-pow(min(r/R,1.),2.))*smoothstep(R*1.02,R*.6,r)-0.*a;
  float rim=.62*exp(-pow((r-R*1.02)/(.32+.05*R),2.))*(.8+.4*n2(vec2(a*3.,1.)));
  float ej=.28*smoothstep(.5,.85,n2(vec2(a*6.,r*.4)))*exp(-max(r-R,0.)*.38)*step(R,r);   // ejecta rays
  return g+bowl+rim+ej;
}
float shardD(vec3 p,out vec3 lq){float s=cGrow();
  vec3 c=vec3(0.,-1.05+1.25*s-(1.-smoothstep(.62,1.5,w_cr.x))*1.6,0.);   // rises out of the crater after impact
  vec3 q=p-c;float t1=.42,t2=-.22,c1=cos(t1),s1=sin(t1),c2=cos(t2),s2=sin(t2);
  q=vec3(c1*q.x+s1*q.z,q.y,-s1*q.x+c1*q.z);q=vec3(q.x,c2*q.y-s2*q.z,s2*q.y+c2*q.z);lq=q;
  vec3 d=abs(q)-vec3(.95,1.25,.12);return w_cr.x<.6?1e3:length(max(d,0.))+min(max(d.x,max(d.y,d.z)),0.);}
vec4 crater(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  {float hv=hh(cell*.731+2.);if(hv>=smoothstep(.42,.95,w_e))return hv<smoothstep(0.,.36,w_e)?vec4(0.,0.,0.,.5):vec4(0);}   // planet dissolves to dark, then the scene dissolves in
  vec2 uv=(cell+.5-w_res*.5)/w_res.y;
  float af=w_res.x<w_res.y?1.65:1.,yw=w_cam.y,dist=(7.6-1.8*w_cam.x)*af;
  vec3 ro=vec3(sin(yw)*dist,(4.6+.8*w_cam.x)*af,-cos(yw)*dist),ta=vec3(0.,-.2,0.);
  {float ia=w_cr.x-.6,jolt=ia>0.?exp(-ia*4.5)*.32:smoothstep(-1.4,0.,ia)*.05;
   ro+=vec3(n2(vec2(w_t*38.,1.))-.5,n2(vec2(w_t*41.,7.))-.5,n2(vec2(w_t*37.,3.))-.5)*jolt*2.;}
  vec3 fw=normalize(ta-ro),rt=normalize(cross(vec3(0,1,0),fw)),up=cross(fw,rt);
  vec3 rd=normalize(fw+uv.x*rt*1.15+uv.y*up*1.15);
  float t=.5,L=0.;vec3 col=BONE,p;bool hit=false,sh=false;vec3 lq;
  for(int i=0;i<90;i++){p=ro+rd*t;float dg=p.y-chm(p.xz);vec3 q;float ds=shardD(p,q);
    if(ds<.004*t){sh=true;lq=q;break;}if(dg<.01*t){hit=true;break;}t+=max(min(dg*.6,ds),.02);if(t>60.)break;}
  float age=w_cr.x,heat=w_cr.y;
  if(sh){                                          // the shard: the update it carried, on its face, glowing at the edges
    vec3 B=vec3(.95,1.25,.12),a=abs(lq)/B;
    if(a.z>a.x&&a.z>a.y&&lq.z<0.){vec2 u=vec2(lq.x/B.x*.5+.5,.5-lq.y/B.y*.5),ui=vec2(.5+(u.x-.5)*B.x/B.y,u.y);float sl=w_cr.z;
      vec4 tx=texture(w_atl,(vec2(mod(sl,4.),floor(sl/4.))+clamp(ui,.004,.996))/vec2(4.,8.));
      L=dot(tx.rgb,vec3(.3,.59,.11))*1.15+.06;col=mix(BONE,tx.rgb*1.05+.1,.35);
      vec2 ed=min(u,1.-u)*B.xy*2.;if(min(ed.x,ed.y)<.09){L=1.1;col=mix(vec3(1.,.55,.25),BONE,.4);}}
    else{L=.25;col=vec3(1.,.6,.3);}
  } else if(hit){
    float h=chm(p.xz),r=length(p.xz),R=3.*cGrow();vec2 e=vec2(.06,0.);
    vec3 n=normalize(vec3(chm(p.xz-e.xy)-chm(p.xz+e.xy),.12,chm(p.xz-e.yx)-chm(p.xz+e.yx)));
    float dif=max(dot(n,normalize(CSUN)),0.);
    L=.01+pow(dif,1.4)*.78;col=mix(BONE,vec3(1.,.85,.7),.3);
    // still-hot crater floor and glowing cracks, cooling over time
    float ins=1.-smoothstep(R*.25,R*.95,r),cr=1.-smoothstep(.0,.08,abs(n2(p.xz*2.2)-.5));
    float gl=heat*ins*(.35+.9*cr)*(.75+.25*sin(w_t*2.+r*3.));
    if(gl>.12){L=max(L,.4+gl*.8);col=mix(vec3(1.,.31,.13),vec3(1.,.75,.4),clamp(gl-.4,0.,1.));}
    // shockwave racing out across the ground during the replay
    float ai=max(age-.6,0.),sw=exp(-pow((r-(R+ai*5.))/.4,2.))*step(.6,age)*(1.-smoothstep(.3,2.2,ai));L+=sw*.9;
    float fog=1.-exp(-t*.05);L=mix(L,.0,fog);
    {vec2 u2=(cell+.5)/w_res;L*=mix(.35,1.,smoothstep(.0,.38,u2.y));}   // darker foreground so the text below reads
  } else { L=0.;vec2 g=floor(vec2(atan(rd.x,rd.z),rd.y)*160.);if(hh(g)>.985)L=.5*hh(g+3.); }
  // a thin wisp of smoke rises after the impact, then clears
  {float puff=smoothstep(.8,1.6,age)*(1.-smoothstep(3.5,8.,age));vec3 sm=ro+rd*clamp(dot(-ro,rd),0.,60.);float rr=length(sm.xz),hy=sm.y+.4;
   float smoke=puff*smoothstep(1.,0.,rr/(.3+hy*.22))*smoothstep(-.5,.5,hy)*smoothstep(6.,1.5,hy)*n2(vec2(rr*5.,hy*3.-w_t*1.2));
   if(smoke>.35&&!sh){L=max(L,smoke*.5);col=mix(col,vec3(.8,.75,.7),.6);}}
  // ---- the meteor: arcs in from over the horizon, accelerating, a burning rock dragging fire and smoke ----
  float ps=1.15;
  float ma=(w_cr.x+(3.2-.6))/3.2;                                      // 0..1 over the approach
  if(ma<1.03){
    vec3 tg=vec3(0.,.25,0.),st=ro+normalize(fw+up*.36-rt*.3)*32.;st.y=max(st.y,3.);
    vec3 ctl=mix(st,tg,.5)+up*.8*af+rt*4.5*af;                        // the arc: swings across the sky before diving in
    float I=0.,hot=0.,smk=0.;
    for(int k=0;k<40;k++){
      float life=float(k)/39.,sp=pow(clamp(ma,0.,1.),2.3)-life*.42;if(sp<0.)break;   // the trail is the path it just carved
      vec3 c=mix(mix(st,ctl,sp),mix(ctl,tg,sp),sp);
      float fl=n2(vec2(float(k)*.9,w_t*14.)),fl2=n2(vec2(float(k)*1.3+4.,w_t*9.));
      c+=(vec3(fl,fl2,n2(vec2(float(k)*2.1+9.,w_t*11.)))-.5)*life*.45+vec3(0.,life*life*.5,0.);   // licks of flame, smoke rising
      vec3 d=c-ro;float z=dot(d,fw);if(z<.4)continue;
      vec2 q=vec2(dot(d,rt),dot(d,up))/(z*ps);
      float wr=(k==0?.26:life<.6?mix(.2,.05,pow(life/.6,.9)):mix(.06,.13,(life-.6)/.4))*(.8+.4*fl);   // tapers from the rock to a thin tail; smoke stays wispy          // fire swells and breaks up behind the rock
      float sr=max(wr/(z*ps),1.3/w_res.y),g=exp(-dot(uv-q,uv-q)/(sr*sr));
      if(life<.6){float e=(.45+.75*pow(1.-life/.6,.8))*(k<3?2.2:1.)*(.7+.6*fl2);I+=g*e;hot+=g*e*pow(1.-life/.6,2.);}
      else smk+=g*(1.-life)*2.4;
    }
    for(int k=0;k<18;k++){                                               // sparks thrown off the fireball
      float fk=float(k),te=ma-hh(vec2(fk,3.))*.22;if(te<0.)continue;
      float a2=(ma-te)*3.2,s2=pow(clamp(te,0.,1.),2.3);vec3 c=mix(mix(st,ctl,s2),mix(ctl,tg,s2),s2);
      c+=normalize(vec3(hh(vec2(fk,7.))-.5,hh(vec2(fk,8.))-.3,hh(vec2(fk,9.))-.5))*a2*3.+vec3(0.,-a2*a2*4.,0.);
      vec3 d=c-ro;float z=dot(d,fw);if(z<.4)continue;
      vec2 q=vec2(dot(d,rt),dot(d,up))/(z*ps);float sr=max(.06/(z*ps),1.1/w_res.y);
      I+=exp(-dot(uv-q,uv-q)/(sr*sr))*(1.-smoothstep(.1,.5,a2))*1.8;
    }
    float sp0=pow(clamp(ma,0.,1.),2.3);vec3 mp=mix(mix(st,ctl,sp0),mix(ctl,tg,sp0),sp0);
    float fade=1.-smoothstep(.985,1.02,ma);I*=fade;hot*=fade;smk*=fade;
    {float tx=n2(cell*.42+vec2(w_t*2.,-w_t*9.))*.65+n2(cell*1.1-vec2(0.,w_t*14.))*.35;   // flickering flame texture, licks moving backwards
     I*=mix(1.,.35+1.2*tx,smoothstep(.2,.9,I)*(1.-smoothstep(1.6,2.6,hot*2.)));smk*=.5+tx;}
    if(smk>.3&&I<.25){L=max(L,.1+smk*.16);col=vec3(.66,.6,.55);}      // a dirty smoke trail
    if(I>.1){L=max(L,min(I,1.35));float hh2=clamp(hot*.9,0.,1.);
      col=mix(mix(vec3(.75,.16,.06),vec3(1.,.45,.15),clamp(I*.9,0.,1.)),mix(vec3(1.,.78,.4),vec3(1.,.98,.9),clamp(hh2*2.-1.,0.,1.)),clamp(hh2*2.,0.,1.));}
    if(hit){float gl=exp(-dot(p.xz-mp.xz,p.xz-mp.xz)/max(.3+mp.y*.25,.3))*sp0*sp0*.8;L+=gl;col=mix(col,vec3(1.,.55,.25),min(1.,gl));}   // the ground lights up under it
  }
  // dust thrown up by the impact, settling
  {float dt2=smoothstep(.62,.85,age)*(1.-smoothstep(.9,2.4,age));vec3 sm=ro+rd*clamp(dot(-ro,rd),0.,60.);float rr=length(sm.xz);
   float dust=dt2*smoothstep(2.4*cGrow()+.4,0.,rr)*smoothstep(-.6,.2,sm.y)*smoothstep(3.,.0,sm.y)*n2(sm.xz*2.+vec2(0.,age*2.));
   if(dust>.3&&!sh){L=max(L,dust*.55);col=mix(col,vec3(1.,.82,.66),.7);}}
  {float fl=exp(-pow((age-.62)/.045,2.));vec2 c0;{vec3 d=vec3(0.,.1,0.)-ro;float z=dot(d,fw);c0=vec2(dot(d,rt),dot(d,up))/(z*1.15);}
   float g=exp(-pow(length(uv-c0)/.09,2.));L+=fl*g*.8;col=mix(col,vec3(1.,.82,.6),fl*g);}   // impact flash, local
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
${PULL}
void main(){vec2 c=floor(gl_FragCoord.xy);o=w_mode<2.?surface(c):w_mode<4.?strata(c):w_mode<6.?crater(c):pull(c);
  float m=texture(w_tm,vec2((c.x+.5)*w_cell,w_scr.y-(c.y+.5)*w_cell)/(w_res*w_cell)).a;o.rgb*=mix(1.,.06,smoothstep(.03,.3,m));}`;   // only the dots under letters go dim, so text reads over any world

export const BFS = `#version 300 es
precision highp float;
uniform sampler2D b_tex; uniform float b_cell; out vec4 o;
void main(){vec2 f=gl_FragCoord.xy,c=floor(f/b_cell);vec4 v=texelFetch(b_tex,ivec2(c),0);
  if(v.a<.25)discard;vec2 off=f-c*b_cell;bool gap=off.x>=b_cell-1.||off.y>=b_cell-1.;
  o=(v.a>.75&&!gap)?vec4(v.rgb,1.):vec4(.106,.106,.106,1.);}`;

