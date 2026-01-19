const game = document.getElementById("game");
const chicken = document.getElementById("chicken");
const swan = document.getElementById("swan");
const apple = document.getElementById("apple");
const overlay = document.getElementById("overlay");
const overlayText = document.getElementById("overlayText");
const overlayHighscore = document.getElementById("overlayHighscore");
const scoreEl = document.getElementById("ui-score");
const levelEl = document.getElementById("ui-level");
const timerEl = document.getElementById("ui-timer");

let playerName = "";
const startBtn = document.getElementById("startBtn");

// 🔹 Startbutton blockieren
startBtn.disabled = true;
startBtn.textContent = "connecting..";


// 🔹 Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBvDeNNX6CUg21-ma-km5i06MbyBp5iZP4",
  authDomain: "chicknrun-11444.firebaseapp.com",
  databaseURL: "https://chicknrun-11444-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "chicknrun-11444",
  storageBucket: "chicknrun-11444.firebasestorage.app",
  messagingSenderId: "283675744176",
  appId: "1:283675744176:web:9d2867185ad41c01ac6875"
};

// 🔹 Firebase Initialisierung
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();
let firebaseReady = false;

// 🔹 Startbutton blockieren bis Firebase bereit
startBtn.disabled = true;
startBtn.textContent = "connecting..";

// 🔹 Anonymer Login + Startbutton aktivieren
auth.signInAnonymously()
  .then(() => {
    firebaseReady = true;
    console.log("Firebase bereit! UID:", auth.currentUser.uid);

    // Highscore-Liste laden
    updateOnlineHighscores();

    // Startbutton freigeben
    startBtn.disabled = false;
    startBtn.textContent = "start";
  })
  .catch(err => {
    console.error("Firebase Login fehlgeschlagen:", err);
    startBtn.textContent = "cannot connect";
  });



startBtn.addEventListener("click", () => {
  const input = document.getElementById("nameInput").value.trim();

  if (input.length < 2) {
    alert("don't you have a name?");
    return;
  }

  if (!firebaseReady) {
    alert("connecting to online-highscore");
    return;
  }

  playerName = input;
  overlay.style.display = "none";
  startGame();
});



function saveScore(playerName, score) {
  if (!firebaseReady) {
    console.warn("try again in 500ms");
    setTimeout(() => saveScore(playerName, score), 500);
    return;
  }

  const scoreData = {
    name: playerName,
    score: score,
    timestamp: Date.now()
  };

  db.ref('highscores').push(scoreData)
    .then(() => console.log("Highscore online gespeichert ✅"))
    .catch(err => console.error("Fehler beim Speichern:", err));
}




let mouseX = innerWidth / 2;
let mouseY = innerHeight / 2;

let chickenX, chickenY;
let swanX, swanY;

let chickenR = 12;
let chickenSpeed = 3.0;
let swanBaseSpeed = 1.5;

let sprintActive = false;
let sprintTimer = 0;
let sprintStrength = 0; // 0 → 1 (smooth)
const SPRINT_DURATION = 4000;
const SPRINT_BOOST = 1.5;


let swanWidth = 40;
let swanHeight = 80;
let swanVX = 0;
let swanVY = 0;
let swanSpeedBoost = 0; // dauerhaft, durch Sprint-Äpfel

let score = 0;
let highscore = Number(localStorage.getItem("highscore") || 0);

let running = false;
let walkTime = 0;
let walkStrength = 0; // NEU

let level = 1;
let timeLeft = 20;
let levelInterval;

const waters = [];
const sands = [];
const trees = [];
const flowers = [];
const apples = []; // Array für mehrere Äpfel
const waterBlooms = []; // für rosa Seerosen, die Punkte geben
const MAX_APPLES = 3;
const SWAN_SMOOTHING = 0.15; // kleiner Wert = weichere Bewegung
const SPRINT_APPLE_CHANCE = 0.1;




const CHICKEN_BODY_WIDTH = 15;
const CHICKEN_BODY_HEIGHT = 15;
const CHICKEN_HEAD_RADIUS = 10;

function showGameUI() {
  scoreEl.style.display = "block";
  levelEl.style.display = "block";
  timerEl.style.display = "block";
}

function hideGameUI() {
  scoreEl.style.display = "none";
  levelEl.style.display = "none";
  timerEl.style.display = "none";
}

