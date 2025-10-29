import React, { useState, useEffect } from 'react';
import { Box, Tabs, Tab, Typography, Button, TextField, Select, MenuItem, InputLabel, FormControl, Grid, Paper } from '@mui/material';
import defaultConfig from './gameConfig.json';

function ModernAdminPanel() {
  const [tab, setTab] = useState(0);
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('gameConfig');
    return saved ? JSON.parse(saved) : defaultConfig;
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Load current config
    const saved = localStorage.getItem('gameConfig');
    if (saved) {
      setConfig(JSON.parse(saved));
    }
  }, []);

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

  // Renkler
  const renderColors = () => (
    <Grid container spacing={2}>
      {Object.entries(config.colors).map(([key, val]) => (
        <Grid item xs={6} key={key}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">{key}</Typography>
            <input type="color" value={val} onChange={e => handleConfigChange('colors', key, e.target.value)} style={{ width: '100%', height: '40px', border: 'none', background: 'none' }} />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  // Oynanış
  const renderGameplay = () => (
    <Grid container spacing={2}>
      {Object.entries(config.gameplay).map(([key, val]) => (
        <Grid item xs={6} key={key}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="subtitle2">{key}</Typography>
            <TextField type="number" value={val} onChange={e => handleConfigChange('gameplay', key, Number(e.target.value))} fullWidth />
          </Paper>
        </Grid>
      ))}
    </Grid>
  );

  // Diğer ayarlar
  const renderOther = () => (
    <Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel>Zorluk</InputLabel>
        <Select value={config.difficulty} label="Zorluk" onChange={e => setConfig(prev => ({ ...prev, difficulty: e.target.value }))}>
          <MenuItem value="easy">Kolay</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="hard">Zor</MenuItem>
        </Select>
      </FormControl>
      <TextField label="Başlangıç Can" type="number" value={config.player.lives} onChange={e => handleConfigChange('player', 'lives', Number(e.target.value))} fullWidth sx={{ mb: 2 }} />
      <TextField label="Perfect Radius" type="number" value={config.player.perfectRadius} onChange={e => handleConfigChange('player', 'perfectRadius', Number(e.target.value))} fullWidth sx={{ mb: 2 }} />
    </Box>
  );

  // Kaydet
  const handleSave = () => {
    localStorage.setItem('gameConfig', JSON.stringify(config));
    setMessage('Ayarlar kaydedildi ve kalıcı!');
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', mt: 4, p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: 3 }}>
      <Typography variant="h4" align="center" sx={{ mb: 3 }}>Admin Paneli</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} centered sx={{ mb: 3 }}>
        <Tab label="Diğer Ayarlar" />
        <Tab label="Renkler" />
        <Tab label="Oynanış" />
      </Tabs>
      {tab === 0 && renderOther()}
      {tab === 1 && renderColors()}
      {tab === 2 && renderGameplay()}
      <Button variant="contained" color="success" fullWidth sx={{ mt: 3 }} onClick={handleSave}>Kaydet</Button>
      {message && <Typography align="center" color="success.main" sx={{ mt: 2 }}>{message}</Typography>}
    </Box>
  );
}

export default ModernAdminPanel;
