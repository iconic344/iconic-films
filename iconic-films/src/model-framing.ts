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
 const radius=Math.max(.0001,Math.hypot(
   valid(Math.abs(dimensions.x),.0001),
   valid(Math.abs(dimensions.y),.0001),
   valid(Math.abs(dimensions.z),.0001)
 )/2);
 const aspect=valid(viewWidth,1)/valid(viewHeight,1);
 const vfov=clamp(valid(verticalFovDegrees,30),10,100)*Math.PI/180;
 const hfov=2*Math.atan(Math.tan(vfov/2)*aspect);
 const limitingHalfFov=Math.min(vfov,hfov)/2;
 // Leave 18% space beyond even the worst possible 360-degree rotation.
 const unshifted=radius/Math.sin(limitingHalfFov)*1.18;
 // CSS scale used by MainLogo must not enlarge the rendered sphere offscreen.
 const outerScale=Math.max(1,valid(options.outerScale??1,1));
 const shiftX=Math.min(.3,Math.abs(options.offsetX??0)/100);
 const shiftY=Math.min(.3,Math.abs(options.offsetY??0)/100);
 // Account for the occupied space when a viewer is moved by the editor.
 const offsetGuard=1/Math.max(.4,1-2*Math.max(shiftX,shiftY));
 const minimumDistance=unshifted*outerScale*offsetGuard;
 // Allow intentional changes of size until the safety boundary is reached.
 const preferred=minimumDistance*1.3/valid(options.scale??1,1);
 return {
   minimumDistance,
   distance:Math.max(minimumDistance,preferred),
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
 const frame=calculateModelFrame(dimensions,rectangle.width,rectangle.height,fieldOfView,options);
 const orbit=viewer.getCameraOrbit();
 if(!orbit||![orbit.theta,orbit.phi,orbit.radius].every(Number.isFinite))return;
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
