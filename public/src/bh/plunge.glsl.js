export default `
uniform vec4 plunge_p[8],plunge_q[8]; uniform vec2 plunge_c,plunge_s; uniform float plunge_n,plunge_R,plunge_z,plunge_v,plunge_x;
vec4 plunge(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell), d=s-plunge_c;
  float r=max(length(d),1.), sp=abs(plunge_v), tw=atan(d.y,d.x)/6.2832+.5+plunge_z*.024;
  float bin=floor(tw*150.), fa=fract(tw*150.), rh=distance(s,w_ctr.xy);
  if(rh>w_rev){
    float tear=pow(hh(vec2(bin,7.)),5.)*(1.-w_e)*1.8;
    if(rh>w_rev*(1.+tear)||fa>.4) return vec4(0);
    return vec4(mix(BONE,vec3(1.,.64,.34),.5),1.);
  }
  float W=plunge_z+plunge_R/r, q=W*3.+hh(vec2(bin,1.))*9., seg=floor(q), f=fract(q);
  float len=.18+min(.7,sp*.35)+(1.-w_e)*.5;
  float on=step(.5-min(.2,sp*.05),hh(vec2(bin,seg)))*step(f,len)*step(fa,.45);
  float L=.025+on*(.3+.45*hh(vec2(seg,bin+3.)));
  vec3 col=mix(BONE,vec3(1.,.64,.34),step(.75,hh(vec2(bin,seg+5.)))*.8);
  L*=smoothstep(.05,.45,r/plunge_R);
  float near=plunge_s.x, push=plunge_s.y, pr=(1.2+2.5*near+push*5.)*w_cell;
  L=max(L,exp(-r/(pr*(1.5+near*2.)))*(.3+.6*near));
  if(r<pr){L=.5+.5*near;col=vec3(1.,.97,.92);}
  for(int j=0;j<8;j++){if(float(j)>=plunge_n)break;
    vec4 P=plunge_p[j],Q=plunge_q[j]; vec2 e=s-P.xy;
    e-=Q.zw*dot(e,Q.zw)*(1.-1./Q.y);
    vec2 u=e/P.z*.5+.5; float pad=w_cell/P.z;
    if(u.x>-pad&&u.x<1.+pad&&u.y>-pad&&u.y<1.+pad){
      float Li=.02; vec3 ci=col;
      if(u.x>=0.&&u.x<=1.&&u.y>=0.&&u.y<=1.){
        vec4 tx=texture(w_atl,(vec2(mod(P.w,4.),floor(P.w/4.))+clamp(u,.004,.996))/vec2(4.,8.));
        Li=pow(dot(tx.rgb,vec3(.3,.59,.11)),1.2)*.9+.03; ci=mix(BONE,tx.rgb*1.15+.04,.8);
        vec2 eu=min(u,1.-u)*2.*P.z; if(min(eu.x,eu.y)<1.5*w_cell) Li=.95;
      }
      L=mix(L,Li,Q.x); col=mix(col,ci,Q.x);
    }
  }
  float rw=push*.12*plunge_R+(plunge_x>=0.?length(w_scr)*smoothstep(0.,1.1,plunge_x):0.);
  if(r<rw){L=.92-on*.7;col=mix(col,vec3(1.),.75);}
  else if(r<rw+3.*w_cell&&rw>0.){L=1.;col=vec3(1.,.9,.75);}
  return vec4(col*mix(.76,1.05,clamp(L,0.,1.)),L>b8(cell)*.95+.04?1.:.5);
}
`;
