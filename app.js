import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';
import { OrbitControls } from './OrbitControls.js';

const sceneEl = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
sceneEl.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#72a7b6');
scene.fog = new THREE.FogExp2('#79aabb', 0.019);
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 180);
camera.position.set(12.4, 7.1, 15.7);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .045;
controls.target.set(0, 2.1, 0);
controls.minDistance = 8;
controls.maxDistance = 26;
controls.maxPolarAngle = Math.PI * .47;
controls.minPolarAngle = Math.PI * .19;
controls.enablePan = false;

const clock = new THREE.Clock();
const tau = Math.PI * 2;
const C = { cream: 0xffedc6, feather: 0xf5e5bf, shadow:0xd8bf91, beak:0xff803b, beakDark:0xc74f30, blue:0x12364b, metal:0x193b4d, tire:0x16232b, road:0x294750, grass:0x437e6a, sand:0xd8bf8f };
const mat = (color, roughness=.7, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
const cream = mat(C.cream), feather = mat(C.feather), shade = mat(C.shadow), beak = mat(C.beak,.55), beakDark=mat(C.beakDark,.6), dark=mat(C.blue,.55), metal=mat(C.metal,.36,.68), tire=mat(C.tire,.86), roadMat=mat(C.road,.95), grassMat=mat(C.grass,.92), sandMat=mat(C.sand,.98);

// light & morning haze
const hemi = new THREE.HemisphereLight(0xb6e7ee, 0x314838, 1.45); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe1a1, 3.3); sun.position.set(-14,18,4); sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-16; sun.shadow.camera.right=16; sun.shadow.camera.top=16; sun.shadow.camera.bottom=-16; scene.add(sun);
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(2.25,32,16), new THREE.MeshBasicMaterial({color:0xffd899,transparent:true,opacity:.91})); sunDisc.position.set(-18,13,-28);scene.add(sunDisc);

function mesh(geo, material, parent, opts={}) { const m = new THREE.Mesh(geo,material); if(parent) parent.add(m); m.castShadow=opts.cast ?? true;m.receiveShadow=opts.receive ?? true; return m; }
function cylinder(r1,r2,h,material,parent,pos=[0,0,0],rot=[0,0,0]){ const m=mesh(new THREE.CylinderGeometry(r1,r2,h,12),material,parent);m.position.set(...pos);m.rotation.set(...rot);return m; }
function sphere(x,y,z,material,parent,pos=[0,0,0],scale=[1,1,1]){ const m=mesh(new THREE.SphereGeometry(x,y,z),material,parent);m.position.set(...pos);m.scale.set(...scale);return m; }

// ocean shader
const oceanGeo = new THREE.PlaneGeometry(180, 90, 100, 45); oceanGeo.rotateX(-Math.PI/2); oceanGeo.translate(-17,-.21,-16);
const oceanMat = new THREE.ShaderMaterial({ uniforms:{ time:{value:0}, deep:{value:new THREE.Color('#0e5264')}, light:{value:new THREE.Color('#4c9fb2')} }, vertexShader:`varying vec2 vUv; uniform float time; void main(){vUv=uv; vec3 p=position; p.y += sin(p.x*.21 + time*.72)*.12 + sin(p.z*.37 + time*.53)*.07; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`, fragmentShader:`varying vec2 vUv; uniform vec3 deep; uniform vec3 light; void main(){float c=smoothstep(.0,1.,vUv.y); gl_FragColor=vec4(mix(deep,light,c),1.);}` }); scene.add(new THREE.Mesh(oceanGeo,oceanMat));

