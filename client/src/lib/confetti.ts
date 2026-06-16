type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: "rect" | "circle";
  life: number;
};

const COLORS = ["#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6"];

export function fireConfetti(opts: { particleCount?: number; spread?: number; originY?: number } = {}) {
  if (typeof window === "undefined") return;
  const particleCount = opts.particleCount ?? 120;
  const spread = opts.spread ?? 70;
  const originY = opts.originY ?? 0.6;

  const canvas = document.createElement("canvas");
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.width = "100vw";
  canvas.style.height = "100vh";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "9999";
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const particles: Particle[] = [];
  const cx = canvas.width / 2;
  const cy = canvas.height * originY;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() - 0.5) * (spread * Math.PI / 180) - Math.PI / 2;
    const speed = 8 + Math.random() * 8;
    particles.push({
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed * (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * speed - Math.random() * 4,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 6,
      shape: Math.random() > 0.5 ? "rect" : "circle",
      life: 1,
    });
  }

  let frame = 0;
  const maxFrames = 180;

  function tick() {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = 0;
    for (const p of particles) {
      if (p.life <= 0) continue;
      alive++;
      p.vy += 0.25;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      p.life -= 1 / maxFrames;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, p.life);
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    frame++;
    if (alive > 0 && frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }
  requestAnimationFrame(tick);
}

export function fireBurst() {
  fireConfetti({ particleCount: 60, spread: 90, originY: 0.5 });
}
