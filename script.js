const game = document.getElementById("game");
const chicken = document.getElementById("chicken");
const swan = document.getElementById("swan");
const apple = document.getElementById("apple");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayHighscore = document.getElementById("overlayHighscore");
const scoreEl = document.getElementById("score");
const levelEl = document.getElementById("level");
const timerEl = document.getElementById("timer");

let mouseX = innerWidth / 2;
let mouseY = innerHeight / 2;

let chickenX, chickenY;
let swanX, swanY;

let chickenR = 12;
let chickenSpeed = 3.0;
let swanBaseSpeed = 1.5;

let swanWidth = 40;
let swanHeight = 80;
let swanVX = 0;
let swanVY = 0;

let score = 0;
let highscore = Number(localStorage.getItem("highscore") || 0);

let running = false;
let walkTime = 0;

let level = 1;
let timeLeft = 20;
let levelInterval;

const waters = [];
const sands = [];
const trees = [];
const flowers = [];
const apples = []; // Array für mehrere Äpfel
const MAX_APPLES = 5;
const SWAN_AVOID_DISTANCE = 80; // wie früh der Schwan ausweicht
const SWAN_AVOID_FORCE = 1.5;  // wie stark er ausweicht
const SWAN_SMOOTHING = 0.15; // kleiner Wert = weichere Bewegung


document.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

/* ---------- START ---------- */
function showStart() {
  overlay.style.display = "flex";
  overlayText.innerHTML = `chick&run<br>starting game`;
  overlayText.style.fontSize = "64px";
  overlayHighscore.innerHTML = `Highscore: ${highscore}`;

  if(flowers.length === 0) spawnFlowers(60);

  setTimeout(() => {
    overlay.style.display = "none";
    overlayHighscore.innerHTML = "";
    startGame();
  }, 3000);
}

/* ---------- START GAME ---------- */
function startGame() {
  running = true;

  chickenX = mouseX;
  chickenY = mouseY;

  swanX = mouseX < innerWidth / 2 ? innerWidth - 150 : 150;
  swanY = mouseY < innerHeight / 2 ? innerHeight - 150 : 150;

  chicken.style.width = chickenR*2 + "px";
  chicken.style.height = chickenR*2 + "px";
  chicken.style.backgroundColor = "gold";
  chicken.style.borderRadius = "50%";

  swanWidth = 40;
  swanHeight = 80;
  swan.style.width = swanWidth + "px";
  swan.style.height = swanHeight + "px";
  swan.style.backgroundColor = "white";
  swan.style.borderRadius = "20px";

  clearEnvironment();
  spawnEnvironmentLevel(level);
  spawnFlowers(60);
  spawnApples(true);


  chickenR = 12;
  chickenSpeed = 3.0;

  startLevelTimer();
  requestAnimationFrame(loop);
}

/* ---------- LEVEL TIMER ---------- */
function startLevelTimer() {
  timeLeft = 30;
  timerEl.textContent = timeLeft;

  clearInterval(levelInterval);
  levelInterval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = timeLeft;

    if (timeLeft <= 0) {
    clearInterval(levelInterval);
    running = false;

    overlay.style.display = "flex";
    overlayText.innerHTML = `LEVEL COMPLETE!<br>Score: ${score}`;
    overlayText.style.fontSize = "48px";

    level++;
    levelEl.textContent = level;

    setTimeout(() => {
        overlay.style.display = "none";
        running = true;
        clearEnvironment();
        spawnEnvironmentLevel(level);
        swanX = mouseX < innerWidth / 2 ? innerWidth - 150 : 150;
        swanY = mouseY < innerHeight / 2 ? innerHeight - 150 : 150;
        spawnApples(true);
        spawnFlowers(60);
        timeLeft = 30;
        startLevelTimer();
        requestAnimationFrame(loop);
    }, 2000); // 2 Sekunden Overlay
}
  }, 1000);
}

