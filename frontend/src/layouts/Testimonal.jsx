import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: "Alice Johnson",
    role: "Startup Founder",
    review: "This platform helped me find amazing freelancers quickly. The quality of work exceeded my expectations. Highly recommend!",
    avatar: "https://i.pravatar.cc/150?img=1",
    rating: 5,
    company: "TechInnovate Inc."
  },
  {
    id: 2,
    name: "Mark Davis",
    role: "Digital Marketer",
    review: "I got high-quality work at a reasonable price. The communication was seamless and delivery was always on time. Exceptional experience!",
    avatar: "https://i.pravatar.cc/150?img=2",
    rating: 5,
    company: "GrowthMasters"
  },
  {
    id: 3,
    name: "Sophie Lee",
    role: "Entrepreneur",
    review: "The freelancers are very professional and responsive. It saved me so much time in the hiring process. Loved it!",
    avatar: "https://i.pravatar.cc/150?img=3",
    rating: 5,
    company: "Creative Solutions"
  },
  {
    id: 4,
    name: "Robert Chen",
    role: "Product Manager",
    review: "Outstanding platform! Found the perfect developer for our project in just 2 days. Will definitely use again.",
    avatar: "https://i.pravatar.cc/150?img=4",
    rating: 4,
    company: "ProductLabs"
  },
  {
    id: 5,
    name: "Maria Garcia",
    role: "Content Strategist",
    review: "As a freelancer, this platform helped me find consistent, high-paying projects. The interface is intuitive.",
    avatar: "https://i.pravatar.cc/150?img=5",
    rating: 5,
    company: "ContentWorks"
  }
];

const RatingStars = ({ rating }) => {
  return (
    <div className="flex justify-center gap-1 mb-3">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
};

const Testimonials = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const visibleTestimonials = () => {
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 1 : 3;
    
    const result = [];
    for (let i = 0; i < count; i++) {
      const index = (currentIndex + i) % testimonials.length;
      result.push(testimonials[index]);
    }
    return result;
  };

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Trusted by Thousands
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            See what our users say about their experience
          </p>
        </div>

        {/* Desktop Grid View */}
        <div className="hidden md:grid md:grid-cols-3 gap-8 mb-12">
          {testimonials.slice(0, 3).map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 group hover:-translate-y-1"
            >
              <div className="flex items-center mb-6">
                <img
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  className="w-14 h-14 rounded-full ring-4 ring-blue-50 group-hover:ring-blue-100 transition-all"
                  loading="lazy"
                />
                <div className="ml-4">
                  <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                  <p className="text-xs text-gray-500">{testimonial.company}</p>
                </div>
              </div>
              
              <RatingStars rating={testimonial.rating} />
              
              <p className="text-gray-700 italic mb-6 leading-relaxed">
                "{testimonial.review}"
              </p>
              
              <div className="pt-6 border-t border-gray-100">
                <div className="flex items-center text-gray-400">
                  <div className="flex-1">
                    <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Carousel View */}
        <div className="md:hidden relative">
          <div className="overflow-hidden">
            <div className="flex transition-transform duration-300 ease-in-out">
              {visibleTestimonials().map((testimonial) => (
                <div
                  key={testimonial.id}
                  className="w-full flex-shrink-0 px-2"
                >
                  <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                    <div className="flex items-center mb-4">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-12 h-12 rounded-full"
                        loading="lazy"
                      />
                      <div className="ml-3">
                        <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                        <p className="text-sm text-gray-600">{testimonial.role}</p>
                      </div>
                    </div>
                    
                    <RatingStars rating={testimonial.rating} />
                    
                    <p className="text-gray-700 italic text-sm">
                      "{testimonial.review}"
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={prevTestimonial}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all"
            aria-label="Previous testimonial"
          >
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          
          <button
            onClick={nextTestimonial}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white p-2 rounded-full shadow-lg hover:shadow-xl transition-all"
            aria-label="Next testimonial"
          >
            <ChevronRight size={24} className="text-gray-700" />
          </button>
          
          <div className="flex justify-center mt-6 gap-2">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === currentIndex ? 'bg-blue-600 w-6' : 'bg-gray-300'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>

      </div>
    </section>
  );
};

export default Testimonials;