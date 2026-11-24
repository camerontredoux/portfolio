export default `
uniform vec4 pull_s[16]; uniform vec4 pull_m[16]; uniform vec3 pull_h; uniform float pull_n,pull_t,pull_c;
uniform vec4 pull_pc,pull_ps,pull_pf;
float pull_sky(vec2 q,float cellsPerUnit){
  vec2 g=floor(q*cellsPerUnit); float L=hh(g)>.982?.45+.6*hh(g+7.):0.;
  float b=dot(q,normalize(vec2(-.35,.8)));
  return L+exp(-b*b/.3)*(.15+.45*fbm(q*2.6))*.55;
}
vec3 pull_hue(float st){return st<.5?mix(vec3(.95,.24,.08),vec3(1.,.55,.22),st*2.):mix(vec3(1.,.55,.22),BONE,st*2.-1.);}
vec3 pull_img(float slot,vec2 uv){return texture(w_atl,(vec2(mod(slot,4.),floor(slot/4.))+clamp(uv,.004,.996))/vec2(4.,8.)).rgb;}
vec4 pull_plate(vec2 s,vec2 cell){
  if(pull_pf.z<=0.||(pull_pf.x<1.&&hh(cell*1.3)>pull_pf.x)) return vec4(-1.);
  vec4 F=pull_pc; vec2 T=vec2(-sin(F.z),cos(F.z)),N=vec2(cos(F.z),sin(F.z)),q=s-F.xy;
  float ua=dot(q,T),va=dot(q,N);
  if(F.w>1e-5){vec2 o=q+N/F.w;ua=atan(dot(o,T),dot(o,N))/F.w;va=length(o)-1./F.w;}
  float u=ua/(2.*pull_ps.x)+.5,v=va/(2.*pull_ps.y)+.5,k=pull_pf.y,fr=pull_pf.w;
  if(u<0.||u>1.||v>1.) return vec4(-1.);
  if(v<0.){
    float dn=-va/w_cell,len=(1.+3.*hh(vec2(floor(ua/w_cell),3.)))*fr;
    return dn<len&&hh(cell+floor(pull_t*8.)*.71)<(1.-dn/len)*.8?vec4(1.,.3,.1,.9):vec4(-1.);
  }
  float us=clamp(u+(hh(cell+floor(pull_t*5.)*.37)-.5)*(1.-k)*.4,0.,1.);
  vec3 tc=pull_img(pull_ps.w,vec2(us,1.-v));
  float env=smoothstep(0.,.001+.3*(1.-k),min(u,1.-u))*smoothstep(0.,.001+.1*(1.-k),min(v,1.-v));
  float L=(dot(tc,vec3(.3,.59,.11))*1.1+.12)*env;
  vec3 col=mix(pull_hue(pull_ps.z),mix(BONE,tc*1.1+.04,.7),smoothstep(.75,1.,pull_ps.z)*.6);
  vec2 e=min(vec2(u,v),1.-vec2(u,v))*2.*pull_ps.xy;
  if(k>.6&&min(e.x,e.y)<1.6*w_cell){L=.95*smoothstep(.6,.9,k);col=mix(vec3(1.,.55,.25),BONE,.5);}
  if(v<.5&&e.y<1.6*w_cell) col=mix(col,vec3(1.,.3,.1),fr);
  return vec4(col,L);
}
vec4 pull(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  float rv=distance(s,w_ctr.xy);
  if(rv>w_rev) return vec4(0);
  vec2 d=s-pull_h.xy; float r=length(d), Rh=pull_h.z, x=r/Rh, th=atan(d.y,d.x);
  vec4 P=pull_plate(s,cell);
  if(r<Rh&&P.a<0.) return vec4(0.,0.,0.,.5);
  float Re=1.55, beta=x-Re*Re/x, rd=(x-Re)/.07, ring=exp(-rd*rd);
  float L=pull_sky(d/r*beta+vec2(pull_t*.004,0.),Rh/w_cell)*mix(.3,1.,smoothstep(1.,1.7,x));
  L+=ring*(.22+.2*n2(vec2(th*9.,pull_t*.2)));
  vec3 col=mix(BONE,vec3(1.,.6,.3),clamp(ring*.5+(1.-smoothstep(1.,1.5,x))*.8,0.,1.));
  float rim=1.-smoothstep(0.,2.5*w_cell,r-Rh);
  if(rim>0.){L=max(L,rim*.75);col=mix(col,vec3(1.,.36,.14),rim);}
  float top=-1.;
  for(int j=0;j<16;j++){if(float(j)>=pull_n)break;
    vec4 S=pull_s[j],m=pull_m[j];
    if(m.w<=0.) continue;
    float da=atan(sin(th-S.x),cos(th-S.x)), u=da/(2.*S.w)+.5, v=(r-(S.y-S.z))/(2.*S.z), p=m.y;
    float cv=pull_c*m.w*(1.-clamp(p*3.,0.,1.));
    if(cv>0.){
      float tt=abs(da)*r, sz=2.5*w_cell;
      for(int c=0;c<2;c++){
        float yy=r-S.y-S.z-(2.+3.5*float(c))*w_cell;
        if(yy>=0.&&yy<=sz&&tt<sz&&abs(sz-tt-yy)<.75*w_cell){
          float on=pull_t>0.?step(fract(pull_t*.7-float(c)*.3+float(j)*.11),.5):1.;
          L=max(L,.95*cv*mix(.35,1.,on));col=vec3(1.,.55,.22);
        }
      }
    }
    if(u<0.||u>1.||v<0.||v>1.||p<top) continue;
    top=p;
    float sharp=clamp(mix(.15*(1.-m.z),1.,p),0.,1.);
    float us=clamp(u+(hh(cell+floor(pull_t*5.)*.37)-.5)*(1.-sharp)*.5,0.,1.);
    vec3 tc=m.x>=0.?pull_img(m.x,vec2(us,1.-v)):vec3(.55+.4*n2(vec2(us*8.,v*4.)));
    float env=smoothstep(0.,.05+.22*(1.-sharp),min(u,1.-u))*smoothstep(0.,.03+.08*(1.-sharp),min(v,1.-v));
    L=(dot(tc,vec3(.3,.59,.11))*mix(.8,1.15,sharp)+.3)*env*m.w;
    col=mix(pull_hue(.5*min(p,1.)),mix(BONE,tc*1.1+.04,.7),smoothstep(.7,1.,p)*.4);
  }
  if(P.a>=0.){L=P.a;col=P.rgb;}
  if(rv>w_rev-3.*w_cell){L=.95;col=vec3(1.,.88,.7);}
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
