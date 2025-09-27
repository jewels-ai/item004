(function(){
var v=document.getElementById('webcam'),c=document.getElementById('overlay'),x=c.getContext('2d'),nI=null,sFL=null,cam=null,sFP={};
function lI(s){return new Promise(function(r){var i=new Image();i.crossOrigin='anonymous';i.onload=function(){r(i)};i.onerror=function(e){console.error('img fail',s,e);r(null)};i.src=s;})}
async function cJ(s){console.log('load',s);var i=await lI(s);if(!i){console.warn('img failed')}else{nI=i;console.log('img ok',i.width,i.height)}}
async function sC(){try{if(window.Camera){cam=new Camera(v,{onFrame:async()=>{await fM.send({image:v})},width:1280,height:720,facingMode:'user'});cam.start();return;}}catch(e){console.warn(e);}
try{const stream=await navigator.mediaDevices.getUserMedia({video:true});v.srcObject=stream;await v.play();(function f(){if(v.readyState>=2)fM.send({image:v}).catch(()=>{});requestAnimationFrame(f);})();}catch(e){console.warn('camera fail',e)}
function sP(p,c,f=0.4){if(!p)return c;return{x:p.x*(1-f)+c.x*f,y:p.y*(1-f)+c.y*f}}
function dJ(fl,ctx){var scale=0.252;if(fl&&nI){var neck=fl[152];var pos={x:neck.x*c.width-8,y:neck.y*c.height+10};sFP.neck=sP(sFP.neck,pos);var w=nI.width*scale,h=nI.height*scale;ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(nI,sFP.neck.x-w/2,sFP.neck.y,w,h);}}
var fM=new FaceMesh({locateFile:function(f){return'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/'+f}});
fM.setOptions({maxNumFaces:1,refineLandmarks:true,minDetectionConfidence:0.6,minTrackingConfidence:0.6});
fM.onResults(function(r){if(r.multiFaceLandmarks?.length>0){var nl=r.multiFaceLandmarks[0];if(!sFL)sFL=nl;else{var factor=0.2;sFL=sFL.map(function(p,i){return{x:p.x*(1-factor)+nl[i].x*factor,y:p.y*(1-factor)+nl[i].y*factor,z:p.z*(1-factor)+nl[i].z*factor}});}}else sFL=null;dJ(sFL,x);});
document.addEventListener('DOMContentLoaded',function(){cJ('https://drive.google.com/uc?export=view&id=1xsp1nzAWAeoPvxrlpT5hpRpw_-uziGx6');sC();});
v.addEventListener('loadedmetadata',function(){c.width=v.videoWidth;c.height=v.videoHeight;});
})();