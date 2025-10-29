const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

app.post('/api/save-config', (req, res) => {
  try {
    const config = req.body;
    const filePath = path.join(__dirname, 'src', 'gameConfig.json');
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2));
    res.json({ success: true, message: 'Config saved to file!' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.listen(3001, () => console.log('Backend server running on port 3001'));