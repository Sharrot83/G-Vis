/* G-vis svarvläge: tolkar svarvkod (Hass), ritar ämnet och svarvar bort material i 2D och 3D.
   Laddas i <head> före G-vis. G-vis anropar gvLathe på några ställen när window.GV_SVARV är sant:
   parseGcode, render (2D och 3D), verktyget, HUD-rutan, Förklara rad, Ämne och Verktyg i inspektören, Exempel-menyn.
   Koordinater: på svarven är X diameter och Z längs axeln, Z0 på planytan. I ritningen ligger Z åt höger och radien (X/2) uppåt. */
(function(){
'use strict';
const KEY='gvis-maskin',LS_AMNE='gvis-svarv-amne';
let on=false;try{on=localStorage.getItem(KEY)==='svarv';}catch(e){}
window.GV_SVARV=on;
const t=s=>(window.cncT||String)(s);
/* G-vis egna variabler (let och const i sidans skript) */
const PATHS=()=>{try{return paths||[];}catch(e){return [];}};
const PLAYING=()=>{try{return animReq!=null;}catch(e){return false;}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EN=()=>!!(window.cncI18n&&cncI18n.lang==='en');
const nf=(v,d=2)=>{const r=Math.round(v*10**d)/10**d;return String(Object.is(r,-0)?0:r).replace('.',EN()?'.':',').replace('-','−');};

/* ---------- revolvern: verktyg på svarven ---------- */
/* typ: od = utvändig svarvning, gr = stick/spår (bredd w), th = gänga, id = invändig (borrstång), dr = borr (diameter d) */
const TOOLS=[
 {t:1,name:'Grovsvarvstål CNMG 80° R0,8',typ:'od',nr:.8,w:6},
 {t:2,name:'Finsvarvstål DNMG 55° R0,4',typ:'od',nr:.4,w:5},
 {t:3,name:'Stickstål 3 mm',typ:'gr',nr:.2,w:3},
 {t:4,name:'Gängstål 60° utvändig',typ:'th',nr:.1,w:3},
 {t:5,name:'Borr Ø20',typ:'dr',d:20},
 {t:6,name:'Borrstång Ø16 R0,4',typ:'id',nr:.4,w:5},
 {t:7,name:'Centrumborr Ø5',typ:'dr',d:5}];
const tool=n=>{n=Number(n);if(!Number.isFinite(n))return null;return TOOLS.find(x=>x.t===n)||null;};

/* ---------- ämnet ---------- */
const MATS=[['s235','Stål S235'],['c45','Stål C45E'],['ss2343','Rostfritt 1.4404'],['al6082','Aluminium EN AW-6082'],['ms','Mässing CuZn39Pb3'],['pom','Plast POM']];
let A={d:50,l:80,face:1,mat:'s235'};try{Object.assign(A,JSON.parse(localStorage.getItem(LS_AMNE)||'{}'));}catch(e){}
const saveA=()=>{try{localStorage.setItem(LS_AMNE,JSON.stringify(A));}catch(e){}};
const HOME=()=>({x:Math.max(120,A.d+60),z:100});

/* ---------- tolken ---------- */
function words(raw){const s=raw.replace(/\([^)]*\)/g,' ').replace(/;.*$/,'').toUpperCase();const W={},G=[],M=[];let N=null;
  const re=/([A-Z])\s*([-+]?\d*\.?\d+)/g;let m;while((m=re.exec(s))){const L=m[1],v=parseFloat(m[2]);if(L==='G')G.push(v);else if(L==='M')M.push(Math.round(v));else if(L==='N')N=v;else W[L]=v;}
  return {W,G,M,N,empty:!/[A-Z]/.test(s)};}
function parse(text){
  const lines=text.split(/\r?\n/),B=lines.map(words),res=[],warnings=[],cautions=[];
  const Nidx={};B.forEach((b,i)=>{if(b.N!=null&&Nidx[b.N]==null)Nidx[b.N]=i;});
  const S={x:HOME().x,z:HOME().z,units:1,motion:0,feedRev:true,F:null,css:null,rpm:0,max:4000,spin:false,T:null,cyc:null,cp:{},g71:{d:1.5,e:.5},comp:40,ended:null};
  let total=0,minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9,dwell=0,stopBefore=null;const warned={};
  const warnOnce=(k,s)=>{if(!warned[k]){warned[k]=1;warnings.push(s);}};
  const P=p=>({x:p.z,y:p.x/2,z:0});
  function rpmAt(xd){if(!S.spin)return 0;if(S.css){const D=Math.max(Math.abs(xd),1);return Math.min(S.max,Math.round(S.css*1000/(Math.PI*D)));}return S.rpm;}
  function feedMin(xd){if(S.F==null)return null;if(!S.feedRev)return S.F;const n=rpmAt(xd);return n>0?S.F*n:null;}
  function push(type,a,b,o){o=o||{};let pts,center=null,arcRadius=null,bad=false;
    if(type===2||type===3){const A0=P(a),B0=P(b);let c=null;
      if(o.R!=null){const R=Math.abs(o.R),dx=B0.x-A0.x,dy=B0.y-A0.y,d=Math.hypot(dx,dy);
        if(d<1e-9||d>2*R+1e-6){bad=true;}else{const h=Math.sqrt(Math.max(0,R*R-d*d/4)),mx=(A0.x+B0.x)/2,my=(A0.y+B0.y)/2,ux=-dy/d,uy=dx/d;
          // G02 är medurs i ritningen (Z åt höger, X uppåt). Kort båge om R > 0.
          const cw=type===2,s=(cw?-1:1)*(o.R<0?-1:1);c={x:mx+ux*h*s,y:my+uy*h*s};}}
      else c={x:A0.x+(o.K||0),y:A0.y+(o.I||0)};
      if(c&&!bad){const r0=Math.hypot(A0.x-c.x,A0.y-c.y),r1=Math.hypot(B0.x-c.x,B0.y-c.y);if(Math.abs(r0-r1)>Math.max(.02,r0*.002))bad=true;}
      if(c&&!bad){const r=Math.hypot(A0.x-c.x,A0.y-c.y);let a0=Math.atan2(A0.y-c.y,A0.x-c.x),a1=Math.atan2(B0.y-c.y,B0.x-c.x);
        if(type===2){while(a1>=a0-1e-9)a1-=2*Math.PI;}else{while(a1<=a0+1e-9)a1+=2*Math.PI;}
        const n=Math.max(6,Math.ceil(Math.abs(a1-a0)/(Math.PI/36)));pts=[];for(let k=0;k<=n;k++){const q=a0+(a1-a0)*k/n;pts.push({x:c.x+r*Math.cos(q),y:c.y+r*Math.sin(q),z:0});}
        pts[pts.length-1]={...B0};center={x:c.x,y:c.y,z:0};arcRadius=r;}
      else{pts=[A0,B0];warnings.push(t('Rad')+' '+o.line+': '+t('bågen går inte ihop. Kontrollera R eller I och K.'));}}
    else pts=[P(a),P(b)];
    for(let i=1;i<pts.length;i++)total+=Math.hypot(pts[i].x-pts[i-1].x,pts[i].y-pts[i-1].y);
    // vyn anpassas efter ämnet och skärande rörelser, inte efter snabbtransporter till hemläget
    if(type!==0||pts.every(p=>p.x<A.face+30&&Math.abs(p.y)<A.d/2+30))pts.forEach(p=>{minX=Math.min(minX,p.x);maxX=Math.max(maxX,p.x);minY=Math.min(minY,p.y);maxY=Math.max(maxY,p.y);});
    const xm=(a.x+b.x)/2;
    const sg={type,pts,centerPts:pts.map(p=>({...p})),center,arcRadius,invalidGeometry:bad,line:o.line,raw:lines[o.line-1]||'',gCodes:o.G||[],mCodes:o.M||[],w:o.W||{},
      F:S.F,feedMmPerMin:type===0?null:feedMin(xm),S:rpmAt(xm),T:S.T,H:null,D:null,wcs:1,plane:17,cutterCompMode:0,cutterCompRadius:0,compTransitionKind:null,compTransition:false,
      preDwellSec:dwell,preStop:stopBefore,stopAfter:null,lathe:{a:{...a},b:{...b},thread:!!o.thread}};
    dwell=0;stopBefore=null;
    if(!S.quiet&&type!==0&&S.F==null)warnOnce('F',t('Rad')+' '+o.line+': '+t('matning F saknas. Skriv F i mm per varv (G99).'));
    if(!S.quiet&&type!==0&&!S.spin)warnOnce('S',t('Rad')+' '+o.line+': '+t('verktyget skär men spindeln står still. Starta den med M03 eller M04.'));
    res.push(sg);return sg;}
  const tgt=(W,cur)=>{const p={...cur};if(W.X!=null)p.x=W.X*S.units;if(W.U!=null)p.x=cur.x+W.U*S.units;if(W.Z!=null)p.z=W.Z*S.units;if(W.W!=null)p.z=cur.z+W.W*S.units;return p;};
  const hasXZ=W=>W.X!=null||W.Z!=null||W.U!=null||W.W!=null;
  function move(b,ln,type){const a={x:S.x,z:S.z},e=tgt(b.W,a);if(Math.abs(a.x-e.x)<1e-9&&Math.abs(a.z-e.z)<1e-9&&type<2)return;
    push(type,a,e,{line:ln,G:b.G,M:b.M,W:b.W,R:b.W.R!=null?b.W.R*S.units:null,I:b.W.I!=null?b.W.I*S.units:0,K:b.W.K!=null?b.W.K*S.units:0,thread:type===32});
    S.x=e.x;S.z=e.z;}
  const go=(type,x,z,ln,o)=>{const a={x:S.x,z:S.z},e={x,z};if(Math.abs(a.x-e.x)<1e-9&&Math.abs(a.z-e.z)<1e-9)return;push(type,a,e,Object.assign({line:ln},o||{}));S.x=x;S.z=z;};
  /* G90 längd, G92 gänga, G94 plan: start där verktyget står */
  function cycle(kind,b,ln){const cp=S.cp;if(b.W.F!=null)S.F=b.W.F;const st={x:S.x,z:S.z},e=tgt(b.W,{x:cp.x!=null?cp.x:st.x,z:cp.z!=null?cp.z:st.z});cp.x=e.x;cp.z=e.z;
    const R=(b.W.R!=null?(cp.R=b.W.R*S.units):(cp.R||0)),K=(b.W.K!=null?(cp.K=b.W.K*S.units):(cp.K||0));
    if(kind===94){go(0,st.x,e.z+K,ln);go(1,e.x,e.z,ln);go(1,e.x,st.z,ln);go(0,st.x,st.z,ln);return;}
    go(0,e.x+2*R,st.z,ln);go(1,e.x,e.z,ln,{thread:kind===92});if(kind===92)go(0,st.x,e.z,ln);else go(1,st.x,e.z,ln);go(0,st.x,st.z,ln);}
  /* profilen N P till N Q, som punkter med bågar uppdelade */
  function profile(p,q){const i0=Nidx[p],i1=Nidx[q];if(i0==null||i1==null||i1<i0)return null;
    const sv={x:S.x,z:S.z,motion:S.motion,F:S.F},pts=[{x:S.x,z:S.z}];const n0=res.length;S.quiet=true;
    for(let i=i0;i<=i1;i++){const b=B[i];b.G.forEach(g=>{if([0,1,2,3].includes(g))S.motion=g;});if(hasXZ(b.W))move(b,i+1,S.motion);}
    const segs=res.splice(n0);segs.forEach(s=>s.pts.forEach((pt,k)=>{if(k)pts.push({x:pt.y*2,z:pt.x});}));
    S.x=sv.x;S.z=sv.z;S.motion=sv.motion;S.F=sv.F;S.quiet=false;return {pts,end:i1};}
  /* diametern på profilen vid z (profilen är monoton: diametern växer när z minskar) */
  function g71(b,ln){const W=b.W;if(W.P==null||W.Q==null){warnings.push(t('Rad')+' '+ln+': '+t('G71 behöver P och Q, N-numren där profilen börjar och slutar.'));return null;}
    const pr=profile(W.P,W.Q);if(!pr){warnings.push(t('Rad')+' '+ln+': '+t('G71 hittar inte raderna N')+W.P+' '+t('och N')+W.Q+'.');return null;}
    if(W.F!=null)S.F=W.F;const d=(W.D!=null?W.D*S.units:S.g71.d),e=S.g71.e,u=(W.U||0)*S.units,w=(W.W||0)*S.units;
    const prof=pr.pts.map(p=>({x:p.x+u,z:p.z+w})),xs=S.x,zs=S.z;
    const xAt=z=>{let best=null;for(let i=1;i<prof.length;i++){const a=prof[i-1],c=prof[i];const lo=Math.min(a.z,c.z),hi=Math.max(a.z,c.z);if(z<lo-1e-9||z>hi+1e-9)continue;const x=Math.abs(c.z-a.z)<1e-9?Math.max(a.x,c.x):a.x+(c.x-a.x)*(z-a.z)/(c.z-a.z);best=best==null?x:Math.min(best,x);}return best;};
    const zEnd=Math.min(...prof.map(p=>p.z)),xMin=Math.min(...prof.map(p=>p.x));
    let x=xs,n=0;
    while(x-2*d>xMin-1e-6&&n<200){x-=2*d;n++;let zc=zEnd;for(let z=zs;z>=zEnd;z-=.05){const xp=xAt(z);if(xp!=null&&xp>x+1e-6){zc=z;break;}}
      go(0,x,zs,ln);go(1,x,zc,ln);go(1,x+2*e,zc+e,ln);go(0,x+2*e,zs,ln);}
    // sista draget följer profilen med tillägget kvar
    go(0,prof[0].x,zs,ln);for(let i=1;i<prof.length;i++)go(1,prof[i].x,prof[i].z,ln);go(0,xs,prof[prof.length-1].z,ln);go(0,xs,zs,ln);
    return pr.end;}
  /* G76 gänga: Hass på en rad (X Z K D F A) eller Fanuc på två rader */
  function g76(b,ln){const W=b.W;if(W.X==null&&W.U==null&&W.P!=null){S.g76={q:(W.Q||0)/1000,r:(W.R||0)};return;}
    let K=W.K!=null?W.K*S.units:(W.P!=null?W.P/1000:null),D=W.D!=null?W.D*S.units:(W.Q!=null?W.Q/1000:null);if(W.F!=null)S.F=W.F;
    if(K==null||D==null){warnings.push(t('Rad')+' '+ln+': '+t('G76 behöver gängdjupet K och första skärdjupet D.'));return;}
    const xs=S.x,zs=S.z,e=tgt(W,{x:xs,z:zs}),maj=e.x+2*K;let k=1,dep=Math.min(D,K);
    while(k<60){go(0,maj-2*dep,zs,ln);go(1,maj-2*dep,e.z,ln,{thread:true});go(0,xs,e.z,ln);go(0,xs,zs,ln);if(dep>=K-1e-6)break;k++;dep=Math.min(K,D*Math.sqrt(k));}}
  let i=0,guard=0;
  while(i<B.length&&guard++<20000){const b=B[i],ln=i+1;if(b.empty){i++;continue;}
    const G=b.G,W=b.W;let skipTo=null,moved=false;
    if(G.includes(20))S.units=25.4;if(G.includes(21))S.units=1;
    if(G.includes(98))S.feedRev=false;if(G.includes(99))S.feedRev=true;
    if(G.includes(40))S.comp=40;if(G.includes(41)||G.includes(42)){S.comp=G.includes(41)?41:42;warnOnce('comp',t('Nosradiekompensering (G41/G42) visas inte i ritningen. Banan ritas som den är programmerad.'));}
    if(G.includes(50)){if(W.S!=null)S.max=W.S;if(W.X!=null||W.Z!=null)warnOnce('g50',t('Rad')+' '+ln+': '+t('G50 med X eller Z flyttar nollpunkten. Det stöds inte här, använd G54.'));}
    if(G.includes(96)){S.css=W.S!=null?W.S:S.css;}else if(G.includes(97)){S.css=null;if(W.S!=null)S.rpm=W.S;}else if(W.S!=null&&!G.includes(50)){if(S.css)S.css=W.S;else S.rpm=W.S;}
    if(W.F!=null&&!G.some(g=>[71,76].includes(g)))S.F=W.F;
    if(W.T!=null){const n=Math.round(W.T);S.T=n>=100?Math.floor(n/100):n;if(!tool(S.T))warnOnce('T'+S.T,t('Rad')+' '+ln+': '+t('verktyget T')+S.T+' '+t('finns inte i revolvern.'));}
    b.M.forEach(m=>{if(m===3||m===4)S.spin=true;if(m===5)S.spin=false;if(m===0||m===1)stopBefore='M0'+m;});
    if(G.includes(4)){const p=W.P!=null?W.P/1000:(W.X||W.U||0);dwell+=p;}
    if(G.includes(28)||G.includes(53)){const H=HOME();const x=(W.U!=null||W.X!=null||!(W.W!=null||W.Z!=null))?H.x:S.x,z=(W.W!=null||W.Z!=null||!(W.U!=null||W.X!=null))?H.z:S.z;go(0,x,z,ln);i++;continue;}
    const gm=G.find(g=>[0,1,2,3,32].includes(g));if(gm!=null){S.motion=gm;S.cyc=null;}
    const gc=G.find(g=>[90,92,94].includes(g));if(gc!=null){S.cyc=gc;S.cp={};}
    if(G.includes(80))S.cyc=null;
    if(G.includes(71)){if(W.P==null&&W.Q==null){if(W.U!=null)S.g71.d=W.U*S.units;if(W.R!=null)S.g71.e=W.R*S.units;}else skipTo=g71(b,ln);moved=true;}
    else if(G.includes(72)||G.includes(73)||G.includes(74)||G.includes(75)){warnOnce('g'+G.join(),t('Rad')+' '+ln+': '+t('G72–G75 stöds inte än i svarvläget.'));moved=true;}
    else if(G.includes(70)){const pr=W.P!=null&&W.Q!=null?profile(W.P,W.Q):null;if(!pr)warnings.push(t('Rad')+' '+ln+': '+t('G70 behöver P och Q, N-numren där profilen börjar och slutar.'));
      else{const n0=res.length,sv={x:S.x,z:S.z};for(let j=Nidx[W.P];j<=pr.end;j++){const bb=B[j];bb.G.forEach(g=>{if([0,1,2,3].includes(g))S.motion=g;});if(bb.W.F!=null)S.F=bb.W.F;if(hasXZ(bb.W))move(bb,j+1,S.motion);}
        for(let j=n0;j<res.length;j++)res[j].line=ln;go(0,sv.x,S.z,ln);go(0,sv.x,sv.z,ln);}moved=true;}
    else if(G.includes(76)){g76(b,ln);moved=true;}
    else if(gc!=null||(S.cyc&&hasXZ(W)&&gm==null)){cycle(S.cyc,b,ln);moved=true;}
    if(!moved&&hasXZ(W))move(b,ln,S.motion);
    if(b.M.includes(30)||b.M.includes(2)){S.ended={code:'M'+(b.M.includes(30)?'30':'02'),line:ln};break;}
    if(b.M.includes(98)||b.M.includes(97))warnOnce('m98',t('Rad')+' '+ln+': '+t('underprogram (M97/M98) stöds inte än i svarvläget.'));
    i=skipTo!=null?skipTo+1:i+1;}
  // ämnet hör till bilden
  minX=Math.min(minX,-A.l-20);maxX=Math.max(maxX,A.face+10);minY=Math.min(minY,-A.d/2-4);maxY=Math.max(maxY,A.d/2+8);
  if(!res.length){minX=-A.l-5;maxX=5;minY=-A.d/2-2;maxY=A.d/2+2;}
  check(res,warnings,cautions);
  return {paths:res,bounds:{minX,maxX,minY,maxY,minZ:0,maxZ:0},totalLength:total,endPos:{x:S.z,y:S.x/2,z:0},trailingDwellSec:dwell,pendingStopBefore:stopBefore,endedBy:S.ended,
    finalMode:{units:S.units,absolute:true,motion:S.motion,plane:18,wcs:1,activeTool:S.T,cutterCompMode:0,cutterCompD:null,lengthCompActive:false,lengthCompH:null},warnings,cautions};}

/* ---------- materialet: ytterradie och innerradie per 0,1 mm längs Z ---------- */
const DZ=.1;let MAT=null;
function matNew(){const z0=-A.l,z1=A.face,n=Math.ceil((z1-z0)/DZ)+1;MAT={z0,n,ro:new Float32Array(n).fill(A.d/2),ri:new Float32Array(n).fill(0),seg:0,pt:0,ver:0};}
const zi=z=>Math.round((z-MAT.z0)/DZ);
function cutAt(z,r,T){const tl=tool(T);if(!tl||!MAT)return false;let hit=false;
  const lo=k=>Math.max(0,k),hi=k=>Math.min(MAT.n-1,k);
  if(tl.typ==='dr'){const R=tl.d/2;for(let k=lo(zi(z));k<MAT.n;k++){if(MAT.ri[k]<R&&MAT.ro[k]>MAT.ri[k]){MAT.ri[k]=Math.min(R,MAT.ro[k]);hit=true;}}return hit;}
  if(tl.typ==='id'){for(let k=lo(zi(z-tl.nr));k<=hi(zi(z+tl.w));k++){if(MAT.ri[k]<r&&MAT.ro[k]>MAT.ri[k]){MAT.ri[k]=Math.min(r,MAT.ro[k]);hit=true;}}return hit;}
  if(tl.typ==='th'){const h=1.2;for(let k=lo(zi(z-h));k<=hi(zi(z+h));k++){const rr=r+Math.abs(MAT.z0+k*DZ-z)*1.732;if(MAT.ro[k]>rr){MAT.ro[k]=Math.max(rr,MAT.ri[k]);hit=true;}}return hit;}
  const a=tl.typ==='gr'?0:-tl.nr,b=tl.typ==='gr'?tl.w:tl.w;
  for(let k=lo(zi(z+a));k<=hi(zi(z+b));k++){if(MAT.ro[k]>r){MAT.ro[k]=Math.max(r,MAT.ri[k]);hit=true;}}return hit;}
/* kör materialet fram till playPos (index och punkt). Bakåt = börja om. */
function simTo(paths,pos){if(!MAT)matNew();const si=pos?pos.segIndex:paths.length,pp=pos?pos.point:null;
  if(si<MAT.seg){matNew();}
  for(let s=MAT.seg;s<Math.min(si+1,paths.length);s++){const sg=paths[s];if(sg.type===0){MAT.seg=s+1;continue;}
    let P=sg.pts;if(s===si&&pp){P=sg.pts.slice(0,(pos.pointIndex||0)+1).concat([pp]);}
    for(let j=1;j<P.length;j++){const a=P[j-1],c=P[j],L=Math.hypot(c.x-a.x,c.y-a.y),n=Math.max(1,Math.ceil(L/.2));
      for(let k=0;k<=n;k++){const q=k/n;cutAt(a.x+(c.x-a.x)*q,Math.abs(a.y+(c.y-a.y)*q),sg.T);}}
    if(s<si||!pos)MAT.seg=s+1;}
  MAT.ver++;}
/* kontroll efter tolkningen: snabbtransport genom materialet */
function check(res,warnings,cautions){matNew();let crash=0;
  for(const sg of res){if(sg.type!==0){for(let j=1;j<sg.pts.length;j++){const a=sg.pts[j-1],c=sg.pts[j],n=Math.max(1,Math.ceil(Math.hypot(c.x-a.x,c.y-a.y)/.3));for(let k=0;k<=n;k++)cutAt(a.x+(c.x-a.x)*k/n,Math.abs(a.y+(c.y-a.y)*k/n),sg.T);}continue;}
    if(crash>2)continue;
    for(let j=1;j<sg.pts.length;j++){const a=sg.pts[j-1],c=sg.pts[j],n=Math.max(1,Math.ceil(Math.hypot(c.x-a.x,c.y-a.y)/.3));
      for(let k=1;k<n;k++){const z=a.x+(c.x-a.x)*k/n,r=Math.abs(a.y+(c.y-a.y)*k/n),q=zi(z);if(q<0||q>=MAT.n)continue;
        if(r<MAT.ro[q]-.2&&r>MAT.ri[q]+.2){warnings.push(t('Rad')+' '+sg.line+': '+t('snabbtransporten går genom materialet. Kör ut ur ämnet med G00 först i X, sedan i Z.'));crash++;k=n;j=sg.pts.length;}}}}
  MAT=null;}

/* ---------- 2D: ämnet, centrumlinjen och chucken ---------- */
function draw2D(ctx,project,scale,pos){if(!MAT)matNew();const paths=PATHS();try{simTo(paths,pos);}catch(e){}
  const light=document.documentElement.getAttribute('data-theme')==='light';
  const S=(z,r)=>project({x:z,y:r,z:0});
  // chucken
  const cj=S(-A.l-18,A.d/2+6),cj2=S(-A.l+0,A.d/2*0.35);ctx.fillStyle='rgba(120,130,140,.35)';
  ctx.fillRect(cj.x,cj.y,cj2.x-cj.x,cj2.y-cj.y);const cl=S(-A.l-18,-A.d/2*0.35),cl2=S(-A.l,-A.d/2-6);ctx.fillRect(cl.x,cl.y,cl2.x-cl.x,cl2.y-cl.y);
  // ämnet: övre halvan tydlig, undre halvan svag (spegelbild)
  [[1,'rgba(176,186,198,.55)'],[-1,'rgba(176,186,198,.22)']].forEach(([sg,col])=>{ctx.beginPath();
    for(let k=0;k<MAT.n;k++){const p=S(MAT.z0+k*DZ,sg*MAT.ro[k]);k?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
    for(let k=MAT.n-1;k>=0;k--){const p=S(MAT.z0+k*DZ,sg*MAT.ri[k]);ctx.lineTo(p.x,p.y);}
    ctx.closePath();ctx.fillStyle=col;ctx.fill();ctx.strokeStyle='rgba(210,218,228,.75)';ctx.lineWidth=1;ctx.stroke();});
  // centrumlinjen
  const a=S(-A.l-25,0),b=S(A.face+15,0);ctx.strokeStyle='#c9a35c';ctx.lineWidth=1;ctx.setLineDash([12,4,2,4]);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.setLineDash([]);}
/* verktyget som en skärplatta vid spetsen */
function marker(ctx,p,T,scale){const tl=tool(T);ctx.save();ctx.translate(p.x,p.y);const s=Math.max(scale,2);
  ctx.fillStyle='rgba(255,214,102,.85)';ctx.strokeStyle='#ffd666';ctx.lineWidth=1;ctx.beginPath();
  if(!tl||tl.typ==='od'){ctx.moveTo(0,0);ctx.lineTo(6*s,-2*s);ctx.lineTo(8*s,-8*s);ctx.lineTo(2*s,-6*s);}
  else if(tl.typ==='gr'){ctx.rect(0,-10*s,tl.w*s,10*s);}
  else if(tl.typ==='th'){ctx.moveTo(0,0);ctx.lineTo(1.5*s,-2.6*s);ctx.lineTo(1.5*s,-10*s);ctx.lineTo(-1.5*s,-10*s);ctx.lineTo(-1.5*s,-2.6*s);}
  else if(tl.typ==='id'){ctx.moveTo(0,0);ctx.lineTo(5*s,2*s);ctx.lineTo(30*s,2*s);ctx.lineTo(30*s,-4*s);ctx.lineTo(3*s,-4*s);}
  else if(tl.typ==='dr'){const r=tl.d/2*scale;ctx.moveTo(0,0);ctx.lineTo(r*.6,-r);ctx.lineTo(40*s,-r);ctx.lineTo(40*s,r);ctx.lineTo(r*.6,r);}
  ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();}

/* ---------- 3D: det svarvade ämnet som roterar ---------- */
let V=null;
function show3D(v){const host=document.getElementById('rtView');if(!host)return;
  if(v&&!V){if(!window.THREE)return;const el=document.createElement('div');el.id='gvLathe3D';el.style.cssText='position:absolute;inset:0;z-index:3';const wh=document.getElementById('webglHost');host.insertBefore(el,wh?wh.nextSibling:null);
    const R=new THREE.WebGLRenderer({antialias:true});R.setPixelRatio(Math.min(2,devicePixelRatio||1));el.appendChild(R.domElement);
    const sc=new THREE.Scene(),cam=new THREE.PerspectiveCamera(40,1,.5,5000);const D=Math.max(A.l,A.d)*1.5+40;cam.position.set(-A.l/2+D*.25,D*.45,D);
    const ctl=new THREE.OrbitControls(cam,R.domElement);ctl.enableDamping=true;ctl.target.set(-A.l/2,0,0);
    sc.add(new THREE.AmbientLight(0xffffff,.45));const d1=new THREE.DirectionalLight(0xffffff,.8);d1.position.set(60,120,90);sc.add(d1);const d2=new THREE.DirectionalLight(0xffffff,.35);d2.position.set(-80,-40,-60);sc.add(d2);
    const g=new THREE.Group();sc.add(g);
    V={el,R,sc,cam,ctl,g,mesh:null,ver:-1,tool:null,chuck:null,ang:0};
    const fit=()=>{const r=el.getBoundingClientRect();R.setSize(r.width,r.height);cam.aspect=r.width/Math.max(1,r.height);cam.updateProjectionMatrix();};fit();V.fit=fit;addEventListener('resize',fit);try{new ResizeObserver(fit).observe(el);}catch(e){}
    const loop=()=>{if(!V)return;V.raf=requestAnimationFrame(loop);V.ctl.update();if(V.mesh&&PLAYING()){V.ang+=.06;V.mesh.rotation.x=V.ang;}theme();V.R.render(V.sc,V.cam);};loop();}
  if(V){const was=V.el.style.display!=='none';V.el.style.display=v?'':'none';if(v&&!was)V.fit();}}
function theme(){if(!V)return;const l=document.documentElement.getAttribute('data-theme')==='light';const c=l?0xe6eaef:0x2b3137;if(V.bg!==c){V.bg=c;V.sc.background=new THREE.Color(c);}}
const MATCOL={s235:0x9aa3ad,c45:0x8f979f,ss2343:0xc3c9cf,al6082:0xd5d9de,ms:0xd8b45a,pom:0xf2f0e8};
function update3D(pos){if(!V)return;const paths=PATHS();if(!MAT)matNew();try{simTo(paths,pos);}catch(e){}
  if(V.ver!==MAT.ver){V.ver=MAT.ver;if(V.mesh){V.g.remove(V.mesh);V.mesh.geometry.dispose();}
    const pts=[],step=Math.max(1,Math.round(.3/DZ));
    // profilen runt: utsidan från chucken till planytan, planytan in till hålet, hålet tillbaka
    for(let k=0;k<MAT.n;k+=step)pts.push(new THREE.Vector2(Math.max(.01,MAT.ro[k]),MAT.z0+k*DZ));
    const kl=MAT.n-1;pts.push(new THREE.Vector2(Math.max(.01,MAT.ro[kl]),MAT.z0+kl*DZ));pts.push(new THREE.Vector2(Math.max(.01,MAT.ri[kl]),MAT.z0+kl*DZ));
    for(let k=kl;k>=0;k-=step)pts.push(new THREE.Vector2(Math.max(.01,MAT.ri[k]),MAT.z0+k*DZ));
    const geo=new THREE.LatheGeometry(pts.reverse(),96);geo.computeVertexNormals();
    const m=new THREE.MeshStandardMaterial({color:MATCOL[A.mat]||0x9aa3ad,metalness:.55,roughness:.38,side:THREE.DoubleSide});
    const mesh=new THREE.Mesh(geo,m);const hold=new THREE.Group();hold.add(mesh);hold.rotation.z=-Math.PI/2;mesh.rotation.x=0;
    V.g.add(hold);V.mesh=hold;V.mesh.rotation.x=V.ang;
    if(!V.chuck){const ch=new THREE.Mesh(new THREE.CylinderGeometry(A.d/2+14,A.d/2+14,22,48),new THREE.MeshStandardMaterial({color:0x3d444c,metalness:.6,roughness:.5}));ch.rotation.z=Math.PI/2;ch.position.x=-A.l-11;V.g.add(ch);V.chuck=ch;}}
  // verktyget
  const sg=pos?paths[pos.segIndex]:paths[paths.length-1];const pt=pos?pos.point:(sg?sg.pts[sg.pts.length-1]:null);
  if(!V.tool){const tm=new THREE.Mesh(new THREE.ConeGeometry(2.2,9,4),new THREE.MeshStandardMaterial({color:0xffc94d,metalness:.4,roughness:.4}));V.tool=tm;V.g.add(tm);}
  if(pt){V.tool.visible=true;V.tool.position.set(pt.x,Math.abs(pt.y)+4.5,0);V.tool.rotation.z=Math.PI;}else V.tool.visible=false;}
function reset(){MAT=null;if(V)V.ver=-1;if(V&&V.chuck){V.g.remove(V.chuck);V.chuck=null;}}

/* ---------- Förklara rad ---------- */
const DG={0:'Snabbtransport till punkten, utan att skära.',1:'Rak rörelse i matning. Längs Z blir det längdsvarvning, längs X plansvarvning, och båda samtidigt ger en kona.',2:'Båge medurs i XZ-planet. Slutpunkt X Z, och radien R eller centrum I och K.',3:'Båge moturs i XZ-planet. Slutpunkt X Z, och radien R eller centrum I och K.',
 4:'Uppehåll. P anger tiden i millisekunder.',18:'XZ-planet, som är standard på svarven.',20:'Mått i tum.',21:'Mått i millimeter.',28:'Kör till maskinens hemläge, där verktyget kan bytas. G28 U0 W0 kör hem i både X och Z.',
 32:'Gängning i en rörelse. F är stigningen.',40:'Stänger av nosradiekompenseringen.',41:'Nosradiekompensering, verktyget till vänster om banan.',42:'Nosradiekompensering, verktyget till höger om banan. Vanligt vid utvändig svarvning mot chucken.',
 50:'Med S: maxvarvtal för spindeln, viktigt med G96 när diametern blir liten.',53:'Rörelse i maskinens koordinater.',54:'Nollpunkt G54, normalt mitt på planytan.',
 70:'Slutsvarvning: kör profilen mellan N-numren P och Q.',71:'Grovsvarvning längs Z. P och Q är N-numren där profilen börjar och slutar, U och W tillägg för slutsvarvning, D skärdjup per drag.',
 72:'Grovsvarvning plant (längs X).',76:'Gängcykel i flera drag. X är kärndiametern, Z gängans slut, K gängdjupet, D första skärdjupet, F stigningen och A vinkeln.',
 80:'Avbryter en cykel.',90:'Längdsvarvningscykel: X och Z är målet, R ger en kona. På svarven betyder G90 alltså inte absoluta mått som på fräsen.',92:'Enkel gängcykel: som G90 men F är stigningen.',94:'Plansvarvningscykel: X och Z är målet, K ger en kona.',
 96:'Konstant skärhastighet: S är skärhastigheten i m/min, och varvtalet ändras med diametern.',97:'Fast varvtal: S är varv per minut.',98:'Matning per minut (mm/min).',99:'Matning per varv (mm/varv). Standard på svarven.'};
const DM={0:'Programstopp. Tryck cykelstart för att fortsätta.',1:'Valfritt stopp.',3:'Spindeln startar medurs.',4:'Spindeln startar moturs.',5:'Spindeln stannar.',8:'Kylvätska på.',9:'Kylvätska av.',30:'Programslut, tillbaka till början.',2:'Programslut.',98:'Anropar ett underprogram.',99:'Tillbaka från underprogrammet.'};
const DA={X:'Diameter i X',Z:'Läge längs Z. Z0 är planytan, minus är in mot chucken',U:'Förflyttning i X (diameter), från där verktyget står',W:'Förflyttning i Z, från där verktyget står',
 I:'Bågens centrum i X (radie), räknat från startpunkten',K:'Bågens centrum i Z, räknat från startpunkten',R:'Bågens radie, eller konan i G90',F:'Matning',S:'Spindel',T:'Verktyg och korrigering, T0101 = verktyg 1 med korrigering 1',P:'Startrad (N-nummer) eller tid',Q:'Slutrad (N-nummer)',D:'Skärdjup per drag',A:'Gängans vinkel'};
function explain(raw,li){const b=words(raw),rows=[];
  b.G.forEach(g=>rows.push(['G'+String(g).padStart(2,'0'),t(DG[Math.round(g)]||'G-kod som inte används i svarvläget.')]));
  b.M.forEach(m=>rows.push(['M'+String(m).padStart(2,'0'),t(DM[m]||'M-kod som inte påverkar simuleringen.')]));
  const g96=/G96/i.test(raw),g98=/G98/i.test(raw);
  Object.entries(b.W).forEach(([k,v])=>{let s=t(DA[k]||'Adress');
    if(k==='X')s+=': '+t('Ø')+nf(v)+' mm';else if(k==='Z'||k==='U'||k==='W')s+=': '+nf(v)+' mm';
    else if(k==='F')s+=': '+nf(v,3)+' '+(g98?'mm/min':t('mm/varv'));else if(k==='S')s+=': '+v+' '+(g96?t('m/min (skärhastighet)'):t('varv/min'));
    else if(k==='T'){const n=Math.round(v),tl=tool(n>=100?Math.floor(n/100):n);s+=': '+(tl?t(tl.name):t('finns inte i revolvern'));}
    rows.push([k+String(v).replace('.',EN()?'.':','),s]);});
  if(b.N!=null)rows.push(['N'+b.N,t('Radnummer. G71 och G70 hänvisar till det med P och Q.')]);
  if(/\(/.test(raw))rows.push(['( )',t('Kommentar: ignoreras av styrningen.')]);
  return '<h4>'+t('Förklara rad')+' '+(li+1)+'</h4><div class="src">'+esc(raw.trim()||' ')+'</div>'+(rows.length?'<dl>'+rows.map(r=>'<dt>'+esc(r[0])+'</dt><dd>'+esc(r[1])+'</dd>').join('')+'</dl>':'<p class="tom">'+t('Tom rad.')+'</p>');}

/* ---------- inspektören: Ämne och Verktyg ---------- */
function stockUI(box){box.innerHTML=`<div class="gvl-amne"><p class="gk-small">${t('Ämnet är en rund stång i chucken. Z0 är planytan, och ämnet sticker ut till Z−längden.')}</p>
  <label>${t('Diameter (mm)')}<input type="number" min="2" step="1" id="gvlD" value="${A.d}"></label>
  <label>${t('Längd ut från chucken (mm)')}<input type="number" min="5" step="1" id="gvlL" value="${A.l}"></label>
  <label>${t('Tillägg på planytan (mm)')}<input type="number" min="0" step="0.5" id="gvlF" value="${A.face}"></label>
  <label>${t('Material')}<select id="gvlM">${MATS.map(([k,n])=>`<option value="${k}" ${k===A.mat?'selected':''}>${esc(t(n))}</option>`).join('')}</select></label></div>`;
  const upd=()=>{A.d=Math.max(2,+box.querySelector('#gvlD').value||50);A.l=Math.max(5,+box.querySelector('#gvlL').value||80);A.face=Math.max(0,+box.querySelector('#gvlF').value||0);A.mat=box.querySelector('#gvlM').value;saveA();reset();if(window.drawFromText)drawFromText(false);};
  box.querySelectorAll('input,select').forEach(e=>e.addEventListener('change',upd));}
function toolsUI(box){box.innerHTML='<p class="gk-small">'+t('Revolvern på svarven. T0101 betyder verktyg 1 med korrigering 1.')+'</p><table class="gvl-tab"><tr><th>T</th><th>'+t('Verktyg')+'</th></tr>'+TOOLS.map(x=>'<tr><td>T'+String(x.t).padStart(2,'0')+'</td><td>'+esc(t(x.name))+'</td></tr>').join('')+'</table>';}

/* ---------- exempel ---------- */
const EX={
 'Plansvarvning och längdsvarvning (G90)':`O1001 (PLANSVARVNING OCH LANGDSVARVNING)
G21 G99 G18
G50 S3000 (MAXVARV)
T0101 (GROVSVARVSTAL R0.8)
G96 S200 M03
G00 X54 Z0 M08
G01 X-1.6 F0.15 (PLANSVARVA)
G00 Z2
X52
G90 X46 Z-40 F0.25 (LANGDSVARVNINGSCYKEL)
X42
X38
G00 X100 Z100 M09
M05
M30`,
 'Grov- och slutsvarvning (G71/G70)':`O1002 (GROVSVARVNING G71 OCH SLUTSVARVNING G70)
G21 G99 G18
G50 S3000 (MAXVARV)
T0101 (GROVSVARVSTAL R0.8)
G96 S200 M03
G00 X52 Z2 M08
G71 P10 Q60 U0.4 W0.1 D1.5 F0.25
N10 G00 X16
N20 G01 Z0 F0.1
N25 X20 Z-2
N30 Z-15
N40 G02 X32 Z-21 R6
N50 G01 Z-35
N60 X50 Z-45
G00 X100 Z100
T0202 (FINSVARVSTAL R0.4)
G96 S250 M03
G00 X52 Z2
G70 P10 Q60
G00 X100 Z100 M09
M05
M30`,
 'Spår och avstickning':`O1003 (SPAR OCH AVSTICKNING)
G21 G99 G18
G50 S2500 (MAXVARV)
T0101 (GROVSVARVSTAL R0.8)
G96 S200 M03
G00 X52 Z2 M08
G90 X44 Z-42 F0.25
G00 X100 Z100
T0303 (STICKSTAL 3 MM)
G97 S800 M03
G00 X46 Z-20
G01 X36 F0.05 (SPAR 3 MM)
G00 X46
Z-30
G01 X36 F0.05 (SPAR NUMMER TVA)
G00 X46
Z-43 (AVSTICKNING)
G01 X0 F0.04
G00 X46
G00 X100 Z100 M09
M05
M30`,
 'Gänga M30 × 2 (G76)':`O1004 (GANGA M30X2)
G21 G99 G18
G50 S2500 (MAXVARV)
T0101 (GROVSVARVSTAL R0.8)
G96 S200 M03
G00 X52 Z2 M08
G90 X46 Z-35 F0.25
X40
X34
X30
G00 X100 Z100
T0404 (GANGSTAL 60)
G97 S600 M03
G00 X32 Z5
G76 X27.546 Z-25 K1.227 D0.35 F2 A60
G00 X100 Z100 M09
M05
M30`,
 'Borrning och urborrning':`O1005 (BORRNING OCH URBORRNING)
G21 G99 G18
G50 S2500 (MAXVARV)
T0707 (CENTRUMBORR D5)
G97 S1500 M03
G00 X0 Z5 M08
G01 Z-6 F0.08
G00 Z5
G00 X100 Z100
T0505 (BORR D20)
G97 S600 M03
G00 X0 Z5
G01 Z-35 F0.15
G00 Z5
G00 X100 Z100
T0606 (BORRSTANG D16)
G96 S150 M03
G00 X18 Z2
G90 X22 Z-25 F0.15 (URBORRNING)
X24
X26
G00 X100 Z100 M09
M05
M30`};
function examples(){return Object.keys(EX).map(n=>({l:n,a:()=>{if(window.ritaKurs&&ritaKurs.on)ritaKurs.end();loadTextIntoEditor(EX[n]);statusEl.textContent=t('Exempel')+': '+t(n)+'.';}}));}

/* ---------- byta mellan fräs och svarv ---------- */
const CODEKEY=()=>on?'gvis-kod-svarv-v1':'gvis-kod-v1';
function setMode(v){v=!!v;if(v===on)return;
  try{if(window.ritaKurs&&ritaKurs.on)ritaKurs.end();}catch(e){}
  try{localStorage.setItem(CODEKEY(),JSON.stringify({code:ta.value,fileName:(window.gvFile&&gvFile.name)||'program.gvis',t:Date.now()}));}catch(e){}
  on=v;window.GV_SVARV=v;try{localStorage.setItem(KEY,v?'svarv':'fras');}catch(e){}
  document.documentElement.classList.toggle('gv-svarv',v);
  try{if(stockMode)document.getElementById('cncFrasBtn').click();}catch(e){}
  try{if(mode3D){const c=document.getElementById('toggle3D');c.checked=false;c.dispatchEvent(new Event('change',{bubbles:true}));}}catch(e){}
  api.v3=false;
  let code='';try{const o=JSON.parse(localStorage.getItem(CODEKEY())||'null');if(o&&o.code)code=o.code;}catch(e){}
  if(!code&&v)code=EX['Plansvarvning och längdsvarvning (G90)'];
  reset();if(V)V.el.style.display='none';
  loadTextIntoEditor(code);label();
  try{if(window.ritaInspDraw)ritaInspDraw();}catch(e){}try{if(window.gvMenuRebuild)gvMenuRebuild();}catch(e){}
  statusEl.textContent=v?t('Svarvläge: X är diameter och Z går längs axeln. Koden tolkas som Hass svarv.'):t('Fräsläge.');}
function label(){const b=document.getElementById('rtMaskin');if(!b)return;b.textContent=on?'◎ '+t('Svarv'):'⚙ '+t('Fräs');b.title=t(on?'Byt till fräs':'Byt till svarv');b.setAttribute('aria-pressed',on?'true':'false');}
document.addEventListener('DOMContentLoaded',()=>{document.documentElement.classList.toggle('gv-svarv',on);
  const th=document.getElementById('rtTheme');if(!th)return;const b=document.createElement('button');b.type='button';b.className='rt-theme';b.id='rtMaskin';
  th.parentNode.insertBefore(b,th);b.addEventListener('click',()=>setMode(!on));label();addEventListener('cnc-lang',label);});

const api=window.gvLathe={v3:false,get on(){return on;},parse,draw2D,marker,show3D,update3D,explain,stockUI,toolsUI,examples,setMode,tool,reset,TOOLS,EX,
  hud:(pt,sg)=>{const fx=v=>(Math.abs(v)<0.005?0:v).toFixed(2);return 'Z'+fx(pt.x)+' X'+fx(Math.abs(pt.y)*2)+' · S'+(sg.S||0)+' '+(sg.type===0?'F–':'F'+(sg.F!=null?String(sg.F).replace('.',','):'–'))+' T'+(sg.T!=null?String(sg.T).padStart(2,'0'):'–');}};
})();
