import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: "Alex Johnson",
    review: "The quality of work exceeded our expectations. Highly professional service with excellent communication throughout the project.",
    rating: 5
  },
  {
    id: 2,
    name: "Sarah Williams",
    review: "Outstanding results delivered on time. The team demonstrated exceptional expertise and attention to detail in every aspect.",
    rating: 5
  },
  {
    id: 3,
    name: "Michael Brown",
    review: "Professional service that consistently delivers high-quality results. Efficient communication and smooth project management.",
    rating: 5
  },
  {
    id: 4,
    name: "Emily Davis",
    review: "Reliable and professional with excellent technical skills. Projects are completed with precision and delivered ahead of schedule.",
    rating: 5
  },
  {
    id: 5,
    name: "James Wilson",
    review: "Exceptional quality and professionalism. The team provides innovative solutions that significantly improve our operations.",
    rating: 5
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
              <div className="flex flex-col items-center mb-6">
                
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                </div>
              </div>
              
              <RatingStars rating={testimonial.rating} />
              
              <p className="text-gray-700 italic mb-6 leading-relaxed text-center">
                "{testimonial.review}"
              </p>
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
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 flex items-center justify-center mb-3">
                        <span className="text-lg font-bold text-gray-700">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div className="text-center">
                        <h4 className="font-bold text-gray-900">{testimonial.name}</h4>
                      </div>
                    </div>
                    
                    <RatingStars rating={testimonial.rating} />
                    
                    <p className="text-gray-700 italic text-sm text-center">
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