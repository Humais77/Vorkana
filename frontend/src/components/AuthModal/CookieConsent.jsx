// components/CookieConsent.jsx
import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

export default function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  
  useEffect(() => {
    // Check if user has already given consent
    const hasConsent = localStorage.getItem('cookieConsent');
    
    if (!hasConsent) {
      setTimeout(() => {
        setShowConsent(true);
      }, 1000);
    }
  }, []);
  
  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setShowConsent(false);
    toast.success('Cookie preferences saved');
  };
  
  const rejectCookies = () => {
    localStorage.setItem('cookieConsent', 'rejected');
    setShowConsent(false);
    toast.error(
      'Some features may not work without cookies. You can enable cookies in browser settings.'
    );
  };
  
  if (!showConsent) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-lg">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">We Use Cookies</h3>
          <p className="text-sm text-gray-600">
            We use HTTP-only cookies for secure authentication. These cookies are essential for 
            logging in and keeping your session secure. They cannot be accessed by JavaScript 
            and provide better protection against XSS attacks.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            By clicking "Accept", you consent to our use of these security cookies.
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={rejectCookies}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Reject
          </button>
          <button
            onClick={acceptCookies}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
          >
            Accept Cookies
          </button>
        </div>
      </div>
    </div>
  );
}