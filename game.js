"use strict";

/*
 * Python版のMountainCarContinuousと同じ更新順序:
 *
 * velocity += action * power - cos(3 * position) * gravity
 * velocity = clip(velocity, -maxSpeed, maxSpeed)
 * position += velocity
 * position = clip(position, minPosition, maxPosition)
 *
 * 左端で左向き速度を持つ場合は velocity = 0 とする。
 */

const CONFIG = Object.freeze({
  minPosition: -1.2,
  maxPosition: 0.6,
  maxSpeed: 0.07,
  goalPosition: 0.45,
  power: 0.0015,
  gravity: 0.0025,

  // Gymnasium標準に近い初期化範囲
  initialPositionMin: -0.6,
  initialPositionMax: -0.4,
  initialVelocity: 0.0,

  // 1秒間の物理更新回数
  physicsHz: 60,

  // 制限時間。nullなら無制限。
  maxSteps: 9999,
});

class MountainCarEnvironment {
  constructor(config) {
    this.config = config;
    this.reset();
  }

  reset() {
    const range =
      this.config.initialPositionMax - this.config.initialPositionMin;

    this.position =
      this.config.initialPositionMin + Math.random() * range;
    this.velocity = this.config.initialVelocity;
    this.stepCount = 0;
    this.terminated = false;
    this.truncated = false;

    return this.getState();
  }

  step(rawAction) {
    if (this.terminated || this.truncated) {
      return this.getState();
    }

    const action = clamp(rawAction, -1.0, 1.0);

    this.velocity +=
      action * this.config.power
      - Math.cos(3.0 * this.position) * this.config.gravity;

    this.velocity = clamp(
      this.velocity,
      -this.config.maxSpeed,
      this.config.maxSpeed,
    );

    this.position += this.velocity;

    this.position = clamp(
      this.position,
      this.config.minPosition,
      this.config.maxPosition,
    );

    if (
      this.position <= this.config.minPosition
      && this.velocity < 0.0
    ) {
      this.velocity = 0.0;
    }

    this.stepCount += 1;
    this.terminated = this.position >= this.config.goalPosition;

    if (
      Number.isFinite(this.config.maxSteps)
      && this.stepCount >= this.config.maxSteps
      && !this.terminated
    ) {
      this.truncated = true;
    }

    return this.getState();
  }

