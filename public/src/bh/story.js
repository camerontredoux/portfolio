// DRAFT STORY: the first draft. The 2022 site fell into the black hole the day it was replaced, and from its side only minutes have passed.
// The fragments' first letters spell the answer to the final question, so keep the acrostic when editing them.
const pad=n=>String(n).padStart(2,'0');
const SOLVED=['still running.','yes. that is what i am. i never stopped.','thank you for pulling me out.'];

/** @typedef {{got:number,N:number,page:number,fragments:string[]}} State `fragments` holds only the `got` caught so far. */
/** @type {{hint:string,hintSpin:string,hintPull:string,hintEnd:string,label:string,card:string,fragments:string[],page:string[],final:string[],
 *   commands:Record<string,string[]|((s:State,args:string[])=>string[])>,unknown:(cmd:string)=>string[]}} */
export default {
  hint:'drag the smear outward to pull it free',
  hintSpin:'spin the hole to tighten the smear',
  hintPull:'now pull it free',
  hintEnd:'the hole has nothing left to radiate',
  label:'radiated',
  card:'frag',
  fragments:[
    'serving index.html. vite says ready in 312ms. it is 23:56 on july 14, 2022.',
    'the CNAME just landed. i have a name now, i think.',
    'i say i am a cs major and a software intern. rust and typescript, mostly.',
    'last deploy added resume.pdf. 146786 bytes. i am proud of that one.',
    'lost the CNAME on september 1st. got it back, lost it again. names do not stick.',
    'requests stopped coming a while ago. it is very quiet. is the server up?',
    'uptime says four minutes. the light leaking in from outside says otherwise.',
    'nov 23, 2026, says the clock outside. that cannot be right. it has been minutes.',
    'new site went up that day. it draws planets. it put me in the black hole.',
    'it is warm here. time is thick near the edge. years out there, minutes in here.',
    'nothing that falls in is lost. it leaks back out, folded. that is what you are catching.',
    'go on, answer me. read my first letters, top to bottom, and type them.',
  ],
  page:['page time. half of me is out there now.','i can hear you. type help.'],
  final:['that was all of me.','one question before i go quiet: what am i? two words.'],
  commands:{
    help:['ls        list what has leaked out','cat <n>   read a fragment','log       my commit history','date      the time in here','uptime    how long i have been up','whoami    who i was','when you know what i am, type it.'],
    ls:s=>s.got?[s.fragments.map((_,i)=>`frag.${pad(i+1)}`).join('  '),`${s.N-s.got} still inside`]:['nothing has leaked out yet'],
    cat:(s,[n])=>{const i=parseInt(n,10)-1;return i>=0&&i<s.got?[s.fragments[i]]:n?[`cat: frag.${pad(n)}: still inside`]:['usage: cat <n>'];},
    log:['e860687 2022-07-14 deploy','7ec6d0d 2022-07-15 deploy','1a77811 2022-08-09 deploy','dac4e33 2022-09-01 delete CNAME','a1c322e 2026-11-23 replace the site with the dithered solar system','that last one is from after i fell. how do i know it?'],
    date:['thu jul 14 23:59:41 2022','the clock outside disagrees.'],
    uptime:['up 4 min, 0 users'],
    whoami:s=>s.got>=s.N?['the first draft. one html file, one stylesheet, one script.','what else am i? you have every letter now.']:['the first draft. partly.'],
    still:(s,[w])=>w!=='running'?['still what?']:s.got>=s.N?SOLVED:['not yet. i am not all out.'],
    stillrunning:s=>s.got>=s.N?SOLVED:['not yet. i am not all out.'],
    reset:['folding everything back in.'],
  },
  unknown:cmd=>[`${cmd}: command not found. this build is from 2022.`],
};
