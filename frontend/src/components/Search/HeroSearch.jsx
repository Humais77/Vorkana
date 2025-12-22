// components/HeroSearch.jsx - Updated with Hero styling
import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="max-w-4xl w-full flex items-center bg-white rounded-full shadow-lg overflow-hidden px-6 py-2"
    >
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search for any service..."
        className="flex-1 outline-none text-gray-700 text-lg placeholder:text-gray-400 px-2"
      />
      <button 
        type="submit"
        className="bg-black text-white p-4 rounded-full hover:bg-gray-800 transition"
        aria-label="Search"
      >
        <Search className="w-6 h-6" />
      </button>
    </form>
  );
};

export default HeroSearch;