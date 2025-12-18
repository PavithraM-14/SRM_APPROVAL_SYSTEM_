const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function checkData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const Request = mongoose.model('Request', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Find the manager
    const manager = await User.findOne({ role: 'institution_manager' });
    console.log('Manager:', manager.name, manager._id);
    
    // Find all requests
    const requests = await Request.find({}).populate('history.actor', 'name email');
    console.log('\nAll requests:');
    
    requests.forEach(req => {
      console.log(`\n--- Request: ${req.title} (${req._id})`);
      console.log(`Status: ${req.status}`);
      console.log('History:');
      req.history.forEach(h => {
        const actorName = h.actor?.name || 'Unknown';
        const isManager = h.actor?._id?.toString() === manager._id.toString();
        console.log(`  - ${h.action} by ${actorName} ${isManager ? '(MANAGER)' : ''} -> ${h.newStatus || 'no status change'}`);
      });
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();