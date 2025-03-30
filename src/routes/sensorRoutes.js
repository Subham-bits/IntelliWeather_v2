const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const SensorData = require('../models/SensorData');

// 📥 API Endpoint to Receive Data from NodeMCU
router.post('/data', sensorController.storeData);

// 📤 API Endpoint to Fetch Data for Frontend
router.get('/data', sensorController.getData);

// Get latest data
router.get('/data', async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(1);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get historical data
router.get('/data/history', async (req, res) => {
  try {
    const { range = '24h' } = req.query;
    let timeRange;

    // Calculate the time range
    const now = new Date();
    switch (range) {
      case '7d':
        timeRange = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        timeRange = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        timeRange = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Fetch data within the time range
    const data = await SensorData.find({
      timestamp: { $gte: timeRange }
    }).sort({ timestamp: 1 });

    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 