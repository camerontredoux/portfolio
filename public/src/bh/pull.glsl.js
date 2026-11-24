export default `
uniform vec4 pull_q[8],pull_qm[8],pull_sm,pull_smm; uniform vec3 pull_h,pull_spin; uniform float pull_n,pull_t;
uniform vec2 pull_heat; uniform vec4 pull_pc,pull_pf; uniform sampler2D pull_tx;
float pull_sky(vec2 q,float cellsPerUnit){
  vec2 g=floor(q*cellsPerUnit); float L=hh(g)>.982?.45+.6*hh(g+7.):0.;
  float b=dot(q,vec2(.276,.961));   // the reference background band, turned to lie along the tilted ring (tl=.28)
  return L+exp(-b*b/.3)*(.15+.45*fbm(q*2.6))*.55;
}
// The bz disc seen from up close: one huge soft ring at the bz tilt. Its near half crosses in front of the hole;
// its far half is behind the hole; its light comes round as the round ring the old Pull already drew.
float pull_tex(float rho,float ang,float rot){
  float ph=ang-rot/pow(rho,1.5);
  return .2+.8*fbm(vec2(cos(ph),sin(ph))*rho*1.6+rho*.7);
}
float pull_ring(vec2 q,float r,out bool front){
  float s=pull_spin.y, tl=.28, rot=pull_t*.25+pull_spin.x*2.2;
  vec2 t=vec2(cos(tl)*q.x-sin(tl)*q.y,sin(tl)*q.x+cos(tl)*q.y), e=vec2(t.x,t.y/.2);
  float rd=length(e); rd=1.3+max(rd-1.3,0.)*(1.+.6*s)*mix(2.2,1.,smoothstep(.1,1.,w_e));
  float I=0.; front=false;
  if(rd>1.3&&(e.y>0.||r>1.03)){
    float a=atan(e.y,e.x);
    I=pull_tex(rd,a,rot)*smoothstep(1.3,1.6,rd)*(.25+.75*exp(-(rd-1.5)/1.1))*(1.-smoothstep(3.5,6.,rd))*(.75+.25*cos(a))*(e.y>0.?1.5:1.15);
    front=e.y>0.&&r<1.03;
  }
  return I;
}
const vec3 pull_EMBER=vec3(.95,.34,.08),pull_AMBER=vec3(1.,.66,.24),pull_WHITE=vec3(1.,.97,.86);
vec3 pull_hue(float c){c=clamp(c,0.,1.);return c<.5?mix(pull_EMBER,pull_AMBER,c*2.):mix(pull_AMBER,pull_WHITE,c*2.-1.);}
vec4 pull_plate(vec2 s,vec2 cell){
  if(pull_pf.z<=0.||(pull_pf.x<1.&&hh(cell*1.3)>pull_pf.x)) return vec4(-1.);
  float g=pull_pf.w, tk=floor(pull_t*12.), row=floor(cell.y/2.);
  vec2 q=s-pull_pc.xy;
  if(pull_t>0.&&hh(vec2(row,tk))<.08*g) q.x+=(hh(vec2(row+.5,tk))-.5)*g*8.*w_cell;
  vec2 e=pull_pc.zw-abs(q);
  if(e.x<0.||e.y<0.) return vec4(-1.);
  if(min(e.x,e.y)<1.5*w_cell) return vec4(pull_hue(.75+.25*pull_heat.x),.95);
  return vec4(pull_hue(.6),pull_t>0.&&hh(cell+tk*.37)<.015*g?.8:0.);
}
vec4 pull(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  // Pull sits on the bz hole while the camera grows it, and takes the screen over cell by cell, a little sooner near the hole
  vec2 d=s-pull_h.xy; float r=length(d), Rh=pull_h.z, x=r/Rh, th=atan(d.y,d.x);
  if(hh(cell*.731+2.)*.75+.25*clamp((x-1.)/5.,0.,1.)>=smoothstep(.1,.85,w_e)) return vec4(0);
  bool late=hh(cell*.29+9.)<smoothstep(.8,1.,w_e);
  vec4 P=pull_plate(s,cell);
  bool shadow=r<Rh;
  float L=0.; vec3 col=pull_hue(pull_heat.x*.3);
  if(!shadow){
    float Re=1.55;
    L=pull_sky(d/r*(x-Re*Re/x)+vec2(pull_t*.004,0.),Rh/w_cell)*mix(.3,1.,smoothstep(1.,1.7,x));
    float rd=(x-Re)/.07; L+=exp(-rd*rd)*(.22+.2*n2(vec2(th*9.,pull_t*.2)));
    col=pull_hue(L*.45+pull_heat.x*.3)*.62;   // the reference reads dim red-brown (~#6E3620), not bright orange
    float rim=1.-smoothstep(0.,2.5*w_cell,r-Rh);
    if(rim>0.){L=max(L,rim*.85*(1.+.25*sin(pull_t*4.)));col=mix(col,pull_hue(.85),rim);}
  }
  {bool nf; float R=pull_ring(d/Rh,x,nf); if(R>L||(nf&&R>.3)){L=R;col=pull_hue(R*.45+pull_heat.x*.3)*.62;}}
  float fx=pull_heat.y;
  if(fx>0.){float fl=fx*1.2*exp(-pow((x-1.1)/(.06+.5*(1.-fx)),2.));if(fl>L){L=fl;col=pull_WHITE;}}
  for(int j=0;j<8;j++){if(float(j)>=pull_n||!late)break;
    vec4 A=pull_q[j],B=pull_qm[j];
    if(B.x<=0.) continue;
    vec2 o=s-A.xy, dir=vec2(cos(A.z),sin(A.z));
    float along=-dot(o,dir), across=abs(dot(o,vec2(-dir.y,dir.x)));
    if(length(o)<1.7*w_cell){L=max(L,1.2*B.x);col=B.y>.5?pull_AMBER:pull_WHITE;}
    else if(along>0.&&along<A.w&&across<.9*w_cell){
      float f=1.-along/A.w, l=f*.95*B.x*(pull_t>0.?.7+.3*hh(vec2(floor(along/w_cell),floor(pull_t*10.))):1.);
      if(l>L){L=l;col=B.y>.5?pull_EMBER:mix(pull_EMBER,pull_AMBER,f);}
    }
  }
  if(pull_smm.y>0.&&late){
    vec4 S=pull_sm; float p=pull_smm.x, cv=pull_smm.z;
    float da=atan(sin(th-S.x),cos(th-S.x)), u=da/(2.*S.w)+.5, v=(r-(S.y-S.z))/(2.*S.z);
    if(cv>0.){
      float tt=abs(da)*r, sz=2.5*w_cell;
      for(int c=0;c<2;c++){
        float yy=r-S.y-S.z-(2.+3.5*float(c))*w_cell;
        if(yy>=0.&&yy<=sz&&tt<sz&&abs(sz-tt-yy)<.75*w_cell){
          float on=pull_t>0.?step(fract(pull_t*.7-float(c)*.3),.5):1.;
          L=max(L,.95*cv*mix(.35,1.,on));col=pull_AMBER;
        }
      }
    }
    if(u>=0.&&u<=1.&&v>=0.&&v<=1.){
      float sharp=mix(.1,1.,p);
      float us=clamp(u+(hh(cell+floor(pull_t*5.)*.37)-.5)*(1.-sharp)*.5,0.,1.);
      vec3 tc=texture(pull_tx,vec2(us,1.-v)).rgb;
      float env=smoothstep(0.,.05+.22*(1.-sharp),min(u,1.-u))*smoothstep(0.,.03+.08*(1.-sharp),min(v,1.-v));
      L=(dot(tc,vec3(.3,.59,.11))*mix(.8,1.15,sharp)+.3)*env*pull_smm.y;
      col=mix(pull_hue(L*.75+.3*p),mix(BONE,tc*1.1+.04,.7),smoothstep(.7,1.,p)*.4);
    }
  }
  if(P.a>=0.){L=P.a;col=P.rgb;}
  else if(shadow&&L<=0.) return vec4(0.,0.,0.,.5);
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
