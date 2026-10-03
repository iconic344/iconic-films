export type CursorMode='dot'|'text'|'control'|'media';
export const cursorDiameter:Record<CursorMode,number>={dot:6,text:32,control:48,media:60};
export function stepCursorDiameter(current:number,target:number,elapsed:number){const next=current+(target-current)*(1-Math.exp(-Math.min(50,Math.max(0,elapsed))/80));return Math.abs(next-target)<.02?target:next;}