// shore and road
const ground = mesh(new THREE.PlaneGeometry(110,95), grassMat); ground.rotation.x=-Math.PI/2; ground.position.set(15,-.28,8); ground.receiveShadow=true;
const beach = mesh(new THREE.PlaneGeometry(40,90), sandMat); beach.rotation.x=-Math.PI/2; beach.position.set(-5,-.255,2); beach.receiveShadow=true;
// curved sea road ribbon
const roadCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-17,0,-7),new THREE.Vector3(-9,0,-3),new THREE.Vector3(0,0,0),new THREE.Vector3(10,0,2),new THREE.Vector3(22,0,-1)]);
const pts=roadCurve.getPoints(90), verts=[];
for(let i=0;i<pts.length;i++){const p=pts[i], next=pts[Math.min(i+1,pts.length-1)], prev=pts[Math.max(i-1,0)]; const tangent=next.clone().sub(prev).normalize(); const side=new THREE.Vector3(-tangent.z,0,tangent.x).multiplyScalar(2.2); verts.push(p.x+side.x,.015,p.z+side.z,p.x-side.x,.015,p.z-side.z);}
const indices=[];for(let i=0;i<pts.length-1;i++)indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
const roadGeo=new THREE.BufferGeometry();roadGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));roadGeo.setIndex(indices);roadGeo.computeVertexNormals();scene.add(mesh(roadGeo,roadMat));
// dashed centre line
for(let i=6;i<83;i+=9){const p=roadCurve.getPoint(i/90),t=roadCurve.getTangent(i/90),dash=mesh(new THREE.BoxGeometry(.85,.016,.055),mat(0xf5e8c5),null,{cast:false});dash.position.set(p.x,.03,p.z);dash.rotation.y=-Math.atan2(t.z,t.x);scene.add(dash)}

// rocky coast
function rock(pos,s, color=0x56726d){const r=sphere(1,12,8,mat(color,.95),scene,pos,[s*1.6,s*.65,s]);r.rotation.set(Math.random()*.4,Math.random()*tau,Math.random()*.3);return r}
[[[-13,-.02,10],2.3],[[-10,-.02,13],1.5],[[-16,-.04,3],1.6],[[16,-.1,11],2.8],[[21,-.1,7],1.7],[[12,-.12,13],1.2]].forEach(([p,s])=>rock(p,s));
function grassTuft(x,z,s=1){const g=new THREE.Group();g.position.set(x,0,z);for(let i=0;i<5;i++){const blade=mesh(new THREE.ConeGeometry(.03*s,.6*s,4),mat(i%2?0x3f8069:0x639b72),g);blade.position.set((Math.random()-.5)*s*.35,.3*s,(Math.random()-.5)*s*.35);blade.rotation.z=(Math.random()-.5)*.55}scene.add(g)}
for(let i=0;i<60;i++)grassTuft(2+Math.random()*28,-9+Math.random()*31,.35+Math.random()*.85);
// lighthouse
const lighthouse=new THREE.Group();lighthouse.position.set(12,0,-8);cylinder(.7,1.1,5,mat(0xf2e4c8),lighthouse,[0,2.5,0]);cylinder(1.16,1.16,.25,beakDark,lighthouse,[0,4.3,0]);const lamp=cylinder(.7,.7,.65,mat(0xffd977,.3,.2),lighthouse,[0,4.7,0]);cylinder(.86,.86,.16,dark,lighthouse,[0,5.05,0]);const roof=mesh(new THREE.ConeGeometry(1.05,.65,10),dark,lighthouse);roof.position.y=5.42;scene.add(lighthouse);

// Bicycle
const bike = new THREE.Group(); bike.position.set(0,.25,0);bike.rotation.y=-.1; scene.add(bike);
function wheel(x){const w=new THREE.Group();w.position.set(x,.87,0);w.rotation.y=Math.PI/2;const rim=mesh(new THREE.TorusGeometry(.78,.045,8,32),tire,w);const hub=mesh(new THREE.SphereGeometry(.09,10,8),metal,w);for(let a=0;a<10;a++){const spoke=mesh(new THREE.CylinderGeometry(.012,.012,.72,5),metal,w);spoke.rotation.z=a*tau/10;spoke.position.y=0; }bike.add(w);return w}
const rearWheel=wheel(-1.18), frontWheel=wheel(1.18);
function tube(a,b,r=.055,material=metal){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),d=bv.clone().sub(av),m=mesh(new THREE.CylinderGeometry(r,r,d.length(),8),material,bike);m.position.copy(av.clone().add(bv).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m}
const crank=[-.18,.91,0], seat=[-.43,1.75,0], steer=[.82,1.67,0];
tube([-1.18,.87,0],crank);tube(crank,seat);tube(seat,[-1.18,.87,0]);tube(crank,[1.18,.87,0]);tube([1.18,.87,0],steer);tube(steer,seat);tube(seat,[-.52,1.98,0],.042);const saddle=mesh(new THREE.BoxGeometry(.52,.1,.24),dark,bike);saddle.position.set(-.62,2.02,0);saddle.rotation.z=.08;tube(steer,[.98,1.92,0],.038);const handle=mesh(new THREE.TorusGeometry(.27,.035,6,12,Math.PI),metal,bike);handle.position.set(1.0,1.91,0);handle.rotation.y=Math.PI/2;handle.rotation.z=Math.PI/2;
const gear=mesh(new THREE.TorusGeometry(.17,.04,6,18),beak,bike);gear.position.set(...crank);gear.rotation.y=Math.PI/2;const pedals=new THREE.Group();pedals.position.set(...crank);bike.add(pedals);const pedalAx=mesh(new THREE.CylinderGeometry(.025,.025,.55,6),metal,pedals);pedalAx.rotation.z=Math.PI/2;[-.36,.36].forEach(x=>{const p=mesh(new THREE.BoxGeometry(.25,.05,.12),dark,pedals);p.position.x=x});

