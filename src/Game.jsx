import { useEffect, useRef } from 'react';

const Game = ({ onGameOver }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 600;

      // Simple game placeholder: Draw a ball and move it
      let x = 200, y = 300, dx = 2, dy = 2;
      const radius = 20;

      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.closePath();

        x += dx;
        y += dy;

        if (x + radius > canvas.width || x - radius < 0) dx = -dx;
        if (y + radius > canvas.height || y - radius < 0) dy = -dy;

        requestAnimationFrame(draw);
      };

      draw();

      // Simulate game over on space key
      const handleKey = (e) => {
        if (e.code === 'Space') {
          onGameOver(150); // Placeholder score
        }
      };
      window.addEventListener('keydown', handleKey);

      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [onGameOver]);

  return (
    <div id="game-container">
      <canvas ref={canvasRef} id="game"></canvas>
      <p>Boşluk tuşuna basarak oyunu bitir (test için)</p>
    </div>
  );
};

export default Game;