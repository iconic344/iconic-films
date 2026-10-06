import snapshot from './site-config.json';
import {defaultLogo,defaultModelLighting,type EnvironmentMap,type LogoSettings,type ModelLighting} from './logo-settings';
export type TextAlign='left'|'center'|'right';
export type TextStyle={font:string;size:number;color:string;align:TextAlign;x:number;y:number};
export type SiteTextStyles={workKicker:TextStyle;workHeadline:TextStyle;workAside:TextStyle;workCardTitle:TextStyle;workCardMeta:TextStyle;aboutKicker:TextStyle;aboutHeadline:TextStyle;aboutBody:TextStyle;aboutDisciplines:TextStyle;teamKicker:TextStyle;teamHeadline:TextStyle;teamMemberRole:TextStyle;teamMemberName:TextStyle;teamMemberBio:TextStyle;teamView:TextStyle};
export type Work={id:string;title:string;category:string;year:string;role:string;description:string;poster:string;video:string;visible:boolean};
export type Track={id:string;title:string;artist:string;album:string;playlist:string;url:string;cover:string;filename?:string;playlists?:string[]};
export type TeamMember={id:string;codeName:string;memberLabel:string;name:string;role:string;bio:string;instagram:string;photo:string;works:string[];visible:boolean;photoRadius:number;photoSize:number;portfolioSlug:string;portfolioTitle:string;portfolioIntro:string;portfolioLayout:'grid'|'slider';portfolioColumns:number;portfolioGap:number;portfolioRadius:number;portfolioReturnLabel:string;portfolioProfileSize:number;portfolioNameFont:string;portfolioNameSize:number;portfolioNameColor:string;portfolioNameAlign:TextAlign;portfolioNameX:number;portfolioNameY:number;portfolioRoleFont:string;portfolioRoleSize:number;portfolioRoleColor:string;portfolioRoleAlign:TextAlign;portfolioRoleX:number;portfolioRoleY:number;portfolioBioFont:string;portfolioBioSize:number;portfolioBioColor:string;portfolioBioAlign:TextAlign;portfolioBioX:number;portfolioBioY:number;portfolioTitleFont:string;portfolioTitleSize:number;portfolioTitleColor:string;portfolioTitleAlign:TextAlign;portfolioTitleX:number;portfolioTitleY:number;portfolioIntroFont:string;portfolioIntroSize:number;portfolioIntroColor:string;portfolioIntroAlign:TextAlign;portfolioIntroX:number;portfolioIntroY:number;portfolioUtilityFont:string;portfolioUtilitySize:number;portfolioUtilityColor:string;portfolioUtilityAlign:TextAlign;portfolioUtilityX:number;portfolioUtilityY:number;portfolioReturnX:number;portfolioReturnY:number;portfolioSliderWidth:number;portfolioSliderHeight:number;portfolioGridWidth:number};
export type Config={browserTitle:string;favicon:string;textStyles:SiteTextStyles;mainLogo:LogoSettings;filmBackdropOpacity:number;filmBackdropBlur:number;teamHeadlineAlign:'left'|'center'|'right';teamHeadlineFont:string;navWorkLabel:string;navAboutLabel:string;navTeamLabel:string;navContactLabel:string;teamViewLabel:string;heroCaption:string;heroButtonLabel:string;workKicker:string;workAside:string;aboutKicker:string;aboutDisciplines:string;teamKicker:string;footerAdminLabel:string;heroOffsetY:number;logoOffsetY:number;workOffsetX:number;workOffsetY:number;aboutOffsetX:number;aboutOffsetY:number;teamOffsetX:number;teamOffsetY:number;teamHeadlineX:number;teamHeadlineY:number;teamHeadlineSize:number;teamHeadlineWidth:number;teamMediaSize:number;teamMediaRadius:number;teamRowGap:number;showTeam:boolean;teamHeadline:string;teamMembers:TeamMember[];musicPlaylists:string[];hdriEnvironments:EnvironmentMap[];aboutLighting:ModelLighting;aboutHeadline:string;aboutMediaType:string;aboutImage:string;aboutModel:string;modelReturnToCenter:boolean;modelReturnBounce:number;modelScale:number;modelAutoRotate:boolean;modelDrag:boolean;modelReact:boolean;modelZoom:boolean;modelSpeed:number;modelSensitivity:number;modelAnimate:boolean;modelAnimation:string;modelExposure:number;modelRotateX:number;modelRotateY:number;modelRotateZ:number;modelOffsetX:number;modelOffsetY:number;backgroundType:string;backgroundImage:string;backgroundVideo:string;backgroundOpacity:number;backgroundDim:number;pattern:string;patternSize:number;patternColor:string;patternOpacity:number;navOpacity:number;name:string;eyebrow:string;headline:string;subtitle:string;about:string;email:string;instagram:string;heroPoster:string;heroVideo:string;logo:string;theme:string;accent:string;font:string;fontSize:number;spacing:number;radius:number;blur:number;glass:number;motion:number;depth:number;columns:number;autoplay:boolean;showAbout:boolean;showMusic:boolean;musicAutoplay:boolean;musicRandomStart:boolean;musicShuffle:boolean;musicRepeatMode:'none'|'all'|'one';volume:number;works:Work[];tracks:Track[]};
const defaultTextStyle=(size:number,color='',font='Arial, Helvetica, sans-serif',align:TextAlign='left'):TextStyle=>({font,size,color,align,x:0,y:0});
const defaultTextStyles:SiteTextStyles={
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
 teamView:defaultTextStyle(10)
};
const original:Config={browserTitle:'VIIVIIsara®',favicon:'',textStyles:defaultTextStyles,mainLogo:defaultLogo,filmBackdropOpacity:62,filmBackdropBlur:20,teamHeadlineAlign:'left',teamHeadlineFont:'Arial, Helvetica, sans-serif',navWorkLabel:'Work',navAboutLabel:'About',navTeamLabel:'Team',navContactLabel:'Contact',teamViewLabel:'View profile',heroCaption:'ICONIC / DIRECTOR’S CUT',heroButtonLabel:'Watch film',workKicker:'01 / SELECTED WORK',workAside:'A collection of perspectives.\n2025 — 2026',aboutKicker:'02 / BEHIND THE LENS',aboutDisciplines:'Direction\nCinematography\nEditing',teamKicker:'03 / PEOPLE',footerAdminLabel:'admin',heroOffsetY:0,logoOffsetY:0,workOffsetX:0,workOffsetY:0,aboutOffsetX:0,aboutOffsetY:0,teamOffsetX:0,teamOffsetY:0,teamHeadlineX:0,teamHeadlineY:0,teamHeadlineSize:92,teamHeadlineWidth:72,teamMediaSize:250,teamMediaRadius:22,teamRowGap:72,showTeam:true,teamHeadline:'People behind\nthe image.',teamMembers:[],musicPlaylists:[],hdriEnvironments:[],aboutLighting:{...defaultModelLighting},aboutHeadline:'Less noise.\nMore feeling.',aboutMediaType:'image',aboutImage:'',aboutModel:'',modelReturnToCenter:true,modelReturnBounce:.55,modelScale:1,modelAutoRotate:true,modelDrag:true,modelReact:true,modelZoom:true,modelSpeed:20,modelSensitivity:18,modelAnimate:true,modelAnimation:'auto',modelExposure:1,modelRotateX:0,modelRotateY:0,modelRotateZ:0,modelOffsetX:0,modelOffsetY:0,backgroundType:'none',backgroundImage:'',backgroundVideo:'',backgroundOpacity:100,backgroundDim:20,pattern:'none',patternSize:32,patternColor:'#888888',patternOpacity:12,navOpacity:46,name:'ICONIC',eyebrow:'INDEPENDENT FILM DIRECTOR',headline:'A different\npoint of view.',subtitle:'Film. Direction. Moving images.',about:'장면의 분위기부터 마지막 컷의 리듬까지. 패션, 공연, 브랜드의 순간을 촬영하고 편집합니다.',email:'',instagram:'',heroPoster:'/editorial.jpg',heroVideo:'',logo:'',theme:'light',accent:'#536bf2',font:'Arial, Helvetica, sans-serif',fontSize:16,spacing:80,radius:22,blur:24,glass:70,motion:1,depth:12,columns:2,autoplay:true,showAbout:true,showMusic:true,musicAutoplay:true,musicRandomStart:false,musicShuffle:true,musicRepeatMode:'all',volume:60,works:[{id:'1',title:'Between the frames',category:'Fashion film',year:'2026',role:'Direction / Cinematography / Edit',description:'공간과 움직임, 그리고 그 사이의 순간. 작품 파일을 업로드해 나만의 필름으로 교체하세요.',poster:'/editorial.jpg',video:'/sample.mp4',visible:true},{id:'2',title:'Selected moments',category:'Brand film',year:'2026',role:'Direction / Edit',description:'새로운 시선으로 기록한 장면들. 현재 재생되는 영상은 기능 확인용 샘플입니다.',poster:'/editorial.jpg',video:'/sample.mp4',visible:true}],tracks:[]};

