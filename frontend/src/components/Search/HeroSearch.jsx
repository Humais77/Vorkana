import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className={`max-w-4xl w-full flex items-center bg-white rounded-full shadow-lg overflow-hidden transition-all duration-300 ${
        isFocused ? 'ring-2 ring-emerald-500 ring-offset-2' : ''
      }`}
      style={{
        // Responsive padding and sizing
        padding: 'clamp(0.25rem, 1vw, 0.5rem) clamp(1rem, 3vw, 1.5rem)',
        minHeight: 'clamp(2.75rem, 8vh, 3.5rem)'
      }}
    >
      <div className="flex-1 flex items-center">
        {/* Search Icon - Hidden on mobile, visible on tablet+ */}
        <Search className="w-4 h-4 md:w-5 md:h-5 text-gray-400 mr-2 hidden sm:block" />
        
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search for any service..."
          className="flex-1 outline-none text-gray-700 bg-transparent w-full"
          style={{
            fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
            padding: 'clamp(0.25rem, 0.5vw, 0.5rem)',
            lineHeight: '1.5'
          }}
          aria-label="Search for services"
        />
      </div>
      
      <button 
        type="submit"
        className="bg-black text-white hover:bg-gray-800 active:bg-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        aria-label="Search"
        disabled={!searchQuery.trim()}
        style={{
          padding: 'clamp(0.5rem, 1.5vw, 0.875rem)',
          borderRadius: '9999px',
          minWidth: 'clamp(2.5rem, 8vw, 3rem)',
          minHeight: 'clamp(2.5rem, 8vw, 3rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Search className="w-4 h-4 md:w-5 md:h-5" />
        <span className="ml-2 hidden md:inline-block text-sm font-medium">
          Search
        </span>
      </button>
    </form>
  );
};

export default HeroSearch;