'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {ChevronDown,Search,X} from 'lucide-react';

export type FontCategory='추천'|'한글'|'Sans'|'Serif'|'Display'|'Hand'|'Mono'|'System';
export type FontItem={name:string;family:string;category:FontCategory;source:'google'|'system';featured?:boolean};

const g=(name:string,category:FontCategory,featured=false):FontItem=>({name,family:`"${name}", sans-serif`,category,source:'google',featured});
const gs=(name:string,category:FontCategory,featured=false):FontItem=>({name,family:`"${name}", serif`,category,source:'google',featured});
const gh=(name:string,featured=false):FontItem=>({name,family:`"${name}", cursive`,category:'Hand',source:'google',featured});
const gm=(name:string,featured=false):FontItem=>({name,family:`"${name}", monospace`,category:'Mono',source:'google',featured});
const sys=(name:string,family:string,featured=false):FontItem=>({name,family,category:'System',source:'system',featured});

export const FONT_CATALOG:FontItem[]=[
 sys('System UI','system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',true),
 sys('Apple SD Gothic Neo','"Apple SD Gothic Neo", "Noto Sans KR", sans-serif',true),
 sys('Malgun Gothic','"Malgun Gothic", "맑은 고딕", sans-serif'),
 sys('Segoe UI','"Segoe UI", Arial, sans-serif'),
 sys('Arial','Arial, Helvetica, sans-serif',true),
 sys('Helvetica Neue','"Helvetica Neue", Helvetica, Arial, sans-serif',true),
 sys('Verdana','Verdana, Geneva, sans-serif'),
 sys('Trebuchet MS','"Trebuchet MS", Arial, sans-serif'),
 sys('Tahoma','Tahoma, Arial, sans-serif'),
 sys('Georgia','Georgia, "Times New Roman", serif'),
 sys('Times New Roman','"Times New Roman", Times, serif'),
 sys('Courier New','"Courier New", Courier, monospace'),

 g('Noto Sans KR','한글',true),gs('Noto Serif KR','한글',true),g('Nanum Gothic','한글',true),gs('Nanum Myeongjo','한글',true),
 gm('Nanum Gothic Coding',true),g('Black Han Sans','한글',true),g('Do Hyeon','한글',true),g('Jua','한글',true),
 g('Gowun Dodum','한글'),gs('Gowun Batang','한글'),gs('Hahmlet','한글'),g('IBM Plex Sans KR','한글',true),
 g('Sunflower','한글'),gs('Song Myung','한글'),g('Gugi','한글'),g('Gaegu','한글'),g('Gamja Flower','한글'),
 g('Hi Melody','한글'),g('Kirang Haerang','한글'),g('Poor Story','한글'),g('Single Day','한글'),
 gh('Nanum Brush Script'),gh('Nanum Pen Script'),g('East Sea Dokdo','한글'),g('Cute Font','한글'),g('Stylish','한글'),

 g('Inter','Sans',true),g('Roboto','Sans',true),g('Open Sans','Sans',true),g('Lato','Sans'),g('Montserrat','Sans',true),
 g('Poppins','Sans',true),g('Raleway','Sans'),g('Nunito','Sans'),g('Manrope','Sans',true),g('DM Sans','Sans',true),
 g('Work Sans','Sans'),g('Space Grotesk','Sans',true),g('Plus Jakarta Sans','Sans',true),g('Outfit','Sans',true),
 g('Urbanist','Sans'),g('Rubik','Sans'),g('Figtree','Sans'),g('Mulish','Sans'),g('Quicksand','Sans'),g('Josefin Sans','Sans'),
 g('Oswald','Sans',true),g('Archivo','Sans'),g('Barlow','Sans'),g('Sora','Sans'),g('Lexend','Sans'),g('Cabin','Sans'),
 g('Karla','Sans'),g('Titillium Web','Sans'),g('Exo 2','Sans'),g('M PLUS 1p','Sans'),g('M PLUS Rounded 1c','Sans'),

 gs('Playfair Display','Serif',true),gs('Cormorant Garamond','Serif',true),gs('Libre Baskerville','Serif'),gs('Merriweather','Serif'),
 gs('Lora','Serif'),gs('EB Garamond','Serif',true),gs('DM Serif Display','Serif',true),gs('Bodoni Moda','Serif',true),
 gs('Prata','Serif'),gs('Cinzel','Serif'),gs('Crimson Pro','Serif'),gs('Spectral','Serif'),gs('Cardo','Serif'),
 gs('Vollkorn','Serif'),gs('Fraunces','Serif',true),gs('Cormorant','Serif'),gs('Libre Caslon Display','Serif'),

 g('Bebas Neue','Display',true),g('Anton','Display',true),gs('Abril Fatface','Display',true),gs('Alfa Slab One','Display'),
 g('Archivo Black','Display'),g('League Spartan','Display',true),g('Bungee','Display'),g('Unbounded','Display',true),
 g('Syncopate','Display',true),g('Staatliches','Display'),g('Fjalla One','Display'),g('Teko','Display'),g('Russo One','Display'),
 g('Orbitron','Display',true),g('Michroma','Display'),g('Audiowide','Display'),g('Black Ops One','Display'),
 g('Righteous','Display'),g('Monoton','Display'),g('Major Mono Display','Display'),g('Chakra Petch','Display'),
 g('Rajdhani','Display'),g('Kanit','Display'),g('Bruno Ace','Display'),g('Bruno Ace SC','Display'),

 gh('Caveat',true),gh('Dancing Script',true),gh('Pacifico',true),gh('Great Vibes'),gh('Sacramento'),
 gh('Permanent Marker',true),gh('Lobster'),gh('Satisfy'),gh('Kalam'),gh('Indie Flower'),gh('Shadows Into Light'),
 gh('Patrick Hand'),gh('Handlee'),gh('Yellowtail'),gh('Allura'),

 gm('Space Mono',true),gm('IBM Plex Mono',true),gm('JetBrains Mono',true),gm('Roboto Mono'),gm('Source Code Pro',true),
 gm('Fira Code',true),gm('Inconsolata'),gm('Ubuntu Mono'),gm('DM Mono'),gm('Azeret Mono'),gm('Anonymous Pro')
];

