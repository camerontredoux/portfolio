export default `
uniform vec4 pull_s[16]; uniform vec3 pull_m[16]; uniform vec3 pull_h; uniform float pull_n,pull_t;
float pull_sky(vec2 q,float cellsPerUnit){
  vec2 g=floor(q*cellsPerUnit); float L=hh(g)>.982?.45+.6*hh(g+7.):0.;
  float b=dot(q,normalize(vec2(-.35,.8)));
  return L+exp(-b*b/.3)*(.15+.45*fbm(q*2.6))*.55;
}
vec4 pull(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  float rv=distance(s,w_ctr.xy);
  if(rv>w_rev) return vec4(0);
  vec2 d=s-pull_h.xy; float r=length(d), Rh=pull_h.z, x=r/Rh, th=atan(d.y,d.x);
  if(r<Rh) return vec4(0.,0.,0.,.5);
  float Re=1.55, beta=x-Re*Re/x, rd=(x-Re)/.07, ring=exp(-rd*rd);
  float L=pull_sky(d/r*beta+vec2(pull_t*.004,0.),Rh/w_cell)*mix(.3,1.,smoothstep(1.,1.7,x));
  L+=ring*(.22+.2*n2(vec2(th*9.,pull_t*.2)));
  vec3 col=mix(BONE,vec3(1.,.6,.3),clamp(ring*.5+(1.-smoothstep(1.,1.5,x))*.8,0.,1.));
  float rim=1.-smoothstep(0.,2.5*w_cell,r-Rh);
  if(rim>0.){L=max(L,rim*.75);col=mix(col,vec3(1.,.36,.14),rim);}
  float top=-1.;
  for(int j=0;j<16;j++){if(float(j)>=pull_n)break;
    vec4 S=pull_s[j]; vec3 m=pull_m[j];
    float u=atan(sin(th-S.x),cos(th-S.x))/(2.*S.w)+.5, v=(r-(S.y-S.z))/(2.*S.z), p=m.y;
    if(u<0.||u>1.||v<0.||v>1.||p<top) continue;
    top=p;
    float sharp=clamp(mix(.12*(1.-m.z),1.,p),0.,1.);
    float us=clamp(u+(hh(cell+floor(pull_t*5.)*.37)-.5)*(1.-sharp)*.5,0.,1.);
    vec3 tc=vec3(.55+.4*n2(vec2(us*8.,v*4.)));
    if(m.x>=0.) tc=texture(w_atl,(vec2(mod(m.x,4.),floor(m.x/4.))+clamp(vec2(us,1.-v),.004,.996))/vec2(4.,8.)).rgb;
    float env=smoothstep(0.,.08+.4*(1.-sharp),min(u,1.-u))*smoothstep(0.,.02+.12*(1.-sharp),min(v,1.-v));
    L=(dot(tc,vec3(.3,.59,.11))*mix(.6,1.15,sharp)+.05)*env*mix(.55,1.,sharp);
    col=sharp<.5?mix(vec3(.85,.2,.06),vec3(1.,.55,.22),sharp*2.):mix(vec3(1.,.55,.22),BONE,sharp*2.-1.);
    col=mix(col,mix(BONE,tc*1.1+.04,.7),smoothstep(.7,1.,p)*.6);
    vec2 e=min(vec2(u,v),1.-vec2(u,v))*vec2(2.*S.w*S.y,2.*S.z);
    if(p>.55&&min(e.x,e.y)<1.6*w_cell){L=.95*smoothstep(.55,.8,p);col=mix(vec3(1.,.55,.25),BONE,.5);}
  }
  if(rv>w_rev-3.*w_cell){L=.95;col=vec3(1.,.88,.7);}
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
