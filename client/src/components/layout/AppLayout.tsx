import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MobileMenu from "./MobileMenu";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [, navigate] = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    // Close mobile menu when route changes
    closeMobileMenu();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center p-6 max-w-sm mx-auto">
          <div className="flex items-center justify-center h-16 w-16 rounded-md bg-primary text-white mx-auto mb-4">
            <span className="material-icons text-3xl">auto_awesome</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Content Spark AI</h1>
          <p className="text-gray-600 mb-6">
            Transform YouTube videos into valuable content assets with AI-powered summarization and content generation.
          </p>
          <Button
            className="w-full"
            onClick={() => window.location.href = "/api/login"}
          >
            Sign In to Continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar - Desktop Only */}
      <Sidebar user={user} />

      {/* Mobile Menu Overlay */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        user={user}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation - Mobile Only */}
        <MobileNav onOpenMenu={toggleMobileMenu} />

        {/* Main Content */}
        {children}

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden bg-white border-t border-gray-200 flex justify-around items-center py-3 px-4">
          <a href="/" className="touch-target flex flex-col items-center text-primary">
            <span className="material-icons text-lg">dashboard</span>
            <span className="text-xs mt-1">Dashboard</span>
          </a>
          <a href="#" className="touch-target flex flex-col items-center text-gray-500">
            <span className="material-icons text-lg">video_library</span>
            <span className="text-xs mt-1">Videos</span>
          </a>
          <a href="#" className="touch-target flex flex-col items-center text-gray-500">
            <span className="material-icons text-lg">description</span>
            <span className="text-xs mt-1">Reports</span>
          </a>
          <a href="#" className="touch-target flex flex-col items-center text-gray-500">
            <span className="material-icons text-lg">style</span>
            <span className="text-xs mt-1">Flashcards</span>
          </a>
        </nav>
      </div>
    </div>
  );
};

export default AppLayout;
