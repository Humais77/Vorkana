// Hero.jsx
import { useState, useEffect, useRef } from "react";
import { Pause, Play } from "lucide-react";
import HeroSearch from "../../../components/Search/HeroSearch";
import { useNavigate } from "react-router-dom";
import useVideoStore from '../../../store/useVideoStore';
import { getHeroVideoAssets, preloadVideo ,preloadVideoWithFallbacks,checkVideoCDNPerformance } from '../../../utils/cloudinaryFrontend';
import { useSubcategories } from '../../../hooks/useSubcategories';
import LoadingSpinner from '../../../layouts/LoadingSpinner';

const Hero = ({ isAuthModalOpen = false }) => {
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const videoRef = useRef(null);
  const wasPlayingBeforeModal = useRef(false);
  const navigate = useNavigate();
  const { isVideoPaused } = useVideoStore();

  const VIDEO_PUBLIC_ID = "hhmgxyoqn3mu3frjok4n";
  const POSTER_PUBLIC_ID = "y0pa1w8cbxgfrgzk90ns";
  
  // Get optimized PRODUCTION video URLs
  const { 
    videoUrl, 
    webmUrl,
    posterUrl,
    lowQualityVideoUrl
  } = getHeroVideoAssets(VIDEO_PUBLIC_ID, POSTER_PUBLIC_ID);

  // Define the specific category names we want to show (same as before)
  const categoryNames = [
    "website development",
    "architecture & interior design",
    "UGC videos",
    "video editing",
    "vibe coding"
  ];

  // === Fetch subcategories from backend ===
  const { 
    data: subcategories = [], 
    isLoading: subcategoriesLoading,
    error: subcategoriesError,
    isError: hasSubcategoriesError
  } = useSubcategories({
    params: {
      isActive: true,
      limit: 100,
      sortBy: 'name',
      sortOrder: 'asc'
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // === PRODUCTION: Preload video on component mount ===
  useEffect(() => {
    if (videoUrl && !isMobile) {
      preloadVideo(videoUrl);
    }
  }, [videoUrl, isMobile]);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // === PRODUCTION: Video loading and error handling ===
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isMobile) return;

    const handleCanPlay = () => {
      setVideoReady(true);
      setIsBuffering(false);
    };

    const handleWaiting = () => {
      setIsBuffering(true);
    };

    const handlePlaying = () => {
      setIsBuffering(false);
    };

    const handleError = (e) => {
      console.error('Hero video error:', e);
      setVideoLoadError(true);
      // Try lower quality fallback
      if (videoRef.current && lowQualityVideoUrl) {
        videoRef.current.src = lowQualityVideoUrl;
        videoRef.current.load();
      }
    };

    const handleLoadedData = () => {
      // Video loaded successfully
      setVideoReady(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);
    video.addEventListener('loadeddata', handleLoadedData);

    // PRODUCTION: Set loading="lazy" for non-critical videos
    // but for hero, we want eager loading
    video.setAttribute('loading', 'eager');

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [isMobile, lowQualityVideoUrl]);

  // Sync with global video pause state
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isMobile) return;
    
    if (isVideoPaused && !video.paused) {
      video.pause();
      setPaused(true);
    }
  }, [isVideoPaused, isMobile]);

  // Handle auth modal open/close
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isMobile) return;

    if (isAuthModalOpen) {
      wasPlayingBeforeModal.current = !video.paused;
      video.pause();
    } else {
      if (wasPlayingBeforeModal.current && videoReady) {
        video.play().catch(err => {
          console.log("Autoplay prevented after modal:", err);
        });
      }
    }
  }, [isAuthModalOpen, isMobile, videoReady]);

  // Sync paused state with video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video || isMobile) return;
    
    const updatePausedState = () => {
      if (videoRef.current) {
        setPaused(videoRef.current.paused);
      }
    };
    
    const handlePlay = () => {
      updatePausedState();
      setVideoLoadError(false);
    };
    
    const handlePause = () => updatePausedState();
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    updatePausedState();
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', handlePlay);
        videoRef.current.removeEventListener('pause', handlePause);
      }
    };
  }, [isMobile]);

  const handleToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    
    try {
      if (video.paused) {
        video.play().catch(err => {
          console.log("Manual play failed:", err);
          // If play fails due to autoplay policy, show instruction
          if (err.name === 'NotAllowedError') {
            alert("Click the play button to start the video");
          }
        });
      } else {
        video.pause();
      }
    } catch (error) {
      console.error("Video toggle error:", error);
    }
  };

  // This function stays EXACTLY THE SAME as before
  const handleCategoryClick = (name) => {
    navigate(`/search?query=${encodeURIComponent(name)}`);
  };

  // Prepare categories data based on backend subcategories
  const getCategoriesToDisplay = () => {
    // If loading or error, show no categories
    if (subcategoriesLoading || hasSubcategoriesError) {
      return [];
    }

    // Try to match backend subcategories with our category names
    const matchedCategories = [];
    
    for (const categoryName of categoryNames) {
      // Try to find exact match in subcategories
      const matchedSubcategory = subcategories.find(subcat => 
        subcat.name.toLowerCase() === categoryName.toLowerCase()
      );

      // If found, use the subcategory name
      // If not found, we'll just show the category name but it won't be clickable
      if (matchedSubcategory) {
        matchedCategories.push({
          id: matchedSubcategory._id,
          name: matchedSubcategory.name,
          isNew: categoryName.toLowerCase() === "vibe coding"
        });
      }
    }

    return matchedCategories;
  };
