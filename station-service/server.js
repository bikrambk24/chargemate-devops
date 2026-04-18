const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chargemate')
  .then(() => console.log('Station Service: MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Station Schema
const stationSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  location:    { type: String, required: true },
  chargerType: { type: String, enum: ['slow', 'fast', 'rapid'], required: true },
  totalSlots:  { type: Number, required: true },
  availableSlots: { type: Number, required: true },
  pricePerHour:{ type: Number, required: true }
}, { timestamps: true });

const Station = mongoose.model('Station', stationSchema);

// Health check — required for AWS & Jenkins
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'station-service' });
});

// GET all stations (with optional filters)
app.get('/stations', async (req, res) => {
  try {
    const filter = {};
    if (req.query.chargerType) filter.chargerType = req.query.chargerType;
    if (req.query.location)    filter.location = new RegExp(req.query.location, 'i');
    const stations = await Station.find(filter);
    res.json(stations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single station
app.get('/stations/:id', async (req, res) => {
  try {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create station
app.post('/stations', async (req, res) => {
  try {
    const station = new Station(req.body);
    await station.save();
    res.status(201).json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update station
app.put('/stations/:id', async (req, res) => {
  try {
    const station = await Station.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE station
app.delete('/stations/:id', async (req, res) => {
  try {
    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json({ message: 'Station deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Station Service running on port ${PORT}`));

module.exports = app; // exported for testing