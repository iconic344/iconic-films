import assert from 'node:assert/strict';
import test from 'node:test';
import {calculateModelFrame} from '../src/model-framing';

const bounds={x:5.05,y:2.64,z:.43}; // Wide extruded 3D wordmark
const vFov=30;

test('all rotations of a wide logo fit in landscape and portrait viewers',()=>{
 for(const [width,height] of [[1920,1080],[800,800],[390,844],[320,700],[1024,768]]){
  const result=calculateModelFrame(bounds,width,height,vFov);
  const radius=Math.hypot(bounds.x,bounds.y,bounds.z)/2;
  const fov=vFov*Math.PI/180;
  const narrowHalf=Math.min(fov,2*Math.atan(Math.tan(fov/2)*width/height))/2;
  const worstCaseProjectedRadius=radius/(result.minimumDistance*Math.sin(narrowHalf));
  assert.ok(worstCaseProjectedRadius<=.85,'rotation envelope needs at least 15% margin');
  assert.ok(result.distance>=result.minimumDistance);
 }
});

test('increasing editor zoom cannot drive model inside camera clipping zone',()=>{
 const zoomed=calculateModelFrame(bounds,700,440,vFov,{scale:100});
 const defaultFrame=calculateModelFrame(bounds,700,440,vFov,{scale:1});
 assert.ok(zoomed.distance>=zoomed.minimumDistance);
 assert.ok(defaultFrame.distance>=defaultFrame.minimumDistance);
});

test('larger CSS logo scale and editor offsets preserve the safe orbit',()=>{
 const base=calculateModelFrame(bounds,700,440,vFov);
 const large=calculateModelFrame(bounds,700,440,vFov,{outerScale:2,offsetX:22,offsetY:-12});
 assert.ok(large.distance>base.distance*1.8,'external CSS scale needs a wider camera envelope');
 assert.ok(large.maximumDistance>large.minimumDistance);
});

test('small and degenerate dimensions never produce nonfinite distances',()=>{
 for(const dimensions of [{x:0,y:0,z:0},{x:.01,y:.01,z:.01}]){
  const r=calculateModelFrame(dimensions,1,1,30,{scale:0});
  assert.ok(Number.isFinite(r.distance)&&r.distance>0);
  assert.ok(Number.isFinite(r.minimumDistance)&&r.minimumDistance>0);
 }
});

test('portrait and wide 3D objects use close, angle-aware framing and respond to zoom',()=>{
 const orbit={theta:0,phi:75*Math.PI/180,radius:20};
 const near=calculateModelFrame(bounds,700,440,vFov,{orbit,scale:2.5});
 const far=calculateModelFrame(bounds,700,440,vFov,{orbit,scale:1});
 assert.ok(near.distance<far.distance,'2.5x editor scale should visibly enlarge the 3D model');
 const conservative=calculateModelFrame(bounds,700,440,vFov,{scale:2.5});
 assert.ok(near.distance<conservative.distance,'front-facing wide logo should not use all-angle sphere');
});

test('oriented bounds stay inside camera view at every azimuth',()=>{
 const halfV=vFov*Math.PI/360;
 const halfH=Math.atan(Math.tan(halfV)*390/420);
 for(let i=0;i<=72;i++){
  const theta=i*Math.PI/36,phi=75*Math.PI/180;
  const f=calculateModelFrame(bounds,390,420,vFov,{orbit:{theta,phi,radius:8},scale:2.5});
  const st=Math.sin(theta),ct=Math.cos(theta),sp=Math.sin(phi),cp=Math.cos(phi);
  for(const x of [-bounds.x/2,bounds.x/2])
   for(const y of [-bounds.y/2,bounds.y/2])
    for(const z of [-bounds.z/2,bounds.z/2]){
     const u=x*ct-z*st,v=-x*cp*st+y*sp-z*cp*ct;
     const depth=x*sp*st+y*cp+z*sp*ct;
     assert.ok(f.distance-depth>=Math.abs(u)/Math.tan(halfH)-1e-7);
     assert.ok(f.distance-depth>=Math.abs(v)/Math.tan(halfV)-1e-7);
    }
 }
});
