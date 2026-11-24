export default `
uniform float sink_s,sink_rot,sink_trail,sink_acc,sink_nc,sink_np;
uniform vec3 sink_hz; uniform vec2 sink_pole;
uniform vec4 sink_cm[8]; uniform float sink_ca[8];
uniform vec4 sink_pr[8]; uniform vec3 sink_pv[8];
float sink_stars(vec2 s){
  float cw=w_cell, k=1.+1.6*sink_s;
  vec2 d=s-sink_pole; float r=length(d)*k, rw=3.*cw, ri=floor(r/rw), rc=(ri+.5)*rw;
  float N=max(6.,floor(6.2832*rc/(12.*cw))), f=fract((atan(d.y,d.x)+sink_rot)/6.2832)*N, id=floor(f);
  float h=hh(vec2(ri,id)*.37+.11); if(h<.55||abs(r-rc)/k>.55*cw) return 0.;
  float arc=6.2832*rc/N/k, along=(fract(f)-(.15+.7*fract(h*7.3)))*arc, tl=min(sink_trail*rc/k,9.*cw);
  float b=(.75+.5*fract(h*13.1))*(1.+.5*sink_s);
  if(along>-.6*cw&&along<.6*cw) return b;
  if(along>0.&&along<tl) return b*.7*pow(1.-along/tl,1.5);
  return 0.;
}
vec4 sink(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  if(distance(s,w_ctr.xy)>w_rev) return vec4(0);
  vec2 hv=s-sink_hz.xy; float dh=length(hv)-sink_hz.z;
  if(dh<0.) return vec4(vec3(.035),1.);
  float cw=w_cell, L=sink_stars(s); vec3 col=BONE;
  float ang=atan(hv.x,-hv.y)*sink_hz.z/(10.*cw);
  float glow=.6*exp(-dh/((28.+30.*sink_s)*w_dpr))*(.55+.7*n2(vec2(ang-sink_acc,dh/(14.*cw))));
  if(glow>L){L=glow;col=mix(vec3(1.,.6,.3),BONE,smoothstep(.1,.5,glow));}
  if(dh<2.*cw){L=1.1;col=mix(vec3(1.,.72,.45),BONE,.4);}
  for(int j=0;j<8;j++){if(float(j)>=sink_nc)break;float a=sink_ca[j];if(a<=0.)continue;
    vec2 q=s-sink_cm[j].xy,dir=sink_cm[j].zw;float al=-dot(q,dir),pp=abs(q.x*dir.y-q.y*dir.x),len=160.*w_dpr;
    if(al>-cw&&al<len&&pp<1.5*cw){float tb=(al<cw&&pp<cw?1.2:pow(1.-al/len,2.)*(1.-pp/(1.5*cw)))*a;
      if(tb>L){L=tb;col=al<cw?BONE:vec3(1.,.66,.36);}}}
  for(int j=0;j<8;j++){if(float(j)>=sink_np)break;vec4 P=sink_pr[j];vec3 V=sink_pv[j];vec2 u=(s-P.xy)/P.zw;
    if(abs(u.x)>1.||abs(u.y)>1.||hh(cell*.53+float(j)*3.7)>V.y)continue;
    vec2 e=(1.-abs(u))*P.zw;
    if(min(e.x,e.y)<1.5*cw){L=1.;col=mix(BONE,vec3(1.,.55,.25),.35+.65*V.z);continue;}
    if(V.x<0.){L=.25+.15*step(.5,fract((u.x+u.y)*3.));col=BONE;}
    else{vec4 tx=texture(w_atl,(vec2(mod(V.x,4.),floor(V.x/4.))+clamp(u*.5+.5,.004,.996))/vec2(4.,8.));
      L=dot(tx.rgb,vec3(.3,.59,.11))*1.1+.05;col=mix(BONE,tx.rgb*1.05+.1,.5);}
    L*=1.-.55*V.z;col=mix(col,vec3(1.,.45,.2),V.z*.8);}
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
