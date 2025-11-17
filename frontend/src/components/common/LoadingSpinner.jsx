import React from 'react';
import { motion } from 'framer-motion';

const LoadingSpinner = ({
  size = 'md',
  color = 'primary',
  text = '',
  className = '',
  fullScreen = false
}) => {
  // Size configurations
  const sizeClasses = {
    xs: 'w-4 h-4',
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  // Color configurations
  const colorClasses = {
    primary: 'text-primary-600',
    secondary: 'text-secondary-600',
    white: 'text-white',
    neutral: 'text-neutral-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    error: 'text-error-600',
  };

  // Text size based on spinner size
  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const spinnerClasses = `${sizeClasses[size]} ${colorClasses[color]} ${className}`;
  const textClasses = `${textSizeClasses[size]} ${colorClasses[color]} mt-2 font-medium`;

  const SpinnerSVG = () => (
    <motion.svg
      className={spinnerClasses}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </motion.svg>
  );

  const content = (
    <div className="flex flex-col items-center justify-center">
      <SpinnerSVG />
      {text && (
        <motion.p
          className={textClasses}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-75 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-lg">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

// Predefined loading spinner variants
export const PageLoader = ({ text = 'Loading...' }) => (
  <LoadingSpinner size="lg" color="primary" text={text} fullScreen />
);

export const InlineLoader = ({ size = 'sm', color = 'primary' }) => (
  <LoadingSpinner size={size} color={color} />
);

export const ButtonLoader = ({ size = 'xs', color = 'white' }) => (
  <LoadingSpinner size={size} color={color} />
);

export default LoadingSpinner;
