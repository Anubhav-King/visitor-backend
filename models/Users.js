// backend/models/Users.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  mobile:      { type: String, required: true, unique: true },
  password:    { type: String, required: true },
  role:        { type: String, enum: ["resident","guard"], required: true },
  block:       { type: Number, required: function() { return this.role==="resident"; } },
  flat:        { type: Number, required: function() { return this.role==="resident"; } },
  subscription:{ type: Object } // push subscription object
});

module.exports = mongoose.model("User", userSchema);
