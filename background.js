const backdrop=document.querySelector('.site-backdrop');
const canvas=document.createElement('canvas');canvas.className='ambient-canvas';canvas.setAttribute('aria-hidden','true');backdrop.appendChild(canvas);
const context=canvas.getContext('2d',{alpha:false});
const calm=matchMedia('(prefers-reduced-motion:reduce)');
const colors=['#cddff9','#e8e2fc','#cdeae9','#deebfc','#cde8ef','#f6f3fe','#d8eeec'];
const radii=[[.4,.3],[.44,.5],[.45,.45],[.33,.48],[.5,.65],[.32,.3],[.42,.48]];
const initial=[[50,50],[28,28],[-50,50],[-50,0],[50,-50],[0,-50],[-50,-50]];
let width=0,height=0,frame=0,lastPaint=0;
let glassCards=[],glassDirty=true,lastGlassPaint=0;
function refreshGlass(){glassCards=[...document.querySelectorAll('#scene .pen')].map(element=>({element,rect:element.getBoundingClientRect()}));glassDirty=false;}
function shineGlass(lights,now){
 if(now-lastGlassPaint<(innerWidth<=1000?200:100)&&!glassDirty)return;lastGlassPaint=now;
 if(glassDirty)refreshGlass();
 if(document.body.dataset.level==='3')return;
 for(const {element,rect} of glassCards){
  if(rect.bottom<0||rect.top>height||!rect.width||!rect.height)continue;
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
  let power=0,source=lights[0];
  for(const light of lights){const distance=Math.hypot((cx-light.x)/(width*.23),(cy-light.y)/(height*.3)),strength=Math.exp(-distance*distance*1.6)*light.weight;if(strength>power){power=strength;source=light;}}
  element.style.setProperty('--glass-light',power.toFixed(3));
  element.style.setProperty('--glass-x',Math.max(0,Math.min(100,(source.x-rect.left)/rect.width*100)).toFixed(1)+'%');
  element.style.setProperty('--glass-y',Math.max(0,Math.min(100,(source.y-rect.top)/rect.height*100)).toFixed(1)+'%');
 }
}
new MutationObserver(()=>{glassDirty=true;}).observe(document.querySelector('#scene'),{childList:true,subtree:true});
window.addEventListener('scroll',()=>{glassDirty=true;},{passive:true,capture:true});
window.addEventListener('resize',()=>{glassDirty=true;});
const states=initial.map((point,i)=>({from:point,to:point,middle:point,start:0,duration:0,index:i}));
function next(state,now){
 const violet=state.index===1,opposite=v=>v===0?(Math.random()<.5?-1:1):-Math.sign(v),distance=()=>violet?20+Math.random()*10:42+Math.random()*16;
 state.from=state.to;state.to=[opposite(state.from[0])*distance(),opposite(state.from[1])*distance()];
 const dx=state.to[0]-state.from[0],dy=state.to[1]-state.from[1],length=Math.hypot(dx,dy),bend=(Math.random()<.5?-1:1)*(4+Math.random()*6);
 state.middle=[(state.from[0]+state.to[0])/2-dy/length*bend,(state.from[1]+state.to[1])/2+dx/length*bend];
 if(violet)state.middle=state.middle.map(v=>Math.max(-30,Math.min(30,v)));
 state.start=now;state.duration=violet?9000+Math.random()*5000:16000+Math.random()*12000;
}
function resize(){width=backdrop.clientWidth;height=backdrop.clientHeight;canvas.width=width;canvas.height=height;paint(performance.now());}
function paint(now){
 if(!context||!width||!height)return;
 context.fillStyle='#fdfdff';context.fillRect(0,0,width,height);
 const lights=[];
 for(const i of [0,2,3,4,5,6,1]){
  const state=states[i];if(!state.duration)next(state,now);if(!calm.matches&&now-state.start>=state.duration)next(state,now);
  const t=calm.matches?0:Math.min(1,(now-state.start)/state.duration),e=(1-Math.cos(t*Math.PI))/2;
  const a=e<.5?state.from:state.middle,b=e<.5?state.middle:state.to,k=e<.5?e*2:(e-.5)*2;
  const point=calm.matches?initial[i]:[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];
  const scale=i===1&&!calm.matches?.9+.85*Math.sin(t*Math.PI):1;
  if(i===1||i===2||i===4)lights.push({x:width*(.5+point[0]/100),y:height*(.5+point[1]/100),weight:i===1?1:.65});
  const [rx,ry]=radii[i];context.save();context.translate(width*(.5+point[0]/100),height*(.5+point[1]/100));context.scale(width*rx*scale,height*ry*scale);
  const gradient=context.createRadialGradient(0,0,0,0,0,1);gradient.addColorStop(0,colors[i]);gradient.addColorStop(1,colors[i]+'00');context.fillStyle=gradient;context.fillRect(-1,-1,2,2);context.restore();
 }
 shineGlass(lights,now);
}
function tick(now){if(document.hidden||calm.matches){frame=0;return;}if(now-lastPaint>=(innerWidth<=1000?100:50)){paint(now);lastPaint=now;}frame=requestAnimationFrame(tick);}
function resume(){cancelAnimationFrame(frame);frame=0;paint(performance.now());if(!document.hidden&&!calm.matches)frame=requestAnimationFrame(tick);}
if(context){backdrop.classList.add('canvas-background');window.addEventListener('resize',resize);document.addEventListener('visibilitychange',resume);if(calm.addEventListener)calm.addEventListener('change',resume);else calm.addListener(resume);resize();resume();}
