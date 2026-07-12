// Grab the fixed canvas reference from the DOM template
const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');

/* --- OPTIMIZED OVERLAY CONFIGURATION --- */
const numStars = 80; 
const mouse = { x: null, y: null, radius: 140 }; 
let stars = [];

// Interactive capture vectors
window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

window.addEventListener('mouseleave', () => {
  mouse.x = null;
  mouse.y = null;
});

// Define the Star class layout first
class Star {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.baseX = this.x;
    this.baseY = this.y;
    this.size = Math.random() * 1.8 + 1.0;  
    this.alpha = Math.random() * 0.5 + 0.5; 
    this.density = (Math.random() * 30) + 15; 
  }

  draw() {
    ctx.fillStyle = `rgba(225, 245, 255, ${this.alpha})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  update() {
    if (mouse.x !== null && mouse.y !== null) {
      let dx = mouse.x - this.x;
      let dy = mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < mouse.radius) {
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let maxForce = (mouse.radius - distance) / mouse.radius;
        let force = maxForce * 9; 

        this.x -= forceDirectionX * force;
        this.y -= forceDirectionY * force;
        return; 
      }
    }

    if (this.x !== this.baseX) {
      let dx = this.x - this.baseX;
      this.x -= dx / this.density;
    }
    if (this.y !== this.baseY) {
      let dy = this.y - this.baseY;
      this.y -= dy / this.density;
    }
  }
}

// System state helpers
function init() {
  stars = [];
  for (let i = 0; i < numStars; i++) {
    stars.push(new Star());
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < stars.length; i++) {
    stars[i].update();
    stars[i].draw();
  }
  requestAnimationFrame(animate);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  init(); 
}

window.addEventListener('resize', resizeCanvas);

// Kickstart script execution safely
resizeCanvas();
animate();