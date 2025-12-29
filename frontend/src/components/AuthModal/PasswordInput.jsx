import React, { memo } from "react";
import { Eye, EyeOff, AlertCircle } from "lucide-react";

const PasswordInput = memo(({
  type,
  value,
  onChange,
  error,
  showPassword,
  onToggle,
  disabled,
  isSubmitting,
  onForgotPassword,
  passwordRequirements,
  passwordStrength,
  getPasswordStrengthColor,
  setErrors,
  validationFunctions
}) => {
  const handleBlur = async (e) => {
    if (type === 'signup' && e.target.value && validationFunctions.validatePassword) {
      const validatePassword = await validationFunctions.validatePassword();
      const validation = validatePassword(e.target.value);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, password: validation.message }));
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm font-semibold text-gray-700">
          Password {type === 'signup' && '*'}
        </label>
        {type === 'signin' && (
          <button
            type="button"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            onClick={onForgotPassword}
            disabled={isSubmitting}
          >
            Forgot password?
          </button>
        )}
      </div>
      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          name="password"
          value={value}
          onChange={onChange}
          onBlur={handleBlur}
          className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base pr-12"
          placeholder="••••••••"
          disabled={disabled}
          required={type === 'signup'}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
        </button>
      </div>
      
      {error && (
        <p className="mt-2 text-sm text-red-600 animate-fadeIn">{error}</p>
      )}

      {type === 'signup' && value && (
        <>
          <div className={`mt-3 p-3 rounded text-sm animate-fadeIn ${
            getPasswordStrengthColor() === 'green'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 mr-2" />
              {passwordStrength}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center text-sm">
                <div className={`w-3.5 h-3.5 rounded-full mr-2.5 ${req.met ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={req.met ? 'text-green-700' : 'text-gray-500'}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.error === nextProps.error &&
    prevProps.showPassword === nextProps.showPassword &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.isSubmitting === nextProps.isSubmitting &&
    prevProps.passwordStrength === nextProps.passwordStrength &&
    prevProps.passwordRequirements === nextProps.passwordRequirements
  );
});

export default PasswordInput;