/* ACT-882 mandatory acknowledgement shared behaviour. Per-visit, never persisted. */
(function(){
'use strict';
function init(){
 const gate=document.getElementById('pkDisclosureGate')||document.getElementById('ackGate');
 if(!gate)return;
 const box=gate.querySelector('#pkAccept,#ackBox');
 const button=gate.querySelector('#pkReveal,#revealBtn');
 if(!box||!button)return;
 const legacy=gate.id==='pkDisclosureGate';
 const html=document.documentElement;
 box.checked=false;button.disabled=true;
 if(legacy){html.classList.add('pk-locked');html.classList.remove('pk-unlocked');}
 else{
  const analysis=document.getElementById('analysisContent'),print=document.getElementById('printContent');
  if(analysis)analysis.hidden=true;
  if(print)print.hidden=true;
 }
 box.addEventListener('change',()=>{button.disabled=!box.checked;});
 button.addEventListener('click',()=>{
  if(!box.checked||button.disabled)return;
  if(legacy){html.classList.remove('pk-locked');html.classList.add('pk-unlocked');}
  else{
   const analysis=document.getElementById('analysisContent'),print=document.getElementById('printContent');
   if(analysis)analysis.hidden=false;
   if(print)print.hidden=false;
  }
  gate.hidden=true;
  const analysis=document.getElementById('analysisContent');
  if(analysis)analysis.scrollIntoView({block:'start'});
 });
 window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
