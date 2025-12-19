import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, 
  Sparkles, TrendingUp, Users, Star,
  Globe, Camera, Code, Palette,
  Smartphone, BookOpen, Building,
  Cpu, Megaphone, Zap, Music,
  Monitor, FileText, ShoppingBag,
  Headphones, Brush, BarChart,
  Cloud, Database, Gamepad,
  Video, Heart, MessageSquare
} from "lucide-react";
import { motion } from "framer-motion";

const services = [
    {
        id: "website-development",
        name: "Website Development",
        description: "Professional web solutions",
        image: "https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg",
        icon: <Globe className="w-6 h-6" />,
        color: "from-blue-600 to-cyan-500",
        searchQuery: "website development",
        category: "web"
    },
    {
        id: "video-editing",
        name: "Video Editing",
        description: "Creative video production",
        image: "https://images.pexels.com/photos/277349/pexels-photo-277349.jpeg",
        icon: <Camera className="w-6 h-6" />,
        color: "from-purple-600 to-pink-500",
        searchQuery: "video editing",
        category: "video"
    },
    {
        id: "software-development",
        name: "Software Development",
        description: "Custom software solutions",
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
        icon: <Code className="w-6 h-6" />,
        color: "from-green-600 to-emerald-500",
        searchQuery: "software development",
        category: "software"
    },
    {
        id: "mobile-app-development",
        name: "Mobile App Development",
        description: "App development",
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
        icon: <Smartphone className="w-6 h-6" />,
        color: "from-blue-700 to-indigo-600",
        searchQuery: "mobile app",
        category: "mobile"
    },
    {
        id: "graphic-design",
        name: "Graphic Design",
        description: "Visual design services",
        image: "https://images.pexels.com/photos/1591061/pexels-photo-1591061.jpeg",
        icon: <Palette className="w-6 h-6" />,
        color: "from-purple-600 to-pink-500",
        searchQuery: "graphic design",
        category: "design"
    },
    {
        id: "content-writing",
        name: "Content Writing",
        description: "Professional writing",
        image: "https://images.pexels.com/photos/7358/startup-photos.jpg",
        icon: <FileText className="w-6 h-6" />,
        color: "from-teal-600 to-cyan-500",
        searchQuery: "content writing",
        category: "writing"
    },
    {
        id: "social-media-marketing",
        name: "Social Media Marketing",
        description: "Digital marketing",
        image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
        icon: <Megaphone className="w-6 h-6" />,
        color: "from-fuchsia-600 to-purple-500",
        searchQuery: "social media marketing",
        category: "marketing"
    },
    {
        id: "ai-services",
        name: "AI Services",
        description: "AI-powered solutions",
        image: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg",
        icon: <Cpu className="w-6 h-6" />,
        color: "from-indigo-600 to-violet-500",
        searchQuery: "ai services",
        category: "ai"
    },
    {
        id: "data-analysis",
        name: "Data Analysis",
        description: "Data analytics services",
        image: "https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg",
        icon: <BarChart className="w-6 h-6" />,
        color: "from-orange-600 to-red-500",
        searchQuery: "data analysis",
        category: "data"
    },
    {
        id: "seo-optimization",
        name: "SEO Optimization",
        description: "Search engine optimization",
        image: "https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg",
        icon: <TrendingUp className="w-6 h-6" />,
        color: "from-green-600 to-teal-500",
        searchQuery: "seo optimization",
        category: "seo"
    },
    {
        id: "ui-ux-design",
        name: "UI/UX Design",
        description: "User interface design",
        image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg",
        icon: <Monitor className="w-6 h-6" />,
        color: "from-pink-600 to-rose-500",
        searchQuery: "ui ux design",
        category: "design"
    },
    {
        id: "voice-over",
        name: "Voice Over",
        description: "Professional voice services",
        image: "https://images.pexels.com/photos/316466/pexels-photo-316466.jpeg",
        icon: <Headphones className="w-6 h-6" />,
        color: "from-amber-600 to-orange-500",
        searchQuery: "voice over",
        category: "audio"
    },
    {
        id: "music-production",
        name: "Music Production",
        description: "Music and audio services",
        image: "https://images.pexels.com/photos/164745/pexels-photo-164745.jpeg",
        icon: <Music className="w-6 h-6" />,
        color: "from-purple-700 to-pink-600",
        searchQuery: "music production",
        category: "audio"
    },
    {
        id: "e-commerce",
        name: "E-commerce Solutions",
        description: "Online store development",
        image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
        icon: <ShoppingBag className="w-6 h-6" />,
        color: "from-yellow-600 to-orange-500",
        searchQuery: "ecommerce",
        category: "business"
    },
    {
        id: "cloud-services",
        name: "Cloud Services",
        description: "Cloud computing solutions",
        image: "https://images.pexels.com/photos/325229/pexels-photo-325229.jpeg",
        icon: <Cloud className="w-6 h-6" />,
        color: "from-blue-500 to-cyan-400",
        searchQuery: "cloud services",
        category: "technology"
    },
    {
        id: "database-management",
        name: "Database Management",
        description: "Database administration",
        image: "https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg",
        icon: <Database className="w-6 h-6" />,
        color: "from-red-600 to-pink-500",
        searchQuery: "database management",
        category: "technology"
    },
    {
        id: "game-development",
        name: "Game Development",
        description: "Game design and development",
        image: "https://images.pexels.com/photos/275033/pexels-photo-275033.jpeg",
        icon: <Gamepad className="w-6 h-6" />,
        color: "from-green-700 to-emerald-600",
        searchQuery: "game development",
        category: "gaming"
    },
    {
        id: "animation",
        name: "Animation",
        description: "2D/3D animation services",
        image: "https://images.pexels.com/photos/277349/pexels-photo-277349.jpeg",
        icon: <Video className="w-6 h-6" />,
        color: "from-purple-700 to-indigo-600",
        searchQuery: "animation",
        category: "video"
    },
    {
        id: "illustration",
        name: "Illustration",
        description: "Digital illustration services",
        image: "https://images.pexels.com/photos/1591061/pexels-photo-1591061.jpeg",
        icon: <Brush className="w-6 h-6" />,
        color: "from-pink-600 to-rose-500",
        searchQuery: "illustration",
        category: "design"
    },
    {
        id: "translation",
        name: "Translation",
        description: "Language translation services",
        image: "https://images.pexels.com/photos/316466/pexels-photo-316466.jpeg",
        icon: <MessageSquare className="w-6 h-6" />,
        color: "from-blue-600 to-teal-500",
        searchQuery: "translation",
        category: "writing"
    }
];

