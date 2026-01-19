// Home.jsx - Updated version
import React from 'react'
import Hero from './Hero'
import CategoryGrid from '../../../components/categories/CategoryGrid'
import Testimonials from './Testimonal'
import CallToAction from '../footer/CallToAction'
import MakeItHappen from './MakeItHappen'

import LogoMakerBanner from './LogoMakerBanner'
import { useState } from 'react'
import GetQuoteBanner from './GetQuoteBanner'
import PopularCategoriesSection from '../../../components/home/PopularCategoriesSection'
import { SeoWrapper } from '../../../components/SeoWrapper' // Import SeoWrapper
import AuthModal from '../../../components/authModal/AuthModal'

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
    <SeoWrapper
      title="Vorkanna | Freelance services marketplace | Find top global talent"
      description="Discover top freelance services, digital gigs, and creative professionals on Vorkanna. Hire experts or find work opportunities."
      keywords="freelance services, digital gigs, hire freelancers, freelance jobs, creative professionals"
      ogTitle="Vorkanna | Freelance Marketplace"
      ogDescription="Connect with skilled freelancers for your projects or find freelance work opportunities"
      ogImage="/images/og-home.jpg"
      structuredData={[
        {
          "@type": "WebPage",
          "@id": "https://vorkanna.com/#homepage",
          "name": "Vorkanna Homepage",
          "description": "Global freelance marketplace homepage",
          "url": "https://vorkanna.com",
          "isPartOf": {
            "@id": "https://vorkanna.com/#website"
          },
          "primaryImageOfPage": {
            "@type": "ImageObject",
            "url": "https://vorkanna.com/images/og-home.jpg"
          }
        }
      ]}
    >
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
    </SeoWrapper>
  );
};

export default Home;