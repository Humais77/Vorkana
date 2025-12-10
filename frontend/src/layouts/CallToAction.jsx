// src/components/CallToAction.jsx
import React from 'react'
import { Link } from 'react-router-dom'

const CallToAction = () => {
  return (
    <section className="py-16 bg-green-600 text-white text-center">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Start Your Journey Today
        </h2>
        <p className="mb-8 text-lg md:text-xl">
          Join thousands of freelancers and clients who are achieving success with our platform.
        </p>
        <Link
          to="/signup"
          className="inline-block bg-white text-green-600 font-semibold px-8 py-3 rounded-lg shadow hover:bg-gray-100 transition"
        >
          Get Started
        </Link>
      </div>
    </section>
  )
}

export default CallToAction
