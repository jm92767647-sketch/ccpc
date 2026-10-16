const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const brands=[['그라폰 파버카스텔','GvFC'],['도미넌트 인더스트리','DI'],['페리스 휠 프레스','FWP'],['나미키(파이롯트)','NMK'],['나카야 (플래티넘)','NKY'],['파버카스텔','FC'],['디플로마트','DPL'],['몬테그라파','MG'],['까렌다쉬','CdA'],['레오나르도','LD'],['비스콘티','VS'],['트위스비','TWSBI'],['파이롯트','PLT'],['ST 듀퐁','STD'],['몽블랑','MB'],['펠리칸','PE'],['발트만','WD'],['라미','LAMY'],['파카','PK'],['워터맨','WM'],['오노토','ON'],['쉐퍼','SH'],['크로스','CR'],['오로라','AU'],['구오마스','OMAS'],['세일러','SL'],['카웨코','KW'],['나왈','NW'],['아스바인','ASV'],['제브라','ZB'],['유니','UNI'],['로트링','RT'],['펜텔','PNT']];
function brandOf(p){return brands.find(([name])=>p.name.startsWith(name))||['',''];}
function brandLabel(p){const name=brandOf(p)[0];return level===3?name:name.replace(/\s*\([^)]*\)/g,'');}
function displayName(p){
 if(level===3)return p.name;
 const [brand,short]=brandOf(p);
 let model=p.name.slice(brand.length).trim().replace(/\([^)]*\)/g,'').replace(/고급진 멀티펜|얇은 바디\/특이 색감/g,'').replace(/\s+/g,' ').trim();
 if(p.id===28)model=model.replace(/(14k).*/i,'$1');
 if(p.id===33)model=model.replace(/(브론즈에이지).*/,'$1');
 if(p.id===19)model=model.replace(/(AMARE).*/i,'$1');
 if(p.id===20)model=model.replace(/(580).*/,'$1');
 if(p.id===36)model=model.replace(/(캡리스).*/,'$1');
 if(p.id===50)model=model.replace(/(뮤\s*701).*/,'$1');
 if(p.id===42)model=model.replace(/21k닙\s*/i,'');
 return level<=1?model:(short?short+' ':'')+model;
}
let section=location.hash==='#daily'?'daily':'fountain',sort='brand',level=0;
const scene=$('#scene'),viewport=$('#viewport');

