const pad=n=>String(n).padStart(2,'0');

/** @typedef {{h:string,at:string,lines:string[]}} Record `at` is ship time, "day hh:mm", used to sort `ls`. A `{word}` in a line stays scrambled until the player greps that word. */
/** @typedef {{id:string,first:string,last:string,role:string,fate:string}} Crew */
export default {
  hint:'drag a smear outward to pull it free',
  hintEnd:'that\'s everything the hole had. who ended up where?',
  label:'recovered',
  firstCard:'there\'s a terminal under each record. type help',
  /** @type {Record[]} */
  records:[
    {h:'#ops',at:'41 03:12',lines:[
      'dana: anyone else getting the clock drift warning',
      'dana: nav says we\'re 40s behind ground',
      'lena: it\'s the low pass. relativity. go back to sleep',
      'dana: it says 40 {minutes} now']},
    {h:'crew list',at:'01 09:00',list:true,lines:[
      'l. reyes    captain',
      'd. ruiz     pilot',
      'm. okafor   engineer',
      's. iqbal    science',
      'pod-1       2 seats']},
    {h:'MAINT-114',at:'12 14:30',lines:[
      '{thruster} 3 cuts out over 60% load',
      'opened by d.ruiz. status: wontfix',
      'mark: we never burn on 3. ask me again if we ever need it']},
    {h:'nav log',at:'41 02:58',lines:[
      '02:58:10 low pass burn start',
      '02:58:40 thr 3 fault. thrust uneven',
      '02:58:41 attitude lost',
      '02:59:30 orbit decaying',
      '02:59:30 est. {horizon} crossing 03:51 ship time']},
    {h:'#science',at:'36 19:05',lines:[
      'sam: the disc data from up here is mush. we\'re too far out',
      'sam: one low pass. ninety minutes. i\'ll cook',
      'lena: you said that last time',
      'sam: and was it good or not',
      'lena: fine. one pass. mark checks the {engine} first']},
    {h:'#random',at:'20 22:41',lines:[
      'dana: who keeps eating my crackers',
      'mark: sam',
      'sam: it\'s for science',
      'lena: it\'s theft sam']},
    {h:'#ops',at:'41 03:20',lines:[
      'mark: going aft. i can run 3 by hand if i hold the {valve} open',
      'lena: for how long',
      'mark: long enough',
      'dana: mark',
      'mark: long enough dana']},
    {h:'pre-burn checks',at:'37 08:15',lines:[
      'main engine ok',
      'thrusters 1 2 4 ok',
      'thruster 3 skipped, see MAINT-114',
      '{pod} battery 61%, charging',
      'checked by m.okafor']},
    {h:'#ops',at:'41 03:31',lines:[
      'lena: dana, sam. pod. now',
      'sam: i\'m not done',
      'lena: you\'re done',
      'dana: who\'s flying',
      'lena: i\'ve got the {helm}. go']},
    {h:'comms log',at:'41 03:44',lines:[
      '03:44:02 {uplink} open, aimed out',
      '03:44:05 queued 3.1 TB from s.{iqbal}',
      '03:44:06 send time 6h 12m',
      '03:44:06 send will not finish before crossing']},
    {h:'pod-1',at:'41 03:47',lines:[
      '03:47:30 hatch sealed',
      '03:47:31 seats taken: {one} of two',
      '03:47:40 separation clean',
      '03:48:00 beacon on']},
    {h:'engine bay',at:'41 03:49',lines:[
      '03:49:10 thr 3 manual. operator m.{okafor}',
      '03:49:10 thr 3 at 74%',
      '03:50:55 thr 3 at 74%',
      '03:51:00 thr 3 at 74%']},
    {h:'#ops',at:'41 03:50',lines:[
      'lena: pod\'s clear. nice work mark',
      'lena: sam where are you',
      'sam: {comms}. 41% sent',
      'lena: ok',
      'lena: ok. stay there']},
    {h:'outbox',at:'41 03:48',lines:[
      'voicemail, pod-1 to ana ruiz. relayed through the ship',
      'ana it\'s me. i\'m fine. i\'m in the pod',
      'sam was right behind me. he stopped at the {hatch}',
      'said someone has to send it. then he shut it',
      'tell mom i wasn\'t scared. i was. tell her anyway']},
  ],
  final:{h:'nav log',at:'41 03:51',lines:[
    '03:51:00 crossing',
    '03:51:00 crossing',
    '03:51:00 crossing',
    'uplink 41% sent. still sending']},
  /** @type {Crew[]} */
  crew:[
    {id:'reyes',first:'lena',last:'reyes',role:'captain',fate:'helm'},
    {id:'ruiz',first:'dana',last:'ruiz',role:'pilot',fate:'pod'},
    {id:'okafor',first:'mark',last:'okafor',role:'engineer',fate:'engine'},
    {id:'iqbal',first:'sam',last:'iqbal',role:'science',fate:'comms'},
  ],
  places:['helm','pod','engine','comms','airlock','bunk','lab'],
  say:{
    help:['ls                   records you have, by ship time','cat <n>              open record n','grep <word>          search every record. a burned word you name comes back',
      'who                  the crew, and where you think they ended up','fate <name> <place>  say where someone ended up','places               where they could be','clear                clear this screen'],
    lsNone:['nothing yet. pull something out'],
    ls:(n,h,at)=>`${pad(n)}  day ${at}  ${h}`,
    catUsage:['usage: cat <n>'],
    catNone:n=>[`cat: ${n}: you haven't pulled that one`],
    grepUsage:['usage: grep <word>'],
    grepNone:w=>[`no record mentions "${w}"`],
    grepHit:(n,h)=>`${pad(n)}  ${h}`,
    grepInside:(k,soon)=>`${k} more still inside${soon?". the next one out will have it":""}`,
    grepBurned:w=>`"${w}" is readable now`,
    whoNone:['no crew list yet. keep pulling'],
    who:(c,guess,locked)=>`${c.first[0]}. ${c.last.padEnd(8)} ${c.role.padEnd(9)} ${guess?guess+(locked?'  locked':''):'?'}`,
    fateUsage:['usage: fate <name> <place>. try: places'],
    fateWho:n=>[`no one called ${n} on the crew list`],
    fatePlace:p=>[`${p} isn't a place on the ship. try: places`],
    fateLocked:c=>[`${c.first} is already locked in`],
    fateNoted:(c,p)=>[`${c.first} ${c.last}: ${p}. noted`],
    fatePair:cs=>[`two of your guesses are right: ${cs.map(c=>c.first).join(' and ')}. locked in`],
    fateDone:['that\'s all four.','one more record came loose.'],
    unknown:cmd=>[`${cmd}: command not found. try help`],
  },
};
