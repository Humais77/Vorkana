import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../components/categories/CategoryGrid'
import PopularServices from '../components/services/PopularService'
import FAQSection from './FaqSection'
import Testimonials from './Testimonal'
import Stats from './Stats'
import CallToAction from './CallToAction'
import MakeItHappen from './MakeItHappen'
import AuthModal from '../components/AuthModal';
import HowItWorks from '../components/HowItWorks'
const Home = ({ onSignupClick, onSigninClick }) => {
  return (
    <div>
      <Hero />
      <CategoryGrid />
      <HowItWorks/>
      <PopularServices />
      <Testimonials />
      {/* <Stats /> */}
      <MakeItHappen onSignupClick={onSignupClick} />
      <CallToAction onSignupClick={onSignupClick} />
      <FAQSection />
    </div>
  );
};

export default Home;
