import { useState, useEffect, useRef } from "react";
import { Pause, Play } from "lucide-react";
import HeroSearch from "../components/Search/HeroSearch";
import { useNavigate } from "react-router-dom"; // Add this import

const Hero = () => {
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const videoRef = useRef(null);
  const navigate = useNavigate(); // Add this hook

  const handleVideoReady = () => {
    setIsReady(true);
  };

  // Cloudinary Configuration
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const videoPublicId = import.meta.env.VITE_CLOUDINARY_VIDEO_ID;
  
  // Generate optimized Cloudinary URL with transformations
  const getOptimizedVideoUrl = () => {
    const transformations = [
      "f_auto",      // Best format (usually WebM for Chrome)
      "q_auto:eco",  // 'eco' is even lighter than 'low' for backgrounds
      "vc_vp9",      // VP9 codec is highly efficient for web
      "so_0",        // Start offset at 0
      "br_1m",       // Cap bitrate to 1Mbps to prevent lag on slow builds
      "ac_none",     // Remove audio track entirely (reduces file size)
    ].join(",");
    
    return `https://res.cloudinary.com/${cloudName}/video/upload/${transformations}/${videoPublicId}`;
  };

  // Get fallback image for mobile/error cases
  const getFallbackImage = () => {
    const imageTransformations = [
      "f_auto",
      "q_auto",
      "c_fill",
      "w_1920",
      "h_1080"
    ].join(",");
    
    return `https://res.cloudinary.com/${cloudName}/image/upload/${imageTransformations}/${videoPublicId}.jpg`;
  };

  const cloudinaryVideoUrl = getOptimizedVideoUrl();
  const fallbackImageUrl = getFallbackImage();

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
    "Google",
    "NETFLIX",
    "ABC",
    "PayPal",
    "Olympiant"
  ];

  const handleToggle = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setPaused(false);
      } else {
        videoRef.current.pause();
        setPaused(true);
      }
    }
  };

  // Updated: Use query parameter instead of route
  const handleCategoryClick = (categoryName) => {
    navigate(`/search?query=${encodeURIComponent(categoryName)}`);
  };

  return (
    <section className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden flex items-center">
      {/* Background Video - Only show on md and above with loading states */}
      {!isMobile ? (
        <div className="absolute inset-0 w-full h-full">
          {/* Fallback image shown while video loads or on error */}
          {(videoError || !videoLoaded) && (
            <div 
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${fallbackImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
            </div>
          )}
          
          <video
            ref={videoRef}
            poster={fallbackImageUrl}
            onCanPlayThrough={handleVideoReady}
            id="heroVideo"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
              videoLoaded && !videoError ? 'opacity-100' : 'opacity-0'
            }`}
            src={cloudinaryVideoUrl}
            onLoadedData={() => setVideoLoaded(true)}
            onError={() => {
              console.error("Video playback failed, falling back to image");
              setVideoError(true);
            }}
            onCanPlay={() => setVideoLoaded(true)}
          >
            <p>Your browser does not support HTML5 video.</p>
          </video>
        </div>
      ) : (
        // Mobile gradient with fallback image overlay
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600"></div>
          <div 
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{
              backgroundImage: `url(${fallbackImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          ></div>
        </div>
      )}

      {/* Dark overlay with gradient from left */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>

      {/* Content aligned to left */}
      <div className="relative z-10 max-w-4xl w-full px-8 md:px-16 text-left">
        
        {/* Heading */}
        <h1 className="text-white font-bold text-4xl md:text-6xl lg:text-7xl leading-tight mb-8">
          Our freelancers <br /> will take it from here
        </h1>

        {/* HeroSearch Component - Replaces the old search form */}
        <div className="max-w-2xl w-full mb-8">
          <HeroSearch />
        </div>

        {/* Category Quick Tags - Left aligned */}
        <div className="flex flex-wrap gap-3 mt-8">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => handleCategoryClick(category.name)}
              className="px-5 py-2.5 bg-transparent border-2 border-white/40 text-white backdrop-blur-sm rounded-full text-base font-medium hover:bg-white/10 hover:border-white/60 transition-all cursor-pointer whitespace-nowrap"
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

        {/* Simple Trusted By Section */}
        <div className="mt-12 flex flex-col md:flex-row items-start md:items-center text-white">
          <span className="font-medium text-white/90 mb-3 md:mb-0 md:mr-8">Trusted By:</span>
          <div className="flex flex-wrap items-center gap-6 md:gap-10">
            {trustedCompanies.map((company, index) => (
              <span 
                key={index}
                className="font-normal opacity-90 hover:opacity-100 transition-opacity text-sm md:text-base"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Pause / Play Button - Only show when video is loaded */}
      {!isMobile && videoLoaded && !videoError && (
        <button
          onClick={handleToggle}
          className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-md transition shadow-md cursor-pointer hidden md:flex"
          aria-label={paused ? "Play video" : "Pause video"}
        >
          {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
        </button>
      )}

      {/* Loading indicator */}
      {!isMobile && !videoLoaded && !videoError && (
        <div className="absolute bottom-6 right-6 bg-black/50 text-white px-3 py-2 rounded-full text-sm backdrop-blur-md hidden md:flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          Loading...
        </div>
      )}
    </section>
  );
};

export default Hero;