/* Lexikonet som flyttbart fönster ovanpå simulatorn, som i G-vis.
   Länkar till lexikon.html öppnas här i stället för att byta sida (i programmet gick det annars inte att komma tillbaka). */
(function(){
'use strict';
const css=document.createElement('style');css.textContent=`
.lxw{position:fixed;z-index:900;left:50%;top:50%;transform:translate(-50%,-50%);width:min(1040px,94vw);height:min(700px,calc(100vh - 16px));display:flex;flex-direction:column;background:#101318;border:1.5px solid #303a47;border-radius:10px;box-shadow:0 24px 70px rgba(0,0,0,.5);overflow:hidden;resize:both;min-width:360px;min-height:260px}
.lxw[hidden]{display:none}
.lxw-bar{display:flex;align-items:center;gap:6px;padding:7px 8px 7px 14px;background:#0b0f14;color:#eef3f8;font:600 14px system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;cursor:move;user-select:none;border-bottom:2px solid #c89b3c}
.lxw-bar span{flex:1}
.lxw-bar button{background:none;border:0;color:inherit;font-size:15px;cursor:pointer;padding:2px 7px;border-radius:4px}
.lxw-bar button:hover{background:rgba(255,255,255,.15)}
.lxw iframe{flex:1;width:100%;border:0;background:#101318}
.lxw.drag iframe{pointer-events:none}
html[data-theme="light"] .lxw{background:#f6f8fa;border-color:#c9d2db;box-shadow:0 24px 70px rgba(0,0,0,.25)}
html[data-theme="light"] .lxw iframe{background:#f6f8fa}`;
document.head.appendChild(css);
if(!document.documentElement.getAttribute('data-theme')){let t='dark';try{t=localStorage.getItem('cnc-tema')||'dark';}catch(e){}document.documentElement.setAttribute('data-theme',t);}
let W=null,fr=null;
const T=s=>(window.cncT||String)(s);
function make(){W=document.createElement('div');W.className='lxw';W.hidden=true;W.setAttribute('role','dialog');W.setAttribute('aria-label',T('Lexikon'));
  W.innerHTML='<div class="lxw-bar"><span>'+T('Lexikon')+'</span><button type="button" data-a="tab" title="'+T('Öppna lexikonet i en egen flik')+'">↗</button><button type="button" data-a="x" aria-label="'+T('Stäng')+'">✕</button></div><iframe title="'+T('Lexikon')+'"></iframe>';
  document.documentElement.appendChild(W);fr=W.querySelector('iframe');   // utanför body, så att ljusa lägets färgvändning inte påverkar fönstret
  fr.addEventListener('load',()=>{try{fr.contentDocument.documentElement.setAttribute('data-theme',document.documentElement.getAttribute('data-theme')||'dark');}catch(e){}});
  W.querySelector('[data-a=x]').onclick=()=>{W.hidden=true;};
  W.querySelector('[data-a=tab]').onclick=()=>{let h='';try{h=fr.contentWindow.location.hash;}catch(e){}window.open('../lexikon.html'+h,'_blank');};
  // flytta i titelraden
  const bar=W.querySelector('.lxw-bar');
  bar.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;const r=W.getBoundingClientRect(),dx=e.clientX-r.left,dy=e.clientY-r.top;
    W.style.transform='none';W.style.left=r.left+'px';W.style.top=r.top+'px';W.classList.add('drag');bar.setPointerCapture(e.pointerId);
    const mv=ev=>{W.style.left=Math.min(innerWidth-80,Math.max(-r.width+80,ev.clientX-dx))+'px';W.style.top=Math.min(innerHeight-40,Math.max(0,ev.clientY-dy))+'px';};
    const up=()=>{W.classList.remove('drag');bar.removeEventListener('pointermove',mv);bar.removeEventListener('pointerup',up);};
    bar.addEventListener('pointermove',mv);bar.addEventListener('pointerup',up);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!W.hidden){e.stopPropagation();W.hidden=true;}},true);}
window.simLex=function(h){if(!W)make();const url='../lexikon.html?inbaddad=1'+(h?'#'+h:'');
  if(!fr.src||!fr.src.includes('lexikon.html'))fr.src=url;else if(h){try{fr.contentWindow.location.hash=h;}catch(e){fr.src=url;}}
  W.hidden=false;};
/* Netlify tar bort .html i länkarna (lexikon.html blir /lexikon), så båda formerna räknas */
const isLex=a=>{try{return /\/lexikon(\.html)?$/.test(new URL(a.href,location.href).pathname);}catch(_){return false;}};
window.simIsLex=isLex;
document.addEventListener('click',e=>{const a=e.target.closest&&e.target.closest('a[href*="lexikon"]');if(!a||!isLex(a)||e.ctrlKey||e.metaKey||e.shiftKey)return;
  e.preventDefault();const h=(a.getAttribute('href').split('#')[1])||'';window.simLex(h);},true);
})();
