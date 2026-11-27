/* Supportsvarven: verktygslådan som fönster, i samma stil som verktygsmagasinet i G-vis.
   Vänster: verktygstyper att dra in. Mitten: lådans platser (dra hit, dra mellan platser för att byta). Höger: detaljer och Montera.
   Två flikar: Skärverktyg (verktygsstolen) och Reitstock (centrum och borrar).
   Fönstret styr simulatorn genom dess egna kontroller (#toolType, #barD, #barL, #holderAngleNum och reitstockens lista #tbox),
   så simuleringen i övrigt är orörd. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
const T=s=>(window.cncT||String)(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const EN=()=>!!(window.cncI18n&&cncI18n.lang==='en');
const num=v=>String(Math.round(v*100)/100).replace('.',EN()?'.':',');
const NS=8,LS='svarv_lada_v1';
const css=document.createElement('style');css.textContent=`
.sl-win{position:fixed;inset:0;z-index:800;background:rgba(2,8,12,.5)}
.sl-win[hidden]{display:none}
.sl-box{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1080px,96vw);height:min(690px,92vh);display:flex;flex-direction:column;background:#0a171e;color:var(--ink,#e8f0f5);border:1.5px solid #284652;border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.55);overflow:hidden;font:13px Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}
.sl-bar{display:flex;align-items:center;gap:8px;padding:8px 10px 8px 14px;background:#050e14;font-weight:600;font-size:14px;cursor:move;user-select:none;border-bottom:2px solid #c89b3c}
.sl-bar .sp{flex:1}.sl-bar>button{background:none;border:0;color:inherit;font-size:16px;cursor:pointer;padding:2px 7px;border-radius:4px}.sl-bar>button:hover{background:rgba(255,255,255,.15)}
.sl-tabs{display:flex;gap:4px;margin-left:10px}.sl-tabs button{font:600 12px inherit;font-family:inherit;padding:5px 12px;border:1px solid #284652;border-radius:6px;background:#0f2530;color:#a9bcc5;cursor:pointer}
.sl-tabs button.on{background:#0b6b5f;border-color:#35e2d2;color:#fff}
.sl-body{flex:1;min-height:0;display:grid;grid-template-columns:minmax(220px,1fr) minmax(260px,1.1fr) minmax(260px,1fr)}
.sl-col{min-height:0;overflow:auto;padding:12px 14px;border-right:1px solid #1d3743}.sl-col:last-child{border-right:0}
.sl-col h4{margin:0 0 10px;font-size:14px}.sl-small{font-size:12px;color:var(--muted,#8ba0ab);font-weight:400}
.sl-lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:8px}
.sl-li{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 4px;border:1.5px solid #284652;border-radius:7px;background:#0f2530;cursor:grab;text-align:center;font-size:11.5px;line-height:1.2}
.sl-li:hover,.sl-li:focus-visible{border-color:#35e2d2;outline:none}.sl-li.drag{opacity:.5}.sl-li canvas{width:70px;height:80px}.sl-li small{color:var(--muted,#8ba0ab)}
.sl-pk{display:flex;flex-direction:column;gap:6px}
.sl-p{position:relative;display:grid;grid-template-columns:34px 46px 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:5px 8px;border:1.5px solid #284652;border-radius:7px;background:#0f2530;cursor:pointer;min-height:58px}
.sl-p b{grid-row:1/3;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:14px}.sl-p .th{grid-row:1/3;width:46px;height:56px}.sl-p .th canvas{width:46px;height:56px}
.sl-p .n{font-weight:600;font-size:13px;align-self:end;padding-right:20px}.sl-p .d{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--muted,#8ba0ab);align-self:start}
.sl-p.empty{border-style:dashed;color:var(--muted,#8ba0ab)}.sl-p.empty .n{font-weight:400}
.sl-p.sel{border-color:#35e2d2;box-shadow:0 0 0 2px rgba(53,226,210,.25)}.sl-p.over{border-color:#35e2d2;background:rgba(53,226,210,.12)}
.sl-p.mnt::after{content:attr(data-m);position:absolute;right:28px;top:6px;font-size:10px;letter-spacing:.08em;color:#35e2d2;font-weight:700}
.sl-x{position:absolute;right:6px;top:6px;background:none;border:0;color:var(--muted,#8ba0ab);cursor:pointer;font-size:13px;padding:2px 5px;border-radius:4px}.sl-x:hover{background:rgba(53,226,210,.18);color:#fff}
.sl-det h4{font-size:15px;margin:0 0 10px}.sl-l{display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--muted,#8ba0ab);margin:0 0 10px}
.sl-l select,.sl-l input{font:13px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:6px 8px;border:1.5px solid #284652;border-radius:6px;background:#0f2530;color:var(--ink,#e8f0f5);width:100%;box-sizing:border-box}
.sl-chips{display:flex;flex-wrap:wrap;gap:5px;margin:-2px 0 10px}.sl-chips button{font:12px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:4px 8px;border:1.5px solid #284652;border-radius:14px;background:#0f2530;color:var(--ink,#e8f0f5);cursor:pointer}
.sl-chips button.on{background:#0b6b5f;border-color:#35e2d2;color:#fff}.sl-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.sl-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}
.sl-btns,.sl-foot{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}.sl-foot{margin:0;padding:9px 12px;border-top:1px solid #1d3743;align-items:center}.sl-foot .sp{flex:1}
.sl-btns button,.sl-foot button,.sl-open{font:12.5px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;padding:7px 11px;border:1.5px solid #284652;border-radius:6px;background:#0f2530;color:var(--ink,#e8f0f5);cursor:pointer}
.sl-btns button.pri,.sl-foot button.pri,.sl-open{background:#0b6b5f;border-color:#35e2d2;color:#fff;font-weight:600}
.sl-open{width:100%;margin:10px 0 4px;font-size:13px}.sl-info{font-size:12px;color:var(--muted,#8ba0ab);margin:0 0 10px;line-height:1.45}`;
document.head.appendChild(css);

/* ---------- skärverktygen: läses från simulatorns egen lista ---------- */
const OPT=()=>{const s=$('#toolType');return s?[...s.querySelectorAll('option')].map(o=>({id:o.value,code:o.textContent.split(' — ')[0],desc:(o.textContent.split(' — ')[1]||''),bore:/^BS/.test(o.value),part:o.value==='MGMN'})):[];};
const opt=id=>OPT().find(o=>o.id===id);
const infoOf=id=>{const r=document.querySelector('#ctbox .trw[data-id="'+id+'"] span');return r?r.textContent:'';};
/* reitstockens verktyg: läses från dess lista */
const TOOLS=()=>[...document.querySelectorAll('#tbox .trw')].map(r=>({id:r.dataset.id,name:r.querySelector('b').textContent,info:(r.querySelector('span')||{}).textContent||''}));
const tKind=id=>id==='center'?'center':/^cd/.test(id)?'cdrill':'drill';
const tD=t=>{const m=(t.name+' '+t.info).match(/Ø\s*([\d.,]+)/);return m?parseFloat(m[1].replace(',','.')):0;};

