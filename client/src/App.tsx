import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import VideoDetail from "@/pages/video-detail";
import SearchPage from "@/pages/search";
import AppLayout from "@/components/layout/AppLayout";
import { SearchProvider } from "@/contexts/SearchContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/videos/:id" component={VideoDetail} />
      <Route path="/search" component={SearchPage} />
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SearchProvider>
          <AppLayout>
            <Router />
          </AppLayout>
        </SearchProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
