import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../components/categories/CategoryGrid'
import PopularServices from '../components/services/PopularService'
import FAQSection from './FaqSection'
import Testimonials from './Testimonal'
import Stats from './Stats'
import CallToAction from './CallToAction'
import MakeItHappen from './MakeItHappen'
import AuthModal from '../components/AuthModal/AuthModal';
import HowItWorks from '../components/HowItWorks'
import LogoMakerBanner from './LogoMakerBanner'
import { useState } from 'react'
import GetQuoteBanner from './GetQuoteBanner'
import PopularCategoriesSection from './PopularCategoriesSection'

const Home = ({ onSignupClick, onSigninClick }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('signin'); // ← ADD THIS LINE

  const openAuthModal = (tab = 'signin') => {
    setActiveTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    // Optional: reset tab when closing
    // setActiveTab('signin');
  };

  return (
    <div>
      <Hero isAuthModalOpen={isAuthModalOpen} />

      {isAuthModalOpen && (
        <AuthModal
          activeTab={activeTab}
          onSwitchTab={setActiveTab}
          onClose={closeAuthModal}
        />
      )}

      <CategoryGrid />
      <PopularCategoriesSection/>
      {/* <PopularServices /> */}
      <GetQuoteBanner/>
      <Testimonials />
      {/* <Stats /> */}
      <MakeItHappen 
        onSignupClick={() => openAuthModal('signup')} 
        // or pass openAuthModal directly if needed
      />
      <LogoMakerBanner/>
      <CallToAction onSignupClick={() => openAuthModal('signup')} />
      <FAQSection />
    </div>
  );
};

export default Home;