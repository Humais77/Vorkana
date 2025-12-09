import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../components/categories/CategoryGrid'
import PopularServices from '../components/services/PopularService'
const Home = () => {
  return (
    <div>
      <Hero/>
      <CategoryGrid/>
      <PopularServices/>
    </div>
  )
}

export default Home