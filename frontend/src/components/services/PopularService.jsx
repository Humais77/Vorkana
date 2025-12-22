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

// Cloudinary imports - ONLY FOR IMAGES
import { Cloudinary } from '@cloudinary/url-gen';
import { AdvancedImage } from '@cloudinary/react';
import { fill } from '@cloudinary/url-gen/actions/resize';

// Initialize Cloudinary
const cld = new Cloudinary({
  cloud: {
    cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  },
});

const services = [
    {
        id: "website-development",
        name: "Website Development",
        description: "Professional web solutions",
        image: "rnh7tzst2c3dn174ymlb",
        icon: <Globe className="w-6 h-6" />,
        color: "from-blue-600 to-cyan-500",
        searchQuery: "website development",
        category: "web"
    },
    {
        id: "video-editing",
        name: "Video Editing",
        description: "Creative video production",
        image: "k012iflvrjkqvkvhnqvb",
        icon: <Camera className="w-6 h-6" />,
        color: "from-purple-600 to-pink-500",
        searchQuery: "video editing",
        category: "video"
    },
    {
        id: "software-development",
        name: "Software Development",
        description: "Custom software solutions",
        image: "duoiabdtuud9ija5m5r4",
        icon: <Code className="w-6 h-6" />,
        color: "from-green-600 to-emerald-500",
        searchQuery: "software development",
        category: "software"
    },
    {
        id: "mobile-app-development",
        name: "Mobile App Development",
        description: "App development",
        image: "duoiabdtuud9ija5m5r4",
        icon: <Smartphone className="w-6 h-6" />,
        color: "from-blue-700 to-indigo-600",
        searchQuery: "mobile app",
        category: "mobile"
    },
    {
        id: "graphic-design",
        name: "Graphic Design",
        description: "Visual design services",
        image: "ce3j5h3kgt5umxymvkon",
        icon: <Palette className="w-6 h-6" />,
        color: "from-purple-600 to-pink-500",
        searchQuery: "graphic design",
        category: "design"
    },
    {
        id: "data-analysis",
        name: "Data Analysis",
        description: "Data analytics services",
        image: "k01xqmefzhmwyfceifqk", // Changed to Cloudinary public ID
        icon: <BarChart className="w-6 h-6" />,
        color: "from-orange-600 to-red-500",
        searchQuery: "data analysis",
        category: "data"
    },
];

// ... (rest of your imports and setup)

const PopularServices = () => {
    const scrollContainerRef = useRef(null);

    const scrollLeft = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: -250, behavior: 'smooth' });
        }
    };

    const scrollRight = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollBy({ left: 250, behavior: 'smooth' });
        }
    };

    return (
        <section className="relative py-16 px-4 bg-white">
            <div className="max-w-7xl mx-auto">
                {/* Header Section - No changes */}
                <div className="text-center mb-12">
                    <div className="flex justify-between items-center mb-6">
                        <div className="text-left">
                            <motion.h2 
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

                <div className="relative mb-16">
                    {/* Buttons - No changes */}
                    <motion.button
                        onClick={scrollLeft}
                        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </motion.button>

                    <motion.button
                        onClick={scrollRight}
                        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-6 z-10 w-12 h-12 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-700 hover:text-blue-600 transition-all duration-200"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </motion.button>

                    <div
                        ref={scrollContainerRef}
                        className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide py-4 px-2"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                        {services.map((service, index) => {
                            const myImage = cld.image(service.image);
                            myImage.resize(fill().width(256).height(192));
                            
                            return (
                                <motion.div
                                    key={service.id}
                                    /* FIXED LINE BELOW: Smaller width on mobile, original width on md screens */
                                    className="flex-shrink-0 w-48 md:w-64"
                                >
                                    <Link
                                        to={`/services?q=${encodeURIComponent(service.searchQuery)}`}
                                        className="group bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200 block"
                                    >
                                        <div className="relative h-full">
                                            {/* Responsive height: shorter on mobile to maintain aspect ratio */}
                                            <div className="relative h-32 md:h-48 overflow-hidden rounded-t-xl">
                                                <AdvancedImage
                                                    cldImg={myImage}
                                                    alt={service.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                <motion.div
                                                    className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300"
                                                    initial={false}
                                                />
                                            </div>

                                            <div className="p-4 md:p-5">
                                                <div>
                                                    <h3 className="text-sm md:text-lg font-bold text-gray-900 truncate">
                                                        {service.name}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
                
                {/* CTA - No changes */}
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