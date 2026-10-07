'use client';
import type {Dispatch,SetStateAction} from 'react';
import {ArrowLeft,ArrowRight,Plus,Trash2,ChevronUp,ChevronDown} from 'lucide-react';
import {Switch} from '@/components/ui/switch';
import {Slider} from '@/components/ui/slider';
import type {Config,PortfolioMediaRatio,TeamMember,TextStyle} from './defaults';
import TextStyleEditor from './text-style-editor';
import {uploadFile} from './media-upload';
import TeamMedia from './team-media';

const blankMember=(draft:Config):TeamMember=>({id:crypto.randomUUID(),codeName:'',memberLabel:'MEMBER',name:'',role:'',bio:'',instagram:'',photo:'',works:[],visible:true,photoRadius:draft.teamMediaRadius,photoSize:draft.teamMediaSize,portfolioSlug:'member-'+Date.now().toString(36),portfolioTitle:'Selected works',portfolioIntro:'',portfolioCredits:'',portfolioCreditsVisible:true,portfolioTeamIndexLabel:'CATEGORY INDEX',portfolioSubcategories:['Fashion Show','Lookbook','Campaign','Editorial'],portfolioWorkCategories:[],portfolioWorkTitles:[],portfolioWorkInfo:[],portfolioWorkCredits:[],portfolioWorkRatios:[],portfolioLayout:'grid',portfolioColumns:3,portfolioGap:14,portfolioRadius:18,portfolioReturnLabel:'VIIVII sara / Team',portfolioProfileSize:430,portfolioNameFont:'Arial, Helvetica, sans-serif',portfolioNameSize:112,portfolioNameColor:'',portfolioNameAlign:'left',portfolioNameX:0,portfolioNameY:0,portfolioRoleFont:'Arial, Helvetica, sans-serif',portfolioRoleSize:10,portfolioRoleColor:'',portfolioRoleAlign:'left',portfolioRoleX:0,portfolioRoleY:0,portfolioBioFont:'Arial, Helvetica, sans-serif',portfolioBioSize:15,portfolioBioColor:'',portfolioBioAlign:'left',portfolioBioX:0,portfolioBioY:0,portfolioTitleFont:'Arial, Helvetica, sans-serif',portfolioTitleSize:76,portfolioTitleColor:'',portfolioTitleAlign:'left',portfolioTitleX:0,portfolioTitleY:0,portfolioIntroFont:'Arial, Helvetica, sans-serif',portfolioIntroSize:14,portfolioIntroColor:'',portfolioIntroAlign:'left',portfolioIntroX:0,portfolioIntroY:0,portfolioUtilityFont:'Arial, Helvetica, sans-serif',portfolioUtilitySize:11,portfolioUtilityColor:'',portfolioUtilityAlign:'left',portfolioUtilityX:0,portfolioUtilityY:0,portfolioReturnX:0,portfolioReturnY:0,portfolioSliderWidth:100,portfolioSliderHeight:760,portfolioGridWidth:100,portfolioSections:{nav:{visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0},hero:{visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0},index:{visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0},work:{visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0},switcher:{visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0},footer:{visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0}},portfolioDividers:[]});

const ratioOptions:{value:PortfolioMediaRatio;label:string}[]=[{value:'auto',label:'원본 / 자동'},{value:'16:9',label:'16:9'},{value:'4:5',label:'4:5'},{value:'4:3',label:'4:3'},{value:'3:2',label:'3:2'},{value:'1:1',label:'1:1'},{value:'9:16',label:'9:16'}];

