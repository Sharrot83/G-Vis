/* Ljust och mörkt läge i simulatorerna. Samma inställning som i G-vis och lexikonet (localStorage 'cnc-tema').
   Det ljusa läget vänder färgerna på sidan. 3D-vyn, bilder, lexikonet och det som står i data-keep vänds tillbaka, så att de behåller sina egna färger.
   3D-scenernas bakgrund byts med simTema.bg(scen, mörk, ljus). */
(function(){
'use strict';
const me=document.currentScript,keep=(me&&me.dataset.keep)?','+me.dataset.keep:'';
let t='dark';try{t=localStorage.getItem('cnc-tema')||'dark';}catch(e){}
const root=document.documentElement;root.setAttribute('data-theme',t);
const st=document.createElement('style');
const back='canvas,img,video,iframe,svg image'+keep.split(',').filter(Boolean).map(s=>','+s.trim()).join('');
st.textContent=`html[data-theme="light"]{background:#e9edf0;color-scheme:light}
html[data-theme="light"] body{filter:invert(1) hue-rotate(180deg)}
html[data-theme="light"] body :is(${back}){filter:invert(1) hue-rotate(180deg)}
.sim-tema{cursor:pointer;font:inherit}`;
root.appendChild(st);
const fns=[];
const light=()=>root.getAttribute('data-theme')==='light';
function set(v){t=v;root.setAttribute('data-theme',v);try{localStorage.setItem('cnc-tema',v);}catch(e){}
  document.querySelectorAll('iframe').forEach(f=>{try{f.contentDocument.documentElement.setAttribute('data-theme',v);}catch(e){}});
  fns.forEach(f=>{try{f(light());}catch(e){}});lab();}
const T=s=>(window.cncT||String)(s);
function lab(){document.querySelectorAll('.sim-tema').forEach(b=>{b.textContent=light()?'☾ '+T('Mörkt läge'):'☀ '+T('Ljust läge');b.title=T(light()?'Byt till mörkt läge':'Byt till ljust läge');});}
window.simTema={light,set,on:f=>{fns.push(f);try{f(light());}catch(e){}},
  bg(scene,dark,lightCol){if(!scene||!window.THREE)return;const ap=l=>{const c=new THREE.Color(l?lightCol:dark);scene.background=c;if(scene.fog)scene.fog.color=c.clone();};window.simTema.on(ap);}};
/* knappen läggs bredvid varje Lexikon-länk */
function boot(){document.querySelectorAll('a[href*="lexikon.html"]').forEach(a=>{if(a.nextElementSibling&&a.nextElementSibling.classList.contains('sim-tema'))return;
  const b=document.createElement('button');b.type='button';b.className=a.className+' sim-tema';b.style.cssText=(a.getAttribute('style')||'');
  const cs=getComputedStyle(a);b.style.fontSize=cs.fontSize;b.style.fontFamily=cs.fontFamily;b.style.letterSpacing=cs.letterSpacing;b.style.textTransform=cs.textTransform;b.style.fontWeight=cs.fontWeight;
  b.addEventListener('click',()=>set(light()?'dark':'light'));a.after(b);});lab();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
