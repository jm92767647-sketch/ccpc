/* Separate catalogue, using the same PENS, brand registry and PEN_ART as free view. */
(()=>{
 const pane=document.querySelector('#catalog-pane');
 let presentation='list',groupKey=null,lastDirectoryScroll=0;
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function groups(){
  const result=new Map();
  for(const row of visualRows())for(const group of row.groups)for(const p of group.pens){
   const brand=brandOf(p),key=section==='daily'?p.group:sort==='brand'?(brand[0]||p.brand||p.name.split(' ')[0]):p.style;
   const country=p.group==='Italian + French'?(p.name.startsWith('ST 듀퐁')?'French':'Italian'):p.group;
   if(!result.has(key))result.set(key,{key,label:section==='fountain'&&sort==='brand'?(brand[2]||key):key==='Demon'?'Demon':key,country,pens:[]});
   result.get(key).pens.push(p);
  }
  return [...result.values()];
 }
 function updateCount(){document.querySelector('#collection-count').textContent=PENS.filter(p=>p.section===section).length;}
 function photo(p){
  const a=window.PEN_ART[p.id],b=a.contentBounds||[0,0,a.sourceWidth||a.width,a.sourceHeight||a.height],sx=a.width/(a.sourceWidth||a.width),sy=a.height/(a.sourceHeight||a.height),pad=(b[3]-b[1])*.012;
  const x=Math.max(0,b[0]-pad)*sx,y=Math.max(0,b[1]-pad)*sy,right=Math.min(a.sourceWidth||a.width,b[2]+pad)*sx,bottom=Math.min(a.sourceHeight||a.height,b[3]+pad)*sy;
  return `<svg viewBox="${x} ${y} ${right-x} ${bottom-y}" role="img" aria-label="${esc(p.name)} 전체 사진"><image width="${a.width}" height="${a.height}" preserveAspectRatio="none" href="${esc(a.detailPath)}"/></svg>`;
 }
 function render(){
  updateCount();pane.dataset.catalogSection=section;pane.dataset.catalogSort=sort;
  const entries=groups(),group=entries.find(g=>g.key===groupKey);
  if(!group){
   groupKey=null;const split=Math.ceil(entries.length/2);
   function column(gs){let previous='';return `<div class="catalog-column">${gs.map(g=>{let heading='';if(section==='fountain'&&sort==='brand'&&g.country!==previous){heading=`<p class="catalog-country">${esc(g.country==='Italian + French'?'Italian (+ French)':g.country)}</p>`;previous=g.country;}return `${heading}<button class="catalog-entry" data-catalog-group="${esc(g.key)}">${esc(g.label)}</button>`}).join('')}</div>`;}
   pane.innerHTML=`<div class="catalog-directory">${section==='daily'||sort==='style'?column(entries):column(entries.slice(0,split))+column(entries.slice(split))}</div>`;
   pane.scrollTop=lastDirectoryScroll;
  }else{
   pane.innerHTML=`<div class="catalog-group-head"><button id="catalog-back" aria-label="목록으로 뒤로가기"><svg viewBox="0 0 32 24" fill="none" aria-hidden="true"><path d="M30 12H3M13 2 3 12l10 10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><h2>${esc(group.label)}</h2><span>${group.pens.length}</span></div><div class="catalog-products-area"><div class="catalog-products">${group.pens.map(p=>`<article class="catalog-card" data-pen="${p.id}"><div class="catalog-photo">${photo(p)}</div><div class="catalog-caption"><span>${esc(brandOf(p)[2]||brandOf(p)[0])}</span><h3>${esc(displayName(p,group.pens.length===1?3:0))}</h3></div></article>`).join('')}</div></div>`;
   pane.scrollTop=0;fit();
  }
 }
 function fit(){
  const grid=pane.querySelector('.catalog-products');if(!grid)return;
  if(innerWidth<=760){grid.style.cssText='';return;}
  const n=grid.children.length,rows=1,cols=n,area=grid.parentElement;
  const height=area.clientHeight,width=area.clientWidth;
  let art=Math.max(120,(height-rows*58-(rows-1)*8)/rows);
  for(let n=0;n<3;n++){
   const preferred=Math.max(112,Math.min(grid.children.length===1?300:220,art*.25));
   const card=section==='fountain'&&sort==='style'&&groupKey.toLowerCase()==='marble'?Math.min(preferred,(width-(cols-1)*6)/cols):preferred;
   grid.style.setProperty('--catalog-columns',cols);grid.style.setProperty('--catalog-card-width',card+'px');grid.style.setProperty('--catalog-art-height',art+'px');
   const caption=Math.max(...[...grid.querySelectorAll('.catalog-caption')].map(e=>e.getBoundingClientRect().height));
   art=Math.max(100,(height-rows*caption-(rows-1)*8)/rows);
  }
  grid.style.setProperty('--catalog-art-height',art+'px');
  area.classList.toggle('catalog-overflow',cols*parseFloat(grid.style.getPropertyValue('--catalog-card-width'))+(cols-1)*6>width);
 }
 function setPresentation(next){
  if(next===presentation)return;
  presentation=next;document.body.dataset.presentation=next;
  viewport.inert=next==='list';viewport.setAttribute('aria-hidden',String(next==='list'));
  document.querySelectorAll('[data-presentation-button]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.presentationButton===next)));
  if(next==='list')render();
 }
 document.querySelectorAll('[data-presentation-button]').forEach(b=>b.onclick=()=>setPresentation(b.dataset.presentationButton));
 document.querySelectorAll('[data-section],[data-sort]').forEach(b=>{const original=b.onclick;b.onclick=()=>{original();groupKey=null;lastDirectoryScroll=0;render();};});
 pane.onclick=e=>{
  const button=e.target.closest('[data-catalog-group]');if(button){lastDirectoryScroll=pane.scrollTop;groupKey=button.dataset.catalogGroup;render();pane.querySelector('#catalog-back').focus({preventScroll:true});return;}
  if(e.target.closest('#catalog-back')){groupKey=null;render();}
 };
 document.addEventListener('keydown',e=>{
  if(presentation!=='list'||document.querySelector('#numbers').open)return;
  if(e.key==='Escape'&&groupKey){groupKey=null;render();e.preventDefault();}
  if(['+','=','-','Escape','Home','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))e.stopImmediatePropagation();
 },true);
 function syncNumberOrder(){const node=document.querySelector('#number-order');node.dataset.order=numberByCount?'count':'position';node.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String((b.dataset.numberOrder==='count')===numberByCount)));}
 document.addEventListener('pen:number-rendered',syncNumberOrder);
 document.querySelectorAll('[data-number-order]').forEach(b=>b.onclick=()=>{numberByCount=b.dataset.numberOrder==='count';numberContent();});
 addEventListener('resize',()=>{if(presentation==='list')requestAnimationFrame(fit)});
 document.fonts.ready.then(()=>{if(presentation==='list')fit()});
 viewport.inert=true;viewport.setAttribute('aria-hidden','true');render();syncNumberOrder();
 window.PenCatalog={groups,render,fit,setPresentation,get state(){return{presentation,groupKey}}};
})();