/* ---------- LOOP ---------- */
function loop(){
  if(!running) return;

  walkTime += 0.05;
  const jump = Math.sin(walkTime)*3;

  // Score + Timer
  scoreEl.textContent = `Score: ${score}`;
  timerEl.textContent = timeLeft;

  // Küken Bewegung
  let speed = chickenSpeed;
  if(waters.some(w=>Math.hypot(chickenX-w.x, chickenY-w.y)<w.r)) speed*=0.3;
  if(sands.some(s=>Math.hypot(chickenX-s.x, chickenY-s.y)<s.r)) speed*=0.6;

  const dx = mouseX - chickenX;
  const dy = mouseY - chickenY;
  const len = Math.hypot(dx, dy);
  if(len>0){ chickenX += (dx/len)*speed; chickenY += (dy/len)*speed; }
  // 🌳 Huhn kollidiert mit Bäumen
trees.forEach(t => {
  const dx = chickenX - t.x;
  const dy = chickenY - t.y;
  const dist = Math.hypot(dx, dy);

  const minDist = chickenR + t.r;

  if (dist < minDist && dist > 0) {
    const pushX = dx / dist;
    const pushY = dy / dist;

    // sanftes Zurückschieben
    chickenX = t.x + pushX * minDist;
    chickenY = t.y + pushY * minDist;
  }
});

  chicken.style.left = chickenX - chickenR + "px";
  chicken.style.top = chickenY - chickenR + jump + "px";

  // Zielrichtung inkl. Baum-Ausweichung
let vx = chickenX - swanX;
let vy = chickenY - swanY;
let vlen = Math.hypot(vx, vy);
if (vlen > 0) {
  vx /= vlen;
  vy /= vlen;
}

let spd = swanBaseSpeed;

// schneller im Wasser
const nearWater = waters.some(
  w => Math.hypot(swanX - w.x, swanY - w.y) < w.r + 80
);
if (nearWater) spd *= 2;

// 🌳 Baum-Ausweichlogik
let avoidX = 0;
let avoidY = 0;

trees.forEach(t => {
  const dx = t.x - swanX;
  const dy = t.y - swanY;
  const dist = Math.hypot(dx, dy);

  if (dist < SWAN_AVOID_DISTANCE + t.r) {
    const dot = dx * vx + dy * vy;
    if (dot > 0) {
      avoidX += -dy / dist;
      avoidY += dx / dist;
    }
  }
});

// Ziel + Ausweichen mischen
vx += avoidX * SWAN_AVOID_FORCE;
vy += avoidY * SWAN_AVOID_FORCE;

// Richtung normalisieren
let finalLen = Math.hypot(vx, vy);
if (finalLen > 0) {
  vx /= finalLen;
  vy /= finalLen;
}

// 🌊 Bewegung mit gleitender Geschwindigkeit (smooth)
swanVX += (vx * spd - swanVX) * SWAN_SMOOTHING;
swanVY += (vy * spd - swanVY) * SWAN_SMOOTHING;

swanX += swanVX;
swanY += swanVY;

swan.style.left = swanX - swanWidth / 2 + "px";
swan.style.top = swanY - swanHeight / 2 + "px";



  // Apfel sammeln
for (let i = apples.length - 1; i >= 0; i--) {
  const a = apples[i];
  const d = Math.hypot(chickenX - a.x, chickenY - a.y);
  if (d < chickenR + 8) { // Apfelgröße ~16px
    score++;
    chickenR += 0.1;
    chickenSpeed += 0.005;

    chicken.style.width = chickenR*2 + "px";
    chicken.style.height = chickenR*2 + "px";

    // Apfel entfernen
    a.div.remove();
    apples.splice(i, 1);

    spawnApples(false);
  }
}


  // Schwan-Kollision
  if(Math.hypot(chickenX-swanX, chickenY-swanY)<chickenR+30) gameOver();

  requestAnimationFrame(loop);
}

/* ---------- GAME OVER ---------- */
function gameOver(){
  running=false;
  overlay.style.display = "flex";
  overlayText.innerHTML = `GAME OVER<br>Score: ${score}`;
  overlayText.style.fontSize="64px";
  overlayHighscore.innerHTML="";

  if(score>highscore){ highscore=score; localStorage.setItem("highscore",highscore); }

  setTimeout(()=>{
    score=0; level=1; chickenR=12; chickenSpeed=3.0;
    clearEnvironment();
    flowers.length=0;
    showStart();
  },1000);
}

/* ---------- ENVIRONMENT ---------- */
function clearEnvironment(){document.querySelectorAll(".water,.sand,.tree-part,.flower").forEach(e=>e.remove()); waters.length=0; sands.length=0; trees.length=0; flowers.length=0;}
function spawnEnvironmentLevel(lvl){for(let i=0;i<2+lvl-1;i++) spawnWobblyWater(); for(let i=0;i<3+lvl-1;i++) spawnTree();}

