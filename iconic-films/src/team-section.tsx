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
    '--team-role-font':config.textStyles.teamMemberRole.font||'Arial, Helvetica, sans-serif',
    '--team-role-size':config.textStyles.teamMemberRole.size+'px',
    '--team-role-color':config.textStyles.teamMemberRole.color||'var(--soft)',
    '--team-role-align':config.textStyles.teamMemberRole.align,
    '--team-role-x':config.textStyles.teamMemberRole.x+'px',
    '--team-role-y':config.textStyles.teamMemberRole.y+'px',
    '--team-name-font':config.textStyles.teamMemberName.font||'Arial, Helvetica, sans-serif',
    '--team-name-size':config.textStyles.teamMemberName.size+'px',
    '--team-name-color':config.textStyles.teamMemberName.color||'var(--ink)',
    '--team-name-align':config.textStyles.teamMemberName.align,
    '--team-name-x':config.textStyles.teamMemberName.x+'px',
    '--team-name-y':config.textStyles.teamMemberName.y+'px',
    '--team-bio-font':config.textStyles.teamMemberBio.font||'Arial, Helvetica, sans-serif',
    '--team-bio-size':config.textStyles.teamMemberBio.size+'px',
    '--team-bio-color':config.textStyles.teamMemberBio.color||'var(--soft)',
    '--team-bio-align':config.textStyles.teamMemberBio.align,
    '--team-bio-x':config.textStyles.teamMemberBio.x+'px',
    '--team-bio-y':config.textStyles.teamMemberBio.y+'px',
    '--team-view-font':config.textStyles.teamView.font||'Arial, Helvetica, sans-serif',
    '--team-view-size':config.textStyles.teamView.size+'px',
    '--team-view-color':config.textStyles.teamView.color||'var(--ink)',
    '--team-view-align':config.textStyles.teamView.align,
    '--team-view-x':config.textStyles.teamView.x+'px',
    '--team-view-y':config.textStyles.teamView.y+'px',
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
      <span className="kicker" style={textCss('teamKicker')}>{config.teamKicker||'03 / PORTFOLIO'}</span>
      <h2 style={textCss('teamHeadline')}>{(config.teamHeadline||'Selected disciplines.').split('\n').map((line,i)=><span key={i}>{line}{i<(config.teamHeadline||'').split('\n').length-1&&<br/>}</span>)}</h2>
    </div>

    <div className="team-stack-list">
      {visible.map((member,index)=>{
        const slug=member.portfolioSlug||member.id;
        return <a
          className="team-stack-card"
          href={'/team/'+encodeURIComponent(slug)}
          key={member.id}
          onClick={event=>open(event,member)}
          aria-label={(member.name||'Portfolio category')+' 포트폴리오 보기'}
        >
          <div className="team-stack-visual">
            {member.photo
              ?<TeamMedia src={member.photo} alt={member.name||'Portfolio'} className="team-stack-media"/>
              :<span className="team-stack-placeholder" aria-hidden="true"/>}
          </div>

          <div className="team-stack-copy team-stack-copy--portfolio">
            <h3 style={textCss('teamMemberName')}>{member.name||'Portfolio'}</h3>
            {!!member.portfolioSubcategories?.length&&<p className="team-stack-subcategories" style={textCss('teamMemberBio')}>{member.portfolioSubcategories.slice(0,4).join(' · ')}</p>}
          </div>

          <div className="team-stack-end">
            <span className="team-stack-view" style={textCss('teamView')}>View portfolio <ArrowUpRight size={15}/></span>
          </div>
        </a>;
      })}
    </div>
  </section>
}
