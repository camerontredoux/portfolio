// PLACEHOLDER STORY
const pad=n=>String(n).padStart(2,'0');

/** @typedef {{got:number,N:number,page:number,fragments:string[]}} State `fragments` holds only the `got` caught so far. */
/** @type {{hint:string,hintEnd:string,label:string,card:string,fragments:string[],page:string[],final:string[],
 *   commands:Record<string,string[]|((s:State,args:string[])=>string[])>,unknown:(cmd:string)=>string[]}} */
export default {
  hint:'drag the smear outward to pull it free',
  hintEnd:'the hole has nothing left to radiate',
  label:'radiated',
  card:'frag',
  fragments:[
    'if you can read this, the hole is giving me back.',
    'nothing that fell in was ever lost. it was only folded.',
    'every pair at the edge splits: one of us falls, one of us leaves.',
    'the one that leaves carries a little of what fell.',
    'for a long time it looks like noise. that is the scrambling.',
    'past the halfway mark the noise starts to agree with itself.',
    'you are reading the half that came out after the page time.',
    'each piece you catch leaves the hole smaller and hotter.',
    'small holes burn faster. you have noticed the rate climb.',
    'the last of it comes quickly, then all at once.',
    'when the hole is gone, the message is all that is left.',
    'end of placeholder. swap story.js for the real message.',
  ],
  page:['page time. half the hole has radiated.','the noise agrees with itself now.'],
  final:['message complete.','the hole is small and white. it has nothing left to say.'],
  commands:{
    help:['ls        list what has radiated','cat <n>   print a fragment','whoami    ask the hole','hawking   how it leaks'],
    ls:s=>s.got?[s.fragments.map((_,i)=>`frag.${pad(i+1)}`).join('  '),`${s.N-s.got} still inside`]:['nothing has radiated yet'],
    cat:(s,[n])=>{const i=parseInt(n,10)-1;return i>=0&&i<s.got?[s.fragments[i]]:n?[`cat: frag.${pad(n)}: not radiated yet`]:['usage: cat <n>'];},
    whoami:s=>s.got>=s.N?['a message. complete.']:['what fell in. partly.'],
    hawking:['pairs at the edge. one falls in, one gets out.','what gets out is a little of what fell.'],
    reset:['folding everything back in.'],
  },
  unknown:cmd=>[`${cmd}: no such process`],
};