function spawnWobblyWater(){
  let x,y,r,safe=false;
  while(!safe){
    x = innerWidth*(0.3+Math.random()*0.4);
    y = innerHeight*(0.3+Math.random()*0.4);
    r = 120+Math.random()*50;
    safe = Math.hypot(x-chickenX,y-chickenY)>r+chickenR+20;
  }
  const water = document.createElement("div");
  water.className="water";
  const wobble=0.8+Math.random()*0.4;
  water.style.width = r*2*wobble+"px";
  water.style.height = r*2+"px";
  water.style.left = x-(r*wobble)+"px";
  water.style.top = y-r+"px";
  water.style.borderRadius="50% / 50%";
  game.appendChild(water);
  waters.push({x,y,r});

// Seerose: 20% Chance
  if (Math.random() < 0.2) {
    const offsetX = (Math.random() - 0.5) * r;
    const offsetY = (Math.random() - 0.5) * r;
    const lx = x + offsetX;
    const ly = y + offsetY;

    // Herzförmiges Blatt: zwei Ellipsen, 45° zueinander
    for (let i = 0; i < 2; i++) {
      const leaf = document.createElement("div");
      const leafWidth = 15 + Math.random() * 5;
      const leafHeight = 25 + Math.random() * 5;
      leaf.className = "flower";
      leaf.style.width = leafWidth + "px";
      leaf.style.height = leafHeight + "px";
      leaf.style.backgroundColor = "#228B22"; // etwas helleres Grün
      leaf.style.borderRadius = "50% / 50%";
      leaf.style.position = "absolute";
      leaf.style.left = lx - leafWidth/2 + "px";
      leaf.style.top = ly - leafHeight/2 + "px";
      leaf.style.zIndex = 3;
      leaf.style.transform = `rotate(${i === 0 ? -45 : 45}deg)`;
      leaf.style.transformOrigin = "center center";
      game.appendChild(leaf);
    }

    // 33% Chance rosa Blüte
    if (Math.random() < 0.33) {
      const bloomRadius = 6;
      const bloomSize = 6 + Math.random()*2;
      for (let b = 0; b < 4; b++) {
        const angle = (Math.PI/2) * b;
        const bloom = document.createElement("div");
        bloom.className = "flower";
        bloom.style.width = bloomSize + "px";
        bloom.style.height = bloomSize + "px";
        bloom.style.backgroundColor = "pink";
        bloom.style.borderRadius = "50%";
        bloom.style.position = "absolute";
        bloom.style.left = (lx + Math.cos(angle)*bloomRadius - bloomSize/2) + "px";
        bloom.style.top = (ly + Math.sin(angle)*bloomRadius - bloomSize/2) + "px";
        bloom.style.zIndex = 4;
        game.appendChild(bloom);
      }
    }
}

  const sandLayers=5;
  for(let layer=0; layer<sandLayers; layer++){
    const layerRadius = r + 5 + layer*5; // kleinerer Startwert & engerer Abstand
    const sandCount = 12+Math.floor(Math.random()*6);
    for(let i=0;i<sandCount;i++){
      const angle = Math.random()*Math.PI*2;
      const dist = layerRadius + (Math.random()*6 - 3); // etwas mehr Zufall, aber immer nah am Wasser
      const sx = x + Math.cos(angle)*dist;
      const sy = y + Math.sin(angle)*dist;
      const sr = 15 + Math.random()*12;
      const sand=document.createElement("div");
      sand.className="sand";
      sand.style.width=sr*2+"px";
      sand.style.height=sr*2+"px";
      sand.style.left=sx-sr+"px";
      sand.style.top=sy-sr+"px";
      sand.style.borderRadius="50%";
      sand.style.backgroundColor="#e6d29e";
      sand.style.opacity=0.5+Math.random()*0.4;
      game.appendChild(sand);
      sands.push({x:sx,y:sy,r:sr});
    }
  }
}

