import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const snapshot=JSON.parse(readFileSync(path.join(root,'src/viivii-public-snapshot.json'),'utf8'));
const gallery=readFileSync(path.join(root,'src/media-gallery.tsx'),'utf8');
const css=readFileSync(path.join(root,'src/portfolio-slider-unified.css'),'utf8');
const originalCss=readFileSync(path.join(root,'src/hero-gallery-poster-fix.css'),'utf8');

test('VIIVII pre-NAS editorial showreel retains real media with full-frame fit',()=>{
  assert.match(snapshot.name,/viivii/i);
  assert.equal(snapshot.heroVideo,'/media/viivii-hero-777.mp4');
  assert.equal(snapshot.heroPoster,'/media/viivii-hero-777-poster.jpg');
  assert.equal(snapshot.heroMediaFit,'contain');
  assert(statSync(path.join(root,'public/media/viivii-hero-777.mp4')).size>100_000);
  assert(statSync(path.join(root,'public/media/viivii-hero-777-poster.jpg')).size>10_000);
});

test('hero image and video are never force-cropped while waiting or playing',()=>{
  assert.match(css,/\.is-pre-nas-showreel[\s\S]*?object-fit:contain!important/);
  assert.match(css,/\.is-pre-nas-showreel\.is-fullscreen\.has-video[\s\S]*?object-fit:contain!important/);
  assert.match(originalCss,/object-fit:var\(--gallery-media-fit,cover\)/);
});

test('video loops natively both in preview and during fullscreen handoff',()=>{
  assert.match(gallery,/v\.loop=true;v\.controls=false/);
  assert.match(gallery,/data-site-autoplay=\{!modal&&active\?'true':undefined\} autoPlay=\{active&&!suspended\} loop playsInline/);
  assert.match(gallery,/const ended=\(\)=>\{if\(v\.ended\)/);
  assert.match(gallery,/\.is-pre-nas-showreel/);
});
