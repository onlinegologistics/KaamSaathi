const mongoose = require('mongoose');
const env = require('../config/env');
const Category = require('../models/Category');
const Report = require('../models/Report');
const User = require('../models/User');
const Job = require('../models/Job');

const DEFAULT_CATEGORIES = [
  { name: 'Labor', key: 'labor', icon: 'hammer', color: '#E4622A', sortOrder: 1 },
  { name: 'Tutoring', key: 'tutoring', icon: 'book-open-variant', color: '#5B6FE0', sortOrder: 2 },
  { name: 'Delivery', key: 'delivery', icon: 'moped', color: '#2E9E5B', sortOrder: 3 },
  { name: 'Events', key: 'events', icon: 'party-popper', color: '#B14FC7', sortOrder: 4 },
  { name: 'Cleaning', key: 'cleaning', icon: 'broom', color: '#0F766E', sortOrder: 5 },
  { name: 'Retail', key: 'retail', icon: 'storefront', color: '#E0A030', sortOrder: 6 },
];

const run = async () => {
  await mongoose.connect(env.mongoUri);

  for (const cat of DEFAULT_CATEGORIES) {
    await Category.findOneAndUpdate({ key: cat.key }, { $setOnInsert: cat }, { upsert: true });
  }
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} categories (existing ones left untouched).`);

  const existingReports = await Report.countDocuments();
  if (existingReports === 0) {
    const sampleUser = await User.findOne();
    const sampleJob = await Job.findOne();

    if (sampleUser) {
      const demoReports = [];
      if (sampleJob) {
        demoReports.push({
          targetType: 'job',
          targetId: sampleJob._id,
          reporterId: sampleUser._id,
          reason: 'Suspicious pay rate / possible scam listing',
          status: 'pending',
        });
      }
      demoReports.push({
        targetType: 'user',
        targetId: sampleUser._id,
        reporterId: sampleUser._id,
        reason: 'Reported for inappropriate messages',
        status: 'pending',
      });
      await Report.insertMany(demoReports);
      console.log(`Seeded ${demoReports.length} demo reports.`);
    } else {
      console.log('No users found in the database yet — skipped demo report seeding.');
    }
  } else {
    console.log('Reports already exist — skipped demo report seeding.');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed demo data:', error);
  process.exit(1);
});
