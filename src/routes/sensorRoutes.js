const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const SensorData = require('../models/SensorData');

// Define a variable to store predictions
let weatherPredictions = [];

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
    const { range = '24h', aggregation = '15m' } = req.query;
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
    
    // Determine aggregation interval in minutes
    let aggregationMinutes;
    switch (aggregation) {
      case '1h': aggregationMinutes = 60; break;
      case '3h': aggregationMinutes = 180; break;
      case '6h': aggregationMinutes = 360; break;
      case '12h': aggregationMinutes = 720; break;
      default: aggregationMinutes = 15; // '15m'
    }

    // Fetch data within the time range
    let data;
    
    if (aggregationMinutes > 15) {
      // Apply aggregation for larger time periods to reduce data points
      const aggregationPipeline = [
        { $match: { timestamp: { $gte: timeRange } } },
        { $sort: { timestamp: 1 } },
        { 
          $group: {
            _id: {
              $toDate: {
                $subtract: [
                  { $toLong: "$timestamp" },
                  { $mod: [{ $toLong: "$timestamp" }, aggregationMinutes * 60 * 1000] }
                ]
              }
            },
            timestamp: { $first: "$timestamp" },
            temperature: { $avg: "$temperature" },
            humidity: { $avg: "$humidity" },
            pressure: { $avg: "$pressure" },
            light: { $avg: "$light" },
            aqi: { $avg: "$aqi" },
            uv_index: { $avg: "$uv_index" }
          }
        },
        { $sort: { timestamp: 1 } }
      ];
      
      data = await SensorData.aggregate(aggregationPipeline);
    } else {
      // For small time periods or default, just use the filtered data
      data = await SensorData.find({
        timestamp: { $gte: timeRange }
      }).sort({ timestamp: 1 });
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Endpoint to receive prediction data from Python script
router.post('/data/prediction', async (req, res) => {
  try {
    const predictions = req.body;
    
    // Basic validation
    if (!Array.isArray(predictions)) {
      return res.status(400).json({ message: "Predictions must be an array" });
    }
    
    // Optional: You can validate each prediction object here
    for (const prediction of predictions) {
      if (!prediction.timestamp) {
        return res.status(400).json({ message: "Each prediction must have a timestamp" });
      }
      
      // Convert string timestamps to Date objects if needed
      if (typeof prediction.timestamp === 'string') {
        prediction.timestamp = new Date(prediction.timestamp);
      }
      
      // Add is_prediction flag to distinguish from actual readings
      prediction.is_prediction = true;
    }
    
    // Store the predictions in memory
    weatherPredictions = predictions;
    
    console.log(`Received ${predictions.length} weather predictions`);
    res.status(201).json({ message: "Predictions received successfully" });
    
  } catch (error) {
    console.error("Error processing predictions:", error);
    res.status(500).json({ message: error.message });
  }
});

// Endpoint to retrieve prediction data
router.get('/data/prediction', async (req, res) => {
  // Return the stored predictions
  res.json(weatherPredictions);
});

module.exports = router;
