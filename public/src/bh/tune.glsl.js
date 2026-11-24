export default `
uniform vec3 tune_ctr; uniform float tune_yaw,tune_sl[16],tune_ns,tune_hs,tune_c,tune_prox,tune_still;
vec3 tune_px(float sl,vec2 ui){return texture(w_atl,(vec2(mod(sl,4.),floor(sl/4.))+clamp(ui,.004,.996))/vec2(4.,8.)).rgb;}
float tune_luma(vec3 c){return dot(c,vec3(.3,.59,.11));}
vec4 tune(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  if(distance(s,w_ctr.xy)>w_rev) return vec4(0);
  const vec3 EMBER=vec3(1.,.55,.25);
  float R=tune_ctr.z, px=w_cell/R, L=.015; vec3 col=BONE;
  vec2 d=(s-tune_ctr.xy)/R; float r=length(d);
  if(r<1.){
    vec3 n=vec3(d.x,-d.y,sqrt(1.-r*r));
    float K=floor(6.2832/px), lon=fract((atan(n.x,n.z)+tune_yaw)/6.2832);
    vec2 id=vec2(floor(lon*K),floor(asin(n.y)/px));
    float h=hh(id*.173+.5);
    vec2 sd=id+step(.72,h)*floor(w_t*7.+h*3.)*(1.-tune_still)*vec2(17.,5.);
    vec2 nu=vec2(hh(sd+1.3),hh(sd*1.7+4.1));
    vec3 tx=BONE; float Ls=hh(sd+2.9);
    if(tune_ns>.5){tx=tune_px(tune_sl[int(min(floor(hh(sd+7.7)*tune_ns),tune_ns-1.))],nu);Ls=tune_luma(tx);}
    L=(Ls*1.05+.02)*(.35+.65*sqrt(n.z));
    col=hh(sd+9.1)>.97?EMBER:mix(BONE,tx*1.1,.35);
    float on=tune_c-hh(id+11.3);
    if(tune_hs>=0.&&on>0.){
      vec3 im=tune_px(tune_hs,mix(nu,d*.53+.5,smoothstep(0.,.18,on)));
      L=tune_luma(im)*1.1+.03;col=mix(BONE,im*1.1+.04,.6);
    }
  } else {
    float rr=(r-1.)/px, arc=atan(d.x,-d.y)*r/px;
    if(rr>2.5&&rr<3.5) L=step(.5,fract(arc/4.))*.4;
    if(abs(arc)<1.&&rr>2.5&&rr<6.5+tune_prox*tune_prox*14.){
      L=tune_c>.5?1.2:.4+.6*tune_prox;col=mix(BONE,EMBER,smoothstep(.5,1.,tune_c));
    }
  }
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
