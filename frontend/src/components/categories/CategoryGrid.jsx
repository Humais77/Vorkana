import React from "react";
import { Link } from "react-router-dom";
import {
  FaLaptopCode,
  FaPaintBrush,
  FaBullhorn,
  FaPenFancy,
  FaVideo,
  FaMobileAlt,
  FaMusic,
  FaSearch,
  FaCamera,
  FaRobot,
  FaBriefcase,
  FaUsersCog,
  FaFilm,
  FaPenNib
} from "react-icons/fa";

const categories = [
  { id: 1, name: "Programming\n& Tech", icon: <FaLaptopCode size={32} /> },
  { id: 2, name: "Graphic\n& Design", icon: <FaPaintBrush size={32} /> },
  { id: 3, name: "Digital\nMarketing", icon: <FaBullhorn size={32} /> },
  { id: 4, name: "Writing\n& Translation", icon: <FaPenNib size={32} /> },
  { id: 5, name: "Video\n& Animation", icon: <FaFilm size={32} /> },
  { id: 6, name: "AI\nServices", icon: <FaRobot size={32} /> },
  { id: 7, name: "Music\n& Audio", icon: <FaMusic size={32} /> },
  { id: 8, name: "Business", icon: <FaBriefcase size={32} /> },
  { id: 9, name: "Consulting", icon: <FaUsersCog size={32} /> },
  { id: 10, name: "Photography", icon: <FaCamera size={32} /> },
  { id: 11, name: "Mobile\nApps", icon: <FaMobileAlt size={32} /> },
  { id: 12, name: "SEO\nServices", icon: <FaSearch size={32} /> },
];

const CategoryGrid = () => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          Explore Categories
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Discover services across various professional domains
        </p>
      </div> */}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {categories.map((cat) => {
          const [line1, line2] = cat.name.split('\n');
          
          return (
            <Link
              key={cat.id}
              to={`/categories/${cat.id}`}
              className="
                group
                bg-white
                w-full
                min-h-[160px]
                rounded-2xl
                shadow-2xl
                shadow-gray-200/50
                hover:shadow-2xl
                hover:shadow-blue-200/50
                border
                border-gray-200
                hover:border-blue-300
                flex
                flex-col
                p-5
                transition-all
                duration-300
                hover:-translate-y-1
                hover:scale-[1.02]
              "
            >
              <div className="flex justify-start mb-4">
                <div className="
                  w-14
                  h-14
                  rounded-xl
                  bg-gradient-to-br from-blue-50 to-blue-100
                  group-hover:from-blue-100 group-hover:to-blue-200
                  flex
                  items-center
                  justify-center
                  text-blue-600
                  group-hover:text-blue-700
                  transition-colors
                  duration-300
                ">
                  {cat.icon}
                </div>
              </div>

              <p className="
                text-lg
                font-bold
                text-gray-800
                group-hover:text-blue-700
                leading-tight
                mb-1
              ">
                {line1}
              </p>

              <p className="
                text-lg
                font-bold
                text-gray-800
                group-hover:text-blue-700
                leading-tight
                mb-3
              ">
                {line2}
              </p>

              <span className="
                inline-block
                text-sm
                text-gray-500
                group-hover:text-blue-500
                font-medium
                mt-auto
              ">
                Explore →
              </span>
            </Link>
          );
        })}
      </div>
      {/* <div className="text-center mt-12">
        <Link
          to="/categories"
          className="
            inline-flex
            items-center
            justify-center
            px-8
            py-3
            rounded-xl
            bg-gradient-to-r from-blue-600 to-blue-700
            hover:from-blue-700 hover:to-blue-800
            text-white
            font-semibold
            text-lg
            shadow-lg
            shadow-blue-200
            hover:shadow-xl
            hover:shadow-blue-300
            transition-all
            duration-300
            hover:-translate-y-0.5
          "
        >
          View All Categories
        </Link>
      </div> */}
    </div>
  );
};

export default CategoryGrid;