'use client';
import type {TeamMember} from './defaults';

const isVideo=(url:string)=>/\.(mp4|webm|mov)(?:$|\?)/i.test(url);

export default function TeamSection({headline,members}:{headline:string;members:TeamMember[]}){
  const visible=(members||[]).filter(member=>member.visible);
  if(!visible.length)return null;
  return <section id="team" className="team-section reveal">
    <div className="team-section-head">
      <span className="kicker">03 / PEOPLE</span>
      <h2>{(headline||'People behind the image.').split('\n').map((line,i)=><span key={i}>{line}<br/></span>)}</h2>
    </div>
    <div className="team-grid">
      {visible.map((member,index)=><article className="team-card" key={member.id}>
        <div className="team-portrait">
          {member.photo?<img src={member.photo} alt={member.name||member.role}/>:<div className="team-placeholder" aria-hidden="true">{String(index+1).padStart(2,'0')}</div>}
          <span>{String(index+1).padStart(2,'0')}</span>
        </div>
        <div className="team-card-copy">
          <div>
            <p>{member.role||'CREATIVE'}</p>
            <h3>{member.name||'Unnamed'}</h3>
          </div>
          {member.instagram&&<a className="team-instagram" href={member.instagram} target="_blank" rel="noreferrer" aria-label={member.name+' Instagram'}><span className="team-ig-mark" aria-hidden="true">IG</span><span>Instagram</span></a>}
        </div>
        {!!member.works?.length&&<div className="team-work-strip">
          {member.works.map((url,i)=>isVideo(url)
            ?<video key={url+i} src={url} muted playsInline preload="metadata" onPointerEnter={e=>e.currentTarget.play().catch(()=>{})} onPointerLeave={e=>{e.currentTarget.pause();e.currentTarget.currentTime=0}}/>
            :<img key={url+i} src={url} alt={member.name+' work '+(i+1)}/>)}
        </div>}
      </article>)}
    </div>
  </section>
}
