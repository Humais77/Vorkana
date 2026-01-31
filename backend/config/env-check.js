const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

class EnvValidator {
  constructor() {
    this.requiredEnvVars = {
      // Database
      MONGO_URL: {
        required: true,
        description: 'MongoDB connection string',
        validate: (value) => value && value.startsWith('mongodb'),
        errorMessage: 'Must be a valid MongoDB connection string starting with mongodb:// or mongodb+srv://'
      },

      // JWT & Security
      JWT_SECRET: {
        required: true,
        description: 'JWT secret key for signing tokens',
        validate: (value) => value && value.length >= 32,
        errorMessage: 'Must be at least 32 characters long for security'
      },
      JWT_REFRESH_SECRET: {
        required: true,
        description: 'JWT refresh token secret',
        validate: (value) => value && value.length >= 32,
        errorMessage: 'Must be at least 32 characters long'
      },
      COOKIE_SECRET: {
        required: process.env.NODE_ENV === 'production',
        description: 'Secret for signing cookies',
        validate: (value) => !process.env.NODE_ENV === 'production' || (value && value.length >= 32),
        errorMessage: 'Required in production and must be at least 32 characters'
      },

      // Frontend & URLs
      FRONTEND_URL: {
        required: true,
        description: 'Frontend application URL',
        validate: (value) => value && (value.startsWith('http://') || value.startsWith('https://')),
        errorMessage: 'Must be a valid URL starting with http:// or https://'
      },
      BACKEND_URL: {
        required: false,
        description: 'Backend API URL',
        default: 'http://localhost:3000'
      },

      // Email Configuration
      SMTP_HOST: {
        required: false,
        description: 'SMTP server host for emails',
        default: 'smtp.gmail.com'
      },
      SMTP_PORT: {
        required: false,
        description: 'SMTP server port',
        default: '587',
        validate: (value) => !value || !isNaN(parseInt(value)),
        errorMessage: 'Must be a valid port number'
      },
      SMTP_USER: {
        required: false,
        description: 'SMTP username/email'
      },
      SMTP_PASS: {
        required: false,
        description: 'SMTP password'
      },
      EMAIL_FROM: {
        required: false,
        description: 'Default sender email address',
        default: 'noreply@yourapp.com'
      },

      // File Upload
      CLOUDINARY_CLOUD_NAME: {
        required: false,
        description: 'Cloudinary cloud name'
      },
      CLOUDINARY_API_KEY: {
        required: false,
        description: 'Cloudinary API key'
      },
      CLOUDINARY_API_SECRET: {
        required: false,
        description: 'Cloudinary API secret'
      },
      MAX_FILE_SIZE: {
        required: false,
        description: 'Maximum file upload size in bytes',
        default: '5242880', // 5MB
        validate: (value) => !value || !isNaN(parseInt(value)),
        errorMessage: 'Must be a valid number'
      },

      // Rate Limiting
      RATE_LIMIT_WINDOW_MS: {
        required: false,
        description: 'Rate limit window in milliseconds',
        default: '900000', // 15 minutes
        validate: (value) => !value || !isNaN(parseInt(value)),
        errorMessage: 'Must be a valid number'
      },
      RATE_LIMIT_MAX_REQUESTS: {
        required: false,
        description: 'Maximum requests per window',
        default: '500',
        validate: (value) => !value || !isNaN(parseInt(value)),
        errorMessage: 'Must be a valid number'
      },

      // Application
      NODE_ENV: {
        required: false,
        description: 'Application environment',
        default: 'development',
        validate: (value) => ['development', 'production', 'test', 'staging'].includes(value),
        errorMessage: 'Must be one of: development, production, test, staging'
      },
      PORT: {
        required: false,
        description: 'Server port',
        default: '3000',
        validate: (value) => !value || !isNaN(parseInt(value)),
        errorMessage: 'Must be a valid port number'
      },
      LOG_LEVEL: {
        required: false,
        description: 'Logging level',
        default: 'info',
        validate: (value) => ['error', 'warn', 'info', 'debug'].includes(value),
        errorMessage: 'Must be one of: error, warn, info, debug'
      },

      // Session
      SESSION_SECRET: {
        required: process.env.NODE_ENV === 'production',
        description: 'Session secret key',
        validate: (value) => !process.env.NODE_ENV === 'production' || (value && value.length >= 32),
        errorMessage: 'Required in production and must be at least 32 characters'
      },
      SESSION_MAX_AGE: {
        required: false,
        description: 'Session max age in milliseconds',
        default: '86400000', // 24 hours
        validate: (value) => !value || !isNaN(parseInt(value)),
        errorMessage: 'Must be a valid number'
      },

      // CORS
      CORS_ORIGINS: {
        required: false,
        description: 'Comma-separated list of allowed CORS origins',
        default: 'http://localhost:3000,http://localhost:5173'
      }
    };
  }