function updateOnlineHighscores() {
  const highscoreList = overlayHighscore;

  db.ref('highscores')
    .orderByChild('score')
    .limitToLast(5)
    .once('value', snapshot => {
      const data = snapshot.val();

      if (!data) {
        highscoreList.innerHTML = `<h3>Highscores</h3><p>Keine Online-Highscores</p>`;
        return;
      }

      const arr = Object.values(data).sort((a,b)=>b.score - a.score);

      let html = "<h3>Highscores</h3><ol>";
      arr.forEach(e => {
        html += `<li>${e.name}: ${e.score}</li>`;
      });
      html += "</ol>";

      highscoreList.innerHTML = html;
    });
}






document.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function createChicken() {
    chicken.innerHTML = ""; 
    chicken.style.position = "absolute";
    chicken.style.zIndex = 15;
    chicken.style.pointerEvents = "none";

    const bodyWidth = CHICKEN_BODY_WIDTH;
	const bodyHeight = CHICKEN_BODY_HEIGHT;
	const headR = CHICKEN_HEAD_RADIUS;


    // Körper
    const body = document.createElement("div");
    body.style.width = bodyWidth + "px";
    body.style.height = bodyHeight + "px";
    body.style.backgroundColor = "gold";
    body.style.borderRadius = "50% / 50%";
    body.style.position = "absolute";
    body.style.left = "0px";
    body.style.top = headR + "px"; 
    chicken.appendChild(body);

    // Kopf (kleiner Kreis oben)
    const head = document.createElement("div");
    head.style.width = headR*2 + "px";
    head.style.height = headR*2 + "px";
    head.style.backgroundColor = "gold";
    head.style.borderRadius = "50%";
    head.style.position = "absolute";
    head.style.left = (bodyWidth/2 - headR) + "px";
    head.style.top = "0px"; 
    chicken.appendChild(head);

    // Augen
    const eyeR = chickenR * 0.3;
    const eyeLeft = document.createElement("div");
    eyeLeft.style.width = eyeR + "px";
    eyeLeft.style.height = eyeR + "px";
    eyeLeft.style.backgroundColor = "black";
    eyeLeft.style.borderRadius = "50%";
    eyeLeft.style.position = "absolute";
    eyeLeft.style.left = (bodyWidth/2 - headR + eyeR) + "px";
    eyeLeft.style.top = headR*0.7 + "px";
    chicken.appendChild(eyeLeft);

    const eyeRight = document.createElement("div");
    eyeRight.style.width = eyeR + "px";
    eyeRight.style.height = eyeR + "px";
    eyeRight.style.backgroundColor = "black";
    eyeRight.style.borderRadius = "50%";
    eyeRight.style.position = "absolute";
    eyeRight.style.left = (bodyWidth/2 - headR + eyeR + eyeR*1.5) + "px";
    eyeRight.style.top = headR*0.7 + "px";
    chicken.appendChild(eyeRight);

    // Schnabel
    const beak = document.createElement("div");
    beak.style.width = "0";
    beak.style.height = "0";
    beak.style.borderLeft = `${eyeR}px solid transparent`;
    beak.style.borderRight = `${eyeR}px solid transparent`;
    beak.style.borderTop = `${eyeR*1.2}px solid orange`;
    beak.style.position = "absolute";
    beak.style.left = (bodyWidth/2 - headR + headR*0.4) + "px";
    beak.style.top = headR + "px";
    chicken.appendChild(beak);

    // Flügel links
    const wingLeft = document.createElement("div");
    wingLeft.style.width = chickenR*1.2 + "px";
    wingLeft.style.height = chickenR*0.8 + "px";
    wingLeft.style.backgroundColor = "gold";
    wingLeft.style.borderRadius = "50% / 50%";
    wingLeft.style.position = "absolute";
    wingLeft.style.left = -chickenR*0.6 + "px";
    wingLeft.style.top = bodyHeight*0.4 + headR + "px";
    wingLeft.style.transform = "rotate(15deg)";
    chicken.appendChild(wingLeft);

    // Flügel rechts
    const wingRight = document.createElement("div");
    wingRight.style.width = chickenR*1.2 + "px";
    wingRight.style.height = chickenR*0.8 + "px";
    wingRight.style.backgroundColor = "gold";
    wingRight.style.borderRadius = "50% / 50%";
    wingRight.style.position = "absolute";
    wingRight.style.left = bodyWidth - chickenR*0.6 + "px";
    wingRight.style.top = bodyHeight*0.4 + headR + "px";
    wingRight.style.transform = "rotate(-15deg)";
    chicken.appendChild(wingRight);

    // Füße
    const footLeft = document.createElement("div");
    footLeft.style.width = chickenR*0.5 + "px";
    footLeft.style.height = chickenR*0.8 + "px";
    footLeft.style.backgroundColor = "orange";
    footLeft.style.position = "absolute";
    footLeft.style.left = bodyWidth*0.3 + "px";
    footLeft.style.top = bodyHeight + headR + "px";
    footLeft.style.borderRadius = "50% / 30%";
    chicken.appendChild(footLeft);

    const footRight = document.createElement("div");
    footRight.style.width = chickenR*0.5 + "px";
    footRight.style.height = chickenR*0.8 + "px";
    footRight.style.backgroundColor = "orange";
    footRight.style.position = "absolute";
    footRight.style.left = bodyWidth*0.6 + "px";
    footRight.style.top = bodyHeight + headR + "px";
    footRight.style.borderRadius = "50% / 30%";
    chicken.appendChild(footRight);

    // Position auf Mauszeiger zentrieren
    chicken.style.left = Math.round(chickenX - bodyWidth / 2) + "px";
    chicken.style.top  = Math.round(chickenY - (bodyHeight/2 + headR)) + "px";
}


