const mongoose = require('mongoose');

const uri = 'mongodb+srv://King:King%402025@visitor-database.r7r8srv.mongodb.net/?retryWrites=true&w=majority&appName=Visitor-Database;

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => console.error('❌ MongoDB connection error:', err));

module.exports = mongoose;
