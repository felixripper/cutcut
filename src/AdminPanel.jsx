import React, { useState } from 'react';
import gameConfig from './gameConfig.json';
import gameAssets from './gameAssets.json';
import './AdminPanel.css';

const defaultConfig = JSON.parse(JSON.stringify(gameConfig));
const defaultAssets = JSON.parse(JSON.stringify(gameAssets));

function AdminPanel() {
  const [config, setConfig] = useState(defaultConfig);
  const [assets, setAssets] = useState(defaultAssets);
  const [tab, setTab] = useState('ayarlar');
  const [message, setMessage] = useState('');

  // Ayarları güncelle
  const handleConfigChange = (section, key, value) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  // Renk ayarları
  const renderColors = () => (
    <div className="panel-section">
      <h3>Renkler</h3>
      {Object.entries(config.colors).map(([key, val]) => (
        <div key={key} className="panel-row">
          <label>{key}</label>
          <input type="color" value={val} onChange={e => handleConfigChange('colors', key, e.target.value)} />
        </div>
      ))}
    </div>
  );

  // Oynanış ayarları
  const renderGameplay = () => (
    <div className="panel-section">
      <h3>Oynanış</h3>
      {Object.entries(config.gameplay).map(([key, val]) => (
        <div key={key} className="panel-row">
          <label>{key}</label>
          <input type="number" value={val} onChange={e => handleConfigChange('gameplay', key, Number(e.target.value))} />
        </div>
      ))}
    </div>
  );

  // Diğer ayarlar
  const renderOther = () => (
    <div className="panel-section">
      <h3>Diğer Ayarlar</h3>
      <div className="panel-row">
        <label>Zorluk</label>
        <select value={config.difficulty} onChange={e => setConfig(prev => ({ ...prev, difficulty: e.target.value }))}>
          <option value="easy">Kolay</option>
          <option value="normal">Normal</option>
          <option value="hard">Zor</option>
        </select>
      </div>
      <div className="panel-row">
        <label>Başlangıç Can</label>
        <input type="number" value={config.player.lives} onChange={e => handleConfigChange('player', 'lives', Number(e.target.value))} />
      </div>
      <div className="panel-row">
        <label>Perfect Radius</label>
        <input type="number" value={config.player.perfectRadius} onChange={e => handleConfigChange('player', 'perfectRadius', Number(e.target.value))} />
      </div>
    </div>
  );

  // Kaydet butonu
  const handleSave = () => {
    setMessage('Ayarlar kaydedildi! (Demo: JSON dosyasına yazılmadı)');
    // Gerçek uygulamada burada dosyaya veya onchain'e yazılır
  };

  return (
    <div className="admin-panel">
      <h2>Admin Paneli</h2>
      <div className="panel-tabs">
        <button onClick={() => setTab('ayarlar')} className={tab === 'ayarlar' ? 'active' : ''}>Ayarlar</button>
        <button onClick={() => setTab('renkler')} className={tab === 'renkler' ? 'active' : ''}>Renkler</button>
        <button onClick={() => setTab('oynaniş')} className={tab === 'oynaniş' ? 'active' : ''}>Oynanış</button>
      </div>
      {tab === 'ayarlar' && renderOther()}
      {tab === 'renkler' && renderColors()}
      {tab === 'oynaniş' && renderGameplay()}
      <button className="save-btn" onClick={handleSave}>Kaydet</button>
      {message && <div className="panel-message">{message}</div>}
    </div>
  );
}

export default AdminPanel;
