import React from "react";

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
}

const ContentCard = ({ children, className = "" }: ContentCardProps) => {
  return (
    <div className={`bg-white rounded-lg shadow-md border border-gray-200 p-4 ${className}`}>
      {children}
    </div>
  );
};

export default ContentCard;
