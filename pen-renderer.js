/* Precomputed copies of the original transparent, upright renders.
   Only visible images are decoded; overview and detailed sources share a crop. */
const PenRenderer=(()=>{
 function get(p){return window.PEN_ART[p.id];}
 function paint(p,slot){
  const art=get(p);
  if(!art)return Promise.reject(new Error('Missing pen art '+p.id));
  const image=new Image();
  image.className='pen-image';image.alt=p.name;image.draggable=false;
  image.width=art.width;image.height=art.height;
  image.loading=document.body.dataset.level==='3'?'eager':'lazy';
  image.decoding='async';
  image.sizes='32px';
  image.srcset=art.previewPath+' '+art.previewWidth+'w, '+art.detailPath+' '+art.detailWidth+'w';
  image.src=art.previewPath;
  image.onload=()=>{slot.dataset.ready='true';};
  image.onerror=()=>{slot.dataset.error='true';slot.textContent='사진을 불러오지 못했습니다';slot.classList.add('image-error');};
  slot.classList.toggle('posted',art.posted);slot.replaceChildren(image);
  return Promise.resolve(image);
 }
 return{get,paint};
})();