  validate() {
    const errors = [];
    const warnings = [];
    const validatedEnv = {};

    console.log('🔍 Validating environment variables...\n');

    // Check each environment variable
    for (const [key, config] of Object.entries(this.requiredEnvVars)) {
      const value = process.env[key];
      
      // If value is not set
      if (!value && value !== '') {
        if (config.required) {
          errors.push({
            variable: key,
            message: `❌ Required variable "${key}" is not set. Description: ${config.description}`
          });
        } else if (config.default !== undefined) {
          validatedEnv[key] = config.default;
          warnings.push({
            variable: key,
            message: `⚠️  Optional variable "${key}" not set, using default: ${config.default}. Description: ${config.description}`
          });
        } else {
          validatedEnv[key] = undefined;
        }
        continue;
      }

      // If value is empty string but required
      if (value === '' && config.required) {
        errors.push({
          variable: key,
          message: `❌ Required variable "${key}" is empty. Description: ${config.description}`
        });
        continue;
      }

      // Validate value if validator exists
      if (config.validate && value) {
        try {
          const isValid = config.validate(value);
          if (!isValid) {
            errors.push({
              variable: key,
              message: `❌ Invalid value for "${key}": ${config.errorMessage}. Current value: "${value}"`
            });
            continue;
          }
        } catch (validationError) {
          errors.push({
            variable: key,
            message: `❌ Validation error for "${key}": ${validationError.message}`
          });
          continue;
        }
      }

      // Store validated value
      validatedEnv[key] = value;
    }

    // Additional environment-specific validations
    this.validateEnvironmentSpecific(errors, warnings, validatedEnv);

    // Print results
    if (warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      warnings.forEach(warning => {
        console.log(`   ${warning.message}`);
      });
    }

    if (errors.length > 0) {
      console.log('\n❌ Errors found:');
      errors.forEach(error => {
        console.log(`   ${error.message}`);
      });
      
      console.log('\n📋 Summary:');
      console.log(`   Total variables checked: ${Object.keys(this.requiredEnvVars).length}`);
      console.log(`   Errors: ${errors.length}`);
      console.log(`   Warnings: ${warnings.length}`);
      
      throw new Error(`Environment validation failed with ${errors.length} error(s)`);
    }

    console.log('\n✅ Environment validation passed!');
    console.log(`📋 Summary:`);
    console.log(`   Total variables checked: ${Object.keys(this.requiredEnvVars).length}`);
    console.log(`   Errors: ${errors.length}`);
    console.log(`   Warnings: ${warnings.length}`);
    console.log(`   Environment: ${validatedEnv.NODE_ENV}`);
    console.log(`   Port: ${validatedEnv.PORT}`);
    
    return validatedEnv;
  }

  validateEnvironmentSpecific(errors, warnings, env) {
    const NODE_ENV = env.NODE_ENV || 'development';

    // Production-specific validations
    if (NODE_ENV === 'production') {
      if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
        warnings.push({
          variable: 'CLOUDINARY_*',
          message: '⚠️  Cloudinary configuration is missing. File uploads may not work in production.'
        });
      }

      if (!env.SMTP_USER || !env.SMTP_PASS) {
        warnings.push({
          variable: 'SMTP_*',
          message: '⚠️  SMTP configuration is incomplete. Email functionality may not work.'
        });
      }

      // Check for default JWT secret in production
      if (env.JWT_SECRET && env.JWT_SECRET.includes('default') || env.JWT_SECRET.length < 32) {
        errors.push({
          variable: 'JWT_SECRET',
          message: '❌ JWT_SECRET is too weak for production. Use a strong, random string of at least 32 characters.'
        });
      }

      // Check for development URLs in production
      if (env.FRONTEND_URL && env.FRONTEND_URL.includes('localhost')) {
        warnings.push({
          variable: 'FRONTEND_URL',
          message: '⚠️  FRONTEND_URL points to localhost in production. This may cause CORS issues.'
        });
      }
    }

