import { useEffect, useRef, useState } from 'react';
import defaultConfig from './gameConfig.json';
import gameAssets from './gameAssets.json';
import { initGame } from './game.js';

const Game = ({ onGameOver }) => {
  const canvasRef = useRef(null);
  const hudRef = useRef(null);
  const centerRef = useRef(null);
  const [gameConfig, setGameConfig] = useState(defaultConfig);

  useEffect(() => {
    // Fetch latest config
    fetch('/src/gameConfig.json')
      .then(res => res.json())
      .then(setGameConfig)
      .catch(() => setGameConfig(defaultConfig));
  }, []);

  useEffect(() => {
    if (canvasRef.current && hudRef.current && centerRef.current && gameConfig) {
      initGame(canvasRef.current, gameConfig, gameAssets, onGameOver, hudRef.current, centerRef.current);
    }
  }, [onGameOver, gameConfig]);

  return (
    <div>
      <div className="hud" ref={hudRef} id="hud">
        <div className="pill" id="score">Score: 0</div>
        <div className="pill" id="level">Level: 1</div>
        <div className="pill" id="lives">Lives: 3</div>
      </div>
      <div className="center-msg" ref={centerRef} id="center">
        {/* JS ile doldurulacak */}
      </div>
      <canvas ref={canvasRef} id="game"></canvas>
    </div>
  );
};

export default Game;