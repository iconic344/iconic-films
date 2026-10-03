/** Import an independently supplied config JSON without touching the old site. */
import {readFile,writeFile} from 'node:fs/promises';
const input=process.argv[2];
if(!input)throw Error('사용법: npm run import:site -- /path/to/config.json');
const raw=JSON.parse(await readFile(input,'utf8')),config=raw.config||raw;
if(typeof config.name!=='string'||!Array.isArray(config.works)||!Array.isArray(config.tracks))throw Error('유효한 ICONIC 설정 파일이 아닙니다.');
await writeFile('src/site-config.json',JSON.stringify(config,null,2)+'\n');
console.log('설정 스냅샷을 가져왔습니다. 필요하면 미디어 경로를 public/media 경로로 맞추고 다시 빌드하세요.');
