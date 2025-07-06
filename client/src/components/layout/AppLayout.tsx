import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import MobileMenu from "./MobileMenu";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Sparkles, Video, FileText, Zap, ArrowRight } from "lucide-react";

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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-2000"></div>
          <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse animation-delay-4000"></div>
        </div>

        <div className="relative z-10 text-center p-8 max-w-2xl mx-4">
          {/* Logo and main icon */}
          <div className="relative mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-2xl shadow-blue-500/25 mb-6 transform hover:scale-105 transition-transform duration-300">
              <Sparkles className="w-10 h-10" />
            </div>
            {/* Floating icons */}
            <Video className="absolute -top-2 -right-2 w-6 h-6 text-blue-500 animate-bounce animation-delay-1000" />
            <FileText className="absolute -bottom-2 -left-2 w-6 h-6 text-purple-500 animate-bounce animation-delay-3000" />
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-4 leading-tight">
            Content Spark
          </h1>

          {/* Punchy tagline */}
          <p className="text-xl md:text-2xl text-gray-700 font-medium mb-3">
            Turn Any Video Into
          </p>
          <p className="text-2xl md:text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text mb-6">
            Content Gold
          </p>

          {/* Features list */}
          <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm md:text-base">
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-gray-700 font-medium">Summaries</span>
            </div>
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <FileText className="w-4 h-4 text-blue-500" />
              <span className="text-gray-700 font-medium">Smart Reports</span>
            </div>
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span className="text-gray-700 font-medium">Content Ideas</span>
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-4 rounded-xl shadow-xl shadow-blue-500/25 transform hover:scale-105 transition-all duration-300 group"
            onClick={() => window.location.href = "/api/login"}
          >
            <span className="mr-2">Start Creating Magic</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
          </Button>

          {/* Subtle description */}
          <p className="text-gray-500 text-sm mt-6 max-w-md mx-auto">
            Extract transcripts, generate summaries, create flashcards, and mine content ideas from any YouTube video automatically.
          </p>
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
