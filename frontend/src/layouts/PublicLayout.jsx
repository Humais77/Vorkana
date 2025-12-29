import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AuthModal from '../components/AuthModal/AuthModal.jsx';

const PublicLayout = ({
  showAuthModal,
  activeTab,
  setActiveTab,
  setShowAuthModal,
  openSigninModal,
  openSignupModal
}) => {
  return (
    <>
      <Navbar
        onSigninClick={openSigninModal}
        onSignupClick={openSignupModal}
      />

      {showAuthModal && (
        <AuthModal
          activeTab={activeTab}
          onSwitchTab={setActiveTab}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      <Outlet />

      <Footer />
    </>
  );
};

export default PublicLayout;
