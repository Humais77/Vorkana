import { Grid, RefreshCw, Zap, Smile } from "lucide-react";

const items = [
  {
    icon: Grid,
    text: "Access a pool of top talent across 700 categories",
  },
  {
    icon: RefreshCw,
    text: "Enjoy a simple, easy-to-use matching experience",
  },
  {
    icon: Zap,
    text: "Get quality work done quickly and within budget",
  },
  {
    icon: Smile,
    text: "Work with freelancers until you're fully satisfied",
  },
];

const MakeItHappen = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-7xl mx-auto px-6">
        <h2 className="text-3xl md:text-5xl text-gray-600 mb-14 text-left">
          Make it all happen with freelancers
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {items.map((item, index) => (
            <div
              key={index}
              className="flex flex-row sm:flex-row md:flex-col lg:flex-col items-start md:items-center gap-4 md:text-center text-left"
            >
              <item.icon className="w-12 h-12 text-gray-800 flex-shrink-0 md:mb-2" />

              <p className="text-gray-600 text-lg leading-relaxed max-w-[260px] md:max-w-[220px]">
                {item.text}
              </p>
            </div>
          ))}
        </div>
        <div className="text-left">
          <button className="bg-black text-white px-8 py-3 rounded-md text-sm font-medium hover:bg-gray-800 transition">
            Join now
          </button>
        </div>
      </div>
    </section>
  );
};

export default MakeItHappen;