/* ---------- START ---------- */
function showStart() {
  running = false;
	hideGameUI();
	overlayHighscore.style.display = "block"; // 🔹 Highscores im Startscreen sichtbar
	updateOnlineHighscores();                 // Highscore-Liste aktualisieren
	nameInput.style.display = "block";        // Namensfeld
	startBtn.style.display = "block";         // Startbutton
	
  overlay.style.display = "flex";
  overlayText.innerHTML = `chick&run`;
  overlayText.style.fontSize = "64px";

  updateOnlineHighscores(); // 🔹 lädt Highscore-Liste
  clearEnvironment();
  chickenX = innerWidth / 2;
  chickenY = innerHeight / 2;
  spawnEnvironmentLevel(1);
  spawnFlowers(60);
}



/* ---------- START GAME ---------- */
function startGame() {
    running = true;
	showGameUI();
    chickenX = mouseX;
    chickenY = mouseY;

    swanX = mouseX < innerWidth / 2 ? innerWidth - 150 : 150;
    swanY = mouseY < innerHeight / 2 ? innerHeight - 150 : 150;

    chickenR = 12;       // Größe des Kükenkörpers
    chickenSpeed = 3.0;

    createChicken();      // 🆕 hier


  swanWidth = 40;
  swanHeight = 80;
  swan.style.width = swanWidth + "px";
  swan.style.height = swanHeight + "px";
  swan.style.backgroundColor = "white";
  swan.style.borderRadius = "20px";
  swan.style.zIndex = 16; // größer als chicken.style.zIndex = 15


  clearEnvironment();
  spawnEnvironmentLevel(level);
  spawnFlowers(60);
  spawnApples(true);


  chickenR = 12;
  chickenSpeed = 3.0;

  overlayHighscore.style.display = "none"; // 🔹 Highscores ausblenden
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

	// 🔹 Highscores, Namensfeld und Button ausblenden
	overlayHighscore.style.display = "none";
	nameInput.style.display = "none";
	startBtn.style.display = "none";


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
function loop() {
  if (!running) return;

  // Score + Timer
levelEl.textContent = `LEVEL ${level}`;
scoreEl.textContent = `score: ${score}`;
timerEl.textContent = timeLeft;



  // ---------- Küken Bewegung ----------
  let speed = chickenSpeed;
 
 // ---------- Sprint ----------
if (sprintActive) {
  sprintTimer -= 16;

  sprintStrength += (1 - sprintStrength) * 0.15;

  if (sprintTimer <= 0) {
    sprintActive = false;
  }
} else {
  sprintStrength += (0 - sprintStrength) * 0.15;
}

// Sprint-Boost anwenden
speed += sprintStrength * SPRINT_BOOST;

 if (!sprintActive) {
  if (waters.some(w => Math.hypot(chickenX - w.x, chickenY - w.y) < w.r)) speed *= 0.3;
  if (sands.some(s => Math.hypot(chickenX - s.x, chickenY - s.y) < s.r)) speed *= 0.6;
}


  const dx = mouseX - chickenX;
  const dy = mouseY - chickenY;
  const len = Math.hypot(dx, dy);

  if (len > 10) {
    chickenX += (dx / len) * speed;
    chickenY += (dy / len) * speed;

    // WalkStrength sanft anpassen
    const moveSpeed = Math.min(len, chickenSpeed);
    const animStrength = moveSpeed / chickenSpeed;
    walkStrength += (animStrength - walkStrength) * 0.25;

    // WalkTime hochzählen für Jump
    walkTime += 0.2 + walkStrength * 0.3;
  } else {
    walkStrength *= 0.85;
    if (walkStrength < 0.01) walkStrength = 0;
  }

  // Jump-Höhe Küken
  const chickenJump = walkStrength > 0 ? Math.sin(walkTime) * walkStrength * 5 : 0;

  // ---------- Baum-Kollision ----------
  trees.forEach(t => {
    const dx = chickenX - t.x;
    const dy = chickenY - t.y;
    const dist = Math.hypot(dx, dy);
    const minDist = chickenR + t.r;
    if (dist < minDist && dist > 0) {
      const pushX = dx / dist;
      const pushY = dy / dist;
      chickenX = t.x + pushX * minDist;
      chickenY = t.y + pushY * minDist;
    }
  });

  // Position Küken
  // Position exakt auf Mauszeiger
const bodyWidth = CHICKEN_BODY_WIDTH;
const bodyHeight = CHICKEN_BODY_HEIGHT;
const headR = CHICKEN_HEAD_RADIUS;


chicken.style.left = Math.round(chickenX - bodyWidth / 2) + "px";
chicken.style.top  = Math.round(chickenY - (bodyHeight/2 + headR) + chickenJump) + "px";




  // ---------- Swan-Bewegung ----------
let targetX = chickenX;
let targetY = chickenY;

// 🏃‍♂️ Schwan sucht Sprint-Äpfel
const sprintApples = apples.filter(a => a.sprint);
if (sprintApples.length > 0) {
  // wähle den nächsten Sprint-Apfel
  const closestApple = sprintApples.reduce((prev, curr) => {
    const dPrev = Math.hypot(swanX - prev.x, swanY - prev.y);
    const dCurr = Math.hypot(swanX - curr.x, swanY - curr.y);
    return dCurr < dPrev ? curr : prev;
  });
  targetX = closestApple.x;
  targetY = closestApple.y;
}

// Richtung normalisieren
let vx = targetX - swanX;
let vy = targetY - swanY;
let vlen = Math.hypot(vx, vy);
if (vlen > 0) { vx /= vlen; vy /= vlen; }

// Speed: Basis + Boost + Dauerboost durch gesammelte Sprint-Äpfel
let spd = swanBaseSpeed + swanSpeedBoost;
if (waters.some(w => Math.hypot(swanX - w.x, swanY - w.y) < w.r + 80)) spd *= 1.5;

// Smooth Swan-Movement
swanVX += (vx * spd - swanVX) * SWAN_SMOOTHING;
swanVY += (vy * spd - swanVY) * SWAN_SMOOTHING;
swanX += swanVX;
swanY += swanVY;

  
  // ---------- Swan-Baum-Kollision ----------
trees.forEach(t => {
  const dx = swanX - t.x;
  const dy = swanY - t.y;
  const dist = Math.hypot(dx, dy);

  const swanRadius = 30; // grobe Größe vom Schwan
  const minDist = swanRadius + t.r;

  if (dist < minDist && dist > 0) {
    const pushX = dx / dist;
    const pushY = dy / dist;

    swanX = t.x + pushX * minDist;
    swanY = t.y + pushY * minDist;
  }
});


  // ---------- Swan Jump ----------
  if (!swan.walkTime) swan.walkTime = 0; // einmal initialisieren
  swan.walkTime += 0.10; // viel langsamer als Chicken
  const swanJump = Math.sin(swan.walkTime) * 3; // kleiner Sprung
  swan.style.left = swanX - swanWidth / 2 + "px";
  swan.style.top  = swanY - swanHeight / 2 + swanJump + "px";

 // ---------- Apfel sammeln ----------
for (let i = apples.length - 1; i >= 0; i--) {
  const a = apples[i];
  const d = Math.hypot(chickenX - a.x, chickenY - a.y);

  if (d < chickenR + 20) {

    if (a.sprint) {
      // 🍏 Sprint-Apfel
      // 🍏 Sprint-Apfel
	sprintActive = true;
	sprintTimer = SPRINT_DURATION;


    } else {
      // 🍎 Normaler Apfel
      score++;
    }

    a.div.remove();
    apples.splice(i, 1);
    spawnApples(false);
  }
  }

// ---------- Seerosen sammeln ----------
for (let i = waterBlooms.length - 1; i >= 0; i--) {
  const b = waterBlooms[i];
  const d = Math.hypot(chickenX - b.x, chickenY - b.y);

  if (d < chickenR + b.r) {
    score += 50; // Bonuspunkte
    b.div.remove(); // Blüte vom Spielfeld entfernen
    waterBlooms.splice(i, 1); // aus Array entfernen
  }
}
// ---------- Schwan sammelt Sprint-Äpfel ----------
for (let i = apples.length - 1; i >= 0; i--) {
  const a = apples[i];
  const d = Math.hypot(swanX - a.x, swanY - a.y);

  if (d < 20 && a.sprint) { // Nähe prüfen, z.B. 20px
    swanSpeedBoost += 0.2;   // dauerhafter Boost
    a.div.remove();
    apples.splice(i, 1);

    // Optional: neuen Apfel spawnen
    spawnApples(false);
  }
}


  // ---------- Schwan-Kollision ----------
  if (Math.hypot(chickenX - swanX, chickenY - swanY) < chickenR + 30) gameOver();

  requestAnimationFrame(loop);
}



/* ---------- GAME OVER ---------- */
function gameOver() {
  running = false;
  overlay.style.display = "flex";
	overlayText.innerHTML = `GAME OVER<br>Score: ${score}`;
	overlayText.style.fontSize="64px";

	// 🔹 Highscores, Namensfeld und Button ausblenden
	overlayHighscore.style.display = "none";
	nameInput.style.display = "none";
	startBtn.style.display = "none";


  // Local Highscore
  if(score > highscore){ 
    highscore = score; 
    localStorage.setItem("highscore", highscore); 
  }

  // Online Highscore speichern
  if (playerName) {
    saveScore(playerName, score);
  }

  setTimeout(() => {
    score = 0;
    level = 1;
    chickenR = 12;
    chickenSpeed = 3.0;
    clearEnvironment();
    flowers.length = 0;
    swanSpeedBoost = 0;

    showStart();
  }, 1000);
}




/* ---------- ENVIRONMENT ---------- */

function clearEnvironment() {
  document.querySelectorAll(".water,.sand,.tree-part,.flower").forEach(e => e.remove());
  waters.length = 0;
  sands.length = 0;
  trees.length = 0;
  flowers.length = 0;
  
  // 💖 alle rosa Blüten entfernen
  waterBlooms.forEach(b => b.div.remove());
  waterBlooms.length = 0;
}

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
  if (Math.random() < 0.5) {
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
if (Math.random() < 0.4) {
  const bloomRadius = 8; // kleineres Blatt
  const bloomContainer = document.createElement("div");
  bloomContainer.style.position = "absolute";
  bloomContainer.style.width = bloomRadius * 4 + "px";  // genug Platz für Blätter
  bloomContainer.style.height = bloomRadius * 4 + "px";
  bloomContainer.style.left = (lx - bloomRadius*2) + "px"; 
  bloomContainer.style.top  = (ly - bloomRadius*2) + "px"; 
  bloomContainer.style.zIndex = 4;
  game.appendChild(bloomContainer);

  // Versatz der vier Blätter – stärker überlappend
  const offsets = [
    [-0.2, -0.2],
    [0.2, -0.2],
    [-0.2, 0.2],
    [0.2, 0.2]
  ];

  offsets.forEach(off => {
    const petal = document.createElement("div");
    petal.style.width = bloomRadius + "px";
    petal.style.height = bloomRadius + "px";
    petal.style.backgroundColor = "pink";
    petal.style.borderRadius = "50%";
    petal.style.position = "absolute";

    // Blatt positionieren stark überlappend in der Mitte
    petal.style.left = (bloomRadius*2 + off[0]*bloomRadius) - bloomRadius/2 + "px";
    petal.style.top  = (bloomRadius*2 + off[1]*bloomRadius) - bloomRadius/2 + "px";

    bloomContainer.appendChild(petal);
  });

  // 💖 Ein Objekt für das Spiel
  waterBlooms.push({
    x: lx,              // Mittelpunkt für Kollision
    y: ly,
    r: bloomRadius,     // Radius für Kollision
    div: bloomContainer
  });
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
	  sand.style.zIndex = 1;
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
    ? 1 + Math.floor(Math.random() * 2)   // 1–2 beim Start
    : Math.floor(Math.random() * 3);      // 0–2 beim Essen

  // Maximalgrenze beachten
  spawnCount = Math.min(spawnCount, MAX_APPLES - apples.length);

  for (let i = 0; i < spawnCount; i++) {
    if (trees.length === 0) break;

    let x, y, safe = false;
    const minDist = 100;
    const maxDist = 150;
    const edgeMargin = 40; // Abstand zum Spielfeldrand
    const waterMargin = 40; // Abstand zum Wasser

    // Finde eine sichere Position
    while (!safe) {
      const tree = trees[Math.floor(Math.random() * trees.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = minDist + Math.random() * (maxDist - minDist);

      x = tree.x + Math.cos(angle) * dist;
      y = tree.y + Math.sin(angle) * dist;

      safe =
        !waters.some(w => Math.hypot(x - w.x, y - w.y) < w.r + waterMargin) &&
        x > edgeMargin && x < innerWidth - edgeMargin &&
        y > edgeMargin && y < innerHeight - edgeMargin;
    }

    // Sprint-Apfel?
    const isSprint = Math.random() < SPRINT_APPLE_CHANCE;

    // Apfel erstellen
    const apple = document.createElement("div");
    apple.className = "apple";
    apple.style.position = "absolute";
    apple.style.left = x + "px";
    apple.style.top = y + "px";
    apple.textContent = isSprint ? "🍏" : "🍎"; // Sprint-Apfel 🍏
    apple.style.zIndex = 4;

    // Apfel zuerst unsichtbar für 10ms
    apple.style.opacity = 0;
    setTimeout(() => {
      apple.style.opacity = 1;
    }, 10);

    // Dezente goldene Animation für Sprint-Äpfel
    if (isSprint) {
      apple.style.textShadow =
        "0 0 2px gold, 0 0 4px gold, 0 0 6px rgba(255,215,0,0.4)";
      apple.style.animation = "goldPulse 1s infinite alternate";
    }

    game.appendChild(apple);

    // Finde den Baum, der dem Apfel am nächsten ist
    let closestTree = trees[0];
    let minDistToTree = Math.hypot(x - trees[0].x, y - trees[0].y);
    for (const t of trees) {
      const d = Math.hypot(x - t.x, y - t.y);
      if (d < minDistToTree) {
        minDistToTree = d;
        closestTree = t;
      }
    }

    // Animation vom nächsten Baum starten
    animateAppleFromTree(closestTree.x, closestTree.y, x, y, apple);

    // Apfel ins Array
    apples.push({
      x,
      y,
      div: apple,
      sprint: isSprint
    });
  }

  // 🛡️ Garantie: mindestens 1 Apfel
  if (apples.length === 0 && trees.length > 0) {
    spawnApples(true); // erzwingt 1–3 Äpfel
  }
}



function animateAppleFromTree(treeX, treeY, appleX, appleY, appleDiv) {
    const startX = treeX;
    const startY = treeY;
    const targetX = appleX;
    const targetY = appleY;
    const duration = 300 + Math.random() * 200;
    const startTime = performance.now();

    function animate(time) {
        const t = Math.min((time - startTime)/duration,1);
        const ease = t*t; // Beschleunigtes Fallen
        appleDiv.style.left = startX + (targetX - startX) * ease + "px";
        appleDiv.style.top  = startY + (targetY - startY) * ease + "px";
        if(t < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
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
