import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../components/categories/CategoryGrid'
import Testimonials from './Testimonal'
import CallToAction from './CallToAction'
import MakeItHappen from './MakeItHappen'
import AuthModal from '../components/AuthModal/AuthModal';
import LogoMakerBanner from './LogoMakerBanner'
import { useState } from 'react'
import GetQuoteBanner from './GetQuoteBanner'
import PopularCategoriesSection from './PopularCategoriesSection'

const Home = ({ onSignupClick, onSigninClick }) => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('signin'); 

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
      <MakeItHappen 
        onSignupClick={() => openAuthModal('signup')} 
        // or pass openAuthModal directly if needed
      />
      <LogoMakerBanner/>
      <CallToAction onSignupClick={() => openAuthModal('signup')} />
    </div>
  );
};

export default Home;