export function normalizeConfig(value:unknown={}){
 const stored=value as Partial<Config>&{mainLogo?:Partial<LogoSettings>};
 const aboutLighting=stored.aboutLighting?{...defaultModelLighting,...stored.aboutLighting}:{...defaultModelLighting,exposure:stored.modelExposure??defaultModelLighting.exposure};
 const storedLogo:Partial<LogoSettings>=stored.mainLogo||{};
 const logoLighting=storedLogo.modelLighting?{...defaultModelLighting,...storedLogo.modelLighting}:{...defaultModelLighting,exposure:storedLogo.modelExposure??defaultModelLighting.exposure};
 const teamMembers=Array.isArray(stored.teamMembers)?stored.teamMembers.map((member,index)=>{
  const name=typeof member?.name==='string'?member.name:'';
  const fallbackSlug=(name||('member-'+(index+1))).toLowerCase().trim().replace(/[^a-z0-9가-힣]+/g,'-').replace(/^-+|-+$/g,'')||('member-'+(index+1));
  return {...member,
    codeName:typeof member?.codeName==='string'&&member.codeName.trim()?member.codeName.trim().slice(0,8).toUpperCase():((name.trim().slice(0,1)||String(index+1)).toUpperCase()),
    memberLabel:typeof member?.memberLabel==='string'&&member.memberLabel.trim()?member.memberLabel.trim().slice(0,24):'MEMBER',
    bio:typeof member?.bio==='string'?member.bio:'',
    photoRadius:Number.isFinite(member?.photoRadius)?member.photoRadius:(stored.teamMediaRadius??original.teamMediaRadius),
    photoSize:Number.isFinite(member?.photoSize)?member.photoSize:(stored.teamMediaSize??original.teamMediaSize),
    works:Array.isArray(member?.works)?member.works:[],
    portfolioSlug:typeof member?.portfolioSlug==='string'&&member.portfolioSlug.trim()?member.portfolioSlug:fallbackSlug,
    portfolioTitle:typeof member?.portfolioTitle==='string'&&member.portfolioTitle.trim()?member.portfolioTitle:'Selected works',
    portfolioIntro:typeof member?.portfolioIntro==='string'?member.portfolioIntro:'',
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
    portfolioSliderHeight:Number.isFinite(member?.portfolioSliderHeight)?Math.min(1100,Math.max(320,member.portfolioSliderHeight)):760,
    portfolioGridWidth:Number.isFinite(member?.portfolioGridWidth)?Math.min(100,Math.max(45,member.portfolioGridWidth)):100
  };
}):[];
 const storedText=(stored.textStyles||{}) as Partial<SiteTextStyles>;
 const textStyles=Object.fromEntries(Object.entries(defaultTextStyles).map(([key,value])=>[key,{...value,...((storedText as any)[key]||{})}])) as SiteTextStyles;
 const hasNewPlaybackDefaults=typeof stored.musicShuffle==='boolean'||stored.musicRepeatMode==='none'||stored.musicRepeatMode==='all'||stored.musicRepeatMode==='one';
 const musicAutoplay=hasNewPlaybackDefaults?(stored.musicAutoplay??true):true;
 const musicShuffle=stored.musicShuffle??true;
 const musicRepeatMode=stored.musicRepeatMode==='none'||stored.musicRepeatMode==='one'||stored.musicRepeatMode==='all'?stored.musicRepeatMode:'all';
 return {...original,...stored,musicAutoplay,musicShuffle,musicRepeatMode,textStyles,aboutLighting,hdriEnvironments:stored.hdriEnvironments||[],teamMembers,mainLogo:{...defaultLogo,...storedLogo,modelLighting:logoLighting}} as Config;
}
export const initial:Config=normalizeConfig(snapshot);