export default function TeamEditor({draft,setDraft,busy,setBusy,notify}:{draft:Config;setDraft:Dispatch<SetStateAction<Config>>;busy:boolean;setBusy:(v:boolean)=>void;notify:(v:string)=>void}){
  const members=draft.teamMembers||[];
  const patch=(id:string,key:keyof TeamMember,value:unknown)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===id?{...m,[key]:value}:m)}));
  const setSubcategories=(id:string,raw:string)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>{
    if(m.id!==id)return m;
    const values=Array.from(new Set(raw.split(/[\n,]/).map(v=>v.trim()).filter(Boolean))).slice(0,16);
    const fallback=values[0]||'All';
    return {...m,portfolioSubcategories:values,portfolioWorkCategories:(m.portfolioWorkCategories||[]).map(v=>values.includes(v)?v:fallback)};
  })}));
  const setWorkCategory=(id:string,index:number,value:string)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>{
    if(m.id!==id)return m;
    const labels=[...(m.portfolioWorkCategories||[])];
    while(labels.length<(m.works||[]).length)labels.push((m.portfolioSubcategories||[])[0]||'All');
    labels[index]=value;
    return {...m,portfolioWorkCategories:labels};
  })}));
  const setWorkRatio=(id:string,index:number,value:PortfolioMediaRatio)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>{
    if(m.id!==id)return m;
    const ratios=[...(m.portfolioWorkRatios||m.works.map(()=>'auto' as PortfolioMediaRatio))];while(ratios.length<m.works.length)ratios.push('auto');ratios[index]=value;
    return {...m,portfolioWorkRatios:ratios};
  })}));
  const movePortfolioWork=(id:string,index:number,dir:number)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>{
    if(m.id!==id)return m;const target=index+dir;if(target<0||target>=m.works.length)return m;
    const works=[...m.works],categories=[...(m.portfolioWorkCategories||[])],titles=[...(m.portfolioWorkTitles||m.works.map(()=>m.name||'Portfolio'))],info=[...(m.portfolioWorkInfo||m.works.map(()=>''))],credits=[...(m.portfolioWorkCredits||m.works.map(()=>m.portfolioCredits||''))],ratios=[...(m.portfolioWorkRatios||m.works.map(()=>'auto' as PortfolioMediaRatio))];
    while(categories.length<works.length)categories.push((m.portfolioSubcategories||[])[0]||'All');while(titles.length<works.length)titles.push(m.name||'Portfolio');while(info.length<works.length)info.push('');while(credits.length<works.length)credits.push(m.portfolioCredits||'');while(ratios.length<works.length)ratios.push('auto');
    [works[index],works[target]]=[works[target],works[index]];[categories[index],categories[target]]=[categories[target],categories[index]];[titles[index],titles[target]]=[titles[target],titles[index]];[info[index],info[target]]=[info[target],info[index]];[credits[index],credits[target]]=[credits[target],credits[index]];[ratios[index],ratios[target]]=[ratios[target],ratios[index]];
    return {...m,works,portfolioWorkCategories:categories,portfolioWorkTitles:titles,portfolioWorkInfo:info,portfolioWorkCredits:credits,portfolioWorkRatios:ratios};
  })}));
  const removeWork=(id:string,index:number)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===id?{
    ...m,
    works:(m.works||[]).filter((_,i)=>i!==index),
    portfolioWorkCategories:(m.portfolioWorkCategories||[]).filter((_,i)=>i!==index),
    portfolioWorkTitles:(m.portfolioWorkTitles||m.works.map(()=>m.name||'Portfolio')).filter((_,i)=>i!==index),
    portfolioWorkInfo:(m.portfolioWorkInfo||m.works.map(()=>'')).filter((_,i)=>i!==index),
    portfolioWorkCredits:(m.portfolioWorkCredits||m.works.map(()=>m.portfolioCredits||'')).filter((_,i)=>i!==index),
    portfolioWorkRatios:(m.portfolioWorkRatios||m.works.map(()=>'auto' as PortfolioMediaRatio)).filter((_,i)=>i!==index)
  }:m)}));
  const setConfig=<K extends keyof Config>(key:K,value:Config[K])=>setDraft(d=>({...d,[key]:value}));
  const setGlobalStyle=(key:keyof Config['textStyles'],value:TextStyle)=>setDraft(d=>({...d,textStyles:{...d.textStyles,[key]:value}}));
  const miniRange=(member:TeamMember,key:keyof TeamMember,label:string,min:number,max:number,step=1,suffix='px')=><label className="field layout-range">{label}<span className="val">{Number(member[key])}{suffix}</span><Slider value={[Number(member[key])]} min={min} max={max} step={step} onValueChange={v=>patch(member.id,key,v[0])}/></label>;
  const portfolioStyle=(member:TeamMember,prefix:'Name'|'Role'|'Bio'|'Title'|'Intro'|'Utility'):TextStyle=>({
    font:String(member[('portfolio'+prefix+'Font') as keyof TeamMember]||'Arial, Helvetica, sans-serif'),
    size:Number(member[('portfolio'+prefix+'Size') as keyof TeamMember]||12),
    color:String(member[('portfolio'+prefix+'Color') as keyof TeamMember]||''),
    align:(member[('portfolio'+prefix+'Align') as keyof TeamMember]||'left') as TextStyle['align'],
    x:Number(member[('portfolio'+prefix+'X') as keyof TeamMember]||0),
    y:Number(member[('portfolio'+prefix+'Y') as keyof TeamMember]||0)
  });
  const patchPortfolioStyle=(member:TeamMember,prefix:'Name'|'Role'|'Bio'|'Title'|'Intro'|'Utility',value:TextStyle)=>{
    const keys:{[K in keyof TextStyle]:keyof TeamMember}={
      font:('portfolio'+prefix+'Font') as keyof TeamMember,
      size:('portfolio'+prefix+'Size') as keyof TeamMember,
      color:('portfolio'+prefix+'Color') as keyof TeamMember,
      align:('portfolio'+prefix+'Align') as keyof TeamMember,
      x:('portfolio'+prefix+'X') as keyof TeamMember,
      y:('portfolio'+prefix+'Y') as keyof TeamMember
    };
    setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>m.id===member.id?{...m,[keys.font]:value.font,[keys.size]:value.size,[keys.color]:value.color,[keys.align]:value.align,[keys.x]:value.x,[keys.y]:value.y}:m)}));
  };
  const remove=(id:string)=>setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).filter(m=>m.id!==id)}));
  const move=(index:number,dir:number)=>setDraft(d=>{const list=[...(d.teamMembers||[])],next=index+dir;if(next<0||next>=list.length)return d;[list[index],list[next]]=[list[next],list[index]];return {...d,teamMembers:list}});
  async function uploadOne(file:File|undefined,done:(url:string)=>void){
    if(!file)return;
    try{setBusy(true);const url=await uploadFile(file);done(url);notify('업로드 완료. 미리보기 후 저장 & 적용을 눌러 주세요.')}catch(e){notify((e as Error).message)}finally{setBusy(false)}
  }
  async function uploadWorks(id:string,files:FileList|null){
    if(!files?.length)return;
    try{
      setBusy(true);
      const urls:string[]=[];
      for(const file of Array.from(files))urls.push(await uploadFile(file));
      setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>{
        if(m.id!==id)return m;
        const fallback=(m.portfolioSubcategories||[])[0]||'All';
        return {...m,works:[...(m.works||[]),...urls],portfolioWorkCategories:[...(m.portfolioWorkCategories||[]),...urls.map(()=>fallback)],portfolioWorkTitles:[...(m.portfolioWorkTitles||m.works.map(()=>m.name||'Portfolio')),...urls.map(()=>m.name||'Portfolio')],portfolioWorkInfo:[...(m.portfolioWorkInfo||m.works.map(()=>'')),...urls.map(()=>'')],portfolioWorkCredits:[...(m.portfolioWorkCredits||m.works.map(()=>m.portfolioCredits||'')),...urls.map(()=>m.portfolioCredits||'')],portfolioWorkRatios:[...(m.portfolioWorkRatios||m.works.map(()=>'auto' as PortfolioMediaRatio)),...urls.map(()=>'auto' as PortfolioMediaRatio)]};
      })}));
      notify('포트폴리오 미디어 업로드 완료. 세부 카테고리를 지정한 뒤 저장 & 적용을 눌러 주세요.');
    }catch(e){notify((e as Error).message)}finally{setBusy(false)}
  }
  async function replaceWork(id:string,index:number,file:File|undefined){
    if(!file)return;
    try{
      setBusy(true);const url=await uploadFile(file);
      setDraft(d=>({...d,teamMembers:(d.teamMembers||[]).map(m=>{
        if(m.id!==id)return m;const works=[...m.works];works[index]=url;const ratios=[...(m.portfolioWorkRatios||m.works.map(()=>'auto' as PortfolioMediaRatio))];while(ratios.length<works.length)ratios.push('auto');ratios[index]='auto';return {...m,works,portfolioWorkRatios:ratios};
      })}));
      notify('작품을 교체했습니다. 표시 비율은 원본 비율로 초기화했습니다.');
    }catch(e){notify((e as Error).message)}finally{setBusy(false)}
  }
  return <div className="team-editor-stack">
    <section className="editor-card team-editor-intro">
      <div><h3>Team portfolio / categories</h3><p>팀 전체 포트폴리오를 Fashion / Commercial / Events 같은 대분류로 나누고, 각 페이지 안에서 세부 카테고리와 사진·영상·3D 미디어를 관리합니다.</p></div>
      <button type="button" className="add" onClick={()=>setDraft(d=>({...d,teamMembers:[...(d.teamMembers||[]),blankMember(d)]}))}><Plus size={16}/> 카테고리 추가</button>
    </section>
    <div className="team-editor-dashboard">
      <div className="team-editor-left-rail">
    <section className="editor-card typography-card">
      <h3>Portfolio category typography</h3>
      <p>메인 Team 영역을 팀 전체 포트폴리오 카테고리 인덱스로 사용합니다.</p>
      <TextStyleEditor label="Team 작은 제목" value={draft.textStyles.teamKicker} onChange={v=>setGlobalStyle('teamKicker',v)} text={draft.teamKicker} onTextChange={v=>setConfig('teamKicker',v)}/>
      <TextStyleEditor label="Team 큰 제목" value={draft.textStyles.teamHeadline} onChange={v=>setGlobalStyle('teamHeadline',v)} text={draft.teamHeadline} onTextChange={v=>setConfig('teamHeadline',v)} multiline/>
      <TextStyleEditor label="카테고리 이름" value={draft.textStyles.teamMemberName} onChange={v=>setGlobalStyle('teamMemberName',v)}/>
      <TextStyleEditor label="세부 카테고리" value={draft.textStyles.teamMemberBio} onChange={v=>setGlobalStyle('teamMemberBio',v)}/>
      <TextStyleEditor label="포트폴리오 버튼" value={draft.textStyles.teamView} onChange={v=>setGlobalStyle('teamView',v)} text={draft.teamViewLabel} onTextChange={v=>setConfig('teamViewLabel',v)}/>
      <label className="field layout-range">Team 제목 폭 <span className="val">{draft.teamHeadlineWidth}%</span><Slider value={[draft.teamHeadlineWidth]} min={35} max={100} step={1} onValueChange={v=>setConfig('teamHeadlineWidth',v[0])}/></label>
    </section>
      </div>
      <div className="team-editor-right-rail">
    <section className="editor-card team-brand-editor">
      <h3>Shared header brand</h3>
      <p>메인 사이트와 팀 포트폴리오 페이지가 같은 이름/로고를 사용합니다.</p>
      <label className="field">공통 헤더 이름<input value={draft.name} onChange={e=>setConfig('name',e.target.value)}/></label>
      <label className="field file-upload">공통 헤더 로고 업로드<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={busy} onChange={e=>uploadOne(e.target.files?.[0],url=>setConfig('logo',url))}/><span className="uploaded-file">{draft.logo?'로고 이미지 등록됨':'이미지가 없으면 위 이름 텍스트를 사용합니다.'}</span>{draft.logo&&<button type="button" className="file-clear" onClick={()=>setConfig('logo','')}>로고 이미지 제거</button>}</label>
      <div className="team-brand-preview brand">{draft.logo?<img src={draft.logo} alt={draft.name}/>:draft.name}<span>®</span></div>
    </section>
    {members.map((member,index)=><section className="editor-card team-editor-card" key={member.id}>
      <div className="team-editor-card-head">
        <div><span className="kicker">{String(index+1).padStart(2,'0')} / CATEGORY</span><h3>{member.name||'새 카테고리'}</h3></div>
        <div className="team-editor-actions">
          <button type="button" className="icon" aria-label="위로" disabled={index===0} onClick={()=>move(index,-1)}><ChevronUp size={17}/></button>
          <button type="button" className="icon" aria-label="아래로" disabled={index===members.length-1} onClick={()=>move(index,1)}><ChevronDown size={17}/></button>
          <button type="button" className="icon" aria-label="삭제" onClick={()=>remove(member.id)}><Trash2 size={16}/></button>
        </div>
      </div>
      <div className="team-credit-editor-top">
        <div className="team-credit-editor-copy"><span className="kicker">HERO CREDIT</span><strong>상단 크레딧</strong><small>히어로 좌측 상단에 표시됩니다. 영상·작품에 방해되면 표시를 끌 수 있습니다.</small></div>
        <label className="toggle">크레딧 표시<Switch checked={member.portfolioCreditsVisible!==false} onCheckedChange={v=>patch(member.id,'portfolioCreditsVisible',v)}/></label>
        <label className="field team-credit-editor-text">크레딧 내용<textarea placeholder={"DIRECTOR / xnives\nFILM MAKER / iconic\nPHOTOGRAPHER / h.feel"} value={member.portfolioCredits||''} onChange={e=>patch(member.id,'portfolioCredits',e.target.value)}/></label>
        <TextStyleEditor label="히어로 크레딧 스타일 / 위치" value={portfolioStyle(member,'Role')} onChange={v=>patchPortfolioStyle(member,'Role',v)}/>
      </div>
      <div className="team-editor-grid">
        <div className="team-member-fields">
          <label className="field">대분류 이름<input placeholder="Fashion / Commercial / Events" value={member.name} onChange={e=>patch(member.id,'name',e.target.value)}/></label>
          <label className="field">INDEX 문구<input maxLength={40} placeholder="CATEGORY INDEX" value={member.portfolioTeamIndexLabel||'CATEGORY INDEX'} onChange={e=>patch(member.id,'portfolioTeamIndexLabel',e.target.value.slice(0,40))}/></label>
          <label className="field">세부 카테고리<textarea placeholder={"Fashion Show\nLookbook\nCampaign\nEditorial"} value={(member.portfolioSubcategories||[]).join('\n')} onChange={e=>setSubcategories(member.id,e.target.value)}/><span className="uploaded-file">줄바꿈 또는 쉼표로 구분합니다. 포트폴리오 페이지 상단 필터로 표시됩니다.</span></label>
          
          
          
          
          <div className="team-portfolio-type-editor team-portfolio-type-editor--primary">
            <h4>Portfolio typography / position</h4>
            <TextStyleEditor label="카테고리 이름" value={portfolioStyle(member,'Name')} onChange={v=>patchPortfolioStyle(member,'Name',v)}/>
            <TextStyleEditor label="카테고리 보조문구" value={portfolioStyle(member,'Bio')} onChange={v=>patchPortfolioStyle(member,'Bio',v)}/>
          </div>
        </div>
        <div className="team-member-media">
          <label className="field file-upload">히어로 배경 미디어<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>uploadOne(e.target.files?.[0],url=>patch(member.id,'photo',url))}/><span className="uploaded-file">{member.photo?'히어로 배경 등록됨':'이미지 / 영상 / GLB·glTF'}</span>{member.photo&&<button type="button" className="file-clear" onClick={()=>patch(member.id,'photo','')}>배경 제거</button>}</label>
          {member.photo&&<div className="team-editor-hero-preview"><TeamMedia src={member.photo} alt="히어로 배경 미리보기" className="team-editor-hero-preview-media" interactive/></div>}
          <label className="field file-upload">포트폴리오 미디어 업로드<input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>uploadWorks(member.id,e.target.files)}/><span className="uploaded-file">이미지 / 영상 / 3D 여러 개 선택 가능</span></label>
          <div className="team-portfolio-type-editor team-portfolio-type-editor--secondary">
            <h4>Portfolio typography / position</h4>
            <TextStyleEditor label="아카이브 제목" value={portfolioStyle(member,'Title')} onChange={v=>patchPortfolioStyle(member,'Title',v)}/>
            <TextStyleEditor label="아카이브 설명" value={portfolioStyle(member,'Intro')} onChange={v=>patchPortfolioStyle(member,'Intro',v)}/>
            <TextStyleEditor label="기타 문구 / 헤더 / 카운트" value={portfolioStyle(member,'Utility')} onChange={v=>patchPortfolioStyle(member,'Utility',v)}/>
            <div className="team-return-position-pair">
              
            </div>
          </div>
          <div className="team-portfolio-size-editor">
            <h4>Portfolio media size</h4>
            {miniRange(member,'portfolioSliderWidth','슬라이드 폭',45,100,1,'%')}
            {miniRange(member,'portfolioSliderHeight','슬라이드 높이',320,1100)}
            {miniRange(member,'portfolioGridWidth','그리드 전체 폭',45,100,1,'%')}
          </div>
          <label className="field">포트폴리오 보기 방식<div className="team-layout-choice"><button type="button" className={member.portfolioLayout!=='slider'?'active':''} onClick={()=>patch(member.id,'portfolioLayout','grid')}>GRID</button><button type="button" className={member.portfolioLayout==='slider'?'active':''} onClick={()=>patch(member.id,'portfolioLayout','slider')}>SLIDER</button></div></label>
          {member.portfolioLayout!=='slider'&&<label className="field layout-range">포트폴리오 열 수 <span className="val">{member.portfolioColumns||3}</span><Slider value={[member.portfolioColumns||3]} min={1} max={4} step={1} onValueChange={v=>patch(member.id,'portfolioColumns',v[0])}/></label>}
          <label className="field layout-range">포트폴리오 간격 <span className="val">{member.portfolioGap||14}px</span><Slider value={[member.portfolioGap||14]} min={4} max={48} step={1} onValueChange={v=>patch(member.id,'portfolioGap',v[0])}/></label>
          <label className="field layout-range">포트폴리오 모서리 <span className="val">{member.portfolioRadius??18}px</span><Slider value={[member.portfolioRadius??18]} min={0} max={48} step={1} onValueChange={v=>patch(member.id,'portfolioRadius',v[0])}/></label>
          <label className="toggle">사이트에 표시<Switch checked={member.visible} onCheckedChange={v=>patch(member.id,'visible',v)}/></label>
        </div>
      </div>
      {!!member.works?.length&&<div className="team-editor-works team-editor-works--categorized">{member.works.map((url,i)=><div key={url+i} className="team-editor-work-card"><TeamMedia src={url} alt="작품 미리보기" className="team-editor-work-media" interactive/><div className="team-editor-work-meta"><span>{String(i+1).padStart(2,'0')}</span><select aria-label="세부 카테고리" value={(member.portfolioWorkCategories||[])[i]||(member.portfolioSubcategories||[])[0]||'All'} onChange={e=>setWorkCategory(member.id,i,e.target.value)}>{(member.portfolioSubcategories||[]).map(label=><option key={label} value={label}>{label}</option>)}{!(member.portfolioSubcategories||[]).length&&<option value="All">All</option>}</select><select aria-label="표시 비율" value={member.portfolioWorkRatios?.[i]||'auto'} onChange={e=>setWorkRatio(member.id,i,e.target.value as PortfolioMediaRatio)}>{ratioOptions.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div className="team-editor-work-actions"><button type="button" aria-label="왼쪽으로 이동" disabled={i===0} onClick={()=>movePortfolioWork(member.id,i,-1)}><ArrowLeft size={14}/></button><button type="button" aria-label="오른쪽으로 이동" disabled={i===member.works.length-1} onClick={()=>movePortfolioWork(member.id,i,1)}><ArrowRight size={14}/></button><label className="team-editor-work-replace">교체<input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.webm,.glb,.gltf" disabled={busy} onChange={e=>{replaceWork(member.id,i,e.target.files?.[0]);e.currentTarget.value=''}}/></label><button type="button" aria-label="작품 삭제" onClick={()=>removeWork(member.id,i)}><Trash2 size={14}/></button></div></div>)}</div>}
    </section>)}
    {!members.length&&<section className="editor-card team-editor-empty">아직 등록된 포트폴리오 카테고리가 없습니다. ‘카테고리 추가’로 시작하세요.</section>}
      </div>
    </div>
  </div>
}
