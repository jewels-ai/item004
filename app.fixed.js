// Debug / Fixed script - loads necklace image directly from provided Drive link
(function(){
  const VIDEO = document.getElementById('webcam');
  const CANVAS = document.getElementById('overlay');
  const CTX = CANVAS.getContext('2d');

  let necklaceImg = null;
  let smoothed = null;
  let camera = null;
  let sPoints = {};

  async function loadImage(src){
    return new Promise((resolve)=>{
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = ()=>resolve(img);
      img.onerror = (e)=>{ console.error('Image load failed', src, e); resolve(null); };
      img.src = src;
    });
  }

  async function changeJewelry(src){
    console.log('changeJewelry ->', src);
    const img = await loadImage(src);
    if(!img) return console.warn('Failed to load product image');
    necklaceImg = img;
    console.log('Necklace image loaded', img.width, img.height);
  }

  async function startCamera(facingMode='user'){
    try{
      if(window.Camera){
        camera = new Camera(VIDEO, { onFrame: async ()=>{ await faceMesh.send({ image: VIDEO }); }, width:1280, height:720, facingMode });
        camera.start();
        console.log('Started MediaPipe Camera');
        return;
      }
    }catch(e){ console.warn('MediaPipe Camera start failed', e); }

    // Fallback to getUserMedia
    try{
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio:false });
      VIDEO.srcObject = stream;
      await VIDEO.play();
      console.log('getUserMedia stream started');
      // feed frames to faceMesh manually
      (function frameLoop(){
        if(VIDEO.readyState >= 2) faceMesh.send({ image: VIDEO }).catch(e=>{});
        requestAnimationFrame(frameLoop);
      })();
    }catch(e){ alert('Camera error: ' + e.message); console.error(e); }
  }

  function smoothPoint(prev, cur, f=0.4){ if(!prev) return cur; return { x: prev.x*(1-f)+cur.x*f, y: prev.y*(1-f)+cur.y*f }; }

  function drawJewelry(faceLandmarks, ctx){
    const necklaceScale = 0.252;
    if(faceLandmarks && necklaceImg){
      const neck = faceLandmarks[152];
      let neckPos = { x: neck.x * CANVAS.width - 8, y: neck.y * CANVAS.height + 10 };
      sPoints.neck = smoothPoint(sPoints.neck, neckPos);
      const w = necklaceImg.width * necklaceScale;
      const h = necklaceImg.height * necklaceScale;
      ctx.clearRect(0,0,CANVAS.width,CANVAS.height);
      ctx.drawImage(necklaceImg, sPoints.neck.x - w/2, sPoints.neck.y, w, h);
    }
  }

  // MediaPipe setup
  const faceMesh = new FaceMesh({ locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file });
  faceMesh.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });
  faceMesh.onResults((results)=>{ 
    if(results.multiFaceLandmarks?.length > 0){ 
      const newL = results.multiFaceLandmarks[0];
      if(!smoothed) smoothed = newL;
      else { const factor = 0.2; smoothed = smoothed.map((p,i)=>({ x: p.x*(1-factor)+newL[i].x*factor, y: p.y*(1-factor)+newL[i].y*factor, z: p.z*(1-factor)+newL[i].z*factor })); }
    } else smoothed = null;
    drawJewelry(smoothed, CTX);
  });

  document.addEventListener('DOMContentLoaded', async ()=>{ 
    // Load product from the direct Drive URL provided
    await changeJewelry('https://drive.google.com/uc?export=view&id=1xsp1nzAWAeoPvxrlpT5hpRpw_-uziGx6');
    startCamera('user');
  });

  VIDEO.addEventListener('loadedmetadata', ()=>{ CANVAS.width = VIDEO.videoWidth; CANVAS.height = VIDEO.videoHeight; });
})();