import { useEffect, useRef } from 'react';

const Game = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 600;

      // Placeholder: Simple draw
      ctx.fillStyle = '#0000b5';
      ctx.fillRect(0, 0, 400, 600);
      ctx.fillStyle = '#fff';
      ctx.font = '30px Arial';
      ctx.fillText('Oyun Yakında!', 150, 300);
    }
  }, []);

  return (
    <div id="game-container">
      <canvas ref={canvasRef} id="game"></canvas>
    </div>
  );
};

export default Game;