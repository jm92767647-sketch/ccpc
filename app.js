const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const mobile=matchMedia('(max-width:760px)');
const metrics=new Map(), memories={daily:{level:0,index:0,selected:null},fountain:{level:0,index:0,selected:null}};
for(const [id,art] of Object.entries(window.PEN_ART||{}))metrics.set(Number(id),{ratio:art.width/art.height,scale:window.PEN_LENGTHS[id].scale});
const brands=[['그라폰 파버카스텔','GvFC'],['도미넌트 인더스트리','DI'],['페리스 휠 프레스','FWP'],['나미키(파이롯트)','NMK'],['나카야 (플래티넘)','NKY'],['파버카스텔','FC'],['디플로마트','DPL'],['몬테그라파','MG'],['까렌다쉬','CdA'],['레오나르도','LD'],['비스콘티','VS'],['트위스비','TWSBI'],['파이롯트','PLT'],['ST 듀퐁','STD'],['몽블랑','MB'],['펠리칸','PE'],['발트만','WD'],['라미','LAMY'],['파카','PK'],['워터맨','WM'],['오노토','ON'],['쉐퍼','SH'],['크로스','CR'],['오로라','AU'],['구오마스','OMAS'],['세일러','SL'],['카웨코','KW'],['나왈','NW'],['아스바인','ASV'],['제브라','ZB'],['유니','UNI'],['로트링','RT'],['펜텔','PNT']];
function brandOf(p){return brands.find(([name])=>p.name.startsWith(name))||['',''];}
function displayName(p){
 if(level===3)return p.name;
 const [brand,short]=brandOf(p);
 const model=p.name.slice(brand.length).trim().replace(/\([^)]*\)/g,'').replace(/고급진 멀티펜|얇은 바디\/특이 색감/g,'').replace(/\s+/g,' ').trim();
 return level<=1?model:(short?short+' ':'')+model;
}
let section=location.hash==='#fountain'?'fountain':'daily',sort='brand',level=0,index=0,selected=null;
let fitFrame=0,lastWheel=0,wheel=0,wheelTimer,ignoreClickUntil=0,dragStart=null;
const scene=$('#scene'),viewport=$('#viewport');

