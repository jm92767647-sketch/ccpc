const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let section=location.hash==='#fountain'?'fountain':'daily',sort='brand',mode='all',page=0,selected=null,wheel=0,wheelTimer,lastWheel=0;
const modes=['all','double','row','single'],memory={daily:{mode:'all',page:0},fountain:{mode:'all',page:0}};

function groups(){
  const pens=PENS.filter(p=>p.section===section).sort((a,b)=>sort==='style'&&section==='fountain'?a.styleOrder-b.styleOrder:a.order-b.order);
  const result=[];
  for(const p of pens){
    const key=section==='daily'?(p.order<6?'Ballpoint Pen':p.order<9?'Multi Pen':'Mechanical Pencil'):sort==='brand'?p.group:['Wood','Sterling Silver','Demon'].includes(p.style)?'Wood / Sterling Silver / Demonstrator':p.style;
    if(result.at(-1)?.name!==key)result.push({name:key,pens:[]});
    result.at(-1).pens.push(p);
  }
  return result;
}

function visualRows(){
  const raw=groups();
  if(section==='daily')return [{name:'Ballpoint + Multi Pen',groups:raw.filter(g=>g.name==='Ballpoint Pen'||g.name==='Multi Pen')},{name:'Mechanical Pencil',groups:raw.filter(g=>g.name==='Mechanical Pencil')}];
  if(sort!=='style')return raw.map(g=>({name:g.name,groups:[g]}));
  const pairs=[['Classic','Stripe'],['Colored','Marble'],['Wood / Sterling Silver / Demonstrator','Modern Nib'],['Oriental','Holy']];
  return pairs.map(pair=>({name:pair.join('  ·  '),groups:pair.map(name=>raw.find(g=>g.name===name)).filter(Boolean)}));
}

function pages(){
  const rows=visualRows();
  if(mode==='single')return rows.flatMap(row=>row.groups.flatMap(g=>g.pens.map(p=>[{name:g.name,groups:[{name:g.name,pens:[p]}]}])));
  if(mode==='all')return [rows];
  const count=mode==='row'?1:2;
  const out=[];for(let i=0;i<rows.length;i+=count)out.push(rows.slice(i,i+count));return out;
}

function makeSegment(group){
  const segment=document.createElement('div');segment.className='row-segment';segment.dataset.group=group.name;
  const heading=document.createElement('h2');heading.className='row-heading';heading.textContent=group.name;
  const number=document.createElement('span');number.textContent=String(group.pens.length).padStart(2,'0');heading.append(number);
  const items=document.createElement('div');items.className='row-pens';items.style.setProperty('--count',group.pens.length);items.classList.toggle('dense',group.pens.length>10);
  items.append(...group.pens.map(p=>{
    const el=document.createElement('button');el.className='pen'+(selected===p.id?' selected':'');el.dataset.id=p.id;el.title=p.name;el.setAttribute('aria-label',p.name+' 크게 보기');
    const art=document.createElement('div');art.className='pen-art';PenRenderer.paint(p,art).catch(()=>{art.textContent='사진을 불러오지 못했습니다';art.dataset.error='true'});
    const name=document.createElement('h3');name.textContent=p.name;el.append(art,name);el.onclick=()=>{selected=p.id;changeMode('single',p.id)};return el;
  }));
  segment.style.setProperty('--count',group.pens.length);segment.append(heading,items);return segment;
}

