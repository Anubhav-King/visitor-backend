// backend/models/Visitor.js
const mongoose = require("mongoose");

const visitorSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  purpose:          { type: String, required: true },
  block:            { type: Number, required: true },
  flat:             { type: Number, required: true },
  expectedArrival:  { type: String }, // "HH:MM"
  actualArrival:    { type: String },
  departureTime:    { type: String },
  vehicleType:      { type: String, enum: ["Bike", "Car", "none"], required: false, default: "none" },
  vehicleNumber:    { type: String, required: false },
  contactNumber:    { type: String, required: true },
  photo:            { type: String }, // base64
  status:           { type: String, enum: ["pending", "approved","pre-approved","arrived","departed","denied"], default: "pending" },
  isArchived:       { type: Boolean, default: false },
  entryDate: { type: String }, // Format: "dd-mm-yyyy"
}, {
  timestamps: true  // ✅ This adds createdAt and updatedAt fields automatically
});

module.exports = mongoose.model("Visitor", visitorSchema);
