export type CursorMode='dot'|'text'|'control'|'media';
export const cursorDiameter:Record<CursorMode,number>={dot:6,text:31,control:47,media:59};
export function stepCursorDiameter(current:number,target:number,elapsed:number){
 const dt=Math.min(40,Math.max(0,elapsed));
 const next=current+(target-current)*(1-Math.exp(-dt/108));
 return Math.abs(next-target)<.015?target:next;
}
export function stepCursorPosition(current:number,target:number,elapsed:number){
 const dt=Math.min(40,Math.max(0,elapsed));
 const next=current+(target-current)*(1-Math.exp(-dt/42));
 return Math.abs(next-target)<.03?target:next;
}
