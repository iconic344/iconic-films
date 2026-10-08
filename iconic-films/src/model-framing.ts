/**
 * Rotation-safe camera framing for all glTF / GLB viewers.
 *
 * A model's bounding sphere is rotation invariant. Fit that entire sphere
 * against BOTH the vertical and horizontal field of view. Unlike a fixed
 * camera-orbit percentage, this stays inside the viewport at any orientation,
 * editor zoom level and tablet/phone aspect ratio.
 */
export type ModelFrameDimensions={x:number;y:number;z:number};
export type ModelFrameOrbit={theta:number;phi:number;radius:number};
export type FramingViewer=HTMLElement&{
 loaded?:boolean;
 getDimensions?:()=>ModelFrameDimensions;
 getFieldOfView?:()=>number;
 getCameraOrbit?:()=>ModelFrameOrbit;
 jumpCameraToGoal?:()=>void;
};
export type ModelFrameOptions={
 scale?:number;
 outerScale?:number;
 offsetX?:number;
 offsetY?:number;
 resetDistance?:boolean;
  orbit?:ModelFrameOrbit;
};

const valid=(n:number,fallback:number)=>Number.isFinite(n)&&n>0?n:fallback;
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));

export function calculateModelFrame(
 dimensions:ModelFrameDimensions,
 viewWidth:number,
 viewHeight:number,
 verticalFovDegrees:number,
 options:ModelFrameOptions={}
){

 const sx=valid(Math.abs(dimensions.x),.0001)/2;
 const sy=valid(Math.abs(dimensions.y),.0001)/2;
 const sz=valid(Math.abs(dimensions.z),.0001)/2;
 const aspect=valid(viewWidth,1)/valid(viewHeight,1);
 const vfov=clamp(valid(verticalFovDegrees,30),10,100)*Math.PI/180;
 const halfVFov=vfov/2;
 const halfHFov=Math.atan(Math.tan(halfVFov)*aspect);
 let fittedDistance=0;
 if(options.orbit){
   // Tight per-orientation fit for all eight corners. A wide, flat logo is
   // 2–4x larger than it was with the unnecessarily huge enclosing sphere.
   const theta=options.orbit.theta,phi=options.orbit.phi;
   const st=Math.sin(theta),ct=Math.cos(theta),sp=Math.sin(phi),cp=Math.cos(phi);
   for(const x of [-sx,sx])for(const y of [-sy,sy])for(const z of [-sz,sz]){
     const projectedX= x*ct-z*st;
     const projectedY=-x*cp*st+y*sp-z*cp*ct;
     const nearDepth=x*sp*st+y*cp+z*sp*ct;
     const needsX=Math.abs(projectedX)/Math.tan(halfHFov);
     const needsY=Math.abs(projectedY)/Math.tan(halfVFov);
     fittedDistance=Math.max(fittedDistance,nearDepth+Math.max(needsX,needsY));
   }
 }else{
   // Conservative backward-compatible fallback for callers without orbit data.
   const radius=Math.hypot(sx,sy,sz);
   fittedDistance=radius/Math.sin(Math.min(halfVFov,halfHFov));
 }
 const offsetX=Math.min(.25,Math.abs(options.offsetX??0)/100);
 const offsetY=Math.min(.25,Math.abs(options.offsetY??0)/100);
 const offsetGuard=1/Math.max(.5,1-2*Math.max(offsetX,offsetY));
 // Small real margin for rotation and anti-aliasing, no more camera shrink hack.
 const minimumDistance=Math.max(.0001,fittedDistance*1.07)*offsetGuard;
 const outerScale=Math.max(1,valid(options.outerScale??1,1));
 const zoom=clamp(valid(options.scale??1,1),.1,8);
 const preferred=minimumDistance*Math.max(1.015,1.5/zoom);
 const desiredDistance=preferred*outerScale;
 return {
   minimumDistance,
   distance:Math.max(minimumDistance,desiredDistance),
   maximumDistance:Math.max(minimumDistance*25,minimumDistance+100)
 };
}

export function frameModelViewer(viewer:FramingViewer,options:ModelFrameOptions={}):void{
 if(!viewer.loaded||!viewer.getDimensions||!viewer.getCameraOrbit)return;
 const dimensions=viewer.getDimensions();
 if(!dimensions||![dimensions.x,dimensions.y,dimensions.z].every(Number.isFinite))return;
 const rectangle=viewer.getBoundingClientRect();
 if(rectangle.width<2||rectangle.height<2)return;
 const fieldOfView=viewer.getFieldOfView?.()??30;
 const orbit=viewer.getCameraOrbit();
 if(!orbit||![orbit.theta,orbit.phi,orbit.radius].every(Number.isFinite))return;
 const frame=calculateModelFrame(dimensions,rectangle.width,rectangle.height,fieldOfView,{...options,orbit});
 // Apply limits FIRST: scrolling, touch zoom and spring-return may never
 // enter the model or pass through its silhouette near the camera plane.
 viewer.setAttribute('max-camera-orbit',`auto auto ${frame.maximumDistance.toFixed(6)}m`);
 viewer.setAttribute('min-camera-orbit',`auto auto ${frame.minimumDistance.toFixed(6)}m`);
 const next=options.resetDistance?frame.distance:Math.max(orbit.radius,frame.minimumDistance);
 if(Math.abs(orbit.radius-next)>Math.max(.0001,next*.002)){
   viewer.setAttribute('camera-orbit',`${orbit.theta}rad ${orbit.phi}rad ${next.toFixed(6)}m`);
   viewer.jumpCameraToGoal?.();
 }
}
