'use client';
import type {CSSProperties} from 'react';
import type {Config} from './defaults';
import TeamMedia from './team-media';

export default function TeamSection({config}:{config:Config}){
  const visible=(config.teamMembers||[]).filter(member=>member.visible);
  if(!visible.length)return null;
  const sectionStyle={
    '--team-head-x':config.teamHeadlineX+'px',
    '--team-head-y':config.teamHeadlineY+'px',
    '--team-head-size':config.teamHeadlineSize+'px',
    '--team-head-width':config.teamHeadlineWidth+'%',
    '--team-default-media':config.teamMediaSize+'px',
    '--team-default-radius':config.teamMediaRadius+'%',
    '--team-row-gap':config.teamRowGap+'px',
  } as CSSProperties;
  return <section id="team" className="team-section reveal" style={sectionStyle}>
    <div className="team-section-head">
      <span className="kicker">{config.teamKicker||'03 / PEOPLE'}</span>
      <h2>{(config.teamHeadline||'People behind the image.').split('\n').map((line,i)=><span key={i}>{line}{i<(config.teamHeadline||'').split('\n').length-1&&<br/>}</span>)}</h2>
    </div>
    <div className="team-list">
      {visible.map((member,index)=>{
        const visual=member.photo;
        const memberStyle={
          '--member-media-size':(member.photoSize||config.teamMediaSize)+'px',
          '--member-radius':(member.photoRadius??config.teamMediaRadius)+'%',
        } as CSSProperties;
        return <article className="team-card" key={member.id} style={memberStyle}>
          <div className="team-card-media">
            {visual?<TeamMedia src={visual} alt={member.name||member.role} className="team-primary-media" interactive/>:<div className="team-placeholder" aria-hidden="true">{String(index+1).padStart(2,'0')}</div>}
            <span className="team-index">{String(index+1).padStart(2,'0')}</span>
          </div>
          <div className="team-card-info">
            <div className="team-card-heading">
              <div>
                <p>{member.role||'CREATIVE'}</p>
                <h3>{member.name||'Unnamed'}</h3>
              </div>
              {member.instagram&&<a className="team-instagram" href={member.instagram} target="_blank" rel="noreferrer" aria-label={member.name+' Instagram'}><span className="team-ig-mark" aria-hidden="true">IG</span><span>Instagram</span></a>}
            </div>
            {member.bio&&<p className="team-bio">{member.bio}</p>}
            {!!member.works?.length&&<div className="team-work-grid">
              {member.works.map((url,i)=><div className="team-work-item" key={url+i}><TeamMedia src={url} alt={(member.name||'Team member')+' work '+(i+1)} className="team-work-media" interactive/></div>)}
            </div>}
          </div>
        </article>
      })}
    </div>
  </section>
}
