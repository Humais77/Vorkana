import React, { memo } from "react";

const EmailInput = memo(({ value, onChange, error, disabled, setErrors, validationFunctions }) => {
  const handleBlur = async (e) => {
    if (e.target.value && validationFunctions.validateEmail) {
      const validateEmail = await validationFunctions.validateEmail();
      if (!validateEmail(e.target.value)) {
        setErrors(prev => ({ ...prev, email: "Please enter a valid email address" }));
      }
    }
  };

  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-2 block">
        Email Address
      </label>
      <input
        type="email"
        name="email"
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
        placeholder="you@example.com"
        disabled={disabled}
        autoFocus
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 animate-fadeIn">{error}</p>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.value === nextProps.value &&
    prevProps.error === nextProps.error &&
    prevProps.disabled === nextProps.disabled
  );
});

export default EmailInput;