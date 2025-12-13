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
        <section className="relative py-16 px-4 bg-gradient-to-b from-white to-gray-50">
            {/* Background Decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-500/5 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-purple-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="relative max-w-7xl mx-auto">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-left">
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                                Popular Services
                            </h2>
                            <p className="text-gray-600 mt-2">
                                Browse services by category and find what you need
                            </p>
                        </div>
                        <Link 
                            to="/services"
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:gap-3 transition-all"
                        >
                            View All Services
                            <ChevronRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>

                {/* Services Grid with Scroll Buttons */}
                <div className="relative mb-16">
                    {/* Left Scroll Button */}
                    <button
                        onClick={scrollLeft}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 group"
                    >
                        <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
                    </button>

                    {/* Right Scroll Button */}
                    <button
                        onClick={scrollRight}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-xl border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 hover:border-blue-300 hover:shadow-2xl transition-all duration-300 group"
                    >
                        <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
                    </button>

                    {/* Services Scroll Container */}
                    <div
                        ref={scrollContainerRef}
                        className="flex gap-6 overflow-x-auto scrollbar-hide py-4 px-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {services.map((service) => (
                            <Link
                                key={service.id}
                                to={`/services?q=${encodeURIComponent(service.searchQuery)}`}
                                className="group flex-shrink-0 w-80 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 border border-gray-200 hover:border-transparent hover:scale-[1.02] relative overflow-hidden"
                            >
                                {/* Gradient Background Overlay */}
                                <div className={`absolute inset-0 bg-gradient-to-br ${service.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                                
                                {/* Service Card Content */}
                                <div className="relative h-full">
                                    {/* Image Section */}
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={service.image}
                                            alt={service.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        {/* Image Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                                        
                                        {/* Service Icon */}
                                        <div className="absolute bottom-4 left-4 w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center">
                                            {service.icon}
                                        </div>
                                        
                                        {/* View Services Button */}
                                        <div className="absolute bottom-4 right-4">
                                            <div className="flex items-center gap-1 px-3 py-2 bg-white/90 backdrop-blur-sm rounded-full text-sm font-medium text-gray-700 group-hover:text-blue-600 transition-colors">
                                                View Services
                                                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-6">
                                        {/* Service Info */}
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300 mb-2">
                                                {service.name}
                                            </h3>
                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                {service.description}
                                            </p>
                                        </div>
                                        
                                        {/* Category Tag */}
                                        <div className="flex items-center justify-between">
                                            <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                                                {service.category.toUpperCase()}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                Click to explore →
                                            </span>
                                        </div>
                                    </div>

                                    {/* Hover Effect Lines */}
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Stats Section */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-blue-600 mb-2">
                                {services.length}+
                            </div>
                            <p className="text-gray-600">Service Categories</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-purple-600 mb-2">
                                1000+
                            </div>
                            <p className="text-gray-600">Active Services</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-green-600 mb-2">
                                4.8/5
                            </div>
                            <p className="text-gray-600">Average Rating</p>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-orange-600 mb-2">
                                24/7
                            </div>
                            <p className="text-gray-600">Support Available</p>
                        </div>
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
                            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-full hover:from-blue-700 hover:to-purple-700 transition-all hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <Sparkles className="w-5 h-5" />
                            Browse All Services
                        </Link>
                        <Link
                            to="/services/create"
                            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-blue-600 border border-blue-200 font-bold rounded-full hover:bg-blue-50 transition-all hover:shadow-lg transform hover:-translate-y-0.5"
                        >
                            <Zap className="w-5 h-5" />
                            Start Selling
                        </Link>
                    </div>
                </div>
                
                {/* Custom Scrollbar Style */}
                <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                        display: none;
                    }
                    @keyframes shimmer {
                        0% { transform: translateX(-100%); }
                        100% { transform: translateX(100%); }
                    }
                    .animate-shimmer {
                        animation: shimmer 2s infinite linear;
                    }
                `}</style>
            </div>
        </section>
    );
};

export default PopularServices;