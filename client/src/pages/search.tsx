import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoGrid from "@/components/video-grid";
import CategoryFilter from "@/components/category-filter";
import SortOptions from "@/components/sort-options";
import { Search as SearchIcon } from "lucide-react";
import type { Video } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const { toast } = useToast();

  const { data: videos = [], isLoading: isLoadingQuery, error, refetch } = useQuery<
    Video[],
    Error,
    Video[],
    [string, { q: string; topic: string; sortBy: string }]
  >({
    queryKey: ["/api/videos", { q: searchTerm, topic: selectedTopic, sortBy }],
    queryFn: async ({ queryKey }: { queryKey: [string, { q: string; topic: string; sortBy: string }] }) => {
      const [_key, params] = queryKey;
      const response = await fetch(`/api/videos?q=${encodeURIComponent(params.q)}&topic=${params.topic}&sortBy=${params.sortBy}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error fetching videos");
      }
      const data = await response.json();
      if (data.length === 0) {
        toast({
          title: "No Videos Found",
          description: "Try adjusting your search terms or come back later if you've hit the API limit.",
          variant: "destructive",
        });
      }
      return data;
    },
    retry: false
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
    setSearchTerm(""); // Clear search when changing topics
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-2 gradient-text">Discover Videos</h1>
      <p className="text-subtle-gray mb-8">Search and analyze tech-focused content</p>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <Input
            type="search"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow bg-white border-[#E2E8F0] focus:border-[#6638F0]"
          />
          <SortOptions value={sortBy} onValueChange={handleSortChange} />
          <Button type="submit" disabled={isLoadingQuery} className="btn-primary">
            <SearchIcon className="mr-2 h-4 w-4" />
            {isLoadingQuery ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      <div className="mb-6">
        <CategoryFilter selected={selectedTopic} onSelect={handleTopicChange} />
      </div>

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Unable to fetch videos. You may have hit the API quota limit. Please try again later.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-4 bg-white border border-[#E2E8F0]">
          <Info className="h-4 w-4" />
          <AlertDescription>Showing videos with 10,000+ views only</AlertDescription>
        </Alert>
      )}

      <VideoGrid videos={videos} isLoading={isLoadingQuery} />
    </div>
  );
}