/* ACT-882 shared investor analyser header v1.0.
   Reads only presentation metadata; never accesses investor inputs, calculations or storage. */
(function(){
"use strict";
function mount(){
  const target=document.querySelector('[data-pk-universal-header]');
  if(!target) return;
  const data=target.dataset;
  const rent=data.rent,code=data.propertyCode,town=data.town,region=data.region,description=data.description;
  if(!rent||!code||!town||!region||!description) return;
  const h=document.createElement('header');
  h.className='screen pk-universal-header';
  const eyebrow=document.createElement('small');eyebrow.className='pk-eyebrow';eyebrow.textContent='PROPERTY KICKSTART · INVESTOR ANALYSER';
  const title=document.createElement('h1');title.textContent=rent+' a month in rent. What could an investor keep?';
  const location=document.createElement('p');location.className='pk-location';location.textContent=code+' · '+town+' · '+region;
  const descriptor=document.createElement('p');descriptor.className='pk-description';descriptor.textContent=description;
  h.append(eyebrow,title,location,descriptor);
  // Preserve dynamically updated homepage/HA title nodes referenced by their financial scripts.
  const existingTitle=target.querySelector('#assessmentTitle');
  const existingSubtitle=target.querySelector('#assessmentSubtitle');
  if(existingTitle&&existingSubtitle){
    existingTitle.className='pk-dynamic-title';
    existingSubtitle.className='pk-location';
    existingSubtitle.textContent=code+' · '+town+' · '+region+' · '+description;
    const oldLabel=target.querySelector('.eyebrow');
    if(oldLabel){oldLabel.textContent='PROPERTY KICKSTART · INVESTOR ANALYSER';oldLabel.classList.add('pk-eyebrow');}
    target.classList.add('pk-universal-header');
  }else target.replaceWith(h);
  const introHost=document.querySelector('[data-pk-header-intro]');
  if(!introHost) return;
  const intro=document.createElement('div');intro.className='pk-header-intro';
  const heading=document.createElement('h2');heading.textContent='Explore the numbers.';
  const body=document.createElement('p');body.textContent='This analyser uses Property Kickstart’s standard assumptions for acquisition costs, financing and ongoing property expenses.';
  const scenario=document.createElement('p');scenario.textContent='Figures can be changed to explore different scenarios.';
  intro.append(heading,body,scenario);
  const risk=document.createElement('aside');risk.className='pk-header-risk';risk.setAttribute('role','note');
  const riskTitle=document.createElement('strong');riskTitle.textContent='Investment risk';
  const riskBody=document.createElement('p');riskBody.textContent='The value of property investments can go down as well as up. Rental income and financial returns are not guaranteed.';
  risk.append(riskTitle,riskBody);
  const disclaimer=document.createElement('p');disclaimer.className='pk-header-disclaimer';disclaimer.textContent='This analysis is provided for information and discussion and does not constitute an offer to purchase.';
  introHost.replaceWith(intro,risk,disclaimer);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
