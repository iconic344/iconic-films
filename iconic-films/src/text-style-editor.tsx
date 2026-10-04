'use client';
import {Slider} from '@/components/ui/slider';
import type {TextAlign,TextStyle} from './defaults';

export default function TextStyleEditor({
  label,value,onChange,text,onTextChange,multiline=false
}:{
  label:string;
  value:TextStyle;
  onChange:(next:TextStyle)=>void;
  text?:string;
  onTextChange?:(next:string)=>void;
  multiline?:boolean;
}){
  const set=<K extends keyof TextStyle>(key:K,next:TextStyle[K])=>onChange({...value,[key]:next});
  return <section className="text-style-editor">
    <div className="text-style-editor-head"><h4>{label}</h4><span>{value.size}px</span></div>
    {onTextChange&&<label className="field">문구{multiline?<textarea value={text||''} onChange={e=>onTextChange(e.target.value)}/>:<input value={text||''} onChange={e=>onTextChange(e.target.value)}/>}</label>}
    <div className="text-style-editor-grid">
      <label className="field">글씨체<input value={value.font||''} placeholder="Arial, Helvetica, sans-serif" onChange={e=>set('font',e.target.value)}/></label>
      <label className="field">색상<div className="text-color-row"><input type="color" aria-label={label+' 색상'} value={/^#[0-9a-f]{6}$/i.test(value.color||'')?value.color:'#ffffff'} onChange={e=>set('color',e.target.value)}/><button type="button" className={!value.color?'active':''} onClick={()=>set('color','')}>테마 자동</button></div></label>
    </div>
    <label className="field layout-range">크기 <span className="val">{value.size}px</span><Slider value={[value.size]} min={8} max={180} step={1} onValueChange={v=>set('size',v[0])}/></label>
    <label className="field">정렬<div className="team-layout-choice">{(['left','center','right'] as TextAlign[]).map(align=><button type="button" key={align} className={value.align===align?'active':''} onClick={()=>set('align',align)}>{align.toUpperCase()}</button>)}</div></label>
    <div className="text-style-editor-grid">
      <label className="field layout-range">가로 위치 <span className="val">{value.x}px</span><Slider value={[value.x]} min={-360} max={360} step={1} onValueChange={v=>set('x',v[0])}/></label>
      <label className="field layout-range">세로 위치 <span className="val">{value.y}px</span><Slider value={[value.y]} min={-260} max={260} step={1} onValueChange={v=>set('y',v[0])}/></label>
    </div>
  </section>
}
