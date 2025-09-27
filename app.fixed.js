
(async function(){
'use strict';
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('overlay');
const canvasCtx = canvasElement.getContext('2d');
const jewelryOptions = document.getElementById('jewelry-options');

let necklaceImg = null;
let smoothedFaceLandmarks = null, camera;
let smoothedFacePoints = {};

// GOOGLE DRIVE CONFIG (only gold necklaces kept)
const API_KEY = "AIzaSyCOkk8w6DyEp5lwdm5DjECSo-c2Xitw9vI"; 
const driveFolders = {
  gold_necklaces: "1yiCBSMk4HpxxZcPf2AQeQeAKMcNNQNxt",
};

async function fetchDriveImages(folderId) {
  try {
    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${API_KEY}&fields=files(id,name,mimeType)`;
    console.log('fetchDriveImages url', url);
    const res = await fetch(url);
    if(!res.ok) { console.error('Drive API response not ok', res.status, await res.text()); return []; }
    const data = await res.json();
    if (!data.files) return [];
    return data.files.filter(f=>f.mimeType.includes("image/"))
      .map(f => ({ id:f.id, name:f.name, src:`https://drive.google.com/thumbnail?id=${f.id}&sz=w1000` }));
  } catch (e) {
    console.error('fetchDriveImages error', e);
    return [];
  }
}

async function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => { console.warn('image load error', src, err); resolve(null); };
    img.src = src;
  });
}

async function changeJewelry(src) {
  const img = await loadImage(src);
  if (!img) { console.warn('changeJewelry: image null for', src); return; }
  necklaceImg = img;
  console.log('Loaded necklace image', img);
}

// Load first gold necklace automatically on page load
async function autoLoadJewelry() {
  const images = await fetchDriveImages(driveFolders.gold_necklaces);
  console.log('autoLoadJewelry images', images);
  if (images.length > 0) {
    const file = images[0];
    await changeJewelry(file.src);
  } else {
    console.warn('No images found in Drive folder or fetch failed.');
  }
}

function setupFaceMesh() {
  const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
  faceMesh.setOptions({ maxNumFaces:1, refineLandmarks:true, minDetectionConfidence:0.6, minTrackingConfidence:0.6 });
  faceMesh.onResults((results) => {
    canvasCtx.clearRect(0,0,canvasElement.width,canvasElement.height);
    if (results.multiFaceLandmarks?.length>0) {
      const newLandmarks = results.multiFaceLandmarks[0];
      if (!smoothedFaceLandmarks) smoothedFaceLandmarks = newLandmarks;
      else {
        const factor=0.2;
        smoothedFaceLandmarks = smoothedFaceLandmarks.map((prev,i)=>({
          x: prev.x*(1-factor)+newLandmarks[i].x*factor,
          y: prev.y*(1-factor)+newLandmarks[i].y*factor,
          z: prev.z*(1-factor)+newLandmarks[i].z*factor,
        }));
      }
    } else smoothedFaceLandmarks = null;
    drawJewelry(smoothedFaceLandmarks, canvasCtx);
  });
  return faceMesh;
}

async function startCameraWithMediapipe(faceMesh, facingMode='user') {
  try {
    if (camera) camera.stop();
    camera = new Camera(videoElement, {
      onFrame: async () => { await faceMesh.send({ image: videoElement }); },
      width:1280, height:720, facingMode:facingMode
    });
    camera.start();
    console.log('Mediapipe Camera started');
  } catch (e) {
    console.warn('Mediapipe Camera failed, falling back to getUserMedia', e);
    await startCameraFallback();
  }
}

async function startCameraFallback() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}, audio:false});
    videoElement.srcObject = stream;
    await videoElement.play();
    console.log('getUserMedia stream started');
    // If mediapipe faceMesh exists, we still need to send frames to it. Use requestAnimationFrame loop.
    if (typeof FaceMesh !== 'undefined') {
      const faceMesh = setupFaceMesh();
      async function tick(){
        await faceMesh.send({image: videoElement});
        requestAnimationFrame(tick);
      }
      tick();
    }
  } catch (e) {
    console.error('getUserMedia failed', e);
    alert('Camera access failed. Ensure you are serving the page over https or localhost and have granted camera permission.');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await autoLoadJewelry(); // load product immediately
  if (typeof FaceMesh === 'undefined' || typeof Camera === 'undefined') {
    console.warn('Mediapipe FaceMesh or Camera not loaded. Make sure CDN scripts loaded.');
    // still attempt getUserMedia fallback
    await startCameraFallback();
    return;
  }
  const faceMesh = setupFaceMesh();
  startCameraWithMediapipe(faceMesh,'user');
});

videoElement.addEventListener('loadedmetadata', () => {
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
});

function smoothPoint(prev, current, factor = 0.4) {
  if (!prev) return current;
  return { x: prev.x*(1-factor)+current.x*factor, y: prev.y*(1-factor)+current.y*factor };
}

function drawJewelry(faceLandmarks, ctx) {
  const necklaceScale = 0.252;
  if (faceLandmarks && necklaceImg) {
    const neck = faceLandmarks[152];
    let neckPos = { x:neck.x*canvasElement.width-8, y:neck.y*canvasElement.height+10 };
    smoothedFacePoints.neck = smoothPoint(smoothedFacePoints.neck, neckPos);
    const w=necklaceImg.width*necklaceScale, h=necklaceImg.height*necklaceScale;
    ctx.drawImage(necklaceImg, smoothedFacePoints.neck.x-w/2, smoothedFacePoints.neck.y, w,h);
  }
}
})();