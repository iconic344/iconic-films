import {useEffect,useState} from 'react';

// Share exactly the same viewport decision across the public website and
// portfolio pages. Desktop edits remain the single source of content.
const QUERY='(max-width: 1024px), (max-width: 1366px) and (any-pointer: coarse)';
export default function useCompactLayout(){
 const [compact,setCompact]=useState(()=>typeof window!=='undefined'&&window.matchMedia(QUERY).matches);
 useEffect(()=>{
  const media=window.matchMedia(QUERY);
  const sync=()=>setCompact(media.matches);
  sync();
  media.addEventListener?.('change',sync);
  return()=>media.removeEventListener?.('change',sync);
 },[]);
 return compact;
}

export function usePhoneLayout(){
 const [phone,setPhone]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(max-width: 600px)').matches);
 useEffect(()=>{
  const media=window.matchMedia('(max-width: 600px)');
  const sync=()=>setPhone(media.matches);
  sync();
  media.addEventListener?.('change',sync);
  return()=>media.removeEventListener?.('change',sync);
 },[]);
 return phone;
}