/* ---------- lådan (sparas i webbläsaren) ---------- */
let L=null;
function defL(){return {skar:OPT().slice(0,NS).map(o=>({id:o.id,ang:0,bd:16,bl:100})).concat(Array(NS).fill(null)).slice(0,NS),
  reit:['center','cd25_8','d5','d8','d10','d12','d16','d20'].map(id=>({id}))};}
function load(){try{L=JSON.parse(localStorage.getItem(LS)||'null');}catch(e){L=null;}if(!L||!Array.isArray(L.skar)||!Array.isArray(L.reit))L=defL();
  while(L.skar.length<NS)L.skar.push(null);while(L.reit.length<NS)L.reit.push(null);}
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(L));}catch(e){}};

/* ---------- vad som sitter i maskinen just nu ---------- */
const curSkar=()=>({id:$('#toolType').value,bd:+$('#barD').value,bl:+$('#barL').value,ang:parseFloat($('#holderAngleNum').value)||0});
const curReit=()=>{const r=document.querySelector('#tbox .trw.cur');return r?r.dataset.id:'center';};
const same=(tab,s)=>{if(!s)return false;if(tab==='reit')return s.id===curReit();const c=curSkar();return c.id===s.id&&(!opt(s.id)||!opt(s.id).bore||(c.bd===s.bd&&c.bl===s.bl));};
/* vilken plats som är monterad: den som monterades senast, om den fortfarande stämmer med maskinen, annars första som stämmer */
function mountedIdx(tab){const S=L[tab],m=L.mnt&&L.mnt[tab];if(m!=null&&same(tab,S[m]))return m;return S.findIndex(x=>same(tab,x));}
const isMounted=(tab,s)=>!!s&&L[tab].indexOf(s)===mountedIdx(tab);
function mount(tab,i){const s=L[tab][i];if(!s)return;L.mnt=L.mnt||{};L.mnt[tab]=i;save();
  if(tab==='reit'){const r=document.querySelector('#tbox .trw[data-id="'+s.id+'"]');if(r)r.click();render();return;}
  const o=opt(s.id);if(!o)return;
  if(o.bore){$('#barD').value=String(s.bd||16);$('#barL').value=String(s.bl||100);}
  const tt=$('#toolType');tt.value=s.id;tt.onchange&&tt.onchange();
  const hn=$('#holderAngleNum');hn.value=String(s.ang||0);hn.onchange&&hn.onchange();
  render();}
