import confetti from "canvas-confetti";

export function fireRoseConfetti() {
  const rose = confetti.shapeFromText({ text: "🌹", scalar: 2 });

  confetti({
    particleCount: 60,
    spread: 80,
    origin: { y: 0.6 },
    shapes: [rose],
    scalar: 2,
    ticks: 200,
    gravity: 0.7,
    drift: 0,
  });

  // Second burst from slightly different origin for depth
  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { x: 0.3, y: 0.55 },
      shapes: [rose],
      scalar: 2,
      ticks: 180,
      gravity: 0.8,
    });
  }, 150);

  setTimeout(() => {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { x: 0.7, y: 0.55 },
      shapes: [rose],
      scalar: 2,
      ticks: 180,
      gravity: 0.8,
    });
  }, 300);
}
