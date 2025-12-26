import { useState, useEffect, useRef } from "react";
import { Pause, Play } from "lucide-react";
import HeroSearch from "../components/Search/HeroSearch";
import { useNavigate } from "react-router-dom";
import useVideoStore from '../store/useVideoStore';
const Hero = ({ isAuthModalOpen = false }) => {
  const [paused, setPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const videoRef = useRef(null);
  const wasPlayingBeforeModal = useRef(false); // Track if video was playing before modal
  const navigate = useNavigate();
const { isVideoPaused } = useVideoStore();

  // Cloudinary config
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const videoPublicId = import.meta.env.VITE_CLOUDINARY_VIDEO_ID;

  // Faster + lighter Cloudinary video
  const cloudinaryVideoUrl = `https://res.cloudinary.com/${cloudName}/video/upload/
    f_auto,q_auto:eco,vc_vp9,br_900k,ac_none,so_0
    /${videoPublicId}`.replace(/\s+/g, "");

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
useEffect(() => {
  if (!videoRef.current || isMobile) return;
  
  if (isVideoPaused && !videoRef.current.paused) {
    videoRef.current.pause();
    setPaused(true);
  }
}, [isVideoPaused, isMobile]);
  // Handle auth modal open/close
  useEffect(() => {
    if (!videoRef.current || isMobile) return;

    if (isAuthModalOpen) {
      // When modal opens, remember if video was playing
      wasPlayingBeforeModal.current = !videoRef.current.paused;
      videoRef.current.pause();
    } else {
      // When modal closes, resume only if video was playing before
      if (wasPlayingBeforeModal.current) {
        videoRef.current.play()
          .then(() => setPaused(false))
          .catch(err => console.log("Autoplay prevented:", err));
      }
    }
  }, [isAuthModalOpen, isMobile]);

  // Sync paused state with video element
  useEffect(() => {
    if (!videoRef.current || isMobile) return;
    
    const updatePausedState = () => {
      setPaused(videoRef.current.paused);
    };
    
    videoRef.current.addEventListener('play', updatePausedState);
    videoRef.current.addEventListener('pause', updatePausedState);
    
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('play', updatePausedState);
        videoRef.current.removeEventListener('pause', updatePausedState);
      }
    };
  }, [isMobile]);

  const handleToggle = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
    // State will be updated by event listeners above
  };

  const handleCategoryClick = (name) => {
    navigate(`/search?query=${encodeURIComponent(name)}`);
  };

  const categories = [
    { id: 1, name: "website development" },
    { id: 2, name: "architecture & interior design" },
    { id: 3, name: "UGC videos" },
    { id: 4, name: "video editing" },
    { id: 5, name: "vibe coding", isNew: true },
  ];

  const trustedCompanies = ["Google", "NETFLIX", "ABC", "PayPal", "Olympiant"];

  return (
    <section className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden flex items-center">
      
      {/* GREEN SPLASH / MOBILE BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-green-600" />

      {/* VIDEO (DESKTOP ONLY) */}
      {!isMobile && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          fetchPriority="high"
          onLoadedMetadata={() => setVideoReady(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
          src={cloudinaryVideoUrl}
        />
      )}

      {/* DARK OVERLAY */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />

      {/* CONTENT */}
      <div className="relative z-10 max-w-4xl w-full px-8 md:px-16 text-left text-white">
        <h1 className="font-bold text-4xl md:text-6xl lg:text-7xl leading-tight mb-8">
          Our freelancers <br /> will take it from here
        </h1>

        <div className="max-w-2xl mb-8">
          <HeroSearch />
        </div>

        <div className="flex flex-wrap gap-3 mt-8">
          {categories.map((cat) => (
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

        <div className="mt-12 flex flex-wrap items-center gap-6">
          <span className="font-medium opacity-90">Trusted By:</span>
          {trustedCompanies.map((c) => (
            <span key={c} className="opacity-90 text-sm md:text-base">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* PLAY / PAUSE */}
      {!isMobile && videoReady && (
        <button
          onClick={handleToggle}
          className="absolute bottom-6 right-6 bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md hidden md:flex"
        >
          {paused ? <Play /> : <Pause />}
        </button>
      )}
    </section>
  );
};

export default Hero;