/* hållarvinkeln som ställs i menyn sparas på den monterade platsen */
function syncAng(){if(!L)return;const c=curSkar();const m=mountedIdx('skar');if(m>=0)L.skar[m].ang=c.ang;save();if(W&&!W.hidden)render();}

/* ---------- miniatyrbilder: hållare och skär sett uppifrån ---------- */
function thumb(cv,tab,id){const r=devicePixelRatio>1?2:1,w=cv.clientWidth||70,h=cv.clientHeight||80;cv.width=w*r;cv.height=h*r;const g=cv.getContext('2d');g.setTransform(r,0,0,r,0,0);g.clearRect(0,0,w,h);
  const sh='#3b4a53',ed='#15181b',gold='#d9a441',st='#c7ccd2',cx=w/2;g.lineWidth=1;g.strokeStyle=ed;
  const P=(pts,c)=>{g.fillStyle=c;g.beginPath();pts.forEach((p,k)=>k?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();g.fill();g.stroke();};
  if(tab==='skar'){const o=opt(id)||{};
    if(o.bore){P([[cx-6,6],[cx+6,6],[cx+6,h-18],[cx-6,h-18]],sh);P([[cx-6,h-18],[cx+6,h-18],[cx+6,h-10],[cx-6,h-10]],'#56646d');P([[cx-6,h-14],[cx-14,h-8],[cx-8,h-3],[cx-2,h-9]],gold);}
    else if(o.part){P([[cx-4,6],[cx+12,6],[cx+12,h-36],[cx-4,h-36]],sh);P([[cx-4,h-36],[cx+1,h-36],[cx+1,h-4],[cx-4,h-4]],sh);P([[cx-4,h-8],[cx+1,h-8],[cx+1,h-3],[cx-4,h-3]],st);}
    else{const k={SVJBR:93,SVVCN:72.5,SVUBR:95,SVQBR:117.5}[id]||93,a=(k-90)*Math.PI/180;
      P([[cx-2,6],[cx+16,6],[cx+16,h-22],[cx-2,h-22]],sh);
      const tx=cx-8,ty=h-4,L1=16;P([[tx,ty],[tx+L1*Math.cos(-a)*.95,ty-L1*.25],[tx+L1*.9,ty-L1*.9],[tx+L1*.2*Math.cos(a),ty-L1*.75]],gold);}}
  else{const k=tKind(id);g.fillStyle=sh;g.fillRect(cx-9,6,18,14);g.strokeRect(cx-9,6,18,14);
    if(k==='center')P([[cx-7,20],[cx+7,20],[cx+7,h-24],[cx,h-4],[cx-7,h-24]],st);
    else{const t=TOOLS().find(x=>x.id===id),d=t?tD(t):8,R=Math.max(2.5,Math.min(9,d*.45));
      if(k==='cdrill'){P([[cx-7,20],[cx+7,20],[cx+7,h-30],[cx+2,h-20],[cx+2,h-10],[cx,h-4],[cx-2,h-10],[cx-2,h-20],[cx-7,h-30]],st);}
      else{P([[cx-R,20],[cx+R,20],[cx+R,h-4-R*.6],[cx,h-4],[cx-R,h-4-R*.6]],st);g.save();g.beginPath();g.rect(cx-R,20,2*R,h-26);g.clip();g.strokeStyle='rgba(0,0,0,.35)';for(let y=14;y<h;y+=6){g.beginPath();g.moveTo(cx-R,y);g.lineTo(cx+R,y-7);g.stroke();}g.restore();}}}}

/* ---------- fönstret ---------- */
let W=null,tab='skar',sel={skar:0,reit:0};
function make(){W=document.createElement('div');W.className='sl-win';W.hidden=true;W.setAttribute('role','dialog');W.setAttribute('aria-modal','true');
  W.innerHTML=`<div class="sl-box"><div class="sl-bar"><span>${esc(T('Verktygslåda'))}</span><div class="sl-tabs"><button type="button" data-t="skar">${esc(T('Skärverktyg'))}</button><button type="button" data-t="reit">${esc(T('Reitstock'))}</button></div><span class="sp"></span><button type="button" data-a="x" aria-label="${esc(T('Stäng'))}">✕</button></div>
    <div class="sl-body"><div class="sl-col"><h4>${esc(T('Verktyg'))} <span class="sl-small">${esc(T('dra till en plats'))}</span></h4><div class="sl-lib" id="slLib"></div></div>
    <div class="sl-col"><h4>${esc(T('Lådan'))} <span class="sl-small">${esc(T('dra mellan platser för att byta'))}</span></h4><div class="sl-pk" id="slPk"></div></div>
    <div class="sl-col"><div class="sl-det" id="slDet"></div></div></div>
    <div class="sl-foot"><button type="button" data-a="std">${esc(T('Återställ standardverktygen'))}</button><span class="sp"></span><button type="button" data-a="ok" class="pri">${esc(T('Klar'))}</button></div></div>`;
  document.body.appendChild(W);
  W.addEventListener('keydown',e=>e.stopPropagation());W.addEventListener('keyup',e=>e.stopPropagation());   // svarvens tangenter (W, A, S, D, pilar) ska inte köra sliden medan lådan är öppen
  const close=()=>{W.hidden=true;};
  W.querySelector('[data-a=x]').onclick=close;W.querySelector('[data-a=ok]').onclick=close;W.addEventListener('mousedown',e=>{if(e.target===W)close();});
  document.addEventListener('keydown',e=>{if(!W.hidden&&e.key==='Escape'){e.preventDefault();e.stopPropagation();close();}},true);
  W.querySelectorAll('.sl-tabs button').forEach(b=>b.onclick=()=>{tab=b.dataset.t;render();});
  const sb=W.querySelector('[data-a=std]');sb.onclick=()=>{if(!sb.dataset.arm){sb.dataset.arm=1;sb.textContent=T('Klicka igen för att bekräfta');setTimeout(()=>{delete sb.dataset.arm;sb.textContent=T('Återställ standardverktygen');},3500);return;}
    delete sb.dataset.arm;sb.textContent=T('Återställ standardverktygen');const d=defL();L[tab]=d[tab];save();render();};
  // flytta fönstret i titelraden
  const box=W.querySelector('.sl-box'),bar=W.querySelector('.sl-bar');let d=null;
  bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=box.getBoundingClientRect();d={x:e.clientX-r.left,y:e.clientY-r.top};bar.setPointerCapture(e.pointerId);});
  bar.addEventListener('pointermove',e=>{if(!d)return;box.style.left=Math.max(0,Math.min(innerWidth-120,e.clientX-d.x))+'px';box.style.top=Math.max(0,Math.min(innerHeight-40,e.clientY-d.y))+'px';box.style.transform='none';});
  bar.addEventListener('pointerup',()=>d=null);}
