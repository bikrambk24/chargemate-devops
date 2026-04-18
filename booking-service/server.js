const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/chargemate')
  .then(() => console.log('Booking Service: MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// Booking Schema
const bookingSchema = new mongoose.Schema({
  userId:     { type: String, required: true },
  stationId:  { type: String, required: true },
  startTime:  { type: Date,   required: true },
  endTime:    { type: Date,   required: true },
  status:     { type: String, enum: ['pending','confirmed','cancelled','completed'], default: 'pending' }
}, { timestamps: true });

const Booking = mongoose.model('Booking', bookingSchema);

const STATION_SERVICE_URL = process.env.STATION_SERVICE_URL || 'http://localhost:3001';

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'booking-service' });
});

// GET bookings for a user
app.get('/bookings/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create booking (checks station availability first)
app.post('/bookings', async (req, res) => {
  try {
    const { userId, stationId, startTime, endTime } = req.body;

    // Check station exists and has slots
    const stationRes = await axios.get(`${STATION_SERVICE_URL}/stations/${stationId}`);
    const station = stationRes.data;

    if (station.availableSlots < 1) {
      return res.status(400).json({ error: 'No available slots at this station' });
    }

    // Create booking
    const booking = new Booking({ userId, stationId, startTime, endTime, status: 'confirmed' });
    await booking.save();

    // Decrement available slots
    await axios.put(`${STATION_SERVICE_URL}/stations/${stationId}`, {
      availableSlots: station.availableSlots - 1
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH cancel booking
app.patch('/bookings/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// With this:
const PORT = process.env.PORT || 3002;

if (require.main === module) {
  app.listen(PORT, () => console.log(`Booking Service running on port ${PORT}`));
}

module.exports = app;