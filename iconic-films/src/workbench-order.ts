import type {Config,PortfolioSectionKey,SiteSectionKey,TeamMember} from './defaults';

export const HOME_SECTIONS:readonly SiteSectionKey[]=['nav','hero','work','about','team','footer'];
export const PORTFOLIO_SECTIONS:readonly PortfolioSectionKey[]=['nav','hero','index','work','switcher','footer'];
export const LOCKED_HOME_SECTIONS:readonly SiteSectionKey[]=['nav','footer'];
export const LOCKED_PORTFOLIO_SECTIONS:readonly PortfolioSectionKey[]=['nav','switcher','footer'];

export function normalizedSectionOrder<T extends string>(stored:readonly T[]|null|undefined,known:readonly T[],lockedStart:readonly T[],lockedEnd:readonly T[]){
 const valid=new Set<T>(known);
 const start=lockedStart.filter(key=>valid.has(key));
 const end=lockedEnd.filter(key=>valid.has(key)&&!start.includes(key));
 const locked=new Set<T>([...start,...end]);
 const middle=[...new Set((stored||[]).filter(key=>valid.has(key)&&!locked.has(key)))];
 for(const key of known){if(!locked.has(key)&&!middle.includes(key))middle.push(key)}
 return [...start,...middle,...end];
}
export function homeSectionOrder(config:Pick<Config,'sectionOrder'>){
 return normalizedSectionOrder(config.sectionOrder,HOME_SECTIONS,['nav'],['footer']);
}
export function memberSectionOrder(member:Pick<TeamMember,'portfolioSectionOrder'>){
 return normalizedSectionOrder(member.portfolioSectionOrder,PORTFOLIO_SECTIONS,['nav'],['switcher','footer']);
}
/* A drop is a move, not a swap. The endpoints are fixed and never silently
   reorder things which are visually overlaid, such as the navigation bar. */
export function moveOrderedItem<T extends string>(items:readonly T[],from:T,to:T,locked:readonly T[]=[]):T[]{
 if(from===to||locked.includes(from)||locked.includes(to))return [...items];
 const moved=[...items],a=moved.indexOf(from),b=moved.indexOf(to);
 if(a<0||b<0)return moved;
 moved.splice(a,1);
 moved.splice(b,0,from);
 return moved;
}
/* Portfolio work stores per-index credits, categories and display ratios.
   Moving only video URLs destroys that correspondence. */
export function movePortfolioWork(member:TeamMember,from:number,to:number):Partial<TeamMember>{
 const count=member.works.length;
 if(from===to||from<0||to<0||from>=count||to>=count)return {};
 const move=<T,>(values:readonly T[]|undefined,fallback:T):T[]=>{
   const copy=Array.from({length:count},(_,i)=>values?.[i]??fallback);
   const [entry]=copy.splice(from,1);copy.splice(to,0,entry);
   return copy;
 };
 return {
  works:move(member.works,''),
  portfolioWorkCategories:move(member.portfolioWorkCategories,''),
  portfolioWorkTitles:move(member.portfolioWorkTitles,''),
  portfolioWorkInfo:move(member.portfolioWorkInfo,''),
  portfolioWorkCredits:move(member.portfolioWorkCredits,''),
  portfolioWorkRatios:move(member.portfolioWorkRatios,'auto')
 };
}
