// components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log to error tracking service
    console.error('React Error Boundary caught:', error);
    console.error('Component stack:', errorInfo.componentStack);
    
    // Check for common errors
    if (error.toString().includes('lowercase') || error.toString().includes('unrecognized tag')) {
      console.error('🔍 This is likely a React component casing error!');
      console.error('   Make sure all React components start with uppercase letters.');
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800">Something went wrong</h2>
          <p className="text-red-600">{this.state.error?.toString()}</p>
          <details className="mt-2 text-sm text-red-700">
            <summary>Component Stack</summary>
            <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;