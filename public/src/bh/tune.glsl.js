export default `
uniform vec2 tune_dots[8]; uniform float tune_n;
vec4 tune(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  if(distance(s,w_ctr.xy)>w_rev) return vec4(0);
  vec2 c=w_scr*.5,d=s-c; float R=min(w_scr.x,w_scr.y)*.3, r=length(d), L=.02;
  if(r<R) L=.1+.3*step(.5,fract((s.x-c.x)/R*5.));
  for(int j=0;j<8;j++){if(float(j)>=tune_n)break;if(distance(s,tune_dots[j])<10.*w_dpr)L=1.;}
  return vec4(BONE*mix(.76,1.05,L),L>b8(cell)*.95+.04?1.:.5);
}
`;
