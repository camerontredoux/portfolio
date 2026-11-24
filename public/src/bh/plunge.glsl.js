export default `
uniform vec2 plunge_dots[8]; uniform float plunge_n;
vec4 plunge(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  if(distance(s,w_ctr.xy)>w_rev) return vec4(0);
  vec2 c=w_scr*.5,d=s-c; float R=min(w_scr.x,w_scr.y)*.3, r=length(d), L=.02;
  if(r<R) L=.1+.3*step(.5,fract(atan(d.y,d.x)/6.2832*12.));
  for(int j=0;j<8;j++){if(float(j)>=plunge_n)break;if(distance(s,plunge_dots[j])<10.*w_dpr)L=1.;}
  return vec4(BONE*mix(.76,1.05,L),L>b8(cell)*.95+.04?1.:.5);
}
`;
