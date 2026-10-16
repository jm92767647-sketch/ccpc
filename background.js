const backgroundVideo=document.querySelector('#background-video');
if(backgroundVideo){
 backgroundVideo.muted=true;
 const playBackground=()=>{if(!document.hidden)backgroundVideo.play().catch(()=>{});};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)backgroundVideo.pause();else playBackground();});
 document.addEventListener('pointerdown',playBackground,{once:true,passive:true});
 playBackground();
}
