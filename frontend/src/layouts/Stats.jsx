// src/components/Stats.jsx
import React from 'react'

const stats = [
  { label: "Freelancers", value: "500K+" },
  { label: "Projects Completed", value: "1M+" },
  { label: "Happy Clients", value: "250K+" },
  { label: "Categories", value: "100+" },
]

const Stats = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-12">Our Platform in Numbers</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-2xl font-bold text-green-600 mb-2">{s.value}</h3>
              <p className="text-gray-700">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Stats