// Pelican rider
const bird=new THREE.Group();bird.position.set(-.1,2.33,0);bird.rotation.y=.06;bike.add(bird);
const body=sphere(1,20,16,feather,bird,[-.18,.2,0],[1.05,1.36,.74]);body.rotation.z=.18;
const belly=sphere(1,18,12,cream,bird,[.1,.22,-.16],[.76,1.07,.59]);
const neck=sphere(1,16,12,feather,bird,[.4,1.33,0],[.44,1.21,.42]);neck.rotation.z=-.30;
const head=sphere(1,20,14,cream,bird,[.78,2.25,0],[.62,.59,.52]);
// eye sides
[-1,1].forEach(side=>{const eye=mesh(new THREE.SphereGeometry(.095,12,10),dark,bird);eye.position.set(1.12,2.39,side*.38);const glint=mesh(new THREE.SphereGeometry(.027,8,8),mat(0xffffff),bird);glint.position.set(1.18,2.43,side*.4)});
// beak + pouch (sideways 3d long)
const upper=mesh(new THREE.ConeGeometry(.33,1.55,4),beak,bird);upper.position.set(1.68,2.17,0);upper.rotation.z=-Math.PI/2;upper.rotation.y=Math.PI/4;upper.scale.y=.55;
const pouch=sphere(1,18,12,beak,bird,[1.58,1.94,0],[.75,.34,.34]);pouch.rotation.z=-.12;
const beakTip=mesh(new THREE.ConeGeometry(.22,.42,4),beakDark,bird);beakTip.position.set(2.26,2.18,0);beakTip.rotation.z=-Math.PI/2;beakTip.rotation.y=Math.PI/4;
// wings
function wing(side){const w=new THREE.Group();w.position.set(-.4,.42,side*.42);w.rotation.x=side*.1; const main=sphere(1,18,10,shade,w,[0,-.02,side*.12],[.73,1.15,.2]);main.rotation.z=side*.65;for(let i=0;i<4;i++){const f=mesh(new THREE.ConeGeometry(.11,.88-i*.06,5),feather,w);f.position.set(-.28-i*.08,-.32-i*.1,side*.12);f.rotation.z=side*(.4+i*.08)}bird.add(w);return w}const wingL=wing(1),wingR=wing(-1);
// legs / feet on pedals
function leg(side){const upper=new THREE.Group();upper.position.set(-.08,-.55,side*.29);bird.add(upper);const thigh=cylinder(.075,.1,.78,beak,upper,[.12,-.35,0],[0,0,side*.15]);thigh.rotation.z=-.45;const shin=cylinder(.06,.075,.72,beak,upper,[.38,-.84,0]);shin.rotation.z=.7;const foot=mesh(new THREE.BoxGeometry(.42,.08,.14),beak,upper);foot.position.set(.6,-1.14,0);return upper}const legL=leg(1),legR=leg(-1);

// basket and fish
const basket=mesh(new THREE.CylinderGeometry(.4,.32,.48,12,1,true),mat(0xbd8b5a),bike);basket.position.set(1.1,1.24,0);basket.rotation.z=-.08;for(let i=0;i<3;i++){const fish=mesh(new THREE.SphereGeometry(.1,10,6),mat(0x75aeba),bike);fish.scale.set(1.6,.65,.65);fish.position.set(.97+i*.13,1.52,(i-1)*.13)}

