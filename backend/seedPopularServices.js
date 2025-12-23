// scripts/seedPopularServices.js (run once)
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const PopularService = require('./models/PopularService');
if (!process.env.MONGO_URL) {
  console.error('❌ Error: MONGO_URL is not defined in .env file');
  process.exit(1);
}

console.log('Connecting to:', process.env.MONGO_URL);
const services = [
  {
    name: "Website Development",
    description: "Professional web solutions",
    searchQuery: "website development",
    category: "web",
    publicId: "rnh7tzst2c3dn174ymlb",
    order: 1
  },
  {
    name: "Video Editing",
    description: "Creative video production",
    searchQuery: "video editing",
    category: "video",
    publicId: "k012iflvrjkqvkvhnqvb",
    order: 2
  },
  {
    name: "Software Development",
    description: "Custom software solutions",
    searchQuery: "software development",
    category: "software",
    publicId: "duoiabdtuud9ija5m5r4",
    order: 3
  },
  {
    name: "Mobile App Development",
    description: "Native and cross-platform apps",
    searchQuery: "mobile app",
    category: "mobile",
    publicId: "duoiabdtuud9ija5m5r4", // fix duplicate if needed
    order: 4
  },
  {
    name: "Graphic Design",
    description: "Visual design services",
    searchQuery: "graphic design",
    category: "design",
    publicId: "ce3j5h3kgt5umxymvkon",
    order: 5
  },
  {
    name: "Data Analysis",
    description: "Data analytics services",
    searchQuery: "data analysis",
    category: "data",
    publicId: "k01xqmefzhmwyfceifqk",
    order: 6
  }
];

// Connect to DB and insert
mongoose.connect(process.env.MONGO_URL)
  .then(async () => {
    console.log('Connected to MongoDB');

    // Optional: clear existing data (remove in production!)
    await PopularService.deleteMany({});

    await PopularService.insertMany(services);
    console.log('✅ Popular services seeded successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });