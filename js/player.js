import { audio } from './audio.js';

export class Player {
  constructor(elementId, spriteInnerId, speechBubbleId) {
    this.el = document.getElementById(elementId);
    this.spriteInner = document.getElementById(spriteInnerId);
    this.bubble = document.getElementById(speechBubbleId);

    // Initial position (centered in the upper farm path)
    this.x = 185;
    this.y = 220;
    this.isMoving = false;
    this.stepInterval = null;
    this.speedMultiplier = 1.0;

    this.updatePositionStyle();
  }

  setTractorBoost(enabled) {
    this.speedMultiplier = enabled ? 2.0 : 1.0;
  }

  updatePositionStyle() {
    if (this.el) {
      this.el.style.left = `${this.x}px`;
      this.el.style.top = `${this.y}px`;
    }
  }

  moveTo(targetX, targetY, actionMsg = null, onArrival = null) {
    if (!this.el) return;

    // Constrain within canonical farm stage bounds (500x680)
    const clampedX = Math.max(15, Math.min(450, targetX));
    const clampedY = Math.max(80, Math.min(630, targetY));

    const distance = Math.hypot(clampedX - this.x, clampedY - this.y);
    const duration = Math.max(250, (distance / 0.45) / this.speedMultiplier);

    this.isMoving = true;
    if (this.spriteInner) {
      this.spriteInner.classList.add('walking-anim');
    }

    // Set transition duration dynamically
    this.el.style.transition = `left ${duration}ms ease-out, top ${duration}ms ease-out`;
    this.x = clampedX;
    this.y = clampedY;
    this.updatePositionStyle();

    // Show speech bubble
    if (actionMsg && this.bubble) {
      this.bubble.textContent = actionMsg;
      this.bubble.classList.remove('opacity-0');
    }

    // Play footstep sounds
    audio.playStep();
    if (this.stepInterval) clearInterval(this.stepInterval);
    this.stepInterval = setInterval(() => {
      if (this.isMoving) audio.playStep();
    }, 180);

    // Complete arrival
    setTimeout(() => {
      this.isMoving = false;
      if (this.stepInterval) clearInterval(this.stepInterval);
      if (this.spriteInner) {
        this.spriteInner.classList.remove('walking-anim');
      }
      if (actionMsg && this.bubble) {
        setTimeout(() => {
          if (this.bubble) this.bubble.classList.add('opacity-0');
        }, 900);
      }
      if (onArrival) {
        onArrival();
      }
    }, duration);
  }

  speak(text, duration = 1200) {
    if (this.bubble) {
      this.bubble.textContent = text;
      this.bubble.classList.remove('opacity-0');
      setTimeout(() => {
        if (this.bubble) this.bubble.classList.add('opacity-0');
      }, duration);
    }
  }
}