function makeRow(row,layout){
  const sectionEl=document.createElement('section');sectionEl.className='pen-row';sectionEl.dataset.group=row.name;
  const slots=row.groups.reduce((n,g)=>n+g.pens.length,0)+row.groups.length-1;
  const scroller=document.createElement('div');scroller.className='row-scroll';scroller.tabIndex=0;scroller.setAttribute('aria-label',row.name+' 펜 목록');
  const track=document.createElement('div');track.className='row-track';track.style.setProperty('--slots',slots);track.append(...row.groups.map(makeSegment));scroller.append(track);
  const footer=document.createElement('div');footer.className='row-scroll-tools';
  const back=document.createElement('button');back.textContent='‹';back.setAttribute('aria-label',row.name+' 왼쪽으로 보기');
  const forward=document.createElement('button');forward.textContent='›';forward.setAttribute('aria-label',row.name+' 오른쪽으로 보기');
  const hint=document.createElement('span');hint.textContent='좌우로 밀어서 보기';const progress=document.createElement('span');progress.className='row-progress';
  footer.append(back,hint,progress,forward);sectionEl.append(scroller,footer);
  const overflowing=slots*layout.card+(slots-1)*layout.gap>layout.width+1;
  sectionEl.classList.toggle('has-overflow',overflowing);footer.hidden=!overflowing;
  const update=()=>{const max=scroller.scrollWidth-scroller.clientWidth;back.disabled=scroller.scrollLeft<2;forward.disabled=scroller.scrollLeft>=max-2;progress.textContent=max>0?Math.round(scroller.scrollLeft/max*100)+'%':''};
  const move=dir=>scroller.scrollBy({left:dir*scroller.clientWidth*.78,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  back.onclick=()=>move(-1);forward.onclick=()=>move(1);scroller.addEventListener('scroll',update,{passive:true});
  scroller.addEventListener('keydown',e=>{if(e.target===scroller&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();e.stopPropagation();move(e.key==='ArrowRight'?1:-1)}});
  requestAnimationFrame(update);return sectionEl;
}

function measureLayout(rows){
  const rect=$('#viewport').getBoundingClientRect(),small=rect.width<700,maxSlots=Math.max(...rows.map(r=>r.groups.reduce((n,g)=>n+g.pens.length,0)+r.groups.length-1)),gap=mode==='all'?(small?2:4):5;
  let card=mode==='all'?Math.min(98,(rect.width-gap*(maxSlots-1))/maxSlots):mode==='single'?Math.min(500,rect.width):Math.min(mode==='row'?108:92,Math.max(small?78:64,(rect.width-gap*(maxSlots-1))/maxSlots));
  const rowGap=small?12:18,rowHeight=(rect.height-rowGap*(rows.length-1))/rows.length;
  const overflow=mode!=='all'&&mode!=='single'&&maxSlots*card+gap*(maxSlots-1)>rect.width+1;
  const label=mode==='single'?58:mode==='all'?(small?24:32):46,head=mode==='all'?(small?22:20):26,tools=overflow?30:0;
  const art=Math.max(12,Math.min(rowHeight-head-label-tools-8,card*6.4,mode==='single'?620:480));
  return{width:rect.width,card,gap,rowGap,rowHeight,art,label,head};
}

function render(animate=false){
  const old=new Map($$('.pen').map(el=>[el.dataset.id,el.getBoundingClientRect()])),allPages=pages();page=Math.min(Math.max(0,page),allPages.length-1);const rows=allPages[page],board=$('#board');
  const layout=measureLayout(rows);board.dataset.mode=mode;
  for(const [key,value] of Object.entries({card:layout.card,'item-gap':layout.gap,'row-gap':layout.rowGap,'row-height':layout.rowHeight,'art-height':layout.art,'label-height':layout.label,'head-height':layout.head}))board.style.setProperty('--'+key,value+'px');
  board.replaceChildren(...rows.map(row=>makeRow(row,layout)));
  if(animate&&!matchMedia('(prefers-reduced-motion: reduce)').matches)$$('.pen').forEach(el=>{const before=old.get(el.dataset.id),after=el.getBoundingClientRect();el.animate(before?[{transform:`translate(${before.x-after.x}px,${before.y-after.y}px)`},{transform:'none'}]:[{opacity:0},{opacity:1}],{duration:420,easing:'cubic-bezier(.2,.7,.2,1)'})});
  $('#range').textContent=`${page+1} / ${allPages.length}`;$('#previous').disabled=page===0;$('#next').disabled=page===allPages.length-1;$('#classification').hidden=section!=='fountain';$('#up').disabled=section==='daily';$('#down').disabled=section==='fountain';$('#chapter').textContent=section==='daily'?'01 / 02':'02 / 02';$('#eyebrow').textContent=section==='daily'?'01 — EVERYDAY WRITING':'02 — FOUNTAIN PENS';$('#title').textContent=section==='daily'?'Multi Pen & Pencil':'Fountain Pen';$('#count').textContent=section==='daily'?'15 PENS · 볼펜 + 멀티펜 / 샤프':`53 PENS · ${sort==='brand'?'나라별 4줄':'스타일별 4줄'}`;$('#supplies').textContent=rows.map(g=>g.name).join(' · ');$$('button[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));$$('[data-section]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.section===section));$$('[data-sort]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.sort===sort));memory[section]={mode,page};
}

function changeMode(next,focusId){const current=focusId??selected??pages()[page]?.[0]?.groups?.[0]?.pens?.[0]?.id;mode=next;page=Math.max(0,pages().findIndex(rows=>rows.some(row=>row.groups.some(g=>g.pens.some(p=>p.id===current)))));render(true)}
function changeSection(next){if(next===section)return;section=next;({mode,page}=memory[section]);selected=null;history.replaceState(null,'','#'+section);render(true)}
$$('[data-section]').forEach(b=>b.onclick=()=>changeSection(b.dataset.section));$$('button[data-mode]').forEach(b=>b.onclick=()=>changeMode(b.dataset.mode));$$('[data-sort]').forEach(b=>b.onclick=()=>{sort=b.dataset.sort;page=0;selected=null;render(true)});$('#up').onclick=()=>changeSection('daily');$('#down').onclick=()=>changeSection('fountain');$('#previous').onclick=()=>{if(page>0){page--;selected=null;render(true)}};$('#next').onclick=()=>{if(page<pages().length-1){page++;selected=null;render(true)}};
$('#viewport').addEventListener('wheel',e=>{if(e.ctrlKey)return;const scroller=e.target.closest('.row-scroll');if(scroller&&(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))){if(e.shiftKey){e.preventDefault();scroller.scrollLeft+=e.deltaY}return}e.preventDefault();if(performance.now()-lastWheel<250)return;wheel+=e.deltaY*(e.deltaMode===1?16:1);clearTimeout(wheelTimer);wheelTimer=setTimeout(()=>wheel=0,160);if(Math.abs(wheel)<60)return;const next=Math.max(0,Math.min(modes.length-1,modes.indexOf(mode)+(wheel<0?1:-1)));wheel=0;lastWheel=performance.now();if(modes[next]!==mode)changeMode(modes[next],Number(e.target.closest('.pen')?.dataset.id)||undefined)},{passive:false});
document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')$('#next').click();if(e.key==='ArrowLeft')$('#previous').click();if(e.key==='ArrowDown'){e.preventDefault();changeSection('fountain')}if(e.key==='ArrowUp'){e.preventDefault();changeSection('daily')}if(e.key==='Escape')changeMode('all');if(e.key==='+'||e.key==='=')changeMode(modes[Math.min(modes.length-1,modes.indexOf(mode)+1)]);if(e.key==='-')changeMode(modes[Math.max(0,modes.indexOf(mode)-1)])});
let touch;$('#viewport').addEventListener('touchstart',e=>{if(e.touches.length===1){const row=e.target.closest('.row-scroll');touch={x:e.touches[0].clientX,y:e.touches[0].clientY,scrollable:row&&row.scrollWidth>row.clientWidth+1}}},{passive:true});$('#viewport').addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(!touch.scrollable&&Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))(dx<0?$('#next'):$('#previous')).click();touch=null},{passive:true});
let resizeTimer;addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{page=0;render()},100)});addEventListener('hashchange',()=>changeSection(location.hash==='#fountain'?'fountain':'daily'));render();
