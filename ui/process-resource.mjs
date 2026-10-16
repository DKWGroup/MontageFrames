let owner=null;
export const heavyOwner=()=>owner?.name??null;
export function tryAcquireHeavy(name){if(owner)return null;const token={name};owner=token;let released=false;return()=>{if(!released&&owner===token)owner=null;released=true;};}