function libItems(){if(tab==='skar')return OPT().map(o=>({k:o.id,n:o.code,s:o.desc}));
  const ts=TOOLS();const out=[];ts.forEach(t=>{const k=tKind(t.id);if(k!=='drill')out.push({k:t.id,n:t.name,s:''});});
  out.push({k:'drill',n:T('Spiralborr'),s:'Ø3–Ø25'});return out;}
function drillId(d){const t=TOOLS().find(x=>tKind(x.id)==='drill'&&Math.abs(tD(x)-d)<1e-6);return t?t.id:null;}
function put(i,k){if(tab==='skar'){const prev=L.skar[i];L.skar[i]={id:k,ang:0,bd:prev&&prev.bd||16,bl:prev&&prev.bl||100};}
  else L.reit[i]={id:k==='drill'?(drillId(10)||'d10'):k};
  sel[tab]=i;save();render();}
function slotName(s){if(tab==='skar'){const o=opt(s.id);return o?o.code:s.id;}const t=TOOLS().find(x=>x.id===s.id);return t?t.name:s.id;}
function slotDesc(s){if(tab==='skar'){const o=opt(s.id);if(!o)return '';if(o.bore)return 'Ø'+s.bd+' × '+s.bl+' mm · '+num(s.ang||0)+'°';return o.desc+' · '+T('hållare')+' '+num(s.ang||0)+'°';}
  const t=TOOLS().find(x=>x.id===s.id);if(!t)return '';const k=tKind(s.id);return k==='center'?'60°':k==='cdrill'?'A 2,5/8':'Ø'+num(tD(t));}
