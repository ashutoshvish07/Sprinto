const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);
require('dotenv').config()
const mongoose = require('mongoose')
const { sendDueDateReminders } = require('../jobs/reminderJob')
// Must load all models before running any queries
require('../models/User')
require('../models/Project')
require('../models/Task')

const run = async () => {
  try {
    console.log('🔌 Connecting to MongoDB...')
    await mongoose.connect(process.env.MONGO_URI)
    console.log('✅ Connected\n')

    await sendDueDateReminders()

  } catch (err) {
    console.error('❌ Error:', err.message)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
    process.exit(0)
  }
}

run()