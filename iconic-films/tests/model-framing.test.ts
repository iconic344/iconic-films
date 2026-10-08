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
 assert.ok(large.minimumDistance>=2*base.minimumDistance);
 assert.ok(large.maximumDistance>large.minimumDistance);
});

test('small and degenerate dimensions never produce nonfinite distances',()=>{
 for(const dimensions of [{x:0,y:0,z:0},{x:.01,y:.01,z:.01}]){
  const r=calculateModelFrame(dimensions,1,1,30,{scale:0});
  assert.ok(Number.isFinite(r.distance)&&r.distance>0);
  assert.ok(Number.isFinite(r.minimumDistance)&&r.minimumDistance>0);
 }
});
