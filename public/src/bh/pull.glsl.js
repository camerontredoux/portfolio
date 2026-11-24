export default `
uniform vec2 pull_dots[8]; uniform float pull_n;
vec4 pull(vec2 cell){
  vec2 s=vec2((cell.x+.5)*w_cell,w_scr.y-(cell.y+.5)*w_cell);
  if(distance(s,w_ctr.xy)>w_rev) return vec4(0);
  vec2 c=w_scr*.5,d=s-c; float R=min(w_scr.x,w_scr.y)*.3, r=length(d), L=.02;
  if(r<R) L=.1+.3*step(.5,fract(r/R*6.+w_t*.3));
  for(int j=0;j<8;j++){if(float(j)>=pull_n)break;if(distance(s,pull_dots[j])<10.*w_dpr)L=1.;}
  return vec4(BONE*mix(.76,1.05,L),L>b8(cell)*.95+.04?1.:.5);
}
`;
