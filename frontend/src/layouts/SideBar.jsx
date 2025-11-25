import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/solid';

const SideBar = () => {
  const [open, setOpen] = useState(false);

  const categories = [
    { name: "Trending 🔥" },
    { name: "Graphics & Design" },
    { name: "Programming & Tech" },
    { name: "Digital Marketing" },
    { name: "Video & Animation" },
    { name: "Writing & Translation" },
    { name: "Music & Audio" },
    { name: "Business" },
  ];

  return (
    <div className="p-6">
      {/* Browse Category Header */}
      <div
        className="flex justify-between items-center cursor-pointer p-2 hover:bg-gray-200 rounded-md transition"
        onClick={() => setOpen(!open)}
      >
        <span className="text-xl font-medium">Browse Category</span>
        <ChevronDownIcon
          className={`w-6 h-6 transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </div>

      {/* Collapsible Category List */}
      {open && (
        <ul className="flex flex-col space-y-2 mt-2">
          {categories.map((category, index) => (
            <li
              key={index}
              className="p-2 hover:bg-gray-200 rounded-md cursor-pointer transition"
            >
              {category.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SideBar;
