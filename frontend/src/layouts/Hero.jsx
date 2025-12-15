import { useState, useEffect } from "react";
import { Search, Pause, Play } from "lucide-react";
import bg_video from '../assets/bg_video.mp4'

const Hero = () => {
  const [paused, setPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen is mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const categories = [
    { id: 1, name: "website development" },
    { id: 2, name: "architecture & interior design" },
    { id: 3, name: "UGC videos" },
    { id: 4, name: "video editing" },
    { id: 5, name: "vibe coding", isNew: true }
  ];

  const trustedCompanies = [
    { name: "Google", logo: "/google.svg" },
    { name: "NETFLIX", logo: "/netflix.svg" },
    { name: "ABC", logo: "/abc.svg" },
    { name: "PayPal", logo: "/paypal.svg" },
    { name: "Olympiant", logo: "/olymp.svg" }
  ];

  const handleToggle = () => {
    const video = document.getElementById("heroVideo");
    if (video.paused) {
      video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  const handleCategoryClick = (categoryName) => {
    const slug = categoryName.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-');
    window.location.href = `/category/${slug}`;
  };

  const handleTrustedCompanyClick = (companyName) => {
    window.location.href = `/company/${companyName.toLowerCase()}`;
  };

  return (
    <section className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden flex items-center">
      {/* Background Video - Only show on md and above */}
      {!isMobile && (
        <video
          id="heroVideo"
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src={bg_video}
        />
      )}

      {/* Green gradient background only for mobile */}
      {isMobile && (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600"></div>
      )}

      {/* Dark overlay with gradient from left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>

      {/* Content aligned to left */}
      <div className="relative z-10 max-w-4xl w-full px-8 md:px-16 text-left">
        
        {/* Heading */}
        <h1 className="text-white font-bold text-4xl md:text-6xl lg:text-7xl leading-tight mb-8">
          Our freelancers <br /> will take it from here
        </h1>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-4xl w-full flex items-center bg-white rounded-full shadow-lg overflow-hidden px-6 py-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for any service..."
            className="flex-1 outline-none text-gray-700 text-lg"
          />
          <button 
            type="submit"
            className="bg-black text-white p-4 rounded-full hover:bg-gray-800 transition"
          >
            <Search className="w-6 h-6" />
          </button>
        </form>

        {/* Category Quick Tags - Left aligned */}
        <div className="flex flex-wrap gap-3 mt-8">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryClick(category.name)}
              className="px-5 py-2.5 bg-transparent border-2 border-white/40 text-white backdrop-blur-sm rounded-full text-base font-medium hover:bg-white/10 hover:border-white/60 transition-all cursor-pointer"
            >
              {category.name}
              {category.isNew && (
                <span className="ml-2 px-2 text-[10px] bg-yellow-400 text-black font-bold rounded-full">
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>

        
      </div>

      {/* Pause / Play Button */}
      <button
        onClick={handleToggle}
       className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-md transition shadow-md cursor-pointer hidden md:flex"

      >
        {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
      </button>
    </section>
  );
};

export default Hero;