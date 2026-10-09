import snapshot from './site-config.json';
import {defaultLogo,defaultModelLighting,type EnvironmentMap,type LogoSettings,type ModelLighting} from './logo-settings';
export type TextAlign='left'|'center'|'right';
export type TextStyle={font:string;size:number;color:string;align:TextAlign;x:number;y:number;letterSpacing?:number;weight?:number;opacity?:number;textTransform?:'none'|'uppercase'|'lowercase'|'capitalize'};
export type SiteTextStyles={navBrand:TextStyle;navMenu:TextStyle;heroEyebrow:TextStyle;heroSubtitle:TextStyle;heroCaption:TextStyle;workKicker:TextStyle;workHeadline:TextStyle;workAside:TextStyle;workCardTitle:TextStyle;workCardMeta:TextStyle;aboutKicker:TextStyle;aboutHeadline:TextStyle;aboutBody:TextStyle;aboutDisciplines:TextStyle;teamKicker:TextStyle;teamHeadline:TextStyle;teamMemberRole:TextStyle;teamMemberName:TextStyle;teamMemberBio:TextStyle;teamView:TextStyle;footerCopyright:TextStyle;footerAdmin:TextStyle};
export type NavItemKey='work'|'about'|'team'|'contact';
export type SiteSectionKey='nav'|'hero'|'work'|'about'|'team'|'footer';
export type SectionDivider={id:string;after:SiteSectionKey;visible:boolean;width:number;thickness:number;opacity:number;inset:number;marginTop:number;marginBottom:number;offsetY:number;color:string};
export type PageBlockType='slider'|'text'|'media'|'spacer';
export type PageBlock={id:string;type:PageBlockType;after:SiteSectionKey;visible:boolean;title:string;text:string;media:string;width:number;height:number;gap:number;radius:number;offsetY:number;background:string;color:string;fontSize:number;align:TextAlign;mediaFit:'contain'|'cover';mediaPositionX:number;mediaPositionY:number;autoplay:boolean;pattern:string;patternSize:number;patternColor:string;patternOpacity:number;fadeEnabled:boolean;fadeTopSize:number;fadeBottomSize:number;fadeDensity:number;fadeOpacity:number;fadeBlur:number};
export type PortfolioSectionKey='nav'|'hero'|'index'|'work'|'switcher'|'footer';
export type PortfolioSectionLayout={visible:boolean;x:number;y:number;scale:number;minHeight:number;opacity:number;background:string;radius:number};
export type PortfolioDivider={id:string;after:PortfolioSectionKey;visible:boolean;width:number;thickness:number;opacity:number;inset:number;marginTop:number;marginBottom:number;offsetY:number;color:string};
export type PortfolioMediaRatio='auto'|'16:9'|'4:5'|'4:3'|'3:2'|'1:1'|'9:16';
export type Work={id:string;title:string;category:string;year:string;role:string;description:string;poster:string;video:string;visible:boolean};
export type Track={id:string;title:string;artist:string;album:string;playlist:string;url:string;cover:string;filename?:string;playlists?:string[]};
export type TeamMember={id:string;codeName:string;memberLabel:string;name:string;role:string;bio:string;instagram:string;photo:string;works:string[];visible:boolean;photoRadius:number;photoSize:number;portfolioSlug:string;portfolioTitle:string;portfolioIntro:string;portfolioCredits:string;portfolioCreditsVisible:boolean;portfolioTeamIndexLabel:string;portfolioSubcategories:string[];portfolioWorkCategories:string[];portfolioWorkTitles?:string[];portfolioWorkInfo?:string[];portfolioWorkCredits?:string[];portfolioWorkRatios?:PortfolioMediaRatio[];portfolioLayout:'grid'|'slider';portfolioColumns:number;portfolioGap:number;portfolioRadius:number;portfolioReturnLabel:string;portfolioProfileSize:number;portfolioNameFont:string;portfolioNameSize:number;portfolioNameColor:string;portfolioNameAlign:TextAlign;portfolioNameX:number;portfolioNameY:number;portfolioRoleFont:string;portfolioRoleSize:number;portfolioRoleColor:string;portfolioRoleAlign:TextAlign;portfolioRoleX:number;portfolioRoleY:number;portfolioBioFont:string;portfolioBioSize:number;portfolioBioColor:string;portfolioBioAlign:TextAlign;portfolioBioX:number;portfolioBioY:number;portfolioTitleFont:string;portfolioTitleSize:number;portfolioTitleColor:string;portfolioTitleAlign:TextAlign;portfolioTitleX:number;portfolioTitleY:number;portfolioIntroFont:string;portfolioIntroSize:number;portfolioIntroColor:string;portfolioIntroAlign:TextAlign;portfolioIntroX:number;portfolioIntroY:number;portfolioUtilityFont:string;portfolioUtilitySize:number;portfolioUtilityColor:string;portfolioUtilityAlign:TextAlign;portfolioUtilityX:number;portfolioUtilityY:number;portfolioReturnX:number;portfolioReturnY:number;portfolioSliderWidth:number;portfolioSliderHeight:number;portfolioSliderAutoplay?:boolean;portfolioSliderAutoplayMs?:number;portfolioSliderTransitionMs?:number;portfolioSliderEasing?:'smooth'|'soft'|'snappy'|'linear';portfolioGridWidth:number;portfolioSections:Record<PortfolioSectionKey,PortfolioSectionLayout>;portfolioSectionOrder?:PortfolioSectionKey[];portfolioDividers:PortfolioDivider[]};
export type Config={browserTitle:string;favicon:string;sectionOrder:SiteSectionKey[];sectionHeights:Record<SiteSectionKey,number>;sectionDividers:SectionDivider[];pageBlocks:PageBlock[];heroFadeEnabled:boolean;heroFadeTopSize:number;heroFadeBottomSize:number;heroFadeDensity:number;heroFadeOpacity:number;heroFadeBlur:number;heroMediaFit:'contain'|'cover';heroMediaRatio:'fill'|'16:9'|'4:3'|'3:2'|'4:5'|'1:1'|'9:16';heroMediaPositionX:number;heroMediaPositionY:number;heroPattern:string;heroPatternSize:number;heroPatternColor:string;heroPatternOpacity:number;textStyles:SiteTextStyles;mainLogo:LogoSettings;filmBackdropOpacity:number;filmBackdropBlur:number;teamHeadlineAlign:'left'|'center'|'right';teamHeadlineFont:string;navOrder:NavItemKey[];navWorkLabel:string;navAboutLabel:string;navTeamLabel:string;navContactLabel:string;teamViewLabel:string;heroCaption:string;heroButtonLabel:string;workKicker:string;workAside:string;aboutKicker:string;aboutDisciplines:string;teamKicker:string;footerAdminLabel:string;showNav:boolean;showHero:boolean;showFooter:boolean;navOffsetX:number;navOffsetY:number;navScale:number;heroOffsetX:number;heroOffsetY:number;heroScale:number;logoOffsetY:number;workOffsetX:number;workOffsetY:number;workScale:number;aboutOffsetX:number;aboutOffsetY:number;aboutScale:number;teamOffsetX:number;teamOffsetY:number;teamScale:number;footerOffsetX:number;footerOffsetY:number;footerScale:number;teamHeadlineX:number;teamHeadlineY:number;teamHeadlineSize:number;teamHeadlineWidth:number;teamMediaSize:number;teamMediaRadius:number;teamRowGap:number;showTeam:boolean;teamHeadline:string;teamMembers:TeamMember[];musicPlaylists:string[];hdriEnvironments:EnvironmentMap[];aboutLighting:ModelLighting;aboutHeadline:string;aboutMediaType:string;aboutImage:string;aboutModel:string;modelReturnToCenter:boolean;modelReturnBounce:number;modelScale:number;modelAutoRotate:boolean;modelDrag:boolean;modelReact:boolean;modelZoom:boolean;modelSpeed:number;modelSensitivity:number;modelAnimate:boolean;modelAnimation:string;modelExposure:number;modelRotateX:number;modelRotateY:number;modelRotateZ:number;modelOffsetX:number;modelOffsetY:number;backgroundType:string;backgroundImage:string;backgroundVideo:string;backgroundOpacity:number;backgroundDim:number;pattern:string;patternSize:number;patternColor:string;patternOpacity:number;navOpacity:number;name:string;eyebrow:string;headline:string;subtitle:string;about:string;email:string;instagram:string;heroPoster:string;heroVideo:string;logo:string;theme:string;accent:string;font:string;fontSize:number;spacing:number;radius:number;blur:number;glass:number;motion:number;depth:number;sliderTransitionMs:number;sliderAutoplayMs:number;sliderEasing:'smooth'|'soft'|'snappy'|'linear';uiTransitionMs:number;hoverTransitionMs:number;revealTransitionMs:number;columns:number;autoplay:boolean;showAbout:boolean;showMusic:boolean;musicAutoplay:boolean;musicRandomStart:boolean;musicShuffle:boolean;musicRepeatMode:'none'|'all'|'one';volume:number;works:Work[];focusItems:Work[];tracks:Track[]};
const defaultTextStyle=(size:number,color='',font='Arial, Helvetica, sans-serif',align:TextAlign='left'):TextStyle=>({font,size,color,align,x:0,y:0,letterSpacing:0,weight:500,opacity:100,textTransform:'none'});
const defaultTextStyles:SiteTextStyles={
 navBrand:{...defaultTextStyle(25,'','Arial, Helvetica, sans-serif','center'),weight:800,letterSpacing:-1.5},
 navMenu:{...defaultTextStyle(12,'','Arial, Helvetica, sans-serif','center'),weight:500,letterSpacing:0},
 heroEyebrow:{...defaultTextStyle(12),weight:500,letterSpacing:1.1},
 heroSubtitle:{...defaultTextStyle(14),weight:400,letterSpacing:0},
 heroCaption:{...defaultTextStyle(24,'','Arial, Helvetica, sans-serif','center'),weight:600,letterSpacing:-1,opacity:100,textTransform:'none'},
 workKicker:defaultTextStyle(12),
 workHeadline:defaultTextStyle(78),
 workAside:defaultTextStyle(13),
 workCardTitle:defaultTextStyle(20),
 workCardMeta:defaultTextStyle(12),
 aboutKicker:defaultTextStyle(12),
 aboutHeadline:defaultTextStyle(72),
 aboutBody:defaultTextStyle(16),
 aboutDisciplines:defaultTextStyle(13),
 teamKicker:defaultTextStyle(12),
 teamHeadline:defaultTextStyle(92),
 teamMemberRole:defaultTextStyle(9),
 teamMemberName:defaultTextStyle(52),
 teamMemberBio:defaultTextStyle(12),
 teamView:defaultTextStyle(10),
 footerCopyright:{...defaultTextStyle(12),weight:400},
 footerAdmin:{...defaultTextStyle(12),weight:400}
};
const original:Config={browserTitle:'VIIVIIsara®',favicon:'',sectionOrder:['nav','hero','work','about','team','footer'],sectionHeights:{nav:0,hero:0,work:0,about:0,team:0,footer:0},sectionDividers:[],pageBlocks:[],heroFadeEnabled:true,heroFadeTopSize:14,heroFadeBottomSize:14,heroFadeDensity:34,heroFadeOpacity:72,heroFadeBlur:0,heroMediaFit:'contain',heroMediaRatio:'fill',heroMediaPositionX:50,heroMediaPositionY:50,heroPattern:'none',heroPatternSize:32,heroPatternColor:'#888888',heroPatternOpacity:12,textStyles:defaultTextStyles,mainLogo:defaultLogo,filmBackdropOpacity:62,filmBackdropBlur:20,teamHeadlineAlign:'left',teamHeadlineFont:'Arial, Helvetica, sans-serif',navOrder:['work','about','team','contact'],navWorkLabel:'Work',navAboutLabel:'About',navTeamLabel:'Team',navContactLabel:'Contact',teamViewLabel:'View profile',heroCaption:'ICONIC / DIRECTOR’S CUT',heroButtonLabel:'Watch film',workKicker:'01 / SELECTED WORK',workAside:'A collection of perspectives.\n2025 — 2026',aboutKicker:'02 / BEHIND THE LENS',aboutDisciplines:'Direction\nCinematography\nEditing',teamKicker:'03 / PEOPLE',footerAdminLabel:'admin',showNav:true,showHero:true,showFooter:true,navOffsetX:0,navOffsetY:0,navScale:1,heroOffsetX:0,heroOffsetY:0,heroScale:1,logoOffsetY:0,workOffsetX:0,workOffsetY:0,workScale:1,aboutOffsetX:0,aboutOffsetY:0,aboutScale:1,teamOffsetX:0,teamOffsetY:0,teamScale:1,footerOffsetX:0,footerOffsetY:0,footerScale:1,teamHeadlineX:0,teamHeadlineY:0,teamHeadlineSize:92,teamHeadlineWidth:72,teamMediaSize:250,teamMediaRadius:22,teamRowGap:72,showTeam:true,teamHeadline:'People behind\nthe image.',teamMembers:[],musicPlaylists:[],hdriEnvironments:[],aboutLighting:{...defaultModelLighting},aboutHeadline:'Less noise.\nMore feeling.',aboutMediaType:'image',aboutImage:'',aboutModel:'',modelReturnToCenter:true,modelReturnBounce:.55,modelScale:1,modelAutoRotate:true,modelDrag:true,modelReact:true,modelZoom:true,modelSpeed:20,modelSensitivity:18,modelAnimate:true,modelAnimation:'auto',modelExposure:1,modelRotateX:0,modelRotateY:0,modelRotateZ:0,modelOffsetX:0,modelOffsetY:0,backgroundType:'none',backgroundImage:'',backgroundVideo:'',backgroundOpacity:100,backgroundDim:20,pattern:'none',patternSize:32,patternColor:'#888888',patternOpacity:12,navOpacity:46,name:'ICONIC',eyebrow:'INDEPENDENT FILM DIRECTOR',headline:'A different\npoint of view.',subtitle:'Film. Direction. Moving images.',about:'장면의 분위기부터 마지막 컷의 리듬까지. 패션, 공연, 브랜드의 순간을 촬영하고 편집합니다.',email:'',instagram:'',heroPoster:'',heroVideo:'',logo:'',theme:'light',accent:'#536bf2',font:'Arial, Helvetica, sans-serif',fontSize:16,spacing:80,radius:22,blur:24,glass:70,motion:1,depth:12,sliderTransitionMs:850,sliderAutoplayMs:6500,sliderEasing:'smooth',uiTransitionMs:350,hoverTransitionMs:300,revealTransitionMs:650,columns:2,autoplay:true,showAbout:true,showMusic:true,musicAutoplay:true,musicRandomStart:false,musicShuffle:true,musicRepeatMode:'all',volume:60,works:[{id:'1',title:'Between the frames',category:'Fashion film',year:'2026',role:'Direction / Cinematography / Edit',description:'공간과 움직임, 그리고 그 사이의 순간. 작품 파일을 업로드해 나만의 필름으로 교체하세요.',poster:'',video:'/sample.mp4',visible:true},{id:'2',title:'Selected moments',category:'Brand film',year:'2026',role:'Direction / Edit',description:'새로운 시선으로 기록한 장면들. 현재 재생되는 영상은 기능 확인용 샘플입니다.',poster:'',video:'/sample.mp4',visible:true}],focusItems:[],tracks:[]};

