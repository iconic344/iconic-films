// Preserve source indices so callers can keep their full grid while
// the player renders and navigates only the opened item's category.
const categoryKey=(value?:string)=>(value||'').trim().toLocaleLowerCase();

export function scopeGallery<T extends {category?:string}>(items:T[],initialIndex:number){
 const selected=Math.max(0,Math.min(initialIndex,items.length-1));
 const category=categoryKey(items[selected]?.category);
 const sourceIndices=items.flatMap((item,index)=>categoryKey(item.category)===category?[index]:[]);
 return {items:sourceIndices.map(index=>items[index]),sourceIndices,index:Math.max(0,sourceIndices.indexOf(selected))};
}
