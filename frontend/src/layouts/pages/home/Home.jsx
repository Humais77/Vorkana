import { useLocation } from 'react-router-dom' // Import useLocation
import Hero from './Hero'
import CategoryGrid from '../../../components/categories/CategoryGrid'
import Testimonials from './Testimonal'
import CallToAction from '../footer/CallToAction'
import MakeItHappen from './MakeItHappen'
import LogoMakerBanner from './LogoMakerBanner'
import GetQuoteBanner from './GetQuoteBanner'
import PopularCategoriesSection from '../../../components/home/PopularCategoriesSection'
import { SeoWrapper } from '../../../components/SeoWrapper' 

const Home = ({ openAuthModal }) => { // Receive prop from parent
  const location = useLocation(); // Get current location

  // Check if user is on auth pages
  const isOnAuthPage = location.pathname === '/signin' || location.pathname === '/signup';

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
        {/* Pass null or conditionally render based on auth page */}
        <Hero openAuthModal={isOnAuthPage ? null : openAuthModal} />

        {/* REMOVED AuthModal from here - it's now managed in PublicLayout */}

        <CategoryGrid />
        <PopularCategoriesSection/>
        <GetQuoteBanner openAuthModal={isOnAuthPage ? null : openAuthModal} />
        <Testimonials />
        <MakeItHappen openAuthModal={isOnAuthPage ? null : openAuthModal} />
        <LogoMakerBanner/>
        <CallToAction openAuthModal={isOnAuthPage ? null : openAuthModal} />
      </div>
    </SeoWrapper>
  );
};

export default Home;