const portfolioSectionKeys:PortfolioSectionKey[]=['nav','hero','index','work','switcher','footer'];
const defaultPortfolioSection=():PortfolioSectionLayout=>({visible:true,x:0,y:0,scale:1,minHeight:0,opacity:100,background:'',radius:0});

// The retired stock dress image must never be restored by old saved site data.
// Keep user-uploaded media untouched; reject only that exact legacy filename.
export function stripRetiredEditorialMedia(value:unknown):unknown {
 if(typeof value==='string')return /(?:^|\/)editorial\.jpg(?:[?#].*)?$/i.test(value.trim())?'':value;
 if(Array.isArray(value))return value.map(stripRetiredEditorialMedia);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,stripRetiredEditorialMedia(entry)]));
 return value;
}

export function normalizeConfig(value:unknown={}){
 const stored=stripRetiredEditorialMedia(value) as Partial<Config>&{mainLogo?:Partial<LogoSettings>};
 const rawName=typeof stored.name==='string'?stored.name.trim():'';
 const sanitizedName=(rawName.replace(/^(?:\s*©\s*\d{4}\s*)+/,'').trim()||rawName||original.name);
 const repairBrokenEditSession=rawName!==''&&sanitizedName!==rawName;
 const aboutLighting=stored.aboutLighting?{...defaultModelLighting,...stored.aboutLighting}:{...defaultModelLighting,exposure:stored.modelExposure??defaultModelLighting.exposure};
 const storedLogo:Partial<LogoSettings>=stored.mainLogo||{};
 const storedAboutModel=typeof stored.aboutModel==='string'?stored.aboutModel.trim():'';
 const resolvedAboutModel=storedAboutModel==='/media/da61feaa-799d-45b5-8e01-81cd8ad8801a.glb'?'/media/viivii-sara-metallic.gltf':storedAboutModel;
 const logoLighting=storedLogo.modelLighting?{...defaultModelLighting,...storedLogo.modelLighting}:{...defaultModelLighting,exposure:storedLogo.modelExposure??defaultModelLighting.exposure};
 const teamMembers=Array.isArray(stored.teamMembers)?stored.teamMembers.map((member,index)=>{
  const legacyName=typeof member?.name==='string'?member.name:'';
  const isLegacyCategory=!Array.isArray((member as any)?.portfolioSubcategories);
  const seededName=index===0?'Fashion':index===1?'Commercial':index===2?'Events':legacyName;
  const name=isLegacyCategory&&index<3?seededName:legacyName;
  const seededSubs=name==='Fashion'?['Fashion Show','Lookbook','Campaign','Editorial']:name==='Commercial'?['Brand Film','Product','Campaign','Social']:name==='Events'?['Festival','Performance','Launch','Recap']:[];
  const fallbackSlug=(name||('portfolio-'+(index+1))).toLowerCase().trim().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'')||('portfolio-'+(index+1));
  const rawPortfolioSections=((member as any)?.portfolioSections||{}) as Partial<Record<PortfolioSectionKey,Partial<PortfolioSectionLayout>>>;
  const portfolioMovable:PortfolioSectionKey[]=['hero','index','work'];
  const storedPortfolioOrder=Array.isArray(member?.portfolioSectionOrder)
   ?member.portfolioSectionOrder.filter((key:unknown):key is PortfolioSectionKey=>portfolioMovable.includes(key as PortfolioSectionKey)):[];
  const portfolioSectionOrder:PortfolioSectionKey[]=['nav',...new Set<PortfolioSectionKey>([
    ...storedPortfolioOrder,...portfolioMovable
  ]),'switcher','footer'];
  const portfolioSections=Object.fromEntries(portfolioSectionKeys.map(key=>{
   const base=defaultPortfolioSection(),raw=rawPortfolioSections[key]||{};
   return [key,{
    visible:raw.visible!==false,
    x:Number.isFinite(Number(raw.x))?Math.min(400,Math.max(-400,Number(raw.x))):base.x,
    y:Number.isFinite(Number(raw.y))?Math.min(1600,Math.max(-1600,Number(raw.y))):base.y,
    scale:Number.isFinite(Number(raw.scale))?Math.min(1.6,Math.max(.55,Number(raw.scale))):base.scale,
    minHeight:Number.isFinite(Number(raw.minHeight))?Math.min(1800,Math.max(0,Number(raw.minHeight))):base.minHeight,
    opacity:Number.isFinite(Number(raw.opacity))?Math.min(100,Math.max(0,Number(raw.opacity))):base.opacity,
    background:typeof raw.background==='string'?raw.background:'',
    radius:Number.isFinite(Number(raw.radius))?Math.min(80,Math.max(0,Number(raw.radius))):base.radius
   }];
  })) as Record<PortfolioSectionKey,PortfolioSectionLayout>;
  const portfolioDividers:Array<PortfolioDivider>=[];
  return {...member,
    name,
    codeName:typeof member?.codeName==='string'&&member.codeName.trim()?member.codeName.trim().slice(0,8).toUpperCase():((name.trim().slice(0,1)||String(index+1)).toUpperCase()),
    memberLabel:typeof member?.memberLabel==='string'&&member.memberLabel.trim()?member.memberLabel.trim().slice(0,24):'MEMBER',
    bio:typeof member?.bio==='string'?member.bio:'',
    photoRadius:Number.isFinite(member?.photoRadius)?member.photoRadius:(stored.teamMediaRadius??original.teamMediaRadius),
    photoSize:Number.isFinite(member?.photoSize)?member.photoSize:(stored.teamMediaSize??original.teamMediaSize),
    works:Array.isArray(member?.works)?member.works:[],
    portfolioSlug:typeof member?.portfolioSlug==='string'&&member.portfolioSlug.trim()?member.portfolioSlug:fallbackSlug,
    portfolioTitle:typeof member?.portfolioTitle==='string'&&member.portfolioTitle.trim()?member.portfolioTitle:'Selected works',
    portfolioIntro:typeof member?.portfolioIntro==='string'?member.portfolioIntro:'',
    portfolioCredits:typeof member?.portfolioCredits==='string'?member.portfolioCredits:'',
    portfolioCreditsVisible:(member as any)?.portfolioCreditsVisible!==false,
    portfolioTeamIndexLabel:typeof member?.portfolioTeamIndexLabel==='string'&&member.portfolioTeamIndexLabel.trim()?member.portfolioTeamIndexLabel.trim().slice(0,40):'CATEGORY INDEX',
    portfolioSubcategories:Array.isArray((member as any)?.portfolioSubcategories)?(member as any).portfolioSubcategories.filter((v:any)=>typeof v==='string'&&v.trim()).map((v:string)=>v.trim().slice(0,40)).slice(0,16):seededSubs,
    portfolioWorkCategories:Array.isArray((member as any)?.portfolioWorkCategories)?(member as any).portfolioWorkCategories.map((v:any)=>typeof v==='string'?v.slice(0,40):''):Array.isArray(member?.works)?member.works.map(()=>seededSubs[0]||'All'):[],
    portfolioWorkTitles:Array.from({length:Array.isArray(member?.works)?member.works.length:0},(_,i)=>{const v=(member as any)?.portfolioWorkTitles?.[i];return typeof v==='string'?v.slice(0,160):(name||'Portfolio')}),
    portfolioWorkInfo:Array.from({length:Array.isArray(member?.works)?member.works.length:0},(_,i)=>{const v=(member as any)?.portfolioWorkInfo?.[i];return typeof v==='string'?v.slice(0,3000):''}),
    portfolioWorkCredits:Array.from({length:Array.isArray(member?.works)?member.works.length:0},(_,i)=>{const v=(member as any)?.portfolioWorkCredits?.[i];return typeof v==='string'?v.slice(0,3000):(typeof member?.portfolioCredits==='string'?member.portfolioCredits:'')}),
    portfolioWorkRatios:Array.from({length:Array.isArray(member?.works)?member.works.length:0},(_,i)=>{const v=(member as any)?.portfolioWorkRatios?.[i];return ['auto','16:9','4:5','4:3','3:2','1:1','9:16'].includes(v)?v:'auto'}) as PortfolioMediaRatio[],
    portfolioLayout:member?.portfolioLayout==='slider'?'slider':'grid',
    portfolioColumns:Number.isFinite(member?.portfolioColumns)?Math.min(4,Math.max(1,member.portfolioColumns)):3,
    portfolioGap:Number.isFinite(member?.portfolioGap)?Math.min(48,Math.max(4,member.portfolioGap)):14,
    portfolioRadius:Number.isFinite(member?.portfolioRadius)?Math.min(48,Math.max(0,member.portfolioRadius)):18,
    portfolioReturnLabel:typeof member?.portfolioReturnLabel==='string'&&member.portfolioReturnLabel.trim()?member.portfolioReturnLabel:'VIIVII sara / Team',
    portfolioProfileSize:Number.isFinite(member?.portfolioProfileSize)?Math.min(560,Math.max(180,member.portfolioProfileSize)):430,
    portfolioNameFont:typeof member?.portfolioNameFont==='string'&&member.portfolioNameFont.trim()?member.portfolioNameFont:'Arial, Helvetica, sans-serif',
    portfolioNameColor:typeof member?.portfolioNameColor==='string'?member.portfolioNameColor:'',
    portfolioNameAlign:['left','center','right'].includes(member?.portfolioNameAlign)?member.portfolioNameAlign:'left',
    portfolioNameSize:Number.isFinite(member?.portfolioNameSize)?Math.min(180,Math.max(36,member.portfolioNameSize)):112,
    portfolioNameX:Number.isFinite(member?.portfolioNameX)?Math.min(300,Math.max(-300,member.portfolioNameX)):0,
    portfolioNameY:Number.isFinite(member?.portfolioNameY)?Math.min(240,Math.max(-240,member.portfolioNameY)):0,
    portfolioRoleFont:typeof member?.portfolioRoleFont==='string'&&member.portfolioRoleFont.trim()?member.portfolioRoleFont:'Arial, Helvetica, sans-serif',
    portfolioRoleColor:typeof member?.portfolioRoleColor==='string'?member.portfolioRoleColor:'',
    portfolioRoleAlign:['left','center','right'].includes(member?.portfolioRoleAlign)?member.portfolioRoleAlign:'left',
    portfolioRoleSize:Number.isFinite(member?.portfolioRoleSize)?Math.min(40,Math.max(8,member.portfolioRoleSize)):10,
    portfolioRoleX:Number.isFinite(member?.portfolioRoleX)?Math.min(300,Math.max(-300,member.portfolioRoleX)):0,
    portfolioRoleY:Number.isFinite(member?.portfolioRoleY)?Math.min(240,Math.max(-240,member.portfolioRoleY)):0,
    portfolioBioFont:typeof member?.portfolioBioFont==='string'&&member.portfolioBioFont.trim()?member.portfolioBioFont:'Arial, Helvetica, sans-serif',
    portfolioBioColor:typeof member?.portfolioBioColor==='string'?member.portfolioBioColor:'',
    portfolioBioAlign:['left','center','right'].includes(member?.portfolioBioAlign)?member.portfolioBioAlign:'left',
    portfolioBioSize:Number.isFinite(member?.portfolioBioSize)?Math.min(40,Math.max(10,member.portfolioBioSize)):15,
    portfolioBioX:Number.isFinite(member?.portfolioBioX)?Math.min(300,Math.max(-300,member.portfolioBioX)):0,
    portfolioBioY:Number.isFinite(member?.portfolioBioY)?Math.min(240,Math.max(-240,member.portfolioBioY)):0,
    portfolioTitleFont:typeof member?.portfolioTitleFont==='string'&&member.portfolioTitleFont.trim()?member.portfolioTitleFont:'Arial, Helvetica, sans-serif',
    portfolioTitleColor:typeof member?.portfolioTitleColor==='string'?member.portfolioTitleColor:'',
    portfolioTitleAlign:['left','center','right'].includes(member?.portfolioTitleAlign)?member.portfolioTitleAlign:'left',
    portfolioTitleSize:Number.isFinite(member?.portfolioTitleSize)?Math.min(140,Math.max(30,member.portfolioTitleSize)):76,
    portfolioTitleX:Number.isFinite(member?.portfolioTitleX)?Math.min(300,Math.max(-300,member.portfolioTitleX)):0,
    portfolioTitleY:Number.isFinite(member?.portfolioTitleY)?Math.min(240,Math.max(-240,member.portfolioTitleY)):0,
    portfolioIntroFont:typeof member?.portfolioIntroFont==='string'&&member.portfolioIntroFont.trim()?member.portfolioIntroFont:'Arial, Helvetica, sans-serif',
    portfolioIntroColor:typeof member?.portfolioIntroColor==='string'?member.portfolioIntroColor:'',
    portfolioIntroAlign:['left','center','right'].includes(member?.portfolioIntroAlign)?member.portfolioIntroAlign:'left',
    portfolioIntroSize:Number.isFinite(member?.portfolioIntroSize)?Math.min(36,Math.max(10,member.portfolioIntroSize)):14,
    portfolioIntroX:Number.isFinite(member?.portfolioIntroX)?Math.min(300,Math.max(-300,member.portfolioIntroX)):0,
    portfolioIntroY:Number.isFinite(member?.portfolioIntroY)?Math.min(240,Math.max(-240,member.portfolioIntroY)):0,
    portfolioUtilityFont:typeof member?.portfolioUtilityFont==='string'&&member.portfolioUtilityFont.trim()?member.portfolioUtilityFont:'Arial, Helvetica, sans-serif',
    portfolioUtilityColor:typeof member?.portfolioUtilityColor==='string'?member.portfolioUtilityColor:'',
    portfolioUtilityAlign:['left','center','right'].includes(member?.portfolioUtilityAlign)?member.portfolioUtilityAlign:'left',
    portfolioUtilityX:Number.isFinite(member?.portfolioUtilityX)?Math.min(300,Math.max(-300,member.portfolioUtilityX)):0,
    portfolioUtilityY:Number.isFinite(member?.portfolioUtilityY)?Math.min(240,Math.max(-240,member.portfolioUtilityY)):0,
    portfolioUtilitySize:Number.isFinite(member?.portfolioUtilitySize)?Math.min(26,Math.max(8,member.portfolioUtilitySize)):11,
    portfolioReturnX:Number.isFinite(member?.portfolioReturnX)?Math.min(300,Math.max(-300,member.portfolioReturnX)):0,
    portfolioReturnY:Number.isFinite(member?.portfolioReturnY)?Math.min(240,Math.max(-240,member.portfolioReturnY)):0,
    portfolioSliderWidth:Number.isFinite(member?.portfolioSliderWidth)?Math.min(100,Math.max(45,member.portfolioSliderWidth)):100,
    portfolioSliderHeight:Number.isFinite(member?.portfolioSliderHeight)?Math.min(1400,Math.max(240,member.portfolioSliderHeight)):760,
    portfolioSliderAutoplay:member?.portfolioSliderAutoplay!==false,
    portfolioSliderAutoplayMs:Number.isFinite(Number(member?.portfolioSliderAutoplayMs))?Math.min(20000,Math.max(1200,Number(member?.portfolioSliderAutoplayMs))):6500,
    portfolioSliderTransitionMs:Number.isFinite(Number(member?.portfolioSliderTransitionMs))?Math.min(2400,Math.max(120,Number(member?.portfolioSliderTransitionMs))):820,
    portfolioSliderEasing:['smooth','soft','snappy','linear'].includes(String(member?.portfolioSliderEasing))?member?.portfolioSliderEasing as 'smooth'|'soft'|'snappy'|'linear':'smooth',
    portfolioGridWidth:Number.isFinite(member?.portfolioGridWidth)?Math.min(100,Math.max(45,member.portfolioGridWidth)):100,
    portfolioSections,
    portfolioSectionOrder,
    portfolioDividers
  };
}):[];
 const navKeys:NavItemKey[]=['work','about','team','contact'];
 const hasStoredNavOrder=Array.isArray((stored as any).navOrder);
 const storedNavOrder=hasStoredNavOrder?(stored as any).navOrder.filter((key:any):key is NavItemKey=>navKeys.includes(key)):[];
 const navOrder=hasStoredNavOrder?[...new Set<NavItemKey>(storedNavOrder)]:[...navKeys];
 const sectionKeys:SiteSectionKey[]=['nav','hero','work','about','team','footer'];
 const storedSectionOrder=Array.isArray((stored as any).sectionOrder)?(stored as any).sectionOrder.filter((key:any):key is SiteSectionKey=>sectionKeys.includes(key)):[];
 const sectionOrder=[...new Set<SiteSectionKey>(storedSectionOrder),...sectionKeys.filter(key=>!storedSectionOrder.includes(key))];
 const storedHeights=(stored.sectionHeights||{}) as Partial<Record<SiteSectionKey,number>>;
 const sectionHeights=Object.fromEntries(sectionKeys.map(key=>[key,Math.min(1800,Math.max(0,Number(storedHeights[key]||0)))])) as Record<SiteSectionKey,number>;
 const sectionDividers=Array.isArray(stored.sectionDividers)?stored.sectionDividers.map((divider,index)=>({
  id:typeof divider?.id==='string'&&divider.id?divider.id:'divider-'+index,
  after:sectionKeys.includes(divider?.after as SiteSectionKey)?divider.after as SiteSectionKey:'hero',
  visible:divider?.visible!==false,
  width:Math.min(100,Math.max(10,Number(divider?.width??100))),
  thickness:Math.min(12,Math.max(.5,Number(divider?.thickness??1))),
  opacity:Math.min(100,Math.max(0,Number(divider?.opacity??24))),
  inset:Math.min(240,Math.max(0,Number(divider?.inset??0))),
  marginTop:Math.min(240,Math.max(0,Number(divider?.marginTop??0))),
  marginBottom:Math.min(240,Math.max(0,Number(divider?.marginBottom??0))),
  offsetY:Number.isFinite(Number(divider?.offsetY))?Number(divider?.offsetY):0,
  color:typeof divider?.color==='string'?divider.color:''
 })):[];
 const pageBlocks:Array<PageBlock>=Array.isArray((stored as any).pageBlocks)?(stored as any).pageBlocks.map((block:any,index:number)=>({
  id:typeof block?.id==='string'&&block.id?block.id:'page-block-'+index,
  type:block?.type==='text'||block?.type==='media'||block?.type==='spacer'?block.type:'slider',
  after:sectionKeys.includes(block?.after as SiteSectionKey)?block.after as SiteSectionKey:'work',
  visible:block?.visible!==false,
  title:typeof block?.title==='string'?block.title:(block?.type==='slider'?'Slider':''),
  text:typeof block?.text==='string'?block.text:'',
  media:typeof block?.media==='string'?block.media:'',
  width:Math.min(100,Math.max(20,Number(block?.width??100))),
  height:Math.min(1200,Math.max(24,Number(block?.height??(block?.type==='spacer'?120:520)))),
  gap:Math.min(80,Math.max(0,Number(block?.gap??18))),
  radius:Math.min(80,Math.max(0,Number(block?.radius??24))),
  offsetY:Number.isFinite(Number(block?.offsetY))?Math.min(1200,Math.max(-1200,Number(block.offsetY))):0,
  background:typeof block?.background==='string'?block.background:'',
  color:typeof block?.color==='string'?block.color:'',
  fontSize:Math.min(180,Math.max(8,Number(block?.fontSize??42))),
  align:block?.align==='center'||block?.align==='right'?block.align:'left',
  mediaFit:block?.mediaFit==='cover'?'cover':'contain',
  mediaPositionX:Math.min(100,Math.max(0,Number(block?.mediaPositionX??50))),
  mediaPositionY:Math.min(100,Math.max(0,Number(block?.mediaPositionY??50))),
  autoplay:block?.autoplay!==false,
  pattern:typeof block?.pattern==='string'?block.pattern:'none',
  patternSize:Math.min(160,Math.max(4,Number(block?.patternSize??32))),
  patternColor:typeof block?.patternColor==='string'?block.patternColor:'#888888',
  patternOpacity:Math.min(100,Math.max(0,Number(block?.patternOpacity??12))),
  fadeEnabled:block?.fadeEnabled===true,
  fadeTopSize:Math.min(50,Math.max(0,Number(block?.fadeTopSize??14))),
  fadeBottomSize:Math.min(50,Math.max(0,Number(block?.fadeBottomSize??14))),
  fadeDensity:Math.min(100,Math.max(0,Number(block?.fadeDensity??34))),
  fadeOpacity:Math.min(100,Math.max(0,Number(block?.fadeOpacity??72))),
  fadeBlur:Math.min(60,Math.max(0,Number(block?.fadeBlur??0)))
 })) : [];
 const heroMediaFit=stored.heroMediaFit==='cover'?'cover':'contain';
 const heroMediaRatio=(['fill','16:9','4:3','3:2','4:5','1:1','9:16'] as const).includes(stored.heroMediaRatio as any)?stored.heroMediaRatio as Config['heroMediaRatio']:'fill';
 const heroMediaPositionX=Math.min(100,Math.max(0,Number(stored.heroMediaPositionX??original.heroMediaPositionX)));
 const heroMediaPositionY=Math.min(100,Math.max(0,Number(stored.heroMediaPositionY??original.heroMediaPositionY)));
 const heroPattern=typeof stored.heroPattern==='string'?stored.heroPattern:original.heroPattern;
 const heroPatternSize=Math.min(160,Math.max(4,Number(stored.heroPatternSize??original.heroPatternSize)));
 const heroPatternColor=typeof stored.heroPatternColor==='string'?stored.heroPatternColor:original.heroPatternColor;
 const heroPatternOpacity=Math.min(100,Math.max(0,Number(stored.heroPatternOpacity??original.heroPatternOpacity)));
 const storedText=(stored.textStyles||{}) as Partial<SiteTextStyles>;
 const textStyles=Object.fromEntries(Object.entries(defaultTextStyles).map(([key,value])=>[key,{...value,...((storedText as any)[key]||{})}])) as SiteTextStyles;
 if(repairBrokenEditSession){
  for(const key of ['aboutKicker','aboutHeadline','aboutBody','aboutDisciplines','footerCopyright'] as const){
   textStyles[key]={...textStyles[key],x:0,y:0};
  }
 }
 const hasNewPlaybackDefaults=typeof stored.musicShuffle==='boolean'||stored.musicRepeatMode==='none'||stored.musicRepeatMode==='all'||stored.musicRepeatMode==='one';
 const musicAutoplay=hasNewPlaybackDefaults?(stored.musicAutoplay??true):true;
 const musicShuffle=stored.musicShuffle??true;
 const musicRepeatMode=stored.musicRepeatMode==='none'||stored.musicRepeatMode==='one'||stored.musicRepeatMode==='all'?stored.musicRepeatMode:'all';
 return {...original,...stored,
  name:sanitizedName,
  aboutModel:resolvedAboutModel,
  navOrder,
  sectionOrder,
  sectionHeights:repairBrokenEditSession?{...sectionHeights,about:0,footer:0}:sectionHeights,
  sectionDividers,
  pageBlocks,
  heroMediaFit,
  heroMediaRatio,
  heroMediaPositionX,
  heroMediaPositionY,
  heroPattern,
  heroPatternSize,
  heroPatternColor,
  heroPatternOpacity,
  heroFadeTopSize:Math.min(40,Math.max(0,Number(stored.heroFadeTopSize??original.heroFadeTopSize))),
  heroFadeBottomSize:Math.min(40,Math.max(0,Number(stored.heroFadeBottomSize??original.heroFadeBottomSize))),
  heroFadeDensity:Math.min(100,Math.max(0,Number(stored.heroFadeDensity??original.heroFadeDensity))),
  heroFadeOpacity:Math.min(100,Math.max(0,Number(stored.heroFadeOpacity??original.heroFadeOpacity))),
  heroFadeBlur:Math.min(60,Math.max(0,Number(stored.heroFadeBlur??original.heroFadeBlur))),
  focusItems:Array.isArray(stored.focusItems)?stored.focusItems:[],
  musicAutoplay,
  musicShuffle,
  musicRepeatMode,
  textStyles,
  aboutOffsetX:repairBrokenEditSession?0:Number(stored.aboutOffsetX??original.aboutOffsetX),
  aboutOffsetY:repairBrokenEditSession?0:Number(stored.aboutOffsetY??original.aboutOffsetY),
  aboutScale:repairBrokenEditSession?1:Number(stored.aboutScale??original.aboutScale),
  footerOffsetX:0,
  footerOffsetY:0,
  footerScale:1,
  modelOffsetX:repairBrokenEditSession?0:Number(stored.modelOffsetX??original.modelOffsetX),
  modelOffsetY:repairBrokenEditSession?0:Number(stored.modelOffsetY??original.modelOffsetY),
  modelRotateX:repairBrokenEditSession?0:Number(stored.modelRotateX??original.modelRotateX),
  modelRotateY:repairBrokenEditSession?0:Number(stored.modelRotateY??original.modelRotateY),
  modelRotateZ:repairBrokenEditSession?0:Number(stored.modelRotateZ??original.modelRotateZ),
  modelAutoRotate:repairBrokenEditSession?false:(stored.modelAutoRotate??original.modelAutoRotate),
  aboutLighting,
  hdriEnvironments:stored.hdriEnvironments||[],
  teamMembers,
  mainLogo:{...defaultLogo,...storedLogo,modelLighting:logoLighting}
 } as Config;
}
export const initial:Config=normalizeConfig(snapshot);
