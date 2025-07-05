import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import VideoDetail from "@/pages/video-detail";
import VideosPage from "@/pages/videos";
import ReportsPage from "@/pages/reports";
import ReportDetailPage from "@/pages/reports/[id]";
import FlashcardsPage from "@/pages/flashcards";
import FlashcardSetPage from "@/pages/flashcards/[setId]";
import FlashcardStudyPage from "@/pages/flashcards/[setId]/study";
import IdeasPage from "@/pages/ideas";
import IdeaSetPage from "@/pages/ideas/[setId]";
import AppLayout from "@/components/layout/AppLayout";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/videos" component={VideosPage} />
      <Route path="/videos/:id" component={VideoDetail} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/reports/:id" component={ReportDetailPage} />
      <Route path="/flashcards" component={FlashcardsPage} />
      <Route path="/flashcards/:setId" component={FlashcardSetPage} />
      <Route path="/flashcards/:setId/study" component={FlashcardStudyPage} />
      <Route path="/ideas" component={IdeasPage} />
      <Route path="/ideas/:setId" component={IdeaSetPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppLayout>
          <Router />
        </AppLayout>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