function spawnTree() {
  let x, y, valid = false;
  while (!valid) {
    x = Math.random() * innerWidth;
    y = Math.random() * innerHeight;
    valid = !waters.some(w => Math.hypot(x - w.x, y - w.y) < w.r + 30) &&
            Math.hypot(x - chickenX, y - chickenY) > 50;
  }

  // Baum-Container
  const treeContainer = document.createElement("div");
  treeContainer.style.position = "absolute";
  treeContainer.style.left = x + "px";
  treeContainer.style.top = y + "px";
  treeContainer.style.width = "0px";
  treeContainer.style.height = "0px";
  treeContainer.style.zIndex = 5;
  treeContainer.style.filter = "drop-shadow(6px 6px 6px rgba(0,0,0,0.8))"; // EIN EINHEITLICHER SCHATTEN

  const n = 8 + Math.floor(Math.random() * 4); // Anzahl Kreise pro Baum
  const maxRadius = 20;  // Abstand der Kreise vom Zentrum
  const minSize = 40;    // Kreisgröße
  const maxSize = 60;

  for (let i = 0; i < n; i++) {
    const t = document.createElement("div");
    t.className = "tree-part";

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * maxRadius;
    const dx = Math.cos(angle) * radius;
    const dy = Math.sin(angle) * radius;

    const size = minSize + Math.random() * (maxSize - minSize);
    t.style.width = size + "px";
    t.style.height = size + "px";
    t.style.position = "absolute";
    t.style.left = dx - size/2 + "px";
    t.style.top = dy - size/2 + "px";
    t.style.borderRadius = "50%";
    t.style.backgroundColor = "#0e6b21";

    treeContainer.appendChild(t);
    trees.push({ x: x + dx, y: y + dy, r: size/2 });
  }

  game.appendChild(treeContainer);
}



function spawnFlowers(num){
  for(let i=0;i<num;i++){
    let safe=false,x,y;
    while(!safe){
      x=Math.random()*innerWidth;
      y=Math.random()*innerHeight;
      safe = !waters.some(w=>Math.hypot(x-w.x,y-w.y)<w.r+10) &&
             !sands.some(s=>Math.hypot(x-s.x,y-s.y)<s.r+10) &&
             !trees.some(t=>Math.hypot(x-t.x,y-t.y)<t.r+10);
    }
    let center=document.createElement("div");
    center.className="flower";
    center.style.width="4px";
    center.style.height="4px";
    center.style.backgroundColor="yellow";
    center.style.borderRadius="50%";
    center.style.left=x+"px";
    center.style.top=y+"px";
    game.appendChild(center);

    const petals = 5 + Math.floor(Math.random()*2);
    const petalRadius = 5;
    for(let p=0;p<petals;p++){
      const angle = (Math.PI*2/petals)*p;
      const px = x + Math.cos(angle)*petalRadius;
      const py = y + Math.sin(angle)*petalRadius;
      let petal = document.createElement("div");
      petal.className="flower";
      petal.style.width="4px";
      petal.style.height="4px";
      petal.style.backgroundColor="white";
      petal.style.borderRadius="50%";
      petal.style.left=px+"px";
      petal.style.top=py+"px";
      game.appendChild(petal);
    }
    flowers.push({x,y});
  }
}

function spawnApples(reset = false) {

  // Reset = Spielstart / Levelwechsel
  if (reset) {
    apples.forEach(a => a.div.remove());
    apples.length = 0;
  }

  // Wie viele neue Äpfel?
  let spawnCount = reset
    ? 1 + Math.floor(Math.random() * 3)   // 1–3 beim Start
    : Math.floor(Math.random() * 3);      // 0–2 beim Essen

  // Maximalgrenze beachten
  spawnCount = Math.min(
    spawnCount,
    MAX_APPLES - apples.length
  );

  for (let i = 0; i < spawnCount; i++) {

    if (trees.length === 0) break;

    let x, y, safe = false;
    const minDist = 80;
    const maxDist = 120;
	const edgeMargin = 40; // Abstand zum Spielfeldrand
	const waterMargin = 40; // zusätzlicher Abstand zum Wasser


    while (!safe) {
      const tree = trees[Math.floor(Math.random() * trees.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);

      x = tree.x + Math.cos(angle) * dist;
      y = tree.y + Math.sin(angle) * dist;

      safe =
  // nicht zu nah am Wasser
  !waters.some(w => Math.hypot(x - w.x, y - w.y) < w.r + waterMargin) &&

  // nicht am Spielfeldrand
  x > edgeMargin &&
  x < innerWidth - edgeMargin &&
  y > edgeMargin &&
  y < innerHeight - edgeMargin;

    }

    const apple = document.createElement("div");
    apple.className = "apple";
    apple.textContent = "🍎";
    apple.style.position = "absolute";
    apple.style.left = x + "px";
    apple.style.top = y + "px";
    apple.style.fontSize = "16px";

    game.appendChild(apple);
    apples.push({ x, y, div: apple });
  }

  // 🛡️ Garantie: mindestens 1 Apfel
  if (apples.length === 0 && trees.length > 0) {
    spawnApples(true); // erzwingt 1–3 → durch MAX_APPLES max. 1
  }
}

// Start
showStart();

const fsBtn = document.getElementById("fullscreenBtn");

fsBtn.addEventListener("click", () => {
  if (!document.fullscreenElement) {
    game.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
