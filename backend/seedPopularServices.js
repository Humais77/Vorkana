// scripts/seedPopularServices.js (run once)
const dotenv = require('dotenv');
dotenv.config();
const mongoose = require('mongoose');
const Service = require('./models/services.model');
const Category = require('./models/category.model');
const popularServicesData  = [
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
    publicId: "lnszmqoan7b4zdaezjei", 
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
const seedPopularServices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    
    for (const serviceData of popularServicesData) {
      const category = await Category.findOne({ 
        slug: serviceData.categorySlug,
        isActive: true 
      });
      
      if (category) {
        await Service.updateMany(
          { 
            category: category._id,
            status: 'active',
            isActive: true,
            rating: { $gte: 4.5 }
          },
          { 
            $set: { 
              isPopular: true,
              searchKeywords: serviceData.searchKeywords 
            } 
          }
        );
      }
    }
    
    console.log('✅ Popular services seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding popular services:', error);
    process.exit(1);
  }
};

seedPopularServices();