function render(){if(!W)return;W.querySelectorAll('.sl-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===tab));
  // lista
  const lib=W.querySelector('#slLib');lib.innerHTML=libItems().map(x=>`<div class="sl-li" draggable="true" data-k="${esc(x.k)}" tabindex="0" title="${esc(T('Dra till en plats i lådan, eller dubbelklicka för att lägga den på den markerade platsen'))}"><canvas></canvas><span>${esc(T(x.n))}</span>${x.s?`<small>${esc(T(x.s))}</small>`:''}</div>`).join('');
  lib.querySelectorAll('.sl-li').forEach(el=>{const k=el.dataset.k;thumb(el.querySelector('canvas'),tab,k==='drill'?(drillId(10)||'d10'):k);
    el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain','lib:'+k);e.dataTransfer.effectAllowed='copy';el.classList.add('drag');});el.addEventListener('dragend',()=>el.classList.remove('drag'));
    el.addEventListener('dblclick',()=>put(sel[tab],k));el.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();put(sel[tab],k);}});});
  // platserna
  const pk=W.querySelector('#slPk'),S=L[tab];
  pk.innerHTML=S.map((s,i)=>{const n=i+1;if(!s)return `<div class="sl-p empty${i===sel[tab]?' sel':''}" data-i="${i}" tabindex="0"><b>${n}</b><div class="th"></div><span class="n">${esc(T('Tom plats'))}</span><span class="d">${esc(T('Dra hit ett verktyg'))}</span></div>`;
    return `<div class="sl-p${i===sel[tab]?' sel':''}${isMounted(tab,s)?' mnt':''}" data-m="${esc(T('MONTERAD'))}" data-i="${i}" tabindex="0" draggable="true"><b>${n}</b><div class="th"><canvas></canvas></div><span class="n">${esc(T(slotName(s)))}</span><span class="d">${esc(slotDesc(s))}</span><button type="button" class="sl-x" title="${esc(T('Töm platsen'))}">✕</button></div>`;}).join('');
  pk.querySelectorAll('.sl-p').forEach(el=>{const i=+el.dataset.i,s=S[i];if(s)thumb(el.querySelector('canvas'),tab,s.id);
    el.onclick=e=>{if(e.target.classList.contains('sl-x')){S[i]=null;save();render();return;}sel[tab]=i;render();};
    el.ondblclick=()=>mount(tab,i);
    el.addEventListener('keydown',e=>{if(e.key==='Delete'||e.key==='Backspace'){if(S[i]){S[i]=null;save();render();}}
      else if(e.key==='Enter'){mount(tab,i);}
      else if(e.key==='ArrowDown'||e.key==='ArrowRight'){e.preventDefault();sel[tab]=Math.min(NS-1,i+1);render();W.querySelector('.sl-p.sel').focus();}
      else if(e.key==='ArrowUp'||e.key==='ArrowLeft'){e.preventDefault();sel[tab]=Math.max(0,i-1);render();W.querySelector('.sl-p.sel').focus();}});
    el.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain','pk:'+i);e.dataTransfer.effectAllowed='move';});
    el.addEventListener('dragover',e=>{e.preventDefault();el.classList.add('over');});el.addEventListener('dragleave',()=>el.classList.remove('over'));
    el.addEventListener('drop',e=>{e.preventDefault();el.classList.remove('over');const v=e.dataTransfer.getData('text/plain')||'';if(v.startsWith('lib:'))put(i,v.slice(4));
      else if(v.startsWith('pk:')){const a=+v.slice(3);if(a!==i){const x=S[a];S[a]=S[i];S[i]=x;sel[tab]=i;save();render();}}});});
  detail();}
function detail(){const box=W.querySelector('#slDet'),i=sel[tab],s=L[tab][i],n=i+1;
  if(!s){box.innerHTML=`<h4>${esc(T('Plats'))} ${n} · ${esc(T('tom'))}</h4><p class="sl-info">${esc(T('Dra ett verktyg från listan till vänster hit, eller markera ett verktyg och tryck Enter.'))}</p>`;return;}
  const mnt=isMounted(tab,s),btn=`<div class="sl-btns"><button type="button" class="pri" id="slMount">${esc(T(mnt?(tab==='skar'?'Montera igen (nytt skär)':'Montera igen'):'Montera'))}</button><button type="button" id="slClr">${esc(T('Töm platsen'))}</button></div>`;
  if(tab==='skar'){const o=opt(s.id)||{};
    box.innerHTML=`<h4>${esc(T('Plats'))} ${n} · ${esc(o.code||s.id)}</h4><p class="sl-info">${esc(T(o.desc||''))}${infoOf(s.id)&&!o.bore?' · '+esc(infoOf(s.id).split('•').slice(1).join('•').trim()):''}${mnt?'<br><b style="color:#35e2d2">'+esc(T('Sitter i verktygsstolen nu.'))+'</b>':''}</p>
      <label class="sl-l">${esc(T('Typ'))}<select id="slType">${OPT().map(x=>`<option value="${x.id}"${x.id===s.id?' selected':''}>${esc(x.code+' — '+T(x.desc))}</option>`).join('')}</select></label>
      ${o.bore?`<div class="sl-row"><label class="sl-l">${esc(T('Borrstång Ø'))}<select id="slBd">${[...$('#barD').options].map(x=>`<option value="${x.value}"${+x.value===s.bd?' selected':''}>${esc(x.textContent)}</option>`).join('')}</select></label>
        <label class="sl-l">${esc(T('Utstick'))}<select id="slBl">${[...$('#barL').options].map(x=>`<option value="${x.value}"${+x.value===s.bl?' selected':''}>${esc(x.textContent)}</option>`).join('')}</select></label></div>`:''}
      <label class="sl-l">${esc(T('Hållarvinkel (°)'))}<input id="slAng" type="number" min="-90" max="90" step="0.5" value="${s.ang||0}"></label>
      <div class="sl-chips">${[-30,-15,0,15,30].map(v=>`<button type="button" data-a="${v}" class="${Math.abs((s.ang||0)-v)<1e-6?'on':''}">${v>0?'+':''}${v}°</button>`).join('')}</div>${btn}`;
    const upd=()=>{save();if(mnt)mount('skar',i);else render();};
    box.querySelector('#slType').onchange=e=>{s.id=e.target.value;upd();};
    if(box.querySelector('#slBd'))box.querySelector('#slBd').onchange=e=>{s.bd=+e.target.value;upd();};
    if(box.querySelector('#slBl'))box.querySelector('#slBl').onchange=e=>{s.bl=+e.target.value;upd();};
    box.querySelector('#slAng').onchange=e=>{const v=parseFloat(e.target.value);if(Number.isFinite(v)){s.ang=Math.max(-90,Math.min(90,v));upd();}};
    box.querySelectorAll('.sl-chips button').forEach(b=>b.onclick=()=>{s.ang=+b.dataset.a;upd();});}
  else{const t=TOOLS().find(x=>x.id===s.id)||{name:s.id,info:''},k=tKind(s.id);
    const drills=TOOLS().filter(x=>tKind(x.id)==='drill').map(x=>({id:x.id,d:tD(x)})).sort((a,b)=>a.d-b.d);
    box.innerHTML=`<h4>${esc(T('Plats'))} ${n} · ${esc(T(t.name))}</h4><p class="sl-info">${esc(T(t.info))}${mnt?'<br><b style="color:#35e2d2">'+esc(T('Sitter i pinolen nu.'))+'</b>':''}</p>
      ${k==='drill'?`<div class="sl-l">${esc(T('Diameter'))}</div><div class="sl-chips">${drills.map(x=>`<button type="button" data-id="${esc(x.id)}" class="${x.id===s.id?'on':''}">Ø${num(x.d)}</button>`).join('')}</div>
      <details><summary class="sl-small" style="cursor:pointer;margin-bottom:8px">${esc(T('Annat mått …'))}</summary>
        <div class="sl-row3"><label class="sl-l">${esc(T('Ø mm'))}<input id="slD" type="number" min="0.5" max="60" step="0.1" value="8.5"></label><label class="sl-l">${esc(T('Längd mm'))}<input id="slLen" type="number" min="10" max="300" step="1" value="100"></label><label class="sl-l">${esc(T('Spetsvinkel °'))}<input id="slPt" type="number" min="60" max="170" step="1" value="118"></label></div>
        <div class="sl-btns"><button type="button" id="slNew">${esc(T('Skapa borren'))}</button></div><p class="sl-info" id="slMsg"></p></details>`:''}${btn}`;
    box.querySelectorAll('.sl-chips button[data-id]').forEach(b=>b.onclick=()=>{s.id=b.dataset.id;save();if(mnt)mount('reit',i);else render();});
    if(box.querySelector('#slNew'))box.querySelector('#slNew').onclick=()=>{const before=new Set(TOOLS().map(x=>x.id));
      $('#tbD').value=box.querySelector('#slD').value;$('#tbL').value=box.querySelector('#slLen').value;$('#tbP').value=box.querySelector('#slPt').value;$('#tbN').value='';
      $('#tbAdd').click();const nw=TOOLS().find(x=>!before.has(x.id));if(nw){s.id=nw.id;save();render();}else box.querySelector('#slMsg').textContent=$('#tbMsg')?$('#tbMsg').textContent:'';};}
  box.querySelector('#slMount').onclick=()=>mount(tab,i);
  box.querySelector('#slClr').onclick=()=>{L[tab][i]=null;save();render();};}
