function noise(x, y) {
  const left = Math.floor(x);
  const top = Math.floor(y);
  const dx = x - left;
  const dy = y - top;
  const u = dx * dx * (3 - 2 * dx);
  const v = dy * dy * (3 - 2 * dy);
  const upper = mix(sample(left, top), sample(left + 1, top), u);
  const lower = mix(sample(left, top + 1), sample(left + 1, top + 1), u);
  return mix(upper, lower, v);
}

function sample(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function mix(a, b, amount) {
  return a + (b - a) * amount;
}

function turbulence(x, y) {
  return noise(x, y) * 0.58 +
    noise(x * 2.1, y * 2.1) * 0.27 +
    noise(x * 4.3, y * 4.3) * 0.15;
}

export function drawVoicesFog(canvas) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas;
  const image = context.createImageData(width, height);
  for (let row = 0; row < height; row++) {
    const y = row / height;
    for (let column = 0; column < width; column++) {
      const x = column / width;
      const leftBank = Math.exp(-((x / 0.26) ** 2 + ((y - 0.32) / 0.22) ** 2));
      const rightBank = Math.exp(-(((1 - x) / 0.29) ** 2 + ((y - 0.72) / 0.25) ** 2));
      const curl = turbulence(x * 4 + 17, y * 5 + 8);
      const grain = turbulence(x * 5 + curl * 2, y * 26 + curl * 8);
      const density = Math.max(0, grain - 0.24) ** 1.65;
      const offset = (row * width + column) * 4;
      image.data[offset] = 176;
      image.data[offset + 1] = 193;
      image.data[offset + 2] = 211;
      image.data[offset + 3] = (leftBank + rightBank) * density * 150;
    }
  }
  context.putImageData(image, 0, 0);
}
