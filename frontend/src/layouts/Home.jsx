import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../components/categories/CategoryGrid'
import PopularServices from '../components/services/PopularService'
import FAQSection from './FaqSection'
const Home = () => {
  return (
    <div>
      <Hero/>
      <CategoryGrid/>
      <PopularServices/>
      <FAQSection/>
    </div>
  )
}

export default Home