  getState() {
    return {
      position: this.position,
      velocity: this.velocity,
      stepCount: this.stepCount,
      terminated: this.terminated,
      truncated: this.truncated,
    };
  }
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const slider = document.getElementById("actionSlider");
const positionValue = document.getElementById("positionValue");
const velocityValue = document.getElementById("velocityValue");
const actionValue = document.getElementById("actionValue");
const stepValue = document.getElementById("stepValue");
const resetButton = document.getElementById("resetButton");
const overlayResetButton = document.getElementById("overlayResetButton");
const fullLeftButton = document.getElementById("fullLeftButton");
const neutralButton = document.getElementById("neutralButton");
const fullRightButton = document.getElementById("fullRightButton");
const returnToNeutral = document.getElementById("returnToNeutral");
const messageOverlay = document.getElementById("messageOverlay");
const messageTitle = document.getElementById("messageTitle");
const messageText = document.getElementById("messageText");

const env = new MountainCarEnvironment(CONFIG);

let action = 0.0;
let lastFrameTime = performance.now();
let accumulatedTime = 0.0;
const physicsStepMs = 1000 / CONFIG.physicsHz;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function mountainHeight(position) {
  return Math.sin(3.0 * position) * 0.45 + 0.55;
}

function mountainSlope(position) {
  return 1.35 * Math.cos(3.0 * position);
}

function positionToCanvasX(position) {
  const normalized =
    (position - CONFIG.minPosition)
    / (CONFIG.maxPosition - CONFIG.minPosition);

  return normalized * canvas.width;
}

function heightToCanvasY(height) {
  const topMargin = 78;
  const bottomMargin = 64;
  const usableHeight = canvas.height - topMargin - bottomMargin;

  return canvas.height - bottomMargin - height * usableHeight;
}

function setAction(value) {
  action = clamp(Number(value), -1.0, 1.0);
  slider.value = action.toFixed(2);
  actionValue.textContent = action.toFixed(2);
}

function returnActionToNeutral() {
  if (returnToNeutral.checked) {
    setAction(0.0);
  }
}

function resetGame() {
  env.reset();
  setAction(0.0);
  messageOverlay.classList.add("is-hidden");
  updateDashboard();
}

function showEndMessage(state) {
  if (state.terminated) {
    messageTitle.textContent = "GOAL!";
    messageText.textContent =
      `${state.stepCount}ステップでゴールしました。`;
  } else {
    messageTitle.textContent = "TIME UP";
    messageText.textContent =
      `${CONFIG.maxSteps}ステップに到達しました。`;
  }

  messageOverlay.classList.remove("is-hidden");
}

function updateDashboard() {
  const state = env.getState();

  positionValue.textContent = state.position.toFixed(4);
  velocityValue.textContent = state.velocity.toFixed(4);
  actionValue.textContent = action.toFixed(2);
  stepValue.textContent = String(state.stepCount);
}

function updatePhysics() {
  const previousState = env.getState();

  if (previousState.terminated || previousState.truncated) {
    return;
  }

  const state = env.step(action);
  updateDashboard();

  if (state.terminated || state.truncated) {
    setAction(0.0);
    showEndMessage(state);
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#13294b");
  gradient.addColorStop(0.62, "#1d4361");
  gradient.addColorStop(1, "#102238");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#ffffff";

  for (let index = 0; index < 60; index += 1) {
    const x = (index * 173) % canvas.width;
    const y = (index * 97) % 230;
    const radius = index % 3 === 0 ? 1.5 : 1.0;

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1.0;
}

function drawMountain() {
  ctx.beginPath();

  for (let x = 0; x <= canvas.width; x += 2) {
    const normalized = x / canvas.width;
    const position =
      CONFIG.minPosition
      + normalized * (CONFIG.maxPosition - CONFIG.minPosition);
    const y = heightToCanvasY(mountainHeight(position));

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.lineTo(canvas.width, canvas.height);
  ctx.lineTo(0, canvas.height);
  ctx.closePath();

  const groundGradient = ctx.createLinearGradient(
    0,
    canvas.height * 0.3,
    0,
    canvas.height,
  );
  groundGradient.addColorStop(0, "#4f8b70");
  groundGradient.addColorStop(1, "#193d34");

  ctx.fillStyle = groundGradient;
  ctx.fill();

  ctx.beginPath();

  for (let x = 0; x <= canvas.width; x += 2) {
    const normalized = x / canvas.width;
    const position =
      CONFIG.minPosition
      + normalized * (CONFIG.maxPosition - CONFIG.minPosition);
    const y = heightToCanvasY(mountainHeight(position));

    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.strokeStyle = "#9ce6bd";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.stroke();
}

function drawGoal() {
  const x = positionToCanvasX(CONFIG.goalPosition);
  const y = heightToCanvasY(mountainHeight(CONFIG.goalPosition));

  ctx.save();
  ctx.translate(x, y);

  ctx.strokeStyle = "#f9fbff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -105);
  ctx.stroke();

  ctx.fillStyle = "#ffcc66";
  ctx.beginPath();
  ctx.moveTo(0, -102);
  ctx.lineTo(64, -82);
  ctx.lineTo(0, -61);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawCar() {
  const state = env.getState();
  const x = positionToCanvasX(state.position);
  const y = heightToCanvasY(mountainHeight(state.position));
  const angle = -Math.atan(mountainSlope(state.position));

  ctx.save();
  ctx.translate(x, y - 17);
  ctx.rotate(angle);

  // Shadow
  ctx.globalAlpha = 0.28;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(0, 18, 45, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Body
  ctx.fillStyle = "#71e6c2";
  ctx.beginPath();
  ctx.roundRect(-42, -20, 84, 31, 10);
  ctx.fill();

  // Cabin
  ctx.fillStyle = "#dff9ff";
  ctx.beginPath();
  ctx.moveTo(-19, -20);
  ctx.lineTo(-7, -41);
  ctx.lineTo(18, -41);
  ctx.lineTo(31, -20);
  ctx.closePath();
  ctx.fill();

  // Wheels
  for (const wheelX of [-27, 27]) {
    ctx.fillStyle = "#07111f";
    ctx.beginPath();
    ctx.arc(wheelX, 12, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#9baac0";
    ctx.beginPath();
    ctx.arc(wheelX, 12, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawHud() {
  const state = env.getState();

  ctx.save();
  ctx.fillStyle = "rgba(4, 10, 22, 0.55)";
  ctx.beginPath();
  ctx.roundRect(24, 22, 294, 62, 16);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 22px system-ui, sans-serif";
  ctx.fillText("Reach the flag", 44, 49);

  ctx.fillStyle = "#a9b4ce";
  ctx.font = "500 15px system-ui, sans-serif";
  ctx.fillText(
    `x = ${state.position.toFixed(3)}   v = ${state.velocity.toFixed(3)}`,
    44,
    72,
  );

  ctx.restore();
}

function draw() {
  drawBackground();
  drawMountain();
  drawGoal();
  drawCar();
  drawHud();
}

function gameLoop(currentTime) {
  const elapsed = Math.min(currentTime - lastFrameTime, 250);
  lastFrameTime = currentTime;
  accumulatedTime += elapsed;

  while (accumulatedTime >= physicsStepMs) {
    updatePhysics();
    accumulatedTime -= physicsStepMs;
  }

  draw();
  requestAnimationFrame(gameLoop);
}

slider.addEventListener("input", (event) => {
  setAction(event.target.value);
});

slider.addEventListener("pointerup", returnActionToNeutral);
slider.addEventListener("pointercancel", returnActionToNeutral);
slider.addEventListener("change", () => {
  if (returnToNeutral.checked) {
    window.setTimeout(returnActionToNeutral, 80);
  }
});

fullLeftButton.addEventListener("pointerdown", () => setAction(-1.0));
neutralButton.addEventListener("click", () => setAction(0.0));
fullRightButton.addEventListener("pointerdown", () => setAction(1.0));

for (const button of [fullLeftButton, fullRightButton]) {
  button.addEventListener("pointerup", returnActionToNeutral);
  button.addEventListener("pointerleave", returnActionToNeutral);
  button.addEventListener("pointercancel", returnActionToNeutral);
}

resetButton.addEventListener("click", resetGame);
overlayResetButton.addEventListener("click", resetGame);

// 補助操作。スライダーが主操作だが、キーボードも利用可能。
window.addEventListener("keydown", (event) => {
  if (event.code === "ArrowLeft") {
    event.preventDefault();
    setAction(-1.0);
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    setAction(1.0);
  } else if (event.code === "Space") {
    event.preventDefault();
    setAction(0.0);
  } else if (event.code === "KeyR") {
    resetGame();
  }
});

window.addEventListener("keyup", (event) => {
  if (
    event.code === "ArrowLeft"
    || event.code === "ArrowRight"
  ) {
    returnActionToNeutral();
  }
});

resetGame();
requestAnimationFrame(gameLoop);
