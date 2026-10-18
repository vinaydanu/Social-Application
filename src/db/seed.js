const bcrypt = require('bcryptjs');
const dbHelper = require('./database');

async function seed() {
  console.log('--- Seeding ConnectSphere Database ---');
  
  const saltRounds = 10;
  const demoPassword = 'Password123!';
  const demoHash = await bcrypt.hash(demoPassword, saltRounds);

  const demoUsers = [
    {
      firstName: 'Alex',
      lastName: 'Morgan',
      username: 'alexm',
      email: 'alex@example.com',
      passwordHash: demoHash,
      dateOfBirth: '1995-06-15',
      gender: 'Non-binary',
      avatarColor: '#1877f2'
    },
    {
      firstName: 'Sarah',
      lastName: 'Connor',
      username: 'sarahc',
      email: 'sarah@example.com',
      passwordHash: demoHash,
      dateOfBirth: '1992-11-28',
      gender: 'Female',
      avatarColor: '#42b72a'
    },
    {
      firstName: 'David',
      lastName: 'Kim',
      username: 'davidk',
      email: 'david@example.com',
      passwordHash: demoHash,
      dateOfBirth: '1998-03-22',
      gender: 'Male',
      avatarColor: '#e0245e'
    }
  ];

  for (const user of demoUsers) {
    const existing = dbHelper.findUserWithHashByIdentifier(user.email);
    if (!existing) {
      const created = dbHelper.createUser(user);
      console.log(`Created demo user: ${created.email} (Username: ${created.username})`);
      
      // Add a welcome post
      dbHelper.createPost(created.id, `Hello ConnectSphere! Excited to join this secure demo social community.`);
    } else {
      console.log(`User ${user.email} already exists, skipping.`);
    }
  }

  console.log('\nSeed completed successfully.');
  console.log('Demo Credentials for Testing:');
  console.log('Email:    alex@example.com (or username: alexm)');
  console.log('Password: Password123!');
  console.log('--------------------------------------');
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  });
}

module.exports = seed;
