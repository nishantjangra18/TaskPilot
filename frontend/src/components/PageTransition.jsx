import React from 'react';

const PageTransition = ({ children }) => {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    // Slight delay to ensure the browser repaints the layout
    const timer = setTimeout(() => setIsMounted(true), 25);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`transition-all duration-350 transform ease-out ${
      isMounted 
        ? 'opacity-100 translate-y-0' 
        : 'opacity-0 translate-y-4'
    }`}>
      {children}
    </div>
  );
};

export default PageTransition;
