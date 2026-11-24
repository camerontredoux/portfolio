export default `
uniform vec4 pull_q[8],pull_qm[8],pull_sm,pull_smm; uniform vec3 pull_h,pull_spin; uniform float pull_n,pull_t;
uniform vec2 pull_heat; uniform vec4 pull_pc,pull_pf; uniform sampler2D pull_tx;
float pull_sky(vec2 q,float cellsPerUnit){
  vec2 g=floor(q*cellsPerUnit); float L=hh(g)>.982?.45+.6*hh(g+7.):0.;
  return L;
}
// The bz disc seen from up close, with the bz disc's own texture: grooves, tapered streaks, a white-hot inner edge,
// the side turning toward you brighter. Its near half crosses in front of the hole; its far half is bent up over the top.
float pull_lum(float rho,float ang,float rot){
  float ro=3.3; if(rho<1.3||rho>ro) return 0.;
  // Pull draws on a coarse on/off grid, so soft gradients turn to speckle: the structure has to be hard lanes with gaps
  float ph=ang-rot/pow(rho,1.5), heat=1.-smoothstep(1.3,ro,rho)*.65, dop=.68+.32*cos(ang);
  float k=floor((rho-1.3)/.42+.5), lane=smoothstep(.45,.85,.5+.5*cos(6.2832*(rho-1.3)/.42));
  float arcs=1.+step(.5,fract(k*.618)), a=fract(ph*arcs/6.2832+fract(k*.7548)); if(pull_spin.z<0.)a=1.-a;
  float sw=nz(vec3(cos(ph)*rho*1.8,sin(ph)*rho*1.8,rho*2.5));
  float I=heat*dop*(1.7*lane*(.3+.7*pow(a,1.4))*(.7+.45*sw)+.24*smoothstep(.4,.8,sw));
  I=max(I,1.4*dop*exp(-pow((rho-1.36)/.05,2.)));
  return I*smoothstep(ro,ro-.12,rho);
}
float pull_ring(vec2 q,float r,out bool front){
  float s=pull_spin.y, tl=.28, rot=pull_t*.35+pull_spin.x*2.2;
  vec2 t=vec2(cos(tl)*q.x-sin(tl)*q.y,sin(tl)*q.x+cos(tl)*q.y), e=vec2(t.x,t.y/.3);
  float rd=length(e); rd=1.3+max(rd-1.3,0.)*(1.+.6*s);
  float I=0.; front=false;
  if(rd>1.3&&(e.y>0.||r>1.03)){
    I=pull_lum(rd,atan(e.y,e.x),rot);
    front=e.y>0.&&r<1.03&&I>.1;
  }
  if(r>1.03){
    vec2 u=t/r; float ang=atan(u.y,u.x), up=max(0.,-u.y);
    float C=mix(1.,2.,sqrt(up))*(1.+.6*s), rho=1.3+(r-1.03)*C;
    I=max(I,pull_lum(rho,ang,rot)*smoothstep(.3,-.05,u.y)*(1.-smoothstep(1.7,2.5,rho)*up)*(1.+.25*up));
    float dn=max(0.,u.y), k2=(r-1.03)/max(.16*sqrt(dn),1e-3);
    if(k2>0.&&k2<1.) I=max(I,pull_lum(1.3+k2*1.2,ang,rot)*(1.-k2)*.5*sqrt(dn));
  }
  return I<.1?0.:I;
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
  float rv=distance(s,w_ctr.xy), rev=w_rev+w_ctr.z*(1.-w_e);
  if(rv>rev) return vec4(0);
  vec2 d=s-pull_h.xy; float r=length(d), Rh=pull_h.z, x=r/Rh, th=atan(d.y,d.x);
  vec4 P=pull_plate(s,cell);
  bool shadow=r<Rh;
  float L=0.; vec3 col=pull_hue(pull_heat.x*.3);
  if(!shadow){
    float Re=1.55;
    L=pull_sky(d/r*(x-Re*Re/x)+vec2(pull_t*.004,0.),Rh/w_cell)*mix(.3,1.,smoothstep(1.,1.7,x));
    col=pull_hue(L*.45+pull_heat.x*.3);
    float rim=1.-smoothstep(0.,2.5*w_cell,r-Rh);
    if(rim>0.){L=max(L,rim*.85*(1.+.25*sin(pull_t*4.)));col=mix(col,pull_hue(.85),rim);}
  }
  {bool nf; float R=pull_ring(d/Rh,x,nf); if(R>L||nf){L=R;col=pull_hue(R*.62+pull_heat.x*.3);}}
  float fx=pull_heat.y;
  if(fx>0.){float fl=fx*1.2*exp(-pow((x-1.1)/(.06+.5*(1.-fx)),2.));if(fl>L){L=fl;col=pull_WHITE;}}
  for(int j=0;j<8;j++){if(float(j)>=pull_n)break;
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
  if(pull_smm.y>0.){
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
  else if(shadow&&L<=0.) return hh(cell*.731+2.)<smoothstep(.1,.7,w_e)?vec4(0.,0.,0.,.5):vec4(0);
  if(rv>rev-3.*w_cell){L=.95;col=pull_hue(.85);}
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
