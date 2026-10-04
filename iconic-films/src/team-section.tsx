'use client';
import type {CSSProperties,MouseEvent} from 'react';
import {ArrowUpRight} from 'lucide-react';
import type {Config,TeamMember} from './defaults';
import TeamMedia from './team-media';

export default function TeamSection({config,onOpen}:{config:Config;onOpen:(member:TeamMember)=>void}){
  const visible=(config.teamMembers||[]).filter(member=>member.visible);
  if(!visible.length)return null;

  const sectionStyle={
    '--team-head-x':config.textStyles.teamHeadline.x+'px',
    '--team-head-y':config.textStyles.teamHeadline.y+'px',
    '--team-head-size':config.textStyles.teamHeadline.size+'px',
    '--team-head-width':config.teamHeadlineWidth+'%',
    '--team-head-align':config.textStyles.teamHeadline.align||config.teamHeadlineAlign||'left',
    '--team-head-font':config.textStyles.teamHeadline.font||config.teamHeadlineFont||'Arial, Helvetica, sans-serif',
    '--team-row-gap':config.teamRowGap+'px',
  } as CSSProperties;
  const textCss=(key:keyof typeof config.textStyles):CSSProperties=>{
    const s=config.textStyles[key];
    return {fontFamily:s.font||undefined,fontSize:s.size+'px',color:s.color||undefined,textAlign:s.align,translate:s.x+'px '+s.y+'px'};
  };

  const open=(event:MouseEvent<HTMLAnchorElement>,member:TeamMember)=>{
    event.preventDefault();
    onOpen(member);
  };

  return <section id="team" className="team-section reveal team-stack-section" style={sectionStyle}>
    <div className="team-section-head">
      <span className="kicker" style={textCss('teamKicker')}>{config.teamKicker||'03 / PEOPLE'}</span>
      <h2 style={textCss('teamHeadline')}>{(config.teamHeadline||'People behind the image.').split('\n').map((line,i)=><span key={i}>{line}{i<(config.teamHeadline||'').split('\n').length-1&&<br/>}</span>)}</h2>
    </div>

    <div className="team-stack-list">
      {visible.map((member,index)=>{
        const slug=member.portfolioSlug||member.id;
        return <a
          className="team-stack-card"
          href={'/team/'+encodeURIComponent(slug)}
          key={member.id}
          onClick={event=>open(event,member)}
          aria-label={(member.name||'Team member')+' 포트폴리오 보기'}
        >
          <div className="team-stack-visual">
            {member.photo
              ?<TeamMedia src={member.photo} alt={member.name||member.role} className="team-stack-media"/>
              :<span className="team-stack-placeholder">{String(index+1).padStart(2,'0')}</span>}
            <span className="team-stack-number">{String(index+1).padStart(2,'0')}</span>
          </div>

          <div className="team-stack-copy">
            <span style={textCss('teamMemberRole')}>{member.role||'CREATIVE'}</span>
            <h3 style={textCss('teamMemberName')}>{member.name||'Unnamed'}</h3>
            {member.bio&&<p style={textCss('teamMemberBio')}>{member.bio}</p>}
          </div>

          <div className="team-stack-end">
            <span className="team-stack-view" style={textCss('teamView')}>{config.teamViewLabel||'View profile'} <ArrowUpRight size={15}/></span>
          </div>
        </a>;
      })}
    </div>
  </section>
}