export const FONT_CATEGORIES:FontCategory[]=['추천','한글','Sans','Serif','Display','Hand','Mono','System'];

const loaded=new Set<string>();
const googleNameFromFamily=(family:string)=>{
 const first=(family||'').split(',')[0]?.trim().replace(/^['"]|['"]$/g,'');
 return FONT_CATALOG.find(item=>item.source==='google'&&(item.family===family||item.name===first))?.name||'';
};
export function ensureFontFamilies(families:string[]){
 if(typeof document==='undefined')return;
 const names=[...new Set(families.map(googleNameFromFamily).filter(Boolean))].filter(name=>!loaded.has(name));
 if(!names.length)return;
 names.forEach(name=>loaded.add(name));
 const link=document.createElement('link');
 link.rel='stylesheet';
 link.dataset.viiviiFonts=names.join('|');
 link.href='https://fonts.googleapis.com/css2?'+names.map(name=>'family='+encodeURIComponent(name).replace(/%20/g,'+')).join('&')+'&display=swap';
 document.head.appendChild(link);
}
export function ensureFontFamily(family:string){ensureFontFamilies([family])}

function resultsFor(category:FontCategory,query:string){
 const q=query.trim().toLowerCase();
 if(q)return FONT_CATALOG.filter(item=>item.name.toLowerCase().includes(q)||item.category.toLowerCase().includes(q)).slice(0,80);
 if(category==='추천')return FONT_CATALOG.filter(item=>item.featured).slice(0,36);
 return FONT_CATALOG.filter(item=>item.category===category);
}

export default function FontPicker({value,onChange,label='글꼴',compact=false}:{value:string;onChange:(family:string)=>void;label?:string;compact?:boolean}){
 const [open,setOpen]=useState(false),[category,setCategory]=useState<FontCategory>('추천'),[query,setQuery]=useState('');
 const root=useRef<HTMLDivElement>(null);
 const selected=useMemo(()=>FONT_CATALOG.find(item=>item.family===value)||FONT_CATALOG.find(item=>item.name===(value||'').split(',')[0]?.trim().replace(/^['"]|['"]$/g,'')),[value]);
 const items=useMemo(()=>resultsFor(category,query),[category,query]);
 useEffect(()=>{if(open)ensureFontFamilies(items.map(item=>item.family));},[open,items]);
 useEffect(()=>{ensureFontFamily(value)},[value]);
 useEffect(()=>{
  if(!open)return;
  const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false)};
  const esc=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false)};
  document.addEventListener('pointerdown',close);window.addEventListener('keydown',esc);
  return()=>{document.removeEventListener('pointerdown',close);window.removeEventListener('keydown',esc)};
 },[open]);
 const choose=(item:FontItem)=>{ensureFontFamily(item.family);onChange(item.family);setOpen(false)};
 return <div ref={root} className={'font-picker'+(compact?' is-compact':'')}>
  {!compact&&<span className="font-picker-label">{label}</span>}
  <button type="button" className="font-picker-trigger" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
   <span className="font-picker-trigger-preview" style={{fontFamily:value||'inherit'}}>{selected?.name||value||'폰트 선택'}</span><ChevronDown size={14}/>
  </button>
  {open&&<div className="font-picker-popover">
   <div className="font-picker-search"><Search size={14}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="폰트 검색 · 한글 / 영문"/>{query&&<button type="button" onClick={()=>setQuery('')}><X size={12}/></button>}</div>
   {!query&&<div className="font-picker-categories">{FONT_CATEGORIES.map(cat=><button type="button" key={cat} className={category===cat?'is-active':''} onClick={()=>setCategory(cat)}>{cat}</button>)}</div>}
   <div className="font-picker-list">
    {items.map(item=><button type="button" key={item.name} className={'font-picker-item'+(item.family===value?' is-selected':'')} onClick={()=>choose(item)}>
     <span className="font-picker-item-name">{item.name}<small>{item.category}</small></span>
     <span className="font-picker-item-sample" style={{fontFamily:item.family}}>VIIVII sara · 가나다 Aa</span>
    </button>)}
    {!items.length&&<p className="font-picker-empty">검색 결과가 없습니다.</p>}
   </div>
   <div className="font-picker-custom"><span>직접 입력</span><input value={value||''} onChange={e=>onChange(e.target.value)} placeholder="예: 'My Font', sans-serif"/></div>
  </div>}
 </div>;
}
