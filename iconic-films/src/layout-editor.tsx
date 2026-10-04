'use client';
import type {Dispatch,SetStateAction} from 'react';
import {Slider} from '@/components/ui/slider';
import type {Config} from './defaults';

export default function LayoutEditor({draft,setDraft}:{draft:Config;setDraft:Dispatch<SetStateAction<Config>>}){
  const set=<K extends keyof Config>(key:K,value:Config[K])=>setDraft(d=>({...d,[key]:value}));
  const text=(key:keyof Config,label:string,multi=false)=><label className="field">{label}{multi?<textarea value={String(draft[key]??'')} onChange={e=>set(key,e.target.value as never)}/>:<input value={String(draft[key]??'')} onChange={e=>set(key,e.target.value as never)}/>}</label>;
  const range=(key:keyof Config,label:string,min:number,max:number,step=1,suffix='px')=><label className="field layout-range">{label}<span className="val">{Number(draft[key])}{suffix}</span><Slider value={[Number(draft[key])]} min={min} max={max} step={step} onValueChange={v=>set(key,v[0] as never)}/></label>;
  return <div className="editor-grid layout-editor">
    <section className="editor-card">
      <h3>Public copy</h3>
      <p>공개 사이트에 보이는 주요 고정 문구를 여기서 직접 바꿉니다.</p>
      {text('navWorkLabel','메뉴 · Work')}
      {text('navAboutLabel','메뉴 · About')}
      {text('navTeamLabel','메뉴 · Team')}
      {text('navContactLabel','메뉴 · Contact')}
      {text('heroCaption','메인 영상 캡션')}
      {text('heroButtonLabel','메인 영상 버튼')}
      {text('workKicker','작품 섹션 작은 제목')}
      {text('workAside','작품 섹션 우측 문구',true)}
      {text('aboutKicker','About 작은 제목')}
      {text('aboutDisciplines','About 역할 문구 · 줄바꿈으로 구분',true)}
      {text('teamKicker','Team 작은 제목')}
      {text('teamHeadline','Team 큰 제목',true)}
      {text('footerAdminLabel','Footer 관리자 버튼')}
    </section>
    <section className="editor-card">
      <h3>Section position</h3>
      <p>각 공개 영역을 X/Y 방향으로 직접 이동합니다. 미리보기에서 실제 적용 위치를 바로 확인하세요.</p>
      {range('heroOffsetY','메인 영상 세로 위치',-160,180)}
      {range('logoOffsetY','반복 로고 세로 위치',-160,180)}
      {range('workOffsetX','작품 섹션 가로 위치',-180,180)}
      {range('workOffsetY','작품 섹션 세로 위치',-180,180)}
      {range('aboutOffsetX','About 가로 위치',-180,180)}
      {range('aboutOffsetY','About 세로 위치',-180,180)}
      {range('teamOffsetX','Team 전체 가로 위치',-180,180)}
      {range('teamOffsetY','Team 전체 세로 위치',-180,180)}
    </section>
    <section className="editor-card">
      <h3>Team typography & media</h3>
      {range('teamHeadlineX','Team 제목 가로 위치',-260,260)}
      {range('teamHeadlineY','Team 제목 세로 위치',-180,180)}
      {range('teamHeadlineSize','Team 제목 크기',44,150)}
      {range('teamHeadlineWidth','Team 제목 폭',35,100,1,'%')}
      {range('teamMediaSize','팀원 기본 미디어 크기',150,420)}
      {range('teamMediaRadius','팀원 기본 모서리',0,50,1,'%')}
      {range('teamRowGap','팀원 사이 간격',24,140)}
    </section>
  </div>
}
