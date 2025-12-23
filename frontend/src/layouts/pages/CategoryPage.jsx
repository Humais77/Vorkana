// src/pages/CategoryPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import CategoryHero from '../../components/categories/CategoryHero';
import PopularSlider from '../../components/categories/PopularSlider';
import CategoryFAQs from '../../components/categories/CategoryFAQs';
import { SeoWrapper } from '../../components/SeoWrapper';

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

  // Generate structured data for category page
  const generateCategoryStructuredData = () => {
    if (!category) return null;

    const websiteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const currentUrl = `${websiteUrl}/categories/${category.slug || categoryId}`;

    return {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `${category.name} Services - Professional Freelancers | Vorkana`,
      "description": category.description,
      "url": currentUrl,
      "about": {
        "@type": "Thing",
        "name": category.name,
        "description": category.description,
        "category": category.name
      },
      "hasPart": category.services?.map(service => ({
        "@type": "Service",
        "name": service.title,
        "description": `Professional ${service.title.toLowerCase()} services`,
        "serviceType": category.name,
        "provider": {
          "@type": "Organization",
          "name": "Vorkana",
          "url": websiteUrl
        }
      })),
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Home",
            "item": websiteUrl
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "Categories",
            "item": `${websiteUrl}/categories`
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": category.name,
            "item": currentUrl
          }
        ]
      },
      "mainEntity": {
        "@type": "WebPage",
        "@id": currentUrl,
        "name": category.name,
        "description": category.description
      }
    };
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
      <SeoWrapper
        title="Category Not Found | Vorkana"
        description="The requested category could not be found on Vorkana marketplace."
        canonical="/categories"
        robots="noindex, follow"
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">Category not found</h2>
            <p className="text-gray-600 mt-2">The category you're looking for doesn't exist.</p>
          </div>
        </div>
      </SeoWrapper>
    );
  }

  return (
    <SeoWrapper
      title={`${category.name} Services - Professional Freelancers | Vorkana`}
      description={`${category.description} Browse ${category.totalServices}+ professional ${category.name.toLowerCase()} services with ${category.totalProviders}+ verified providers. Get quality work delivered fast.`}
      keywords={`${category.name.toLowerCase()} services, hire ${category.name.toLowerCase()} freelancers, ${category.name.toLowerCase()} experts, professional ${category.name.toLowerCase()}, online ${category.name.toLowerCase()}`}
      canonical={`/categories/${category.slug || categoryId}`}
      ogTitle={`${category.name} Services - Vorkana`}
      ogDescription={category.description}
      ogImage={category.services?.[0]?.image || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80'}
      ogType="website"
      twitterCard="summary_large_image"
      twitterSite="@vorkana"
      robots="index, follow"
      lang="en"
      breadcrumb={[
        { name: "Home", url: "/" },
        { name: "Categories", url: "/categories" },
        { name: category.name, url: `/categories/${category.slug || categoryId}` }
      ]}
      structuredData={generateCategoryStructuredData()}
    >
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
                      loading="lazy"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80';
                      }}
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
    </SeoWrapper>
  );
};

