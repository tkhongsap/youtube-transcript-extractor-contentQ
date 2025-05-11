import { useState } from "react";

interface ContentTypeTabsProps {
  reportsContent: React.ReactNode;
  flashcardsContent: React.ReactNode;
  ideasContent: React.ReactNode;
}

const ContentTypeTabs = ({ 
  reportsContent, 
  flashcardsContent, 
  ideasContent 
}: ContentTypeTabsProps) => {
  const [activeTab, setActiveTab] = useState("reports");
  
  return (
    <div className="mb-6">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button 
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "reports"
                ? "border-primary-500 text-primary-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("reports")}
          >
            Reports
          </button>
          <button 
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "flashcards"
                ? "border-primary-500 text-primary-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("flashcards")}
          >
            Flashcards
          </button>
          <button 
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === "ideas"
                ? "border-primary-500 text-primary-600" 
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("ideas")}
          >
            Ideas
          </button>
        </nav>
      </div>
      
      {/* Tab content */}
      <div className="pt-6">
        {activeTab === "reports" && reportsContent}
        {activeTab === "flashcards" && flashcardsContent}
        {activeTab === "ideas" && ideasContent}
      </div>
    </div>
  );
};

export default ContentTypeTabs;
