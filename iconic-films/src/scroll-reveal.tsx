import {useEffect} from 'react';

// Observe new route/filter content as well as the first render. Only public
// content is animated; controls and portal dialogs remain immediately usable.
export default function ScrollReveal({enabled}:{enabled:boolean}){
 useEffect(()=>{
  if(!enabled||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const selector='.hero-top,.hero-bottom,.section-head,.filters,.work-card,.about-copy,.about-visual,.disciplines,.team-section-head,.team-stack-card,.team-portfolio-profile,.team-member-index,.team-portfolio-work-head,.team-portfolio-subfilters,.team-portfolio-grid-item,.team-portfolio-slider,.team-portfolio-member-switch,.focus-section-head,.focus-card,.focus-navigation,.footer-copy,.team-portfolio-footer';
  const seen=new Set<Element>();
  const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target)}}},{threshold:0,rootMargin:'0px 0px -6% 0px'});
  const scan=()=>{
   document.querySelectorAll('.site main .reveal,.team-section.reveal').forEach(el=>el.classList.add('in'));
   document.querySelectorAll(selector).forEach(el=>{
    if(seen.has(el)||el.closest('[role="dialog"],.admin-panel,[data-reveal="off"]'))return;
    seen.add(el);
    const rect=el.getBoundingClientRect();
    // Initial above-fold content stays visible while the boot screen loads.
    if(rect.top<window.innerHeight*.92&&rect.bottom>0)return;
    el.classList.add('scroll-reveal');observer.observe(el);
   });
   for(const node of seen)if(!node.isConnected){observer.unobserve(node);seen.delete(node)}
  };
  scan();let scheduled=0;
  const mutations=new MutationObserver(()=>{if(!scheduled)scheduled=requestAnimationFrame(()=>{scheduled=0;scan()})});
  mutations.observe(document.getElementById('root')!,{childList:true,subtree:true});
  return()=>{observer.disconnect();mutations.disconnect();cancelAnimationFrame(scheduled);seen.forEach(el=>el.classList.add('is-revealed'))};
 },[enabled]);
 return null;
}
