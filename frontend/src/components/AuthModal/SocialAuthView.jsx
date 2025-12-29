import React, { memo } from "react";
import { Mail } from "lucide-react";

const SocialAuthView = memo(({
  activeTab,
  loading,
  isSubmitting,
  handleGoogleAuth,
  setShowEmailForm,
  onSwitchTab
}) => {
  return (
    <div className="space-y-4">
      <button
        onClick={handleGoogleAuth}
        disabled={loading || isSubmitting}
        className="w-full py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        <img
          src="https://www.google.com/favicon.ico"
          alt="Google"
          className="w-5 h-5 mr-3"
          loading="lazy"
        />
        Continue with Google
      </button>

      <button
        onClick={() => setShowEmailForm(true)}
        disabled={loading || isSubmitting}
        className="w-full py-3.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        <Mail className="w-5 h-5 mr-3" />
        Continue with {activeTab === 'signin' ? 'email' : 'email'}
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.loading === nextProps.loading &&
    prevProps.isSubmitting === nextProps.isSubmitting &&
    prevProps.handleGoogleAuth === nextProps.handleGoogleAuth &&
    prevProps.setShowEmailForm === nextProps.setShowEmailForm &&
    prevProps.onSwitchTab === nextProps.onSwitchTab
  );
});

export default SocialAuthView;