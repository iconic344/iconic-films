import {createRoot} from 'react-dom/client';
import App from './App';
import './globals.css';
import './media-experience.css';
import './portfolio-refinements.css';
import './desktop-refinements.css';
import './mobile-refinements.css';
import './mobile-layout-v3.css';
import './mobile-audit.css';
import './portfolio-grid-polish.css';
import './portfolio-credits-drawer.css';
import './mobile-video-playback.css';
import './edit-site-workbench.css';
import './portfolio-section-order.css';
import './hero-gallery-poster-fix.css';
// Always last: replaces earlier desktop/mobile header rules with the responsive M menu.
import './site-menu.css';
// Mobile-only editorial finishing layer; never changes desktop layout.
import './mobile-official.css';

createRoot(document.getElementById('root')!).render(<App/>);