// clouds & background flying birds
function cloud(x,y,z,s){const g=new THREE.Group();g.position.set(x,y,z);for(let i=0;i<4;i++)sphere(1,12,8,new THREE.MeshBasicMaterial({color:0xf9e5c6,transparent:true,opacity:.38}),g,[i*s*.58,Math.sin(i)*s*.12,0],[s*(.8+i%2*.25),s*.38,s*.4]);scene.add(g)}cloud(-12,9,-23,2.8);cloud(6,12,-28,2.1);cloud(-3,7,-21,1.5);
const flyers=[];function flyer(x,y,z,scale){const g=new THREE.Group();g.position.set(x,y,z);for(const side of [-1,1]){const w=mesh(new THREE.ConeGeometry(.07,.66,3),new THREE.MeshBasicMaterial({color:0x24485a}),g);w.rotation.z=side*.94;w.position.x=side*.25}scene.add(g);flyers.push({g,offset:Math.random()*tau,scale})}flyer(-6,7,-12,1);flyer(-2,8,-18,.7);flyer(4,6,-13,.55);

// interaction / animation
let cruising=false, audioOn=false, audioCtx, oceanNoise, startTime=0;
const toast=document.querySelector('#toast');
function showToast(s){toast.textContent=s;toast.classList.add('show');clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.remove('show'),1800)}
function toggleCruise(){cruising=!cruising; document.querySelector('#rideButton span:nth-child(2)').textContent=cruising?'暂停巡航':'开始巡航';showToast(cruising?'海岸巡航已启动':'巡航已暂停');}
function toggleSound(){audioOn=!audioOn;document.querySelector('#soundToggle').classList.toggle('active',audioOn);document.querySelector('#soundToggle').setAttribute('aria-pressed',audioOn);if(audioOn){ if(!audioCtx){audioCtx=new AudioContext(); const size=audioCtx.sampleRate*2, buf=audioCtx.createBuffer(1,size,audioCtx.sampleRate),d=buf.getChannelData(0);for(let i=0;i<size;i++)d[i]=(Math.random()*2-1)*.22; oceanNoise=audioCtx.createBufferSource();oceanNoise.buffer=buf;oceanNoise.loop=true;const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=440;const gain=audioCtx.createGain();gain.gain.value=.055;oceanNoise.connect(filter).connect(gain).connect(audioCtx.destination);oceanNoise.start(); } audioCtx.resume();showToast('声景：轻浪与海风'); }else{audioCtx?.suspend();showToast('声景已静音');}}
document.querySelector('#rideButton').addEventListener('click',toggleCruise);document.querySelector('#soundToggle').addEventListener('click',toggleSound);
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();toggleCruise()} if(e.key.toLowerCase()==='s')toggleSound()});

function animate(){requestAnimationFrame(animate);const t=clock.getElapsedTime(); oceanMat.uniforms.time.value=t;const pedal=t*(cruising?5.1:1.55);pedals.rotation.z=-pedal;legL.rotation.z=Math.sin(pedal)*.49;legR.rotation.z=Math.sin(pedal+Math.PI)*.49;rearWheel.rotation.x=-pedal*.38;frontWheel.rotation.x=-pedal*.38;bike.position.y=.25+Math.sin(t*2.5)*.025;bird.rotation.z=Math.sin(t*2.5)*.018;wingL.rotation.z=.12+Math.sin(t*1.6)*.035;wingR.rotation.z=-.12-Math.sin(t*1.6)*.035;flyers.forEach((b,i)=>{b.g.position.y+=Math.sin(t*3+b.offset)*.002;b.g.rotation.z=Math.sin(t*4+b.offset)*.2;b.g.position.x+=Math.sin(t*.3+i)*.002});
 if(cruising){controls.target.lerp(new THREE.Vector3(.2,2.1,0),.02); camera.position.x += (12.9+Math.sin(t*.23)*.7-camera.position.x)*.006; camera.position.z += (15+Math.cos(t*.23)*.6-camera.position.z)*.006;}
 document.querySelector('#speedValue').textContent=(cruising?20.1+Math.sin(t*1.2)*1.1:18.4+Math.sin(t*.7)*.2).toFixed(1);document.querySelector('#routeValue').textContent=(8.2-(cruising?(t-startTime)*.008:0)).toFixed(1).padStart(4,'0');controls.update();renderer.render(scene,camera)}
setTimeout(()=>document.querySelector('#loading').classList.add('hide'),900);startTime=clock.getElapsedTime();animate();
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