const PopularServices = () => {
    const scrollContainerRef = useRef(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -350, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 350, behavior: 'smooth' });
        }
    };

    return (
        <section className="relative py-16 px-4 bg-white">
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-left">
                            <motion.h2 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-4xl md:text-5xl font-bold text-gray-900"
                            >
                                Popular Services
                            </motion.h2>
                            <p className="text-gray-600 mt-2">
                                Browse services by category and find what you need
                            </p>
                        </div>
                        <Link 
                            to="/services"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            View All Services
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Services Grid with Scroll Buttons */}
                <div className="relative mb-16">
                    {/* Left Scroll Button */}
                    <motion.button
                        onClick={scrollLeft}
                        
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </motion.button>

                    {/* Right Scroll Button */}
                    <motion.button
                        onClick={scrollRight}
                        
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </motion.button>

                    {/* Services Scroll Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {services.map((service, index) => (
                            <motion.div
                                key={service.id}
                                
                                className="flex-shrink-0 w-64"
                            >
                                <Link
                                    to={`/services?q=${encodeURIComponent(service.searchQuery)}`}
                                    className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 block"
                                >
                                    {/* Service Card Content */}
                                    <div className="relative h-full">
                                        {/* Image Section */}
                                        <div className="relative h-48 overflow-hidden rounded-t-xl">
                                            <motion.img
                                                src={service.image}
                                                alt={service.name}
                                                className="w-full h-full object-cover"
                                                whileHover={{ scale: 1.05 }}
                                                transition={{ duration: 0.3 }}
                                            />
                                            
                                        </div>

                                        {/* Content Section */}
                                        <div className="p-5">
                                            {/* Service Info */}
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-2">
                                                    {service.name}
                                                </h3>
                                            </div>
                                            
                                            
                                        </div>
                                    </div>
                                </Link>
                            </motion.div>
                        ))}
                    </div>
                </div>
                
                {/* Call to Action */}
                <div className="text-center">
                    <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                        Can't find what you're looking for? Search for specific services or request a custom service.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                                to="/services"
                                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors duration-200"
                            >
                                Browse All Services
                            </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PopularServices;