function visualRows(){
 const pens=PENS.filter(p=>p.section===section).sort((a,b)=>section==='fountain'&&sort==='style'?a.styleOrder-b.styleOrder:a.order-b.order);
 const groups=[];
 for(const p of pens){
  const key=section==='daily'?(p.order<6?'Ballpoint Pen':p.order<9?'Multi Pen':'Mechanical Pencil'):sort==='brand'?p.group:p.style==='Demon'?'Demonstrator':p.style;
  if(groups.at(-1)?.name!==key)groups.push({name:key,pens:[]});
  groups.at(-1).pens.push(p);
 }
 let paired;
 if(section==='daily')paired=[groups.slice(0,2),groups.slice(2)];
 else if(sort==='brand')paired=groups.map(g=>[g]);
 else paired=[['Classic','Stripe'],['Colored','Marble'],['Wood','Sterling Silver','Demonstrator','Modern Nib'],['Oriental','Holy']].map(names=>names.map(n=>groups.find(g=>g.name===n)).filter(Boolean));
 return paired.filter(gs=>gs.length).map(gs=>({groups:gs,pens:gs.flatMap(g=>g.pens),name:gs.map(g=>g.name).join(' · ')}));
}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t)};
const camera={t:1,x:0,y:0},target={t:1,x:0,y:0};
let items=[],rows=[],rowMarkers=[],W=0,H=0,lockedId=PENS.find(p=>p.name.includes('뒤마'))?.id||12,frame=0,numberByCount=false,clearance=95,opening=true;
const pointers=new Map();let gesture=null,lastTap=0,resizeTimer;
function geometry(t){
 const narrow=W<=760,n=Math.max(...rows.map(r=>r.pens.length)),ratio=Math.max(...items.map(i=>i.art.width/i.art.height*i.art.scale));
 const fullPitch=(W-28)/n,maxHeight=H*(narrow?.72:.76);
 const dailyFloor=narrow?Math.min(H*.36,(fullPitch-10)/ratio):Math.min(H*.4,(H-220)/2);
 const twoHeight=section==='daily'?Math.min(maxHeight,dailyFloor*1.12):Math.min(H*.34,(fullPitch-7)/ratio);
 const fullHeight=section==='daily'?dailyFloor:Math.min((H-rows.length*90)/rows.length,twoHeight*.62);
 const h=t<=.4?fullHeight+(twoHeight-fullHeight)*smooth(0,.4,t):twoHeight+(maxHeight-twoHeight)*smooth(.4,.86,t);
 const close=smooth(.83,1,t),grow=smooth(.43,.86,t);
 const pitch=Math.max(h*ratio+8,fullPitch+(Math.max(72,h*ratio+28)-fullPitch)*grow);
 const isolatedX=W/2+Math.min(W-28,450)/2+14;
 const pitchX=pitch+(isolatedX-pitch)*close;
 const baseY=narrow?fullHeight+52:H/Math.max(1,rows.length),midY=narrow?twoHeight+64:Math.max(twoHeight+76,H*.46);
 const rowPitch=t<=.4?baseY+(midY-baseY)*smooth(0,.4,t):midY+(h+100-midY)*grow;
 const isolatedY=Math.max(H*.57+h/2+38,H*.43+h/2+60)+12;
 const verticalClose=Math.max(close,smooth(W/5,W/3,pitchX));
 const spacedY=Math.max(h+clearance,rowPitch+(isolatedY-rowPitch)*verticalClose);
 const compact=narrow&&section==='fountain'?smooth(W/4,W/3.4,pitchX):1;
 const pitchY=(h+20)+(spacedY-h-20)*compact;
 return{h,pitchX,pitchY,narrow};
}
function point(i,g){return{x:W/2+i.col*g.pitchX,y:H/2+i.row*g.pitchY};}
function focus(c){const i=items.find(i=>i.p.id===lockedId);if(!i||c.t===0)return;const g=geometry(c.t),p=point(i,g);c.x=W/2-p.x;
 const pair=Math.floor((i.row+(rows.length-1)/2)/2)*2+.5-(rows.length-1)/2;
 const pairY=-pair*g.pitchY,singleY=H*.43-p.y;
 c.y=W>760?pairY+(singleY-pairY)*smooth(.45,.82,c.t):singleY;
 if(W>760&&c.t<=.45)c.x=0;
}
function bound(c){
 c.t=clamp(c.t,0,1);const g=geometry(c.t),ps=items.map(i=>point(i,g));
 const edgeX=Math.max(W/2,g.pitchX/2),edgeTop=Math.max(g.h/2+35,H*.43),edgeBottom=Math.max(g.h/2+90,H*.57);
 const left=Math.min(...ps.map(p=>p.x))-edgeX,right=Math.max(...ps.map(p=>p.x))+edgeX,top=Math.min(...ps.map(p=>p.y))-edgeTop,bottom=Math.max(...ps.map(p=>p.y))+edgeBottom;
 c.x=right-left<W?0:clamp(c.x,W-right-20,-left+20);c.y=bottom-top<H?0:clamp(c.y,H-bottom-20,-top+20);
}
function wake(){if(!frame)frame=requestAnimationFrame(draw);}
function draw(){
 frame=0;const moving=Math.abs(camera.t-target.t)+Math.abs(camera.x-target.x)/100+Math.abs(camera.y-target.y)/100>.001;
 for(const k of ['t','x','y'])camera[k]+=(target[k]-camera[k])*.22;
 if(!moving)Object.assign(camera,target);
 const g=geometry(camera.t),near=camera.t>.97,showNames=!g.narrow||g.pitchX>=W/3.4,showInfo=showNames&&(section==='daily'?camera.t>.6:camera.t>.64),quality=camera.t>.62?'detail':'preview';
 const brandView=section==='fountain'&&sort==='brand',showBrands=!brandView||camera.t>.16;
 let needed=60;
 scene.dataset.zoom=camera.t.toFixed(4);scene.dataset.center=String(lockedId??'');
 for(const i of items){
  const p=point(i,g),h=g.h*i.art.scale,w=h*i.art.width/i.art.height,cardWidth=Math.max(16,Math.min(g.pitchX-7,near?Math.min(W-28,450):220));
  const x=p.x+camera.x,y=p.y+camera.y-g.h/2;
  const visible=x+cardWidth/2>0&&x-cardWidth/2<W&&y+g.h+60>0&&y-38<H;
  i.el.hidden=!visible;if(!visible)continue;
  i.el.style.cssText=`left:${x-cardWidth/2}px;top:${y}px;width:${cardWidth}px;height:${g.h+60}px`;
  i.photo.style.cssText=`width:${w}px;height:${h}px;left:${(cardWidth-w)/2}px;top:0`;
  i.caption.style.cssText=`top:${g.h+10}px;font-size:${near?15:clamp(7+camera.t*6,7,12)}px;line-height:1.35;display:${showNames?'block':'none'}`;
  level=near?3:camera.t>.35?2:0;
  i.label.textContent=displayName(i.p);i.tag.textContent=showInfo||!showBrands?'':i.heading.replace('Demonstrator','Demon');
  i.tag.hidden=false;
  i.info.hidden=!showInfo;i.info.textContent=section==='daily'?i.p.group:[numberCountry(i.p),brandOf(i.p)[0].replace(/\s*\([^)]*\)/g,''),i.p.style].join(' · ');
  i.tag.style.cssText=`bottom:calc(100% + 7px);width:${!showNames?g.pitchX*i.headingSpan-2:cardWidth}px;font-size:${!showNames?7:near?11:clamp(8+camera.t*4,8,11)}px;text-align:${near?'center':'left'}`;
  i.tag.style.whiteSpace='nowrap';
  if(i.tag.textContent){const range=document.createRange();range.selectNodeContents(i.tag);const width=range.getBoundingClientRect().width;if(width>i.tag.clientWidth)i.tag.style.fontSize=parseFloat(i.tag.style.fontSize)*i.tag.clientWidth/width+'px';}
  i.el.setAttribute('aria-current',String(i.p.id===lockedId));
  const src=i.art[quality+'Path'];if(i.img.dataset.quality!==quality){i.img.src=src;i.img.dataset.quality=quality;}
  needed=Math.max(needed,i.caption.getBoundingClientRect().height+i.tag.getBoundingClientRect().height+30+(!showInfo&&section==='fountain'&&sort==='brand'?22:0));
 }
 if(needed>clearance+1){clearance=needed;focus(target);bound(target);wake();}
 for(const m of rowMarkers){const rowItems=items.filter(i=>i.row===m.row),i=rowItems[0],p=point(i,g),font=clamp(8+camera.t*4,8,11),tagHeight=Math.max(...rowItems.map(i=>i.tag.getBoundingClientRect().height));m.el.hidden=showInfo||(g.narrow&&showBrands);m.el.style.cssText=`left:${p.x+camera.x-g.pitchX/2+4}px;top:${p.y+camera.y-g.h/2-(showBrands?tagHeight+14+font*1.3:17)}px;font-size:${font}px;line-height:1.3`;}
 const hint=$('#gesture-hint');hint.style.opacity=camera.t>.6?'0':'.35';
 if(moving)wake();
}
function build(keep=true){
 W=viewport.clientWidth;H=viewport.clientHeight;rows=visualRows();scene.replaceChildren();items=[];rowMarkers=[];clearance=95;
 rows.forEach((row,r)=>{let prev='';row.pens.forEach((p,c)=>{
  const art=window.PEN_ART[p.id],brand=brandOf(p)[0].replace(/\s*\([^)]*\)/g,''),group=row.groups.find(g=>g.pens.some(x=>x.id===p.id));
  const heading=section==='fountain'&&sort==='brand'?(brand!==prev?brand:''):(group.pens[0].id===p.id?group.name:'');prev=brand;
  const el=document.createElement('article');el.className='explore-pen';el.dataset.id=p.id;el.setAttribute('aria-label',p.name);el.tabIndex=0;
  const tag=document.createElement('span');tag.className='explore-tag';const photo=document.createElement('span');photo.className='pen-image';
  const img=new Image();img.className='pen-source';img.alt=p.name;img.draggable=false;img.decoding='async';img.style.cssText='width:100%;height:100%;left:0;top:0';photo.append(img);
  const caption=document.createElement('span');caption.className='explore-caption';const label=document.createElement('span');label.className='explore-label';const info=document.createElement('span');info.className='pen-info';caption.append(label,info);el.append(tag,photo,caption);scene.append(el);
  el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){lockedId=p.id;focus(target);wake();e.preventDefault()}};
  items.push({p,art,el,photo,img,label,tag,caption,info,heading,col:c-(row.pens.length-1)/2,row:r-(rows.length-1)/2});
 });});
 for(const row of rows){const entries=items.filter(i=>row.pens.some(p=>p.id===i.p.id));entries.forEach((i,n)=>{let end=n+1;while(end<entries.length&&!entries[end].heading)end++;i.headingSpan=end-n;});}
 if(section==='fountain'&&sort==='brand')rows.forEach((row,r)=>{const el=document.createElement('span');el.className='country-marker';el.textContent=row.name==='Italian + French'?'Italian (+ French)':row.name;scene.append(el);rowMarkers.push({el,row:r-(rows.length-1)/2})});
 if(!items.some(i=>i.p.id===lockedId))lockedId=items[0].p.id;
 if(!keep)target.t=1;
 if(opening){let low=0,high=1;for(let n=0;n<24;n++){const mid=(low+high)/2;if(geometry(mid).pitchX<W/3)low=mid;else high=mid;}target.t=(low+high)/2;opening=false;}
 focus(target);bound(target);Object.assign(camera,target);
 $('#classification').hidden=section!=='fountain';
 $$('[data-section]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.section===section)));
 $$('[data-sort]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sort===sort)));
 wake();
}
function setZoom(t){
 clearance=95;
 if(lockedId===null){const g=geometry(target.t);lockedId=[...items].sort((a,b)=>{const p=point(a,g),q=point(b,g);return Math.hypot(p.x+target.x-W/2,p.y+target.y-H*.43)-Math.hypot(q.x+target.x-W/2,q.y+target.y-H*.43)})[0]?.p.id??null;}
 const next=clamp(t,0,1);
 // Keep a deliberate, reachable full-width two-row view on desktop.
 target.t=W>760&&((target.t<.4&&next>.4)||(target.t>.4&&next<.4))?.4:next;
 if(target.t===0){target.x=target.y=0;}else focus(target);
 bound(target);wake();
}
viewport.addEventListener('wheel',e=>{e.preventDefault();const step=clamp(e.deltaY*(e.deltaMode===1?16:1),-160,160)*.00065;setZoom(target.t-step*(W<=760&&target.t>.55?.45:1));},{passive:false});
viewport.addEventListener('pointerdown',e=>{
 if(e.button!==0)return;viewport.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 gesture={x:e.clientX,y:e.clientY,ox:target.x,oy:target.y,t:target.t,moved:false,id:Number(e.target.closest('.explore-pen')?.dataset.id)||null};
 if(pointers.size===2){const [a,b]=[...pointers.values()];gesture.distance=Math.hypot(a.x-b.x,a.y-b.y);}
 viewport.classList.add('dragging');
});
viewport.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!gesture)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(pointers.size===2){const [a,b]=[...pointers.values()],d=Math.hypot(a.x-b.x,a.y-b.y);if(gesture.distance)setZoom(gesture.t+Math.log(d/gesture.distance)*.45);gesture.moved=true;}
 else{const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(Math.hypot(dx,dy)>5)gesture.moved=true;if(gesture.moved){lockedId=null;target.x=gesture.ox+dx;target.y=gesture.oy+dy;bound(target);wake();}}
});
function release(e){
 if(gesture&&!gesture.moved&&gesture.id){lockedId=gesture.id;focus(target);if(Date.now()-lastTap<330)setZoom(1);lastTap=Date.now();wake();}
 pointers.delete(e.pointerId);gesture=null;viewport.classList.remove('dragging');
}
viewport.addEventListener('pointerup',release);viewport.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);gesture=null;viewport.classList.remove('dragging')});
$$('[data-section]').forEach(b=>b.onclick=()=>{if(section===b.dataset.section)return;section=b.dataset.section;lockedId=section==='fountain'?(PENS.find(p=>p.name.includes('뒤마'))?.id||12):PENS.find(p=>p.section==='daily').id;history.replaceState(null,'','#'+section);build();});
$$('[data-sort]').forEach(b=>b.onclick=()=>{sort=b.dataset.sort;build();});
document.addEventListener('keydown',e=>{
 if($('#numbers').open||e.ctrlKey||e.altKey||e.metaKey)return;
 if(['+','=','-','Escape','Home'].includes(e.key)){e.preventDefault();setZoom(e.key==='-'?target.t-.08:e.key==='Escape'||e.key==='Home'?0:target.t+.08);}
 if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
  e.preventDefault();const current=items.find(i=>i.p.id===lockedId)||items.reduce((a,i)=>{const p=point(i,geometry(target.t));return Math.hypot(p.x+target.x-W/2,p.y+target.y-H*.43)<a.d?{i,d:Math.hypot(p.x+target.x-W/2,p.y+target.y-H*.43)}:a},{i:items[0],d:Infinity}).i;
  const vertical=e.key==='ArrowUp'||e.key==='ArrowDown',dir=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
  const candidates=items.filter(i=>vertical?(i.row-current.row)*dir>0:i.row===current.row&&(i.col-current.col)*dir>0);
  candidates.sort((a,b)=>vertical?Math.abs(a.row-current.row)*100+Math.abs(a.col-current.col)-Math.abs(b.row-current.row)*100-Math.abs(b.col-current.col):Math.abs(a.col-current.col)-Math.abs(b.col-current.col));
  if(candidates[0]){lockedId=candidates[0].p.id;focus(target);bound(target);wake();}
 }
});
function numberCountry(p){
 if(p.section==='fountain')return p.group==='Italian + French'?(p.name.startsWith('ST 듀퐁')?'French':'Italian'):p.group;
 const brand=brandOf(p)[0];if(['몽블랑','그라폰 파버카스텔','파버카스텔','라미','로트링'].includes(brand))return 'German';if(['크로스','파카'].includes(brand))return 'Anglosphere';if(brand==='비스콘티')return 'Italian';if(brand==='까렌다쉬')return 'Swiss';return 'Asian';
}
function numberContent(){
 const pens=PENS.filter(p=>p.section===section).sort((a,b)=>a.order-b.order),content=$('#number-content');content.replaceChildren();
 const counts=f=>{const m=new Map();for(const p of pens){const k=f(p);m.set(k,(m.get(k)||0)+1)}return[...m]};
 const styles=['Classic','Stripe','Colored','Marble','Wood','Sterling Silver','Demon','Modern Nib','Oriental','Holy'];
 const sections=[['나라별',counts(numberCountry)],...(section==='fountain'?[['스타일별',counts(p=>p.style).sort((a,b)=>styles.indexOf(a[0])-styles.indexOf(b[0]))]]:[['종류별',counts(p=>p.group)]]),['브랜드별',counts(p=>brandOf(p)[0].replace(/\s*\([^)]*\)/g,''))]];
 $('#number-total').textContent=(section==='fountain'?'Fountain Pen':'Pen & Pencil')+' · '+pens.length+'개';
 $('#number-sort').textContent=numberByCount?'위치 순':'개수 순';$('#number-sort').setAttribute('aria-pressed',String(numberByCount));
 for(const [title,original] of sections){const entries=numberByCount?[...original].sort((a,b)=>b[1]-a[1]):original;
  const s=document.createElement('section');s.className='number-section';const h=document.createElement('h3');h.textContent=title;const ul=document.createElement('ul');
  for(const [name,n] of entries){const li=document.createElement('li'),span=document.createElement('span');span.textContent=name;li.append(span);if(n>1){const strong=document.createElement('strong');strong.textContent=n;li.append(strong)}ul.append(li)}s.append(h,ul);content.append(s);
 }
}
$('#number').onclick=()=>{numberByCount=false;numberContent();$('#numbers').showModal()};$('#number-sort').onclick=()=>{numberByCount=!numberByCount;numberContent()};$('#close-numbers').onclick=()=>$('#numbers').close();
$('#numbers').addEventListener('click',e=>{if(e.target===$('#numbers')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)$('#numbers').close()}});
new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>build(),80)}).observe(viewport);
document.fonts.ready.then(()=>build());build();
window.PenExplorer={zoom:setZoom,build,select(id){lockedId=id;focus(target);wake()},get state(){return{...target,section,sort,lockedId,W,H,geometry:geometry(target.t),rows:rows.map(r=>r.pens.map(p=>p.id))}}};
