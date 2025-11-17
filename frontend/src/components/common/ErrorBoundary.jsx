import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    this.setState({
      error: error,
      errorInfo: errorInfo,
    });

    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-50">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              {/* Error Icon */}
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-error-100 mb-6">
                <AlertTriangle className="h-8 w-8 text-error-600" />
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-neutral-900 mb-4">
                Oops! Something went wrong
              </h1>

              {/* Error Message */}
              <p className="text-neutral-600 mb-6">
                We're sorry, but something unexpected happened. Please try one of the options below.
              </p>

              {/* Development Error Details */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-6 p-4 bg-neutral-100 rounded-lg text-left">
                  <h3 className="text-sm font-semibold text-neutral-800 mb-2">
                    Error Details (Development Only):
                  </h3>
                  <pre className="text-xs text-neutral-700 whitespace-pre-wrap overflow-auto max-h-32">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <details className="mt-2">
                      <summary className="text-xs font-medium text-neutral-600 cursor-pointer">
                        Component Stack
                      </summary>
                      <pre className="text-xs text-neutral-600 whitespace-pre-wrap overflow-auto max-h-32 mt-1">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={this.handleRetry}
                  className="w-full btn btn-primary flex items-center justify-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={this.handleReload}
                    className="btn btn-outline flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reload Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="btn btn-secondary flex items-center justify-center gap-2"
                  >
                    <Home className="h-4 w-4" />
                    Go Home
                  </button>
                </div>
              </div>

              {/* Contact Support */}
              <div className="mt-6 pt-6 border-t border-neutral-200">
                <p className="text-sm text-neutral-500">
                  If this problem persists, please{' '}
                  <a
                    href="mailto:support@drugverification.com"
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    contact support
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
