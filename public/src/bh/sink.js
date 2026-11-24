const dots=ctx=>{const P=ctx.projects().slice(0,8),r=Math.min(ctx.W,ctx.H)*.36;
  return P.map((p,j)=>{const a=j/P.length*Math.PI*2-Math.PI/2;return {p,x:ctx.W/2+Math.cos(a)*r,y:ctx.H/2+Math.sin(a)*r};});};
export default {
  hint:'sink · stub · tap a dot to open its project',
  frame(ctx){const D=dots(ctx),v=new Float32Array(16);D.forEach((d,j)=>v.set([d.x*ctx.DPR,d.y*ctx.DPR],j*2));
    ctx.gl.uniform2fv(ctx.u('sink_dots'),v);ctx.gl.uniform1f(ctx.u('sink_n'),D.length);},
  tap(ctx,x,y){const d=dots(ctx).find(d=>Math.hypot(x-d.x,y-d.y)<24);if(d)ctx.open(d.p.i);},
};
