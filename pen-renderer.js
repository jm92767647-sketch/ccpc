/* Precomputed copies of the original transparent, upright renders.
   Only visible images are decoded; overview and detailed sources share a crop. */
const PenRenderer=(()=>{
 function get(p){return window.PEN_ART[p.id];}
 function paint(p,slot){
  const art=get(p);
  if(!art)return Promise.reject(new Error('Missing pen art '+p.id));
  const image=new Image();
  image.className='pen-source';image.alt=p.name;image.draggable=false;
  image.width=art.sourceWidth||art.width;image.height=art.sourceHeight||art.height;
  image.loading=document.body.dataset.level==='3'?'eager':'lazy';
  image.decoding='async';
  image.sizes='32px';
  image.srcset=art.previewPath+' '+art.previewWidth+'w, '+art.detailPath+' '+art.detailWidth+'w';
  image.src=art.previewPath;
  image.onload=()=>{slot.dataset.ready='true';};
  let retried=false;
  image.onerror=()=>{
   if(!retried){retried=true;image.srcset='';image.src=art.detailPath+'?v=fullpens20261015';return;}
   slot.dataset.error='true';slot.dataset.failedSource=image.src;slot.textContent='사진을 불러오지 못했습니다';slot.classList.add('image-error');
  };
  const frame=document.createElement('span');frame.className='pen-image';
  const crop=art.crop||[0,0,art.width,art.height];
  image.style.width=((art.sourceWidth||art.width)/crop[2]*100)+'%';
  image.style.height=((art.sourceHeight||art.height)/crop[3]*100)+'%';
  image.style.left=(-crop[0]/crop[2]*100)+'%';image.style.top=(-crop[1]/crop[3]*100)+'%';
  frame.append(image);slot.classList.toggle('posted',art.posted);slot.replaceChildren(frame);
  return Promise.resolve(frame);
 }
 return{get,paint};
})();


