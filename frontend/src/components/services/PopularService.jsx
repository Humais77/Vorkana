import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { 
  ChevronLeft, ChevronRight, 
  Sparkles, TrendingUp, Users, Star,
  Globe, Camera, Code, Palette,
  Smartphone, BookOpen, Building,
  Cpu, Megaphone
} from "lucide-react";

const services = [
    {
        id: 1,
        name: "Website Development",
        description: "Professional web solutions",
        image: "https://images.pexels.com/photos/1181673/pexels-photo-1181673.jpeg",
        icon: <Globe className="w-6 h-6" />,
        color: "from-blue-600 to-cyan-500",
        rating: 4.9,
        projects: "2.3K"
    },
    {
        id: 2,
        name: "Video Editing",
        description: "Creative video production",
        image: "https://images.pexels.com/photos/277349/pexels-photo-277349.jpeg",
        icon: <Camera className="w-6 h-6" />,
        color: "from-purple-600 to-pink-500",
        rating: 4.8,
        projects: "1.8K"
    },
    {
        id: 3,
        name: "Software Development",
        description: "Custom software solutions",
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
        icon: <Code className="w-6 h-6" />,
        color: "from-green-600 to-emerald-500",
        rating: 4.9,
        projects: "3.1K"
    },
    {
        id: 4,
        name: "Book Publishing",
        description: "Publishing services",
        image: "https://images.pexels.com/photos/316466/pexels-photo-316466.jpeg",
        icon: <BookOpen className="w-6 h-6" />,
        color: "from-amber-600 to-orange-500",
        rating: 4.7,
        projects: "850"
    },
    {
        id: 5,
        name: "Architecture & Interior",
        description: "Design services",
        image: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg",
        icon: <Building className="w-6 h-6" />,
        color: "from-red-600 to-rose-500",
        rating: 4.8,
        projects: "920"
    },
    {
        id: 6,
        name: "AI Services",
        description: "AI-powered solutions",
        image: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg",
        icon: <Cpu className="w-6 h-6" />,
        color: "from-indigo-600 to-violet-500",
        rating: 4.9,
        projects: "1.5K"
    },
    {
        id: 7,
        name: "Social Media Marketing",
        description: "Digital marketing",
        image: "https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg",
        icon: <Megaphone className="w-6 h-6" />,
        color: "from-fuchsia-600 to-purple-500",
        rating: 4.7,
        projects: "2.1K"
    },
    {
        id: 8,
        name: "Mobile App Development",
        description: "App development",
        image: "https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg",
        icon: <Smartphone className="w-6 h-6" />,
        color: "from-blue-700 to-indigo-600",
        rating: 4.9,
        projects: "1.9K"
    },
    {
        id: 9,
        name: "Graphic Design",
        description: "Visual design services",
        image: "https://images.pexels.com/photos/1591061/pexels-photo-1591061.jpeg",
        icon: <Palette className="w-6 h-6" />,
        color: "from-purple-600 to-pink-500",
        rating: 4.8,
        projects: "2.4K"
    },
    {
        id: 10,
        name: "Content Writing",
        description: "Professional writing",
        image: "https://images.pexels.com/photos/7358/startup-photos.jpg",
        icon: <BookOpen className="w-6 h-6" />,
        color: "from-teal-600 to-cyan-500",
        rating: 4.7,
        projects: "1.3K"
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
                    
                    <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                        Popular Services
                    </h2>
                    
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        Discover our most requested services from top-rated freelancers.
                        <span className="font-semibold text-gray-800"> Quality work, delivered on time.</span>
                    </p>
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
                                to={`/services/${service.id}`}
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
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
                                        
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-6">
                                        

                                        {/* Service Info */}
                                        <div className="mb-4">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-300 mb-2">
                                                {service.name}
                                            </h3>
                                            <p className="text-gray-600 text-sm leading-relaxed">
                                                {service.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Hover Effect Lines */}
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* View All Services Button */}
                <div className="text-center">
                    <Link
                        to="/services"
                        className="
                            group
                            relative
                            inline-flex
                            items-center
                            justify-center
                            gap-3
                            px-8
                            py-3.5
                            rounded-xl
                            bg-gradient-to-r from-blue-600 to-purple-600
                            hover:from-blue-700 hover:to-purple-700
                            text-white
                            font-semibold
                            text-base
                            shadow-lg
                            hover:shadow-xl
                            transition-all
                            duration-300
                            transform
                            hover:-translate-y-0.5
                            overflow-hidden
                        "
                    >
                        {/* Animated Background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-white/10 to-blue-500/0 animate-shimmer"></div>
                        
                        <span className="relative">Browse All Services</span>
                        <ChevronRight className="relative w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                        
                        {/* Glowing Effect */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"></div>
                    </Link>
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