// Home.jsx
import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../../../components/categories/CategoryGrid'
import Testimonials from './Testimonal'
import CallToAction from '../footer/CallToAction'
import MakeItHappen from './MakeItHappen'
import AuthModal from '../../../components/AuthModal/AuthModal';
import LogoMakerBanner from './LogoMakerBanner'
import { useState } from 'react'
import GetQuoteBanner from './GetQuoteBanner'
import PopularCategoriesSection from '../../../components/home/PopularCategoriesSection'

const Home = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('signin'); 

  const openAuthModal = (tab = 'signin') => {
    setActiveTab(tab);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
  };

  return (
    <div>
      <Hero openAuthModal={openAuthModal} />

      {isAuthModalOpen && (
        <AuthModal
          activeTab={activeTab}
          onSwitchTab={setActiveTab}
          onClose={closeAuthModal}
        />
      )}

      <CategoryGrid />
      <PopularCategoriesSection/>
      <GetQuoteBanner openAuthModal={openAuthModal} />
      <Testimonials />
      <MakeItHappen openAuthModal={openAuthModal} />
      <LogoMakerBanner/>
      <CallToAction openAuthModal={openAuthModal} />
    </div>
  );
};

export default Home;