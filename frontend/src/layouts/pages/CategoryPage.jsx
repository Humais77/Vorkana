// src/pages/CategoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import CategoryHero from '../../components/categories/CategoryHero';
import PopularSlider from '../../components/categories/PopularSlider';
import CategoryFAQs from '../../components/categories/CategoryFAQs';

const CategoryPage = () => {
  const { categoryId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);

  const queryParams = new URLSearchParams(location.search);
  const categoryName = queryParams.get('name') || '';
  const categorySlug = queryParams.get('slug') || '';

  // Fetch category data based on ID or slug
  useEffect(() => {
    const fetchCategoryData = async () => {
      setLoading(true);
      try {
        const categoryData = getCategoryData(categoryId, categorySlug, categoryName);
        setCategory(categoryData);
      } catch (error) {
        console.error('Error fetching category:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [categoryId, categorySlug, categoryName]);

  // Handle service click
  const handleServiceClick = (serviceName, categoryName) => {
    const serviceSlug = serviceName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/gigs?service=${encodeURIComponent(serviceName)}&category=${encodeURIComponent(categoryName)}&slug=${serviceSlug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Category not found</h2>
          <p className="text-gray-600 mt-2">The category you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <CategoryHero
        category={category.name} 
        description={category.description}
        icon={category.icon}
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PopularSlider 
          category={category.name}
          services={category.popularServices}
        />
        
        {/* Explore Section */}
        <div className="mb-16">
          <div className="flex justify-start mb-8">
            <h2 className="text-3xl font-bold text-black">
              Explore {category.name}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {category.services.map((service, index) => (
              <div key={service.id} className="space-y-6">
                {/* Image at top (no card) */}
                <div className="rounded-lg overflow-hidden h-48">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                </div>
                
                {/* Card with heading and services */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    {service.title}
                  </h3>
                  
                  <div className="space-y-3">
                    {service.services.map((item, itemIndex) => (
                      <div 
                        key={itemIndex} 
                        className="flex items-center cursor-pointer"
                        onClick={() => handleServiceClick(item, category.name)}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-3"></div>
                        <span className="text-gray-700 hover:text-green-600 transition-colors">
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <CategoryFAQs
          category={category.name}
          faqs={category.faqs}
        />
      </div>
    </div>
  );
};

// Helper function to get category data (replace with API call)
const getCategoryData = (id, slug, name) => {
  // This is mock data - replace with actual API calls
  const categories = {
    '1': {
      name: 'Programming & Tech',
      slug: 'programming-tech',
      description: 'From concept to deployment, our expert developers bring your ideas to life with cutting-edge technology solutions.',
      icon: 'Code2',
      totalServices: 1250,
      totalProviders: 320,
      subcategories: [
        { id: 'web-dev', name: 'Web Development', count: 450 },
        { id: 'mobile-apps', name: 'Mobile Apps', count: 320 },
        { id: 'software-dev', name: 'Software Development', count: 280 },
        { id: 'game-dev', name: 'Game Development', count: 120 },
      ],
      popularServices: [
        { id: 1, title: 'Python Development'},
        { id: 2, title: 'HTML & CSS Development'},
        { id: 3, title: 'JavaScript Development'},
        { id: 4, title: 'WordPress Development'},
        { id: 5, title: 'Shopify Flow'},
        { id: 6, title: 'React Development'},
      ],
      services: [
        {
          id: 'websites',
          title: 'Websites',
          image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Website Development', 'Website Maintenance', 'WordPress', 'Shopify', 'Custom Websites']
        },
        {
          id: 'application-dev',
          title: 'Application Development',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Full Stack Web Apps', 'Desktop Applications', 'Game Development', 'Chatbot Development', 'Browser Extensions']
        },
        {
          id: 'software-dev',
          title: 'Software Development',
          image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['AI Development', 'APIs & Integrations', 'Scripting', 'Plugins Development', 'Software Consulting']
        },
        {
          id: 'mobile-apps',
          title: 'Mobile Apps',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Mobile App Development', 'Cross-platform Apps', 'Android App Development', 'iOS App Development', 'Mobile App Maintenance']
        },
        {
          id: 'website-platforms',
          title: 'Website Platforms',
          image: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Wix', 'Webflow', 'GoDaddy', 'Squarespace', 'WooCommerce']
        },
        {
          id: 'vibe-coding',
          title: 'Vibe Coding',
          image: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Development & MVP', 'Troubleshooting & Improvements', 'Deployments & DevOps', 'Consultation & Training', 'Support Services']
        },
        {
          id: 'support-security',
          title: 'Support & Cybersecurity',
          image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Support & IT', 'Cloud Computing', 'DevOps Engineering', 'Cybersecurity', 'Infrastructure']
        },
        {
          id: 'blockchain',
          title: 'Blockchain & Cryptocurrency',
          image: 'https://images.unsplash.com/photo-1620336655055-bd87c5d1d73f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Blockchain Development', 'Decentralized Apps (dApps)', 'Coin Design & Tokenization', 'Blockchain Security', 'Exchange Platforms']
        }
      ],
      faqs: [
        {
          question: 'What programming languages do your developers specialize in?',
          answer: 'Our developers are proficient in a wide range of programming languages including JavaScript, Python, Java, C#, PHP, Ruby, Swift, Kotlin, and Go. We also have specialists in frameworks like React, Angular, Vue.js, Django, Spring, and .NET.'
        },
        {
          question: 'How long does it typically take to develop a custom web application?',
          answer: 'Development time varies based on complexity. A simple website may take 1-2 weeks, while a complex web application can take 2-6 months. We provide detailed project timelines after requirements analysis.'
        },
        {
          question: 'Do you provide maintenance and support after development?',
          answer: 'Yes, we offer comprehensive maintenance packages including bug fixes, security updates, feature enhancements, and 24/7 technical support. Our support plans are flexible and can be customized to your needs.'
        },
        {
          question: 'What is your approach to project management and communication?',
          answer: 'We use agile methodologies with regular sprints, daily stand-ups, and weekly progress reports. You\'ll have a dedicated project manager and access to project management tools like Jira, Trello, or Asana for transparent communication.'
        },
        {
          question: 'Can you work with existing codebases or legacy systems?',
          answer: 'Absolutely. Our developers are experienced in working with existing codebases, refactoring legacy systems, and integrating new features with old technologies. We conduct thorough code reviews before starting any migration or enhancement work.'
        },
        {
          question: 'What security measures do you implement in your development process?',
          answer: 'We follow security best practices including code reviews, vulnerability scanning, penetration testing, SSL implementation, secure authentication, and regular security updates. We also comply with GDPR, HIPAA, and other relevant regulations.'
        }
      ]
    },
    // Add other categories similarly...
  };

  // Find by ID first, then by slug, then by name
  return categories[id] || Object.values(categories).find(cat => 
    cat.slug === slug || cat.name.toLowerCase().includes(name.toLowerCase())
  );
};

export default CategoryPage;