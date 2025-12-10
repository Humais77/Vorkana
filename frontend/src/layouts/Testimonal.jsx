// src/components/Testimonials.jsx
import React from 'react'

const testimonials = [
  {
    name: "Alice Johnson",
    role: "Startup Founder",
    review: "This platform helped me find amazing freelancers quickly. Highly recommend!",
    avatar: "https://i.pravatar.cc/100?img=1"
  },
  {
    name: "Mark Davis",
    role: "Digital Marketer",
    review: "I got high-quality work at a reasonable price. Exceptional experience!",
    avatar: "https://i.pravatar.cc/100?img=2"
  },
  {
    name: "Sophie Lee",
    role: "Entrepreneur",
    review: "The freelancers are very professional and responsive. Loved it!",
    avatar: "https://i.pravatar.cc/100?img=3"
  },
]

const Testimonials = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">What Our Users Say</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <img src={t.avatar} alt={t.name} className="w-16 h-16 mx-auto rounded-full mb-4"/>
              <p className="text-gray-700 mb-4">&quot;{t.review}&quot;</p>
              <h4 className="font-semibold">{t.name}</h4>
              <p className="text-sm text-gray-500">{t.role}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Testimonials
