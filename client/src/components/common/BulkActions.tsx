import React from "react";

interface BulkActionsProps {
  children?: React.ReactNode;
}

const BulkActions = ({ children }: BulkActionsProps) => {
  return (
    <div className="flex items-center space-x-2 mb-4">
      {children || <span className="text-sm text-gray-500">Select items to see actions</span>}
    </div>
  );
};

export default BulkActions;
