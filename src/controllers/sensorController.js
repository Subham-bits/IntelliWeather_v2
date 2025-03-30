const SensorData = require('../models/SensorData');

exports.storeData = async (req, res) => {
  try {
    const { temperature, humidity, pressure, light, ds18b20_temp, aqi, uv_index } = req.body;

    // Validate Data
    if (temperature === undefined || humidity === undefined) {
      return res.status(400).json({ error: "Missing required data fields" });
    }

    // Get the latest data entry
    const lastEntry = await SensorData.findOne().sort({ timestamp: -1 });

    // Check if 15 minutes have passed since the last stored entry
    if (lastEntry) {
      const timeDiff = (Date.now() - lastEntry.timestamp) / (1000 * 60); // Convert ms to minutes
      if (timeDiff < 15) {
        return res.status(200).json({ message: "Data ignored (too soon)" });
      }
    }

    // Save new data
    const newEntry = new SensorData({
      temperature,
      humidity,
      pressure,
      light,
      ds18b20_temp,
      aqi,
      uv_index,
    });
    await newEntry.save();

    console.log("📡 Data stored:", req.body);
    res.status(201).json({ message: "Data stored successfully" });
  } catch (err) {
    console.error("❌ Error saving data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

exports.getData = async (req, res) => {
  try {
    const data = await SensorData.find().sort({ timestamp: -1 }).limit(50);
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}; 