function open(t){if(!L)load();if(!W)make();if(t)tab=t;
  // markera den monterade platsen
  const m=mountedIdx(tab);if(m>=0)sel[tab]=m;
  W.hidden=false;render();setTimeout(()=>{const f=W.querySelector('.sl-p.sel');f&&f.focus();},30);}
window.svarvLada=open;

/* ---------- menyn: knappar till lådan i stället för de gamla listorna ---------- */
function boot(){if(!$('#toolType')||!$('#tbox'))return;load();
  const hide=el=>{if(el)el.style.display='none';};
  // skärverktyg: dölj listan och dess rubrik, lägg en knapp
  const ct=$('#ctbox');hide(ct);if(ct&&ct.previousElementSibling&&ct.previousElementSibling.classList.contains('eyebrow'))hide(ct.previousElementSibling);
  const b1=document.createElement('button');b1.type='button';b1.className='sl-open';b1.textContent='🧰 '+T('Öppna verktygslådan …');b1.onclick=()=>open('skar');ct.after(b1);
  // reitstock: samma
  const tb=$('#tbox');hide(tb);if(tb.previousElementSibling&&tb.previousElementSibling.classList.contains('eyebrow'))hide(tb.previousElementSibling);
  const det=tb.nextElementSibling;if(det&&det.tagName==='DETAILS')hide(det);
  const b2=document.createElement('button');b2.type='button';b2.className='sl-open';b2.textContent='🧰 '+T('Öppna verktygslådan …');b2.onclick=()=>open('reit');tb.after(b2);
  // hållarvinkeln från menyn sparas på platsen
  $('#holderAngle').addEventListener('input',()=>setTimeout(syncAng,0));$('#holderAngleNum').addEventListener('change',()=>setTimeout(syncAng,0));
  // tangent T öppnar lådan, som Ctrl+M i G-vis
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='m'){e.preventDefault();if(W&&!W.hidden)W.hidden=true;else open();}},true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0));else setTimeout(boot,0);
})();
