'use client';
import {useState} from 'react';
import {RotateCcw} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {uploadFile} from './media-upload';
import {defaultModelLighting,type EnvironmentMap,type ModelLighting} from './logo-settings';

const toneMappings:[ModelLighting['toneMapping'],string][]=[['auto','Auto'],['aces','ACES'],['agx','AgX'],['reinhard','Reinhard'],['cineon','Cineon'],['linear','Linear'],['none','None']];

export default function ModelLightingEditor({title,value,onChange,environments,onEnvironmentsChange,busy,setBusy,notify}:{title:string;value:ModelLighting;onChange:(value:ModelLighting)=>void;environments:EnvironmentMap[];onEnvironmentsChange:(value:EnvironmentMap[])=>void;busy:boolean;setBusy:(value:boolean)=>void;notify:(value:string)=>void}){
 const [uploading,setUploading]=useState(false);
 const set=(key:keyof ModelLighting,next:unknown)=>onChange({...value,[key]:next});
 const range=(key:'exposure'|'shadowIntensity'|'shadowSoftness',label:string,min:number,max:number,step:number)=><label className="field">{label}<span className="val">{value[key].toFixed(2)}</span><Slider aria-label={label} value={[value[key]]} min={min} max={max} step={step} onValueChange={v=>set(key,v[0])}/></label>;
 async function uploadEnvironment(file:File|undefined){
  if(!file)return;
  setBusy(true);setUploading(true);
  try{const url=await uploadFile(file);const next=[...environments,{url,name:file.name}];onEnvironmentsChange(next);set('environment',url);notify('HDRI를 등록했습니다. 변경 사항을 저장하세요.')}catch(error){notify((error as Error).message)}finally{setBusy(false);setUploading(false)}
 }
 return <section className="editor-card">
  <div className="logo-preview-heading"><h3>{title} · 3D LIGHTING</h3><button type="button" className="secondary-button" title="Reset lighting defaults" aria-label={`${title} lighting defaults reset`} onClick={()=>onChange({...defaultModelLighting})}><RotateCcw size={15}/> Reset Default</button></div>
  <label className="toggle">커스텀 조명 사용<Switch checked={value.enabled} onCheckedChange={next=>set('enabled',next)}/></label>
  <label className="field">HDRI / Environment<Select value={value.environment} onValueChange={next=>set('environment',next)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="neutral">Neutral</SelectItem><SelectItem value="legacy">Legacy Studio</SelectItem>{environments.map(environment=><SelectItem key={environment.url} value={environment.url}>{environment.name}</SelectItem>)}</SelectContent></Select></label>
  <label className="field file-upload">HDRI (.hdr) 업로드<input type="file" accept=".hdr,.exr" disabled={busy||uploading} onChange={event=>{const file=event.target.files?.[0];event.target.value='';void uploadEnvironment(file)}}/><span className="uploaded-file">{uploading?'업로드 중…':'Radiance HDR 파일을 선택하세요 · 최대 100MB'}</span></label>
  {range('exposure','Exposure',.2,2,.05)}
  {range('shadowIntensity','Shadow Intensity',0,1,.05)}
  {range('shadowSoftness','Shadow Softness',0,1,.05)}
  <label className="field">Tone Mapping<Select value={value.toneMapping} onValueChange={next=>set('toneMapping',next as ModelLighting['toneMapping'])}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{toneMappings.map(([key,label])=><SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></label>
  <p>model-viewer 4.3.1에는 별도 Environment Intensity가 없어 Exposure를 사용합니다. 끄면 사용자 HDRI와 그림자를 비활성화하며 기본 조명은 유지됩니다.</p>
 </section>;
}
