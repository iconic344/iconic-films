'use client';
import {useState,type Dispatch,type SetStateAction} from 'react';
import {ChevronRight,Settings2} from 'lucide-react';
import {Slider} from '@/components/ui/slider';
import {Switch} from '@/components/ui/switch';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import type {Config} from './defaults';
import LayoutEditor from './layout-editor';
import LogoEditor from './logo-editor';
import TeamEditor from './team-editor';
import MediaLibrary from './media-library';
import ModelScene from './model-scene';
import {uploadFile} from './media-upload';

type Page='content'|'layout'|'design'|'logo'|'scene'|'background'|'motion'|'works'|'team';
const groups=[
 {id:'basic',label:'기본',pages:[['content','기본 정보'],['layout','전체 레이아웃']]},
 {id:'design',label:'디자인',pages:[['design','테마 · 글꼴'],['logo','메인 로고'],['background','배경 · 패턴'],['motion','모션']]},
 {id:'content',label:'콘텐츠',pages:[['scene','이미지 · 3D'],['works','작품 관리'],['team','팀 관리']]}
] as const;

export default function EditSiteFullSettings({
 draft,setDraft,busy,setBusy,notify,onThemeChange
}:{
 draft:Config;
 setDraft:Dispatch<SetStateAction<Config>>;
 busy:boolean;
 setBusy:(value:boolean)=>void;
 notify:(value:string)=>void;
 onThemeChange?:(value:string)=>void;
}){
 const [page,setPage]=useState<Page>('content');
 const [animations,setAnimations]=useState<string[]>([]);
 const activeGroup=groups.find(group=>group.pages.some(([value])=>value===page))||groups[0];
 const set=<K extends keyof Config>(key:K,value:Config[K])=>setDraft(current=>({...current,[key]:value}));
 const text=(key:keyof Config,label:string,multi=false)=><label className="field">{label}{multi?<textarea value={String(draft[key]??'')} onChange={e=>set(key,e.target.value as never)}/>:<input value={String(draft[key]??'')} onChange={e=>set(key,e.target.value as never)}/>}</label>;
 const range=(key:keyof Config,label:string,min:number,max:number,step=1)=><label className="field">{label}<span className="val">{String(draft[key])}</span><Slider aria-label={label} value={[Number(draft[key])]} min={min} max={max} step={step} onValueChange={value=>set(key,value[0] as never)}/></label>;
 const sw=(key:keyof Config,label:string)=><label className="toggle">{label}<Switch checked={Boolean(draft[key])} onCheckedChange={value=>set(key,value as never)}/></label>;
 const choice=(value:string,options:string[],onChange:(value:string)=>void)=><Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{options.map(option=><SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>;
 const asset=(label:string,value:string,accept:string,done:(url:string)=>void)=><label className="field file-upload">{label}<input type="file" accept={accept} disabled={busy} onChange={async e=>{const file=e.target.files?.[0];if(!file)return;try{setBusy(true);const url=await uploadFile(file);done(url);notify('업로드 완료. Edit Site에서 저장을 눌러 적용하세요.')}catch(error){notify((error as Error).message)}finally{setBusy(false)}}}/><span className="uploaded-file">{value?'파일 등록됨':'파일을 선택하세요 · 최대 100MB'}</span>{value&&<button type="button" className="file-clear" onClick={event=>{event.preventDefault();done('')}}>파일 제거</button>}</label>;

 return <div className="edit-site-full-settings">
  <div className="edit-site-full-head">
   <div><Settings2 size={16}/><span><strong>사이트 설정</strong><small>사이트 전체에 공통 적용</small></span></div>
   <p>현재 선택한 영역이 아니라 사이트 전체에 적용되는 설정입니다. 페이지 안의 요소는 ‘선택 항목’에서 편집하고, 음악·문의함·보안은 Admin 운영 페이지에서 관리합니다.</p>
  </div>
  <div className="edit-site-settings-groups">
   {groups.map(group=><button type="button" key={group.id} className={activeGroup.id===group.id?'is-active':''} onClick={()=>setPage(group.pages[0][0])}>{group.label}</button>)}
  </div>
  <div className="edit-site-settings-pages">
   {activeGroup.pages.map(([value,label])=><button type="button" key={value} className={page===value?'is-active':''} onClick={()=>setPage(value)}><span>{label}</span><ChevronRight size={12}/></button>)}
  </div>
  <div className="edit-site-settings-body">
   {page==='content'&&<div className="editor-grid">
    <section className="editor-card"><h3>기본 정보 및 문구</h3>{text('name','사이트 이름')}{text('eyebrow','첫 화면 상단 문구')}{text('subtitle','첫 화면 하단 문구')}{text('headline','작품 섹션 제목 (줄바꿈 가능)',true)}{text('aboutHeadline','소개 섹션 제목',true)}{text('about','소개',true)}{text('email','Contact 수신 이메일')}{text('instagram','Instagram 주소')}{sw('showAbout','소개 섹션 표시')}{sw('showTeam','Team 섹션 표시')}{text('teamHeadline','Team 섹션 제목',true)}</section>
    <section className="editor-card"><h3>브라우저 정보</h3>{text('browserTitle','브라우저 탭 제목')}{asset('사이트 파비콘',draft.favicon,'image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon,.ico,.png,.jpg,.jpeg,.webp',value=>set('favicon',value))}<p>브라우저 탭과 즐겨찾기에 표시되는 아이콘입니다. 정사각형 PNG 또는 ICO를 권장합니다. 새 파일을 올리면 교체되고, 파일 제거를 누르면 파비콘이 삭제됩니다.</p>{draft.favicon&&<img src={draft.favicon} alt="파비콘 미리보기" style={{width:56,height:56,objectFit:'contain',borderRadius:12,border:'1px solid var(--line)',padding:8}}/>}</section>
    <section className="editor-card"><h3>메인 비주얼</h3>{asset('상단 메뉴 로고',draft.logo,'image/*',value=>set('logo',value))}{asset('메인 이미지',draft.heroPoster,'image/*',value=>set('heroPoster',value))}{asset('메인 영상 파일 (MP4 / WebM)',draft.heroVideo,'video/mp4,video/webm,.mp4,.webm',value=>set('heroVideo',value))}{sw('autoplay','메인 / 작품 미리보기 자동재생')}<p>이미지·음악·영상·3D 파일을 직접 업로드합니다. 파일당 최대 100MB입니다.</p>{draft.heroPoster&&<img className="editor-preview" src={draft.heroPoster} alt="메인 이미지 미리보기"/>}</section>
   </div>}

   {page==='design'&&<div className="editor-grid">
    <section className="editor-card"><h3>테마 · 글꼴</h3><label className="field">기본 모드{choice(draft.theme,['light','dark'],value=>{set('theme',value);onThemeChange?.(value)})}</label><label className="field editor-color-field">강조 색상<div className="editor-color-control"><input aria-label="강조 색상 선택" type="color" value={draft.accent} onChange={e=>set('accent',e.target.value)}/><span>{draft.accent.toUpperCase()}</span></div></label><label className="field">폰트{choice(draft.font,['Arial, Helvetica, sans-serif','Helvetica Neue, Arial, sans-serif','Georgia, serif','Times New Roman, serif','Verdana, sans-serif','Trebuchet MS, sans-serif','Courier New, monospace','system-ui, sans-serif'],value=>set('font',value))}</label>{range('fontSize','본문 크기',16,22)}{range('spacing','섹션 간격',40,160)}{range('columns','작품 열 수',1,3)}</section>
    <section className="editor-card"><h3>리퀴드 글래스</h3>{range('radius','프레임 곡률',0,50)}{range('blur','글래스 블러',0,50)}{range('glass','글래스 불투명도',20,100)}{range('navOpacity','상단 메뉴바 불투명도',20,85)}<div className="glass-sample" style={{borderRadius:draft.radius,backdropFilter:'blur('+draft.blur+'px)'}}>ICONIC / LIQUID GLASS</div><p>Edit Site 화면에서 실제 조명과 배경에 맞춰 바로 확인하세요.</p></section>
   </div>}

   {page==='layout'&&<LayoutEditor draft={draft} setDraft={setDraft}/>}
   {page==='logo'&&<LogoEditor draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={notify}/>}

   {page==='scene'&&<div className="editor-grid">
    <section className="editor-card"><h3>소개 비주얼</h3><label className="field">오른쪽 영역 콘텐츠{choice(draft.aboutMediaType,['image','3d'],value=>set('aboutMediaType',value))}</label>{asset('JPG / PNG 이미지',draft.aboutImage,'image/jpeg,image/png,.jpg,.jpeg,.png',value=>{set('aboutImage',value);if(value)set('aboutMediaType','image')})}{asset('3D 모델 파일 또는 ZIP 하나',draft.aboutModel,'.glb,.gltf,.fbx,.obj,.stl,.ply,.zip',value=>{set('aboutModel',value);setAnimations([]);if(value){set('aboutMediaType','3d');set('modelOffsetX',0);set('modelOffsetY',0);set('modelScale',1)}})}<p>GLB·glTF·FBX·OBJ·STL·PLY·ZIP 파일 하나를 올리면 자동 변환하고 중앙에 배치합니다. 최대 100MB입니다. 외부 텍스처와 데이터는 모델과 함께 ZIP으로 묶어 주세요.</p>{draft.aboutMediaType==='3d'&&draft.aboutModel?<div className="model-editor-preview"><ModelScene config={draft} onAnimations={setAnimations}/></div>:draft.aboutImage||draft.heroPoster?<img className="editor-preview" src={draft.aboutImage||draft.heroPoster} alt="소개 이미지 미리보기"/>:null}</section>
    <section className="editor-card"><h3>3D 동작</h3>{sw('modelDrag','마우스 / 터치 드래그 회전')}{sw('modelReturnToCenter','놓으면 원위치로 탄력 있게 복귀')}{range('modelReturnBounce','복귀 탄력',0,1,.05)}{sw('modelReact','마우스 위치에 따라 반응')}{sw('modelZoom','휠 / 핀치로 확대·축소')}{sw('modelAutoRotate','자동회전')}{range('modelSpeed','자동회전 속도 (°/초)',-90,90)}{range('modelSensitivity','마우스 반응 강도',0,60)}{range('modelScale','모델 화면 크기',.4,2.5,.05)}{range('modelOffsetX','가로 위치 (%)',-40,40)}{range('modelOffsetY','세로 위치 (%)',-40,40)}{range('modelRotateX','X축 기본 회전',-180,180)}{range('modelRotateY','Y축 기본 회전',-180,180)}{range('modelRotateZ','Z축 기본 회전',-180,180)}{range('modelExposure','조명 밝기',.2,2,.1)}{sw('modelAnimate','모델 애니메이션 재생')}<label className="field">애니메이션 선택{choice(draft.modelAnimation,[...new Set(['auto',draft.modelAnimation,...animations])],value=>set('modelAnimation',value))}</label>{draft.aboutModel&&!animations.length&&<p>내장 애니메이션이 없는 모델은 회전·마우스 반응으로 움직임을 만들 수 있습니다.</p>}</section>
   </div>}

   {page==='background'&&<div className="editor-grid">
    <section className="editor-card"><h3>사이트 배경</h3><label className="field">전체 배경 종류{choice(draft.backgroundType,['none','image','video'],value=>set('backgroundType',value))}</label>{asset('전체 배경 이미지 파일',draft.backgroundImage,'image/jpeg,image/png,image/webp,.jpg,.png,.webp',value=>{set('backgroundImage',value);if(value)set('backgroundType','image')})}{asset('전체 배경 영상 파일 (무음 반복)',draft.backgroundVideo,'video/mp4,video/webm,.mp4,.webm',value=>{set('backgroundVideo',value);if(value)set('backgroundType','video')})}{range('backgroundOpacity','배경 이미지 / 영상 불투명도',0,100)}{range('backgroundDim','가독성 보정 덮개',0,100)}<p>가독성 보정 덮개는 현재 모드의 배경색을 얹습니다. 라이트 / 다크 모드를 바꿔 글자와 배경의 대비를 확인하세요.</p>{draft.backgroundType==='image'&&draft.backgroundImage&&<img className="editor-preview" src={draft.backgroundImage} alt="전체 배경 미리보기"/>}{draft.backgroundType==='video'&&draft.backgroundVideo&&<video className="editor-preview" src={draft.backgroundVideo} controls muted playsInline/>}</section>
    <section className="editor-card"><h3>패턴 오버레이</h3><label className="field">패턴{choice(draft.pattern,['none','dots','grid','diagonal','checker','lines','rings'],value=>set('pattern',value))}</label>{range('patternSize','패턴 크기',8,160)}<label className="field editor-color-field">패턴 색상<div className="editor-color-control"><input aria-label="패턴 색상 선택" type="color" value={draft.patternColor} onChange={e=>set('patternColor',e.target.value)}/><span>{draft.patternColor.toUpperCase()}</span></div></label>{range('patternOpacity','패턴 불투명도',0,100)}<p>패턴은 Edit Site 실제 화면에 즉시 반영됩니다.</p></section>
   </div>}

   {page==='motion'&&<section className="editor-card"><h3>모션 · 깊이감</h3>{range('motion','애니메이션 강도 (0 = 끄기)',0,2,.1)}{range('depth','포인터 / 터치 3D 회전 강도',0,30)}<p>메인 프레임은 포인터 위치에 따라 X·Y축으로 회전하고 빛 반사가 이동합니다. 동작 줄이기 설정을 켠 기기에서는 애니메이션이 축소됩니다.</p></section>}

   {page==='works'&&<div className="works-editor-stack"><section className="editor-card"><h3>작품 미디어</h3><p>메인·작품·팀 포트폴리오는 같은 미디어 갤러리를 사용합니다. In Focus는 아래의 별도 목록에서 사진과 영상을 등록하세요.</p></section><MediaLibrary kind="works" draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={notify}/><section className="editor-card"><h3>In Focus</h3><p>메인 가로 슬라이드 전용 목록입니다. 직접 업로드한 항목만 표시하며, 기존 작품이나 팀 포트폴리오는 자동으로 가져오지 않습니다.</p></section><MediaLibrary kind="focusItems" draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={notify}/></div>}
   {page==='team'&&<TeamEditor draft={draft} setDraft={setDraft} busy={busy} setBusy={setBusy} notify={notify}/>}
  </div>
 </div>;
}
