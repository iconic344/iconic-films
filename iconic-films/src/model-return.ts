import {springStep,closestAngle} from './spring';
type Orbit={theta:number;phi:number;radius:number};
export type ReturnViewer={cameraOrbit:string;orientation:string;autoRotate:boolean;turntableRotation:number;updateComplete:Promise<unknown>;getCameraOrbit:()=>Orbit;resetTurntableRotation:(theta:number)=>void;jumpCameraToGoal:()=>void};
export type ReturnOptions={enabled:boolean;bounce:number;animated:boolean;autoRotate:boolean;orientation:[number,number,number]};
export function createModelReturn(viewer:ReturnViewer,options:()=>ReturnOptions){
 const pointers=new Set<number>();let frame=0,generation=0,wheelTimer:ReturnType<typeof setTimeout>|undefined,returning=false;
 let home:Orbit|null=null,homeYaw=0,angles=[...options().orientation];
 const cancel=()=>{cancelAnimationFrame(frame);frame=0;generation++;returning=false};
 const restoreRotation=()=>{viewer.autoRotate=options().autoRotate&&options().animated};
 const begin=(id:number)=>{if(!pointers.size){if(!returning){home={...viewer.getCameraOrbit()};homeYaw=viewer.turntableRotation}cancel();viewer.autoRotate=false}pointers.add(id)};
 const reset=()=>{
  if(pointers.size)return;const opt=options();if(!opt.enabled){restoreRotation();return}cancel();returning=true;viewer.autoRotate=false;
  const orbit=viewer.getCameraOrbit();const goal=home?{...home,theta:closestAngle(home.theta,orbit.theta)}:null;
  const target=[...opt.orientation];const startYaw=viewer.turntableRotation;const goalYaw=home?closestAngle(homeYaw,startYaw):startYaw;
  const values=[orbit.theta,orbit.phi,orbit.radius,...angles,startYaw].map(value=>({value,velocity:0}));
  const targets=[goal?.theta??orbit.theta,goal?.phi??orbit.phi,goal?.radius??orbit.radius,...target,goalYaw];
  const myGeneration=generation;let last=0,elapsed=0;
  const apply=()=>{if(goal)viewer.cameraOrbit=`${values[0].value}rad ${Math.max(.001,Math.min(Math.PI-.001,values[1].value))}rad ${Math.max(.00001,values[2].value)}m`;angles=values.slice(3,6).map(v=>v.value);viewer.orientation=angles.map(v=>v+'deg').join(' ');if(home)viewer.resetTurntableRotation(values[6].value);void viewer.updateComplete.then(()=>{if(generation===myGeneration)viewer.jumpCameraToGoal()})};
  const tick=(time:number)=>{if(generation!==myGeneration)return;const dt=Math.min(40,time-(last||time-16));last=time;elapsed+=dt;
   if(!opt.animated)values.forEach((v,i)=>{v.value=targets[i];v.velocity=0});else values.forEach((v,i)=>springStep(v,targets[i],dt,opt.bounce));apply();
   const settled=values.every((v,i)=>Math.abs(v.value-targets[i])<.0001&&Math.abs(v.velocity)<.001);
   if(settled||elapsed>1800){values.forEach((v,i)=>{v.value=targets[i];v.velocity=0});apply();returning=false;home=null;frame=0;restoreRotation()}else frame=requestAnimationFrame(tick)
  };frame=requestAnimationFrame(tick);
 };
 const end=(id:number)=>{if(!pointers.delete(id))return;if(!pointers.size)reset()};
 return {
  begin,end,
  hover(x:number,y:number){if(pointers.size||returning)return;angles=[options().orientation[0]+x,options().orientation[1]+y,options().orientation[2]];viewer.orientation=angles.map(v=>v+'deg').join(' ')},
  leave(){if(!pointers.size&&!returning)reset()},
  wheel(){begin(-1);clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>end(-1),180)},
  dispose(){cancel();clearTimeout(wheelTimer);pointers.clear();restoreRotation()}
 };
}
