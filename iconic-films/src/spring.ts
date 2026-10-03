export type Spring={value:number;velocity:number};
export function springStep(state:Spring,target:number,dtMs:number,bounce=.55){
 const stiffness=170,damping=2*Math.sqrt(stiffness)*(1-.55*Math.max(0,Math.min(1,bounce)));
 const steps=Math.max(1,Math.ceil(Math.min(48,Math.max(0,dtMs))/8));const dt=Math.min(48,Math.max(0,dtMs))/steps/1000;
 for(let i=0;i<steps;i++){state.velocity+=((target-state.value)*stiffness-state.velocity*damping)*dt;state.value+=state.velocity*dt}
 if(Math.abs(state.value-target)<.00001&&Math.abs(state.velocity)<.0001){state.value=target;state.velocity=0}
 return state.value;
}
export const closestAngle=(angle:number,reference:number)=>reference+Math.atan2(Math.sin(angle-reference),Math.cos(angle-reference));
