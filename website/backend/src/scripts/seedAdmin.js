const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const env = require('../config/env');
const AdminUser = require('../models/AdminUser');

const parseArgs = () => {
  const args = {};
  process.argv.slice(2).forEach((arg) => {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  });
  return args;
};

const run = async () => {
  const { email, password, name } = parseArgs();

  if (!email || !password || !name) {
    console.error('Usage: node src/scripts/seedAdmin.js --email=admin@kaamsaathi.com --password=ChangeMe123! --name="Root Admin"');
    process.exit(1);
  }

  await mongoose.connect(env.mongoUri);

  const existing = await AdminUser.findOne({ email: email.toLowerCase() });
  if (existing) {
    console.error(`An admin with email ${email} already exists.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, env.bcryptSaltRounds);
  const admin = await AdminUser.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: 'super-admin',
  });

  console.log(`Admin created: ${admin.email} (id: ${admin._id})`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((error) => {
  console.error('Failed to seed admin:', error);
  process.exit(1);
});
