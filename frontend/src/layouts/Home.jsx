import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../components/categories/CategoryGrid'
import PopularServices from '../components/services/PopularService'
import FAQSection from './FaqSection'
import Testimonials from './Testimonal'
import Stats from './Stats'
import CallToAction from './CallToAction'
const Home = () => {
  return (
    <div>
      <Hero/>
      <CategoryGrid/>
      <PopularServices/>
      <Testimonials/>
      <Stats/>
      <CallToAction/>
      <FAQSection/>
    </div>
  )
}

export default Home