// Helper function to get category data (replace with API call)
const getCategoryData = (id, slug, name) => {
  // This is mock data - replace with actual API calls
  const categories = {
    // Programming & Tech (existing)
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
    
    // Graphic & Design (new - based on your data)
    '2': {
      name: 'Graphic & Design',
      slug: 'graphic-design',
      description: 'Transform your ideas into stunning visual designs with our expert graphic designers and creative professionals.',
      icon: 'Palette',
      totalServices: 890,
      totalProviders: 215,
      subcategories: [
        { id: 'logo-branding', name: 'Logo & Brand Identity', count: 320 },
        { id: 'web-app-design', name: 'Web & App Design', count: 280 },
        { id: 'art-illustration', name: 'Art & Illustration', count: 150 },
        { id: 'print-design', name: 'Print Design', count: 140 },
      ],
      popularServices: [
        { id: 1, title: 'Logo Design'},
        { id: 2, title: 'Brand Identity'},
        { id: 3, title: 'UI/UX Design'},
        { id: 4, title: 'Web Design'},
        { id: 5, title: 'Social Media Graphics'},
        { id: 6, title: 'Business Card Design'},
      ],
      services: [
        {
          id: 'logo-branding',
          title: 'Logo & Brand Identity',
          image: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Logo Design', 'Brand Style Guides', 'Business Cards', 'Letterhead Design', 'Brand Guidelines']
        },
        {
          id: 'web-app-design',
          title: 'Web & App Design',
          image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Website Design', 'Mobile App UI/UX', 'Landing Page Design', 'Wireframing', 'Prototyping']
        },
        {
          id: 'art-illustration',
          title: 'Art & Illustration',
          image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Digital Illustrations', 'Character Design', 'Portrait Drawing', 'Manga & Comics', 'Book Illustrations']
        },
        {
          id: 'print-design',
          title: 'Print Design',
          image: 'https://images.unsplash.com/photo-1604594849809-dfeddd82eaa9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Brochure Design', 'Flyer Design', 'Poster Design', 'Magazine Layout', 'Packaging Design']
        },
        {
          id: 'social-media',
          title: 'Social Media Graphics',
          image: 'https://images.unsplash.com/photo-1611605698323-b1e99cfd37ea?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Social Media Posts', 'Banner Design', 'Instagram Stories', 'YouTube Thumbnails', 'Ad Creatives']
        },
        {
          id: 'presentation',
          title: 'Presentation Design',
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['PowerPoint Templates', 'Keynote Design', 'Pitch Deck Design', 'Infographic Design', 'Chart Visualization']
        },
        {
          id: 'merchandise',
          title: 'Merchandise Design',
          image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['T-shirt Design', 'Mug Design', 'Sticker Design', 'Label Design', 'Product Mockups']
        },
        {
          id: 'typography',
          title: 'Typography & Lettering',
          image: 'https://images.unsplash.com/photo-1534237710431-e2fcad436e0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Custom Typography', 'Hand Lettering', 'Calligraphy', 'Font Design', 'Logo Typography']
        }
      ],
      faqs: [
        {
          question: 'What file formats do you deliver for logo designs?',
          answer: 'We deliver logo designs in multiple formats including AI, EPS (vector), PDF, PNG (transparent background), JPG, and SVG. We also provide a style guide with color codes, fonts, and usage guidelines.'
        },
        {
          question: 'How many design concepts do you provide?',
          answer: 'For logo and branding projects, we typically provide 3 initial concepts based on your brief. You can then choose one concept to refine through 2-3 rounds of revisions until you\'re completely satisfied.'
        },
        {
          question: 'What is your typical turnaround time for design projects?',
          answer: 'Simple designs like business cards take 2-3 days. Logo design takes 5-7 days. Complete brand identity packages take 10-14 days. Complex projects like website UI/UX can take 2-4 weeks depending on scope.'
        },
        {
          question: 'Do you work with existing brand guidelines?',
          answer: 'Absolutely! If you have existing brand guidelines, we\'ll strictly follow them to maintain brand consistency. If you don\'t have guidelines, we can create a comprehensive brand style guide as part of our service.'
        },
        {
          question: 'What software do your designers use?',
          answer: 'Our designers are proficient in industry-standard software including Adobe Creative Suite (Photoshop, Illustrator, InDesign), Figma, Sketch, Canva, Affinity Designer, and Procreate for digital illustrations.'
        },
        {
          question: 'Do you provide source files and commercial rights?',
          answer: 'Yes! Upon final payment, you receive all source files and full commercial rights to use the designs. You own the copyright to all final designs we create for your project.'
        }
      ]
    },
    
    // Logo and Brand Identity (specific category from your data)
    '6949ab9060c4c28c74664ebc': {
      name: 'Logo and Brand Identity',
      slug: 'logo-and-brand-identity',
      description: 'Professional logo design and brand identity services including brand style guides, business cards, and complete branding packages.',
      icon: 'Palette',
      totalServices: 320,
      totalProviders: 85,
      subcategories: [],
      popularServices: [
        { id: 1, title: 'Logo Design'},
        { id: 2, title: 'Brand Style Guide'},
        { id: 3, title: 'Business Cards'},
        { id: 4, title: 'Letterhead Design'},
        { id: 5, title: 'Brand Guidelines'},
        { id: 6, title: 'Logo Redesign'},
      ],
      services: [
        {
          id: 'logo-design',
          title: 'Logo Design',
          image: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Minimal Logo', 'Emblem Logo', 'Wordmark Logo', 'Lettermark Logo', 'Mascot Logo']
        },
        {
          id: 'brand-identity',
          title: 'Complete Brand Identity',
          image: 'https://images.unsplash.com/photo-1567446537710-0e9b8d4d8c4d?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Logo + Brand Guide', 'Business Stationery', 'Brand Colors', 'Typography System', 'Brand Assets']
        },
        {
          id: 'brand-guidelines',
          title: 'Brand Guidelines',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Style Guide Design', 'Logo Usage Rules', 'Color Palette', 'Font Guidelines', 'Brand Voice']
        },
        {
          id: 'business-stationery',
          title: 'Business Stationery',
          image: 'https://images.unsplash.com/photo-1603791440384-56cd371ee9a7?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Business Cards', 'Letterheads', 'Envelopes', 'Email Signatures', 'Presentation Templates']
        }
      ],
      faqs: [
        {
          question: 'What\'s included in a complete brand identity package?',
          answer: 'Our complete brand identity package includes: primary and secondary logos, logo variations, color palette with HEX/RGB/CMYK codes, typography system, brand pattern/texture, business card design, letterhead, envelope, email signature, social media profile kit, and a comprehensive brand style guide PDF.'
        },
        {
          question: 'How many logo concepts will I receive?',
          answer: 'For our standard package, you receive 3 unique logo concepts. For premium packages, you receive 5 concepts. Each concept is presented with mockups showing how it looks in real-world applications.'
        },
        {
          question: 'What is the revision process?',
          answer: 'After you select a concept, we provide 3 rounds of revisions. You can request changes to colors, fonts, layout, and details. Additional revisions are available for an extra fee.'
        },
        {
          question: 'Do I own the copyright to the logo?',
          answer: 'Yes! Once final payment is made, you receive full copyright ownership and commercial rights to use the logo anywhere worldwide, forever. We provide a copyright transfer document.'
        },
        {
          question: 'Can you work with my existing logo?',
          answer: 'Absolutely! We offer logo redesign and modernization services. We can refresh your existing logo while maintaining brand recognition or completely redesign it based on your needs.'
        }
      ]
    },
    
    // Web & App Design (from your data)
    '6949ac31c99d0a8db104e806': {
      name: 'Web & App Design',
      slug: 'web-and-app-design',
      description: 'Modern website and application design services including UX design, landing pages, and mobile app interfaces.',
      icon: 'Code2',
      totalServices: 280,
      totalProviders: 75,
      subcategories: [],
      popularServices: [
        { id: 1, title: 'Website Design'},
        { id: 2, title: 'Mobile App UI/UX'},
        { id: 3, title: 'Landing Page Design'},
        { id: 4, title: 'Wireframing'},
        { id: 5, title: 'Prototyping'},
        { id: 6, title: 'Dashboard Design'},
      ],
      services: [
        {
          id: 'website-design',
          title: 'Website Design',
          image: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Responsive Website Design', 'E-commerce Design', 'Portfolio Websites', 'Corporate Websites', 'Blog Design']
        },
        {
          id: 'app-design',
          title: 'Mobile App Design',
          image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['iOS App UI/UX', 'Android App Design', 'Cross-platform Design', 'App Icon Design', 'Onboarding Screens']
        },
        {
          id: 'ux-design',
          title: 'UX Design',
          image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['User Research', 'User Personas', 'User Flows', 'Information Architecture', 'Usability Testing']
        },
        {
          id: 'ui-design',
          title: 'UI Design',
          image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Interface Design', 'Visual Design Systems', 'Component Libraries', 'Design Systems', 'Style Guides']
        }
      ],
      faqs: [
        {
          question: 'What design tools do you use?',
          answer: 'We primarily use Figma for collaborative design, but also work with Adobe XD, Sketch, and InVision. For prototypes, we use Figma, Principle, and Framer. We can deliver designs in whatever format works best for your development team.'
        },
        {
          question: 'Do you design responsive websites?',
          answer: 'Yes! All our website designs are fully responsive. We design for mobile, tablet, and desktop views. We also consider different screen sizes and orientations to ensure optimal user experience across all devices.'
        },
        {
          question: 'What is included in your UX design service?',
          answer: 'Our UX design service includes: user research and interviews, competitive analysis, user personas, user journey maps, information architecture, wireframes (low and high fidelity), interactive prototypes, usability testing, and detailed UX documentation.'
        },
        {
          question: 'Do you provide design handoff to developers?',
          answer: 'Yes! We provide comprehensive design handoff packages including: design specifications, style guides, component libraries, assets in multiple formats, interactive prototypes, and developer notes. We use tools like Figma Dev Mode to make handoff seamless.'
        }
      ]
    },
    
    // Art & Illustration (from your data)
    '6949ac3ac99d0a8db104e81d': {
      name: 'Art & Illustration',
      slug: 'art-and-illustration',
      description: 'Digital art and illustration services including character design, portraits, book illustrations, and concept art.',
      icon: 'Palette',
      totalServices: 150,
      totalProviders: 40,
      subcategories: [],
      popularServices: [
        { id: 1, title: 'Digital Illustrations'},
        { id: 2, title: 'Character Design'},
        { id: 3, title: 'Portrait Drawing'},
        { id: 4, title: 'Manga & Comics'},
        { id: 5, title: 'Book Illustrations'},
        { id: 6, title: 'Concept Art'},
      ],
      services: [
        {
          id: 'digital-art',
          title: 'Digital Art',
          image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Digital Paintings', 'Vector Art', 'Line Art', 'Watercolor Style', 'Oil Painting Style']
        },
        {
          id: 'character-design',
          title: 'Character Design',
          image: 'https://images.unsplash.com/photo-1589256469067-ea99122bbdc4?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Original Characters', 'Character Sheets', 'Character Turnarounds', 'Expression Sheets', 'Character Lineups']
        },
        {
          id: 'book-illustration',
          title: 'Book Illustration',
          image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Children\'s Book Art', 'Book Cover Design', 'Chapter Illustrations', 'Spot Illustrations', 'Comic Book Art']
        },
        {
          id: 'portrait',
          title: 'Portrait Art',
          image: 'https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&q=80',
          services: ['Digital Portraits', 'Pet Portraits', 'Family Portraits', 'Caricatures', 'Anime Style Portraits']
        }
      ],
      faqs: [
        {
          question: 'What art styles do you specialize in?',
          answer: 'Our artists specialize in various styles including: realistic, semi-realistic, cartoon, anime/manga, watercolor, oil painting, vector, line art, minimalistic, and graffiti styles. We can match most artistic styles based on your references.'
        },
        {
          question: 'Can you work from reference photos?',
          answer: 'Absolutely! We can work from reference photos to create digital portraits or illustrations. We can combine multiple references or work from descriptions if you don\'t have specific photos. We always respect copyright and won\'t copy other artists\' work.'
        },
        {
          question: 'What resolution and file formats do you deliver?',
          answer: 'We deliver high-resolution files suitable for printing (300 DPI) and web use (72 DPI). Formats include: PSD (layered), AI, PNG (transparent), JPG, PDF, and TIFF. We can also provide specific formats for your needs.'
        },
        {
          question: 'How long does an illustration take?',
          answer: 'Simple illustrations take 1-3 days. Detailed character designs take 3-5 days. Complex scenes or multiple illustrations take 5-10 days. We provide timelines based on the complexity of each project.'
        }
      ]
    }
  };

  // Find by ID first, then by slug, then by name
  return categories[id] || Object.values(categories).find(cat => 
    cat.slug === slug || cat.name.toLowerCase().includes(name.toLowerCase())
  );
};

export default CategoryPage;