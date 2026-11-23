// Everything you'd edit lives here. The engine (main.js) reads it; nothing in here knows about WebGL.

// Every project, essay and job is a moon. p = which planet (0 Work, 1 Writing, 2 Resume, 3 Starlee).
// status:"archive" starts it in the black hole, status:"wip" in the asteroid belt. imgs: up to two image URLs (placeholder art is drawn until then).
export const ISL=[
  {p:0,slug:'tidepool',t:'Tidepool',d:'2025',role:'Product design · front-end',tools:'Figma, SvelteKit, WebGL',
   desc:'A calm weather app that reads the sky as tides. Forecasts become slow, layered waves you can scrub through.',links:[{label:'Visit',url:''},{label:'Case study',url:''}],imgs:[],art:'waves'},
  {p:0,slug:'lantern',t:'Lantern',d:'2024',role:'Design systems lead',tools:'Figma, Storybook, React',
   desc:'A design system for a small studio: tokens, type, and forty components that ship to web and iOS from one source.',links:[{label:'Case study',url:''}],imgs:[],art:'grid'},
  {p:0,slug:'field-notes',t:'Field Notes',d:'2021',role:'Brand + editorial',tools:'InDesign, Risograph',status:'archive',
   desc:'A risograph zine series about walking the same trail every week for a year. Six issues, two colours each.',links:[],imgs:[],art:'type'},
  {p:1,slug:'on-dithering',t:'On dithering',d:'2026',role:'Essay',tools:'8 min read',
   desc:'Why a 1-bit image can feel warmer than a photograph, and what ordered noise teaches about restraint.',links:[{label:'Read',url:''}],imgs:[],art:'sphere'},
  {p:3,slug:'lumi',t:'Lumi',d:'always',role:'Her little moon',tools:'',
   desc:'A line about Lumi goes here.',links:[],imgs:[],art:'moon'},
  {p:2,slug:'bytebot',t:'ByteBot',d:'2025 — now',role:'',tools:'React, Vue, Node, Postgres',logo:0,
   desc:'Building web apps for clients.',links:[{label:'bytebot.io',url:'https://bytebot.io'}],imgs:[],art:'type'},
  {p:2,slug:'studio-2-stadium',t:'Studio 2 Stadium',d:'2023 — now',role:'',tools:'',logo:2,
   desc:'A line about what you do at Studio 2 Stadium goes here.',links:[{label:'studio2stadium.com',url:'https://studio2stadium.com'}],imgs:[],art:'type'},
  {p:2,slug:'keysight',t:'Keysight Technologies',d:'2022 — 25',role:'',tools:'',logo:1,
   desc:'A line about your work at Keysight goes here.',links:[{label:'keysight.com',url:'https://www.keysight.com'}],imgs:[],art:'type'}
];

// What each planet calls its moons, and the subtitle under its name.
export const PLN=[{noun:'project',sub:'2021–26'},{noun:'essay',sub:'latest nov'},{noun:'job',sub:'about'},{noun:'moon',sub:'Lumi'},{noun:'experiment',sub:'new'}];

// The update a comet carries when it hits a planet (Resume and Starlee are shielded). i = the moon it points at, -1 for none.
export const UPD={0:{t:'Tidepool v2 shipped',x:'Tide charts now scrub at 60fps, even on old phones.',i:0},
  1:{t:'New essay: On dithering',x:'Why a 1-bit image can feel warmer than a photograph.',i:3},
  2:{t:'Booking for spring',x:'Open for two new projects from March. Say hello.',i:-1}};

// Planet names and their numbers, by planet index.
export const APPN=['Work','Writing','Resume','Starlee','Lab'],SUP=['1','2','4','3','5'];

// Field notes for each planet (shown when you tap a landed planet; Starlee shows hers on her own on desktop).
export const FACTS=[
  {cls:'rocky · terminal world',mass:'0.8 ⊕',day:'19 h',air:'thin nitrogen',temp:'−12 °c',life:'unlikely · too cold, too dry',q:'ships things.'},
  {cls:'gas giant',mass:'41 ⊕',day:'9 h 40 m',air:'hydrogen, 1,200 km/h winds',temp:'−145 °c',life:'no · no surface to stand on',q:'a thousand drafts, all open.'},
  {cls:'ice giant',mass:'14 ⊕',day:'16 h',air:'methane, very chatty',temp:'−201 °c',life:'no · methane, far too cold',q:'quiet, on purpose.'},
  {cls:'ocean world · shielded',mass:'2.3 ⊕',day:'31 h',air:'oxygen-rich',temp:'4 °c, liquid surface',life:'yes · water, oxygen, warmth',q:'brightest at dusk.'},
  {cls:'desert world',mass:'0.4 ⊕',day:'58 h',air:'thin carbon dioxide',temp:'38 °c, dust storms',life:'maybe · microbes, deep underground',q:'always cooking something.'}
];

// Captions along Starlee's shore.
export const SCAPS=[{z:8,t:'Starlee',s:'an ocean world at dusk'},{z:30,t:'harbour lights',s:'the cities wake up when the sun goes down'},
  {z:52,t:'Lumi',s:'her little moon, always rising'},{z:74,t:'brightest at dusk',s:'keep going · the shore goes on forever'}];

// Resume, dug through layer by layer: y years, t name, x line (HTML allowed), lg logo slot, u link.
export const STRATA=[{y:'2025 — now',t:'ByteBot',x:'Building web apps for clients: React, Vue, Node and Postgres.',lg:0,u:'https://bytebot.io'},
  {y:'2023 — now',t:'Studio 2 Stadium',x:'A line about what you do at Studio 2 Stadium goes here.',lg:2,u:'https://studio2stadium.com'},
  {y:'2022 — 25',t:'Keysight Technologies',x:'A line about your work at Keysight goes here.',lg:1,u:'https://www.keysight.com'},
  {y:'2024',t:'University of Colorado, Boulder',x:'B.S. in Computer Science<br>Magna cum laude',lg:3,u:'https://www.colorado.edu'},
  {y:'the core',t:'Why I make things',x:'To slow someone down for a second, and make that second feel good.'}];

// Starlee's monoliths: moments about the two of you. img = the stone, full = the larger photo shown when you tap it.
// A stone without a photo shows placeholder art (art: orbits, waves, moon, sphere, grid).
export const MEM=[
  {t:'How we met',d:'',s:'A line about this goes here.',img:'assets/memories/how-we-met.jpg',full:'assets/memories/how-we-met-full.jpg',art:'orbits'},
  {t:'Our first trip',d:'',s:'A line about this goes here.',img:'assets/memories/our-first-trip.jpg',full:'assets/memories/our-first-trip-full.jpg',art:'waves'},
  {t:'The proposal',d:'',s:'A line about this goes here.',img:'assets/memories/the-proposal.jpg',full:'assets/memories/the-proposal-full.jpg',art:'moon'},
  {t:'Home',d:'',s:'A line about this goes here.',img:'',art:'sphere'},
  {t:'What comes next',d:'',s:'A line about this goes here.',img:'',art:'grid'}
];

