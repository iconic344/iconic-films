export type PortfolioCreditContent={
  title?:string;
  kicker?:string;
  info?:string;
  credits?:string;
};

// Used in BOTH the editorial slider and the 4:5 grid. The contents
// come from the same saved portfolio work settings, never mock data.
export default function PortfolioHoverCredits({title,kicker,info,credits}:PortfolioCreditContent){
  const hasInfo=Boolean(info?.trim());
  const hasCredits=Boolean(credits?.trim());
  return <div className="portfolio-hover-credits media-gallery-slide-caption" aria-hidden="true">
    <div className="portfolio-hover-credits-inner media-gallery-slide-caption-inner">
      <span className="portfolio-hover-credits-label media-gallery-slide-caption-label">INFO</span>
      {kicker&&<span className="portfolio-hover-credits-kicker media-gallery-slide-caption-kicker">{kicker}</span>}
      {title&&<h3 className="portfolio-hover-credits-title">{title}</h3>}
      {hasInfo&&<p className="portfolio-hover-credits-description is-info">{info}</p>}
      {hasCredits&&<>
        <span className="portfolio-hover-credits-label is-credits media-gallery-slide-caption-label">CREDITS</span>
        <p className="portfolio-hover-credits-description is-credits-copy">{credits}</p>
      </>}
    </div>
  </div>;
}