useEffect(() => {
    if (!isMobile) {
      preloadVideoWithFallbacks({ videoUrl, webmUrl, posterUrl });
      
      // Optional: Log CDN performance in development
      if (import.meta.env.DEV) {
        checkVideoCDNPerformance(videoUrl);
      }
    }
  }, [videoUrl, webmUrl, posterUrl, isMobile]);

  const categoriesToDisplay = getCategoriesToDisplay();
  const trustedCompanies = ["Google", "NETFLIX", "ABC", "PayPal", "Olympiant"];

  return (
    <section className="relative w-full h-[90vh] overflow-hidden flex items-center bg-black">
      {/* GREEN SPLASH / MOBILE BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600 lg:hidden" />
      
      {!videoLoadError ? (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          fetchPriority="high"
          poster={posterUrl}
          className={`
            absolute inset-0 w-full h-full object-cover
            transition-opacity duration-700 ease-out
            hidden lg:block
            ${videoReady ? "opacity-100" : "opacity-0"}
          `}
          // CDN OPTIMIZATION: Browser will choose the first supported format
        >
          {/* WebM first (better compression, plays instantly in Chrome/Firefox) */}
          <source src={webmUrl} type="video/webm" />
          {/* MP4 fallback (universal support) */}
          <source src={videoUrl} type="video/mp4" />
          {/* Low quality fallback for very slow connections */}
          <source src={lowQualityVideoUrl} type="video/mp4" />
          Your browser does not support HTML5 video.
        </video>
      ) : (
        // Fallback with CDN-optimized image
        <div 
          className="absolute inset-0 hidden lg:block bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${posterUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />
      )}

      {/* === PRODUCTION: Video loading indicator === */}
      {!videoReady && !isMobile && !videoLoadError && (
        <div className="absolute inset-0 hidden lg:flex items-center justify-center bg-black/40">
          <LoadingSpinner size="small" />
        </div>
      )}

      {/* Buffering indicator */}
      {isBuffering && videoReady && !isMobile && (
        <div className="absolute inset-0 hidden lg:flex items-center justify-center bg-black/20">
          <LoadingSpinner size="small" />
        </div>
      )}

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20 pointer-events-none" />

      {/* CONTENT */}
      <div className="relative z-10 max-w-4xl w-full px-8 md:px-16 text-left text-white">
        <h1 className="font-bold text-4xl md:text-6xl lg:text-7xl leading-tight mb-8">
          Our freelancers <br /> will take it from here
        </h1>

        <div className="max-w-2xl mb-8">
          <HeroSearch />
        </div>

        {/* Categories Section */}
        <div className="mt-8">
          {subcategoriesLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner size="small" />
            </div>
          ) : hasSubcategoriesError ? (
            <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded-lg border border-red-700/50">
              Cannot load categories. Please try again later.
            </div>
          ) : categoriesToDisplay.length > 0 ? (
            <div className="flex flex-wrap gap-3">
              {categoriesToDisplay.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="px-5 py-2.5 border-2 border-white/40 rounded-full backdrop-blur-sm hover:bg-white/10 transition"
                >
                  {cat.name}
                  {cat.isNew && (
                    <span className="ml-2 px-2 text-[10px] bg-yellow-400 text-black font-bold rounded-full">
                      NEW
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded-lg border border-red-700/50">
              No matching categories found in database. Please add the required subcategories.
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-6">
          <span className="font-medium opacity-90">Trusted By:</span>
          {trustedCompanies.map((c) => (
            <span key={c} className="opacity-90 text-sm md:text-base">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* PLAY / PAUSE BUTTON */}
      {!isMobile && videoReady && !videoLoadError && (
        <button
          onClick={handleToggle}
          className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md hidden md:flex z-20 transition-all duration-200"
          aria-label={paused ? "Play video" : "Pause video"}
          disabled={isBuffering}
        >
          {paused ? (
            <Play className="w-4 h-4" />
          ) : (
            <Pause className="w-4 h-4" />
          )}
        </button>
      )}
    </section>
  );
};

export default Hero;