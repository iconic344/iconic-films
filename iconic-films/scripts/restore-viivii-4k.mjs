import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const chunkDir=path.join(root,'media-transfer');
const target=path.join(root,'public','media','viivii-hero-777-4k.mp4');
const expectedHash='e8839ba3a9b06cfd302f992806cd6c22e320fdc37c4298d177ff731a75028417';
const chunks=Array.from({length:9},(_,index)=>{
  const file=path.join(chunkDir,`viivii-hero-4k.part${String(index+1).padStart(2,'0')}.txt`);
  return readFileSync(file,'utf8').trim();
});
const encoded=chunks.join('');
const bytes=Buffer.from(encoded,'base64');
const actualHash=createHash('sha256').update(bytes).digest('hex');
if(actualHash!==expectedHash)throw new Error(`4K video integrity check failed: ${actualHash} != ${expectedHash}`);
if(bytes.length!==22_814_149)throw new Error(`Unexpected 4K video size ${bytes.length}`);
if(bytes.subarray(4,8).toString()!=='ftyp')throw new Error('Invalid MP4 header');
mkdirSync(path.dirname(target),{recursive:true});
writeFileSync(target,bytes);
console.log(`Verified 4K H.264 opening showreel: ${bytes.length} bytes, sha256 ${actualHash}`);
