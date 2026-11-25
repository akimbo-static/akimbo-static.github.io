const lamps = [{ x: 0, y: 0.14 }, { x: 1, y: 0.19 }];

export function startWarnerDebris(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const particles = Array.from({ length: 72 }, (_, index) => {
    const lamp = lamps[index % lamps.length];
    const debris = index % 9 === 0;
    return {
      origin: lamp.x + (0.02 + Math.random() * 0.17) * (lamp.x === 0 ? 1 : -1),
      y: Math.random() * 0.72,
      phase: Math.random() * 2 * Math.PI,
      speed: debris ? 0.12 + Math.random() * 0.14 : 0.025 + Math.random() * 0.06,
      size: debris ? 1.3 + Math.random() : 0.35 + Math.random() * 0.65,
      debris,
    };
  });
  let width;
  let height;
  let frame;
  let previousTime;

  function draw(elapsed = 0) {
    context.clearRect(0, 0, width, height);
    for (const particle of particles) {
      particle.y += particle.speed * elapsed;
      if (particle.y > 0.72) particle.y = -0.04;
      const x = particle.origin + Math.sin(particle.phase + particle.y * 12) * 0.024;
      const light = Math.max(...lamps.map(lamp =>
        Math.exp(-(((x - lamp.x) / 0.12) ** 2 + ((particle.y - lamp.y) / 0.21) ** 2))
      ));
      const opacity = light ** 1.4 * (particle.debris ? 0.72 : 0.47);
      if (opacity < 0.015) continue;

      context.fillStyle = `rgba(255, 214, 146, ${opacity})`;
      context.beginPath();
      if (particle.debris) {
        const angle = particle.phase + particle.y * 16;
        for (let corner = 0; corner < 3; corner++) {
          const direction = angle + corner * 2.1;
          const radius = particle.size * (corner === 0 ? 1.6 : 0.8);
          context.lineTo(x * width + Math.cos(direction) * radius,
            particle.y * height + Math.sin(direction) * radius);
        }
        context.closePath();
      } else {
        context.arc(x * width, particle.y * height, particle.size, 0, 2 * Math.PI);
      }
      context.fill();
    }
  }

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    draw();
  }

  function animate(time) {
    const elapsed = previousTime === undefined ? 0 : Math.min((time - previousTime) / 1000, 0.05);
    previousTime = time;
    draw(elapsed);
    frame = requestAnimationFrame(animate);
  }

  function updateMotion() {
    cancelAnimationFrame(frame);
    previousTime = undefined;
    if (!motion.matches) frame = requestAnimationFrame(animate);
  }

  resize();
  updateMotion();
  window.addEventListener("resize", resize);
  motion.addEventListener("change", updateMotion);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    motion.removeEventListener("change", updateMotion);
  };
}