    // Development-specific validations
    if (NODE_ENV === 'development') {
      if (env.MONGO_URL && !env.MONGO_URL.includes('localhost')) {
        warnings.push({
          variable: 'MONGO_URL',
          message: '⚠️  Using non-local MongoDB in development mode.'
        });
      }
    }

    // Validate URL formats
    if (env.FRONTEND_URL) {
      try {
        new URL(env.FRONTEND_URL);
      } catch (e) {
        errors.push({
          variable: 'FRONTEND_URL',
          message: `❌ FRONTEND_URL is not a valid URL: ${env.FRONTEND_URL}`
        });
      }
    }

    // Validate numeric values
    const numericVars = ['PORT', 'SMTP_PORT', 'MAX_FILE_SIZE', 'RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS'];
    numericVars.forEach(varName => {
      if (env[varName] && isNaN(parseInt(env[varName]))) {
        errors.push({
          variable: varName,
          message: `❌ ${varName} must be a valid number, got: ${env[varName]}`
        });
      }
    });
  }

  // Helper method to generate .env.example file
  generateEnvExample() {
    let exampleContent = '# Environment Variables Configuration\n\n';
    
    // Group variables by category
    const categories = {
      'Application': ['NODE_ENV', 'PORT', 'LOG_LEVEL', 'BACKEND_URL', 'FRONTEND_URL'],
      'Database': ['MONGO_URL'],
      'Security': ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'COOKIE_SECRET', 'SESSION_SECRET', 'SESSION_MAX_AGE'],
      'Email': ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM'],
      'File Storage': ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'MAX_FILE_SIZE'],
      'Rate Limiting': ['RATE_LIMIT_WINDOW_MS', 'RATE_LIMIT_MAX_REQUESTS'],
      'CORS': ['CORS_ORIGINS']
    };

    for (const [category, vars] of Object.entries(categories)) {
      exampleContent += `# ${category}\n`;
      vars.forEach(varName => {
        const config = this.requiredEnvVars[varName];
        if (config) {
          exampleContent += `${varName}=`;
          if (config.default !== undefined) {
            exampleContent += config.default;
          }
          exampleContent += ` # ${config.description}`;
          if (config.required) {
            exampleContent += ' (REQUIRED)';
          }
          exampleContent += '\n';
        }
      });
      exampleContent += '\n';
    }

    return exampleContent;
  }

  // Print current environment summary
  printSummary() {
    console.log('\n📊 Current Environment Summary:');
    console.log('='.repeat(50));
    
    Object.entries(this.requiredEnvVars).forEach(([key, config]) => {
      const value = process.env[key];
      const displayValue = value ? 
        (key.includes('SECRET') || key.includes('PASS') || key.includes('KEY') ? 
          '********' : value) : 
        '❌ NOT SET';
      
      const status = value ? '✅' : config.required ? '❌' : '⚠️';
      
      console.log(`${status} ${key.padEnd(30)}: ${displayValue}`);
    });
    
    console.log('='.repeat(50));
  }
}

// Create singleton instance
const envValidator = new EnvValidator();

// Export for use in app.js
module.exports = {
  validateEnv: () => envValidator.validate(),
  generateEnvExample: () => envValidator.generateEnvExample(),
  printSummary: () => envValidator.printSummary(),
  getValidatedEnv: () => {
    const validated = {};
    Object.keys(envValidator.requiredEnvVars).forEach(key => {
      validated[key] = process.env[key] || envValidator.requiredEnvVars[key].default;
    });
    return validated;
  }
};