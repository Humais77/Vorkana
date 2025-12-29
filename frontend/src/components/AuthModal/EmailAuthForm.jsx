import React, { memo, useMemo, lazy, Suspense } from "react";
import { ArrowLeft, AlertCircle, Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

// Lazy load heavy components
const EmailInput = lazy(() => import("./EmailInput"));
const PasswordInput = lazy(() => import("./PasswordInput"));
const NameInput = lazy(() => import("./NameInput"));

const EmailAuthForm = memo(({
  activeTab,
  signinData,
  signupData,
  errors,
  showPassword,
  error,
  loading,
  loginMutation,
  registerMutation,
  isSubmitting,
  passwordStrength,
  passwordRequirements,
  handleSigninChange,
  handleSignupChange,
  handleSigninSubmit,
  handleSignupSubmit,
  togglePasswordVisibility,
  setShowEmailForm,
  setErrors,
  formatErrorMessage,
  getPasswordStrengthColor,
  onSwitchTab,
  navigate,
  onClose
}) => {
  // Memoize expensive calculations
  const validationFunctions = useMemo(() => ({
    validateEmail: async (email) => {
      const { validateEmail } = await import("../../hooks/useAuth");
      return validateEmail(email);
    },
    validateName: async (name) => {
      const { validateName } = await import("../../hooks/useAuth");
      return validateName(name);
    },
    validatePassword: async (password) => {
      const { validatePassword } = await import("../../hooks/useAuth");
      return validatePassword(password);
    }
  }), []);

  const renderSignInForm = useMemo(() => (
    <form onSubmit={handleSigninSubmit} className="space-y-4">
      <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse rounded-lg" />}>
        <EmailInput
          value={signinData.email}
          onChange={handleSigninChange}
          error={errors.email}
          disabled={loading || loginMutation.isPending || isSubmitting}
          setErrors={setErrors}
          validationFunctions={validationFunctions}
        />
      </Suspense>

      <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse rounded-lg" />}>
        <PasswordInput
          type="signin"
          value={signinData.password}
          onChange={handleSigninChange}
          error={errors.password}
          showPassword={showPassword}
          onToggle={togglePasswordVisibility}
          disabled={loading || loginMutation.isPending || isSubmitting}
          isSubmitting={isSubmitting}
          onForgotPassword={() => {
            onClose();
            navigate('/forgot-password');
          }}
          setErrors={setErrors}
        />
      </Suspense>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="rememberMe"
          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
        />
        <label htmlFor="rememberMe" className="ml-2 text-sm text-gray-600">
          Remember me on this device
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || loginMutation.isPending || isSubmitting}
        className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base"
      >
        {loginMutation.isPending || isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Signing In...
          </>
        ) : (
          <>
            <LogIn className="mr-2" size={20} />
            Sign In
          </>
        )}
      </button>
    </form>
  ), [
    handleSigninSubmit,
    signinData.email,
    signinData.password,
    errors.email,
    errors.password,
    loading,
    loginMutation.isPending,
    isSubmitting,
    showPassword,
    handleSigninChange,
    togglePasswordVisibility,
    onClose,
    navigate,
    setErrors,
    validationFunctions
  ]);

  const renderSignUpForm = useMemo(() => (
    <form onSubmit={handleSignupSubmit} className="space-y-4">
      <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse rounded-lg" />}>
        <NameInput
          value={signupData.name}
          onChange={handleSignupChange}
          error={errors.name}
          disabled={loading || registerMutation.isPending || isSubmitting}
          setErrors={setErrors}
          validationFunctions={validationFunctions}
        />
      </Suspense>

      <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse rounded-lg" />}>
        <EmailInput
          value={signupData.email}
          onChange={handleSignupChange}
          error={errors.email}
          disabled={loading || registerMutation.isPending || isSubmitting}
          setErrors={setErrors}
          validationFunctions={validationFunctions}
        />
      </Suspense>

      <Suspense fallback={<div className="h-12 bg-gray-100 animate-pulse rounded-lg" />}>
        <PasswordInput
          type="signup"
          value={signupData.password}
          onChange={handleSignupChange}
          error={errors.password}
          showPassword={showPassword}
          onToggle={togglePasswordVisibility}
          disabled={loading || registerMutation.isPending || isSubmitting}
          isSubmitting={isSubmitting}
          passwordRequirements={passwordRequirements}
          passwordStrength={passwordStrength}
          getPasswordStrengthColor={getPasswordStrengthColor}
          setErrors={setErrors}
          validationFunctions={validationFunctions}
        />
      </Suspense>

      <div className="flex items-start mt-6">
        <input
          type="checkbox"
          id="terms"
          className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500 mt-1"
          required
        />
        <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
          I agree to the Vorkana Terms of Service and Privacy Policy. I understand that I will receive account-related emails.
        </label>
      </div>

      <button
        type="submit"
        disabled={loading || registerMutation.isPending || isSubmitting}
        className="w-full py-3.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center justify-center shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-base mt-4"
      >
        {registerMutation.isPending || isSubmitting ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Creating Account...
          </>
        ) : (
          <>
            <UserPlus className="mr-2" size={20} />
            Create Account
          </>
        )}
      </button>

      <p className="text-sm text-gray-500 text-center mt-4">
        Already have an account?{' '}
        <button
          type="button"
          onClick={() => {
            onSwitchTab('signin');
            setShowEmailForm(false);
          }}
          className="text-emerald-600 hover:text-emerald-700 font-medium"
          disabled={isSubmitting}
        >
          Sign in here
        </button>
      </p>
    </form>
  ), [
    handleSignupSubmit,
    signupData.name,
    signupData.email,
    signupData.password,
    errors.name,
    errors.email,
    errors.password,
    loading,
    registerMutation.isPending,
    isSubmitting,
    showPassword,
    handleSignupChange,
    togglePasswordVisibility,
    passwordRequirements,
    passwordStrength,
    getPasswordStrengthColor,
    onSwitchTab,
    setShowEmailForm,
    setErrors,
    validationFunctions
  ]);

  return (
    <div className="overflow-y-auto max-h-[500px] pr-2">
      <button
        onClick={() => setShowEmailForm(false)}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors text-base"
        disabled={isSubmitting}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </button>

      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Continue with your email {activeTab === 'signup' ? '' : 'or username'}
        </h3>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg animate-fadeIn">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-red-500 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-red-700 font-medium text-sm">
                {formatErrorMessage(error)}
              </p>
              {error.includes('locked') && (
                <p className="text-red-600 text-xs mt-1">
                  Please wait or contact support if you believe this is an error.
                </p>
              )}
              {error.includes('deactivated') && (
                <p className="text-red-600 text-xs mt-1">
                  Contact support to reactivate your account.
                </p>
              )}
              {error.includes('Invalid email or password') && (
                <p className="text-red-600 text-xs mt-1">
                  Please check your credentials and try again.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <Suspense fallback={<div className="h-64 bg-gray-100 animate-pulse rounded-lg" />}>
        {activeTab === 'signin' ? renderSignInForm : renderSignUpForm}
      </Suspense>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function - only re-render when necessary props change
  return (
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.signinData.email === nextProps.signinData.email &&
    prevProps.signinData.password === nextProps.signinData.password &&
    prevProps.signupData.name === nextProps.signupData.name &&
    prevProps.signupData.email === nextProps.signupData.email &&
    prevProps.signupData.password === nextProps.signupData.password &&
    prevProps.errors.email === nextProps.errors.email &&
    prevProps.errors.password === nextProps.errors.password &&
    prevProps.errors.name === nextProps.errors.name &&
    prevProps.showPassword === nextProps.showPassword &&
    prevProps.error === nextProps.error &&
    prevProps.loading === nextProps.loading &&
    prevProps.loginMutation.isPending === nextProps.loginMutation.isPending &&
    prevProps.registerMutation.isPending === nextProps.registerMutation.isPending &&
    prevProps.isSubmitting === nextProps.isSubmitting &&
    prevProps.passwordStrength === nextProps.passwordStrength &&
    prevProps.passwordRequirements === nextProps.passwordRequirements
  );
});

export default EmailAuthForm;