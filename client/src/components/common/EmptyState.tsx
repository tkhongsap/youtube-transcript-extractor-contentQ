import React from "react";

interface EmptyStateProps {
  icon?: string;
  message: string;
}

const EmptyState = ({ icon = "info", message }: EmptyStateProps) => {
  return (
    <div className="text-center py-10">
      <span className="material-icons text-4xl text-gray-300 mb-2">{icon}</span>
      <p className="text-gray-500">{message}</p>
    </div>
  );
};

export default EmptyState;
