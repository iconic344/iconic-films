'use client';
import type {Dispatch,SetStateAction} from 'react';
import {Slider} from '@/components/ui/slider';
import type {Config,SiteTextStyles,TextStyle} from './defaults';
import TextStyleEditor from './text-style-editor';

export default function LayoutEditor({draft,setDraft}:{draft:Config;setDraft:Dispatch<SetStateAction<Config>>}){
  const set=<K extends keyof Config>(key:K,value:Config[K])=>setDraft(d=>({...d,[key]:value}));
  const range=(key:keyof Config,label:string,min:number,max:number,step=1,suffix='px')=><label className="field layout-range">{label}<span className="val">{Number(draft[key])}{suffix}</span><Slider value={[Number(draft[key])]} min={min} max={max} step={step} onValueChange={v=>set(key,v[0] as never)}/></label>;
  const setStyle=(key:keyof SiteTextStyles,value:TextStyle)=>setDraft(d=>({...d,textStyles:{...d.textStyles,[key]:value}}));
  return <div className="editor-grid layout-editor">
    <section className="editor-card">
      <h3>Public copy</h3>
      <p>상단 메뉴와 메인 영상, 푸터처럼 공통으로 보이는 문구를 수정합니다.</p>
      <label className="field">메뉴 · Work<input value={draft.navWorkLabel} onChange={e=>set('navWorkLabel',e.target.value)}/></label>
      <label className="field">메뉴 · About<input value={draft.navAboutLabel} onChange={e=>set('navAboutLabel',e.target.value)}/></label>
      <label className="field">메뉴 · Team<input value={draft.navTeamLabel} onChange={e=>set('navTeamLabel',e.target.value)}/></label>
      <label className="field">메뉴 · Contact<input value={draft.navContactLabel} onChange={e=>set('navContactLabel',e.target.value)}/></label>
      <label className="field">메인 영상 캡션<input value={draft.heroCaption} onChange={e=>set('heroCaption',e.target.value)}/></label>
      <label className="field">메인 영상 버튼<input value={draft.heroButtonLabel} onChange={e=>set('heroButtonLabel',e.target.value)}/></label>
      <label className="field">Team 프로필 버튼<input value={draft.teamViewLabel} onChange={e=>set('teamViewLabel',e.target.value)}/></label>
      <label className="field">Footer 관리자 버튼<input value={draft.footerAdminLabel} onChange={e=>set('footerAdminLabel',e.target.value)}/></label>
    </section>

    <section className="editor-card">
      <h3>Section position</h3>
      <p>각 공개 영역 전체를 X/Y 방향으로 이동합니다. 세부 글씨 위치는 아래 Typography에서 따로 조절할 수 있습니다.</p>
      {range('heroOffsetY','메인 영상 세로 위치',-160,180)}
      {range('logoOffsetY','반복 로고 세로 위치',-160,180)}
      {range('workOffsetX','Work 전체 가로 위치',-180,180)}
      {range('workOffsetY','Work 전체 세로 위치',-180,180)}
      {range('aboutOffsetX','About 전체 가로 위치',-180,180)}
      {range('aboutOffsetY','About 전체 세로 위치',-180,180)}
      {range('teamOffsetX','Team 전체 가로 위치',-180,180)}
      {range('teamOffsetY','Team 전체 세로 위치',-180,180)}
    </section>

    <section className="editor-card typography-card">
      <h3>Work typography</h3>
      <p>문구, 색상, 글씨체, 크기, 좌/중앙/우 정렬, X/Y 위치를 각각 따로 편집합니다.</p>
      <TextStyleEditor label="작품 섹션 작은 제목" value={draft.textStyles.workKicker} onChange={v=>setStyle('workKicker',v)} text={draft.workKicker} onTextChange={v=>set('workKicker',v)}/>
      <TextStyleEditor label="작품 섹션 큰 제목" value={draft.textStyles.workHeadline} onChange={v=>setStyle('workHeadline',v)} text={draft.headline} onTextChange={v=>set('headline',v)} multiline/>
      <TextStyleEditor label="작품 섹션 우측 문구" value={draft.textStyles.workAside} onChange={v=>setStyle('workAside',v)} text={draft.workAside} onTextChange={v=>set('workAside',v)} multiline/>
      <TextStyleEditor label="작품 카드 제목" value={draft.textStyles.workCardTitle} onChange={v=>setStyle('workCardTitle',v)}/>
      <TextStyleEditor label="작품 카드 메타 정보" value={draft.textStyles.workCardMeta} onChange={v=>setStyle('workCardMeta',v)}/>
    </section>

    <section className="editor-card typography-card">
      <h3>About typography</h3>
      <TextStyleEditor label="About 작은 제목" value={draft.textStyles.aboutKicker} onChange={v=>setStyle('aboutKicker',v)} text={draft.aboutKicker} onTextChange={v=>set('aboutKicker',v)}/>
      <TextStyleEditor label="About 큰 제목" value={draft.textStyles.aboutHeadline} onChange={v=>setStyle('aboutHeadline',v)} text={draft.aboutHeadline} onTextChange={v=>set('aboutHeadline',v)} multiline/>
      <TextStyleEditor label="About 소개 본문" value={draft.textStyles.aboutBody} onChange={v=>setStyle('aboutBody',v)} text={draft.about} onTextChange={v=>set('about',v)} multiline/>
      <TextStyleEditor label="About 역할 문구" value={draft.textStyles.aboutDisciplines} onChange={v=>setStyle('aboutDisciplines',v)} text={draft.aboutDisciplines} onTextChange={v=>set('aboutDisciplines',v)} multiline/>
    </section>

    <section className="editor-card typography-card">
      <h3>Team typography</h3>
      <TextStyleEditor label="Team 작은 제목" value={draft.textStyles.teamKicker} onChange={v=>setStyle('teamKicker',v)} text={draft.teamKicker} onTextChange={v=>set('teamKicker',v)}/>
      <TextStyleEditor label="Team 큰 제목" value={draft.textStyles.teamHeadline} onChange={v=>setStyle('teamHeadline',v)} text={draft.teamHeadline} onTextChange={v=>set('teamHeadline',v)} multiline/>
      <TextStyleEditor label="팀원 역할" value={draft.textStyles.teamMemberRole} onChange={v=>setStyle('teamMemberRole',v)}/>
      <TextStyleEditor label="팀원 이름" value={draft.textStyles.teamMemberName} onChange={v=>setStyle('teamMemberName',v)}/>
      <TextStyleEditor label="팀원 소개" value={draft.textStyles.teamMemberBio} onChange={v=>setStyle('teamMemberBio',v)}/>
      <TextStyleEditor label="View profile" value={draft.textStyles.teamView} onChange={v=>setStyle('teamView',v)} text={draft.teamViewLabel} onTextChange={v=>set('teamViewLabel',v)}/>
      <div className="team-media-layout-controls">
        {range('teamHeadlineWidth','Team 제목 폭',35,100,1,'%')}
        {range('teamMediaSize','팀원 기본 미디어 크기',150,420)}
        {range('teamMediaRadius','팀원 기본 모서리',0,50,1,'%')}
        {range('teamRowGap','팀원 사이 간격',24,140)}
      </div>
    </section>
  </div>
}