function visualRows(){
 const pens=PENS.filter(p=>p.section===section).sort((a,b)=>section==='fountain'&&sort==='style'?a.styleOrder-b.styleOrder:a.order-b.order);
 const groups=[];
 for(const p of pens){
  const key=section==='daily'?(p.order<6?'Ballpoint Pen':p.order<9?'Multi Pen':'Mechanical Pencil'):sort==='brand'?p.group:['Wood','Sterling Silver','Demon'].includes(p.style)?'Wood / Sterling Silver / Demonstrator':p.style;
  if(groups.at(-1)?.name!==key)groups.push({name:key,pens:[]});
  groups.at(-1).pens.push(p);
 }
 let paired;
 if(section==='daily')paired=[groups.slice(0,2),groups.slice(2)];
 else if(sort==='brand')paired=groups.map(g=>[g]);
 else paired=[['Classic','Stripe'],['Colored','Marble'],['Wood / Sterling Silver / Demonstrator','Modern Nib'],['Oriental','Holy']].map(names=>names.map(n=>groups.find(g=>g.name===n)).filter(Boolean));
 return paired.filter(gs=>gs.length).map(gs=>({groups:gs,pens:gs.flatMap(g=>g.pens),name:gs.map(g=>g.name).join(' · ')}));
}
function pages(){
 const rows=visualRows();
 if(level===0)return[rows];
 if(level===3)return rows.flatMap(r=>r.groups.flatMap(g=>g.pens.map(p=>[{groups:[{name:g.name,pens:[p]}],pens:[p],name:g.name}])));
 if(level===2)return rows.map(r=>[r]);
 const result=[];for(let i=0;i<rows.length;i+=2)result.push(rows.slice(i,i+2));return result;
}
function selectedIn(rows,id){return rows.some(row=>row.pens.some(p=>p.id===id));}
function remember(){memories[section]={level,index,selected};}
function select(id){
 selected=id;
 $$('.pen').forEach(el=>{const active=Number(el.dataset.id)===id;el.classList.toggle('selected',active);el.setAttribute('aria-pressed',String(active));});
 remember();
}
function penCard(p,tag,span){
 const el=document.createElement('button');el.className='pen';el.dataset.id=p.id;el.dataset.state=window.PEN_LENGTHS[p.id].state;el.title=p.name;el.setAttribute('aria-label',p.name);el.setAttribute('aria-pressed',String(selected===p.id));
 if(selected===p.id)el.classList.add('selected');
 const heading=document.createElement('span');heading.className='tag';heading.textContent=level<=1&&tag==='Wood / Sterling Silver / Demonstrator'?'Wood / Silver / Demonstrator':tag;heading.title=tag;heading.dataset.span=span;
 const art=document.createElement('span');art.className='pen-art';
 const label=document.createElement('span');label.className='label';label.textContent=displayName(p);
 el.append(heading,art,label);
 PenRenderer.paint(p,art).then(()=>{
  if(el.isConnected)scheduleFit();
 }).catch(()=>{art.textContent='사진을 불러오지 못했습니다';art.classList.add('image-error');});
 return el;
}
function makeRow(row){
 const el=document.createElement('section');el.className='display-row';el.dataset.group=row.name;el.setAttribute('aria-label',row.name);
 const slots=document.createElement('div');slots.className='slots';
 if(section==='fountain'&&sort==='brand'){
  let previous='';
  row.pens.forEach((p,i)=>{const brand=brandOf(p)[0];let span=1;while(i+span<row.pens.length&&brandOf(row.pens[i+span])[0]===brand)span++;slots.append(penCard(p,brand!==previous?brand:'',brand!==previous?span:1));previous=brand;});
 }else for(const g of row.groups)g.pens.forEach((p,i)=>slots.append(penCard(p,i===0?g.name:'',i===0?g.pens.length:1)));
 el.append(slots);return el;
}
function scheduleFit(){if(!fitFrame)fitFrame=requestAnimationFrame(()=>{fitFrame=0;fit();});}
function cardMetric(card){return metrics.get(Number(card.dataset.id))||{ratio:.14,scale:1};}
const labelCanvas=document.createElement('canvas'),labelContext=labelCanvas.getContext('2d');
function preferredWidth(card){
 const label=card.querySelector('.label'),css=getComputedStyle(label);
 labelContext.font=css.font||css.fontSize+' '+css.fontFamily;
 const width=labelContext.measureText(label.textContent).width;
 return Math.max([56,64,84,180][level],Math.min(level===3?600:190,width/[4,4,3,2][level]+14));
}
function fit(){
 const rows=$$('.display-row');if(!rows.length)return;
 const availableHeight=viewport.clientHeight-8,availableWidth=viewport.clientWidth-12;
 const gap=mobile.matches?8:level===0?7:9,tagHeight=level===3?0:mobile.matches?26:20;
 scene.style.setProperty('--card-gap',gap+'px');scene.style.setProperty('--tag-height',tagHeight+'px');
 scene.style.setProperty('--label-height','140px');
 const labelHeight=()=>Math.ceil(Math.max(...$$('.label').map(label=>label.getBoundingClientRect().height)));
 let art;
 if(mobile.matches){
  const columns=[4,3,2,1][level];scene.style.setProperty('--columns',columns);
  for(const row of rows){
   const slots=row.querySelector('.slots');slots.style.width='';slots.style.gridTemplateColumns='';
   for(const card of slots.children){card.style.width='';card.style.setProperty('--tag-width','100%');}
  }
  const labels=labelHeight(),cardWidth=(availableWidth-gap*(columns-1))/columns;
  art=Math.max(24,(availableHeight-tagHeight-labels-4)*[.50,.67,.84,1][level]);
  for(const card of $$('.pen')){const m=cardMetric(card);art=Math.min(art,(cardWidth-12)/(m.ratio*m.scale));}
  scene.style.setProperty('--label-height',labels+'px');scene.style.setProperty('--rows','1');
 }else{
  const count=level===0?visualRows().length:level===1?2:1;
  const rowHeight=(availableHeight-8*(count-1))/count;
  const plans=rows.map(row=>{
   const slots=row.querySelector('.slots'),cards=[...slots.children],wanted=cards.map(preferredWidth);
   const budget=availableWidth-gap*(cards.length-1),factor=Math.min(1,budget/wanted.reduce((n,w)=>n+w,0));
   return{slots,cards,minimum:wanted.map(w=>w*factor)};
  });
  function applyWidths(height){
   let fits=true;
   for(const plan of plans){
    const widths=plan.cards.map((card,i)=>{const m=cardMetric(card);return Math.max(plan.minimum[i],height*m.ratio*m.scale+12);});
    const total=widths.reduce((n,w)=>n+w,0)+gap*(widths.length-1);
    if(total>availableWidth+.5)fits=false;
    plan.slots.style.width=total+'px';plan.slots.style.gridTemplateColumns=widths.map(w=>w+'px').join(' ');
    plan.cards.forEach((card,i)=>{card.style.width='';const span=Number(card.querySelector('.tag').dataset.span);card.style.setProperty('--tag-width',widths.slice(i,i+span).reduce((n,w)=>n+w,0)+gap*(span-1)+'px');});
   }
   return fits;
  }
  let low=0,high=Math.max(24,rowHeight-tagHeight-18);
  if(level===0&&section==='daily')high*=.78;
  if(level===2)high*=.86;
  for(let i=0;i<16;i++){
   const height=(low+high)/2,fits=applyWidths(height);
   if(fits&&height+tagHeight+labelHeight()+4<=rowHeight)low=height;else high=height;
  }
  art=Math.max(16,low);applyWidths(art);
  scene.style.setProperty('--label-height',labelHeight()+'px');scene.style.setProperty('--rows',count);
 }
 scene.style.setProperty('--art-height',art+'px');
 for(const card of $$('.pen')){
  const m=cardMetric(card);card.style.setProperty('--length',m.scale);
  const image=card.querySelector('.pen-image');if(image)image.sizes=Math.ceil(art*m.scale*m.ratio)+'px';
 }
}
function render(){
 const sets=pages();index=Math.max(0,Math.min(index,sets.length-1));const rows=sets[index];
 if(selected===null||!selectedIn(rows,selected))selected=rows[0]?.pens[0]?.id??null;
 document.body.dataset.level=level;document.body.dataset.section=section;scene.dataset.sort=sort;
 $('#classification').hidden=section!=='fountain';
 scene.replaceChildren(...rows.map(makeRow));
 $('#position').textContent=(index+1)+' / '+sets.length;
 $('#position').hidden=$('#prev').hidden=$('#next').hidden=sets.length===1;
 $('#prev').disabled=index===0;$('#next').disabled=index===sets.length-1;
 $$('button[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===section)));
 $$('button[data-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sort===sort)));
 $$('[data-level]').filter(b=>b.tagName==='BUTTON').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.level)===level)));
 viewport.scrollTop=0;fit();remember();
}
function zoom(next,focusId){
 next=Math.max(0,Math.min(3,next));if(next===level)return;
 selected=focusId??selected;level=next;index=Math.max(0,pages().findIndex(rows=>selectedIn(rows,selected)));render();
}
function changeSection(next){
 if(next===section)return;remember();section=next;({level,index,selected}=memories[next]);
 history.replaceState(null,'','#'+section);render();
}
function page(delta){
 const count=pages().length,next=Math.max(0,Math.min(count-1,index+delta));if(next===index)return;
 index=next;selected=null;render();
}
$$('button[data-section]').forEach(b=>b.onclick=()=>changeSection(b.dataset.section));
$$('button[data-sort]').forEach(b=>b.onclick=()=>{
 if(sort===b.dataset.sort)return;sort=b.dataset.sort;
 index=Math.max(0,pages().findIndex(rows=>selectedIn(rows,selected)));render();
});
$$('#levels button').forEach(b=>b.onclick=()=>zoom(Number(b.dataset.level)));
$('#prev').onclick=()=>page(-1);$('#next').onclick=()=>page(1);
scene.addEventListener('click',e=>{
 if(Date.now()<ignoreClickUntil)return;const card=e.target.closest('.pen');if(card)select(Number(card.dataset.id));
});
scene.addEventListener('dblclick',e=>{const card=e.target.closest('.pen');if(card)zoom(3,Number(card.dataset.id));});
viewport.addEventListener('wheel',e=>{
 if(e.ctrlKey||e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;
 if(mobile.matches&&viewport.scrollHeight>viewport.clientHeight+2)return;
 e.preventDefault();if(performance.now()-lastWheel<280)return;
 wheel+=e.deltaY*(e.deltaMode===1?16:1);clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>wheel=0,160);
 if(Math.abs(wheel)<50)return;const direction=wheel<0?1:-1;wheel=0;lastWheel=performance.now();
 zoom(level+direction,Number(e.target.closest('.pen')?.dataset.id)||undefined);
},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(level===0||e.button!==0)return;dragStart={x:e.clientX,y:e.clientY,id:e.pointerId};});
viewport.addEventListener('pointermove',e=>{
 if(dragStart&&Math.abs(e.clientX-dragStart.x)>14&&Math.abs(e.clientX-dragStart.x)>Math.abs(e.clientY-dragStart.y)*1.3)viewport.setPointerCapture(e.pointerId);
});
viewport.addEventListener('pointerup',e=>{
 if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;dragStart=null;
 if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){ignoreClickUntil=Date.now()+350;page(dx<0?1:-1);}
});
viewport.addEventListener('pointercancel',()=>dragStart=null);
document.addEventListener('keydown',e=>{
 if(e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.key==='ArrowRight'){page(1);e.preventDefault();}
 if(e.key==='ArrowLeft'){page(-1);e.preventDefault();}
 if(e.key==='+'||e.key==='='){zoom(level+1);e.preventDefault();}
 if(e.key==='-'){zoom(level-1);e.preventDefault();}
 if(e.key==='Escape')zoom(0);
});
addEventListener('hashchange',()=>changeSection(location.hash==='#fountain'?'fountain':'daily'));
new ResizeObserver(scheduleFit).observe(viewport);
mobile.addEventListener('change',scheduleFit);
document.fonts?.ready.then(scheduleFit);
render();
