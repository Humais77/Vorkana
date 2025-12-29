import React, { memo } from "react";

const NameInput = memo(({ value, onChange, error, disabled, setErrors, validationFunctions }) => {
  const handleBlur = async (e) => {
    if (e.target.value && validationFunctions.validateName) {
      const validateName = await validationFunctions.validateName();
      const validation = validateName(e.target.value);
      if (!validation.valid) {
        setErrors(prev => ({ ...prev, name: validation.message }));
      }
    }
  };

  return (
    <div>
      <label className="text-sm font-semibold text-gray-700 mb-2 block">
        Full Name *
      </label>
      <input
        type="text"
        name="name"
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        className="w-full p-3.5 border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all disabled:bg-gray-50 disabled:cursor-not-allowed text-base"
        placeholder="John Doe"
        disabled={disabled}
        autoFocus
        required
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

export default NameInput;