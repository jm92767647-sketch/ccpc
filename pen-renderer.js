/* Render the original catalog photos on a transparent canvas. No original
   image is inserted into the page, including during layout animations. */
const PenRenderer=(()=>{
 const cache=new Map();
 const down=new Set([5,6,8,11,12,13,16,17,24,26,27,32,37,38,39,40,45,46,49,50,52,58,59]);
 const up=new Set([2,10,15,42]);
 const right=new Set([34,44,48]);
 const posted=new Set([1,2,3,4,6,7,8,9,10,11,12,13,14,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,35,37,39,40,42,48,51,52,53,54,59]);
 function makeCanvas(w,h){let c=document.createElement('canvas');c.width=w;c.height=h;return c}
 async function prepare(p){
  const img=new Image();img.src=p.image;await img.decode();let w=img.naturalWidth,h=img.naturalHeight;
  const src=makeCanvas(w,h),ctx=src.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  if(p.id===41){h=Math.floor(h*.76);src.height=h;ctx.drawImage(img,0,0)}
  const image=ctx.getImageData(0,0,w,h),rgba=image.data,n=w*h,mask=new Uint8Array(n),seen=new Uint8Array(n),queue=new Int32Array(n);
  const transparent=[5,15].includes(p.id),threshold=[10,14,20,21,24,42].includes(p.id)?244:215; for(let i=0;i<n;i++)mask[i]=rgba[i*4+3]>20&&(transparent||Math.min(rgba[i*4],rgba[i*4+1],rgba[i*4+2])<threshold)?1:0;
  let best=[];
  for(let start=0;start<n;start++){if(!mask[start]||seen[start])continue;let head=0,tail=1;queue[0]=start;seen[start]=1;while(head<tail){let i=queue[head++],x=i%w;for(let j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<n&&mask[j]&&!seen[j]){seen[j]=1;queue[tail++]=j}}if(tail>best.length)best=Array.from(queue.subarray(0,tail))}
  if(!best.length)throw new Error('Empty pen image '+p.id);
  let sx=0,sy=0;for(let i of best){sx+=i%w;sy+=Math.floor(i/w)}let mx=sx/best.length,my=sy/best.length,xx=0,yy=0,xy=0;
  for(let i of best){let dx=i%w-mx,dy=Math.floor(i/w)-my;xx+=dx*dx;yy+=dy*dy;xy+=dx*dy}
  let angle=.5*Math.atan2(2*xy,xx-yy),vx=Math.cos(angle),vy=Math.sin(angle),target=down.has(p.id)?[0,1]:up.has(p.id)?[0,-1]:right.has(p.id)?[1,0]:[-1,0];if(vx*target[0]+vy*target[1]<0)angle+=Math.PI;
  const solid=new Uint8Array(n);for(let i of best){let x=i%w,y=Math.floor(i/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){let a=x+dx,b=y+dy;if(a>=0&&a<w&&b>=0&&b<h)solid[b*w+a]=1}}
  // Flood the exterior only; white highlights enclosed by the pen stay opaque.
  const exterior=new Uint8Array(n);let head=0,tail=0;function add(i){if(!solid[i]&&!exterior[i]){exterior[i]=1;queue[tail++]=i}}
  for(let x=0;x<w;x++){add(x);add((h-1)*w+x)}for(let y=0;y<h;y++){add(y*w);add(y*w+w-1)}while(head<tail){let i=queue[head++],x=i%w;for(let j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<n)add(j)}
  for(let i=0;i<n;i++){let k=i*4;if(exterior[i])rgba[k+3]=0;else if(!mask[i]){const a=Math.min(1,(255-Math.min(rgba[k],rgba[k+1],rgba[k+2]))/14);if(solid[i])rgba[k+3]=Math.round(rgba[k+3]*a)}}ctx.putImageData(image,0,0);
  const size=Math.ceil(Math.hypot(w,h))+8,rotated=makeCanvas(size,size),rc=rotated.getContext('2d',{willReadFrequently:true});rc.translate(size/2,size/2);rc.rotate(Math.PI/2-angle);rc.drawImage(src,-mx,-my);
  const pixels=rc.getImageData(0,0,size,size).data;let left=size,top=size,bottom=0,rgt=0;for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(pixels[(y*size+x)*4+3]>30){left=Math.min(left,x);rgt=Math.max(rgt,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
  if(p.id===20){const clean=rc.getImageData(0,0,size,size);for(let y=top+Math.floor((bottom-top)*.85);y<=bottom;y++)for(let x=left;x<=rgt;x++){const k=(y*size+x)*4;if(Math.min(clean.data[k],clean.data[k+1],clean.data[k+2])>215)clean.data[k+3]=0}rc.putImageData(clean,0,0);rgt=0;left=size;for(let y=top;y<=bottom;y++)for(let x=0;x<size;x++)if(clean.data[(y*size+x)*4+3]>30){left=Math.min(left,x);rgt=Math.max(rgt,x)}}
  const trimmed=makeCanvas(rgt-left+5,bottom-top+5);trimmed.getContext('2d').drawImage(rotated,left-2,top-2,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);trimmed.dataset.id=p.id;
  return{canvas:trimmed,posted:posted.has(p.id),angle:Math.PI/2-angle};
 }
 function get(p){if(!cache.has(p.id))cache.set(p.id,prepare(p));return cache.get(p.id)}
 async function paint(p,slot){const result=await get(p);const c=makeCanvas(result.canvas.width,result.canvas.height);c.getContext('2d').drawImage(result.canvas,0,0);c.className='pen-image';c.setAttribute('role','img');c.setAttribute('aria-label',p.name);slot.classList.toggle('posted',result.posted);slot.replaceChildren(c);slot.dataset.ready='true';return c}
 return{get,paint};
})();


