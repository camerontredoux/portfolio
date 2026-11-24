export default `
uniform vec4 pull_q[8],pull_qm[8]; uniform vec3 pull_h,pull_spin; uniform float pull_n,pull_t;
uniform vec2 pull_heat; uniform vec4 pull_pc,pull_pf;
float pull_stars(vec2 q,float cellsPerUnit){vec2 g=floor(q*cellsPerUnit);return hh(g)>.982?.45+.6*hh(g+7.):0.;}
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
  float L=bhDisc(d/Rh,pull_spin,w_t,0.,true);
  bool shadow=x<1.03&&L<=0.;
  if(L<=0.&&!shadow) L=pull_stars(d/r*(x-2.4/x),Rh/w_cell)*smoothstep(1.,1.7,x);
  vec3 col=pull_hue(L*.72+pull_heat.x*.55);
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
    if(B.z>0.){
      vec2 dq=A.xy-pull_h.xy; float rq=length(dq), da=atan(sin(th-atan(dq.y,dq.x)),cos(th-atan(dq.y,dq.x)));
      float tt=abs(da)*r, sz=2.5*w_cell;
      for(int c=0;c<2;c++){
        float yy=r-rq-(3.+3.5*float(c))*w_cell;
        if(yy>=0.&&yy<=sz&&tt<sz&&abs(sz-tt-yy)<.75*w_cell){
          float on=pull_t>0.?step(fract(pull_t*.7-float(c)*.3+float(j)*.11),.5):1.;
          L=max(L,.95*B.z*mix(.35,1.,on));col=pull_AMBER;
        }
      }
    }
  }
  if(P.a>=0.){L=P.a;col=P.rgb;}
  else if(shadow&&L<=0.) return hh(cell*.731+2.)<smoothstep(.1,.7,w_e)?vec4(0.,0.,0.,.5):vec4(0);
  if(rv>rev-3.*w_cell){L=.95;col=pull_hue(.85);}
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
