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
import { Info } from "lucide-react";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const { data: videos = [], isLoading: isLoadingQuery, refetch } = useQuery<
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
        throw new Error("Error fetching videos");
      }
      return (await response.json()) as Video[];
    }
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchTerm, "sorted by:", sortBy);
    refetch();
  };

  const handleTopicChange = (topic: string) => {
    console.log("Topic changed to:", topic);
    setSelectedTopic(topic);
    setSearchTerm(""); // Clear search when changing topics
    // No explicit refetch; useQuery will refetch on queryKey change
  };

  const handleSortChange = (sort: string) => {
    console.log("Sort changed to:", sort);
    setSortBy(sort);
    // No explicit refetch; useQuery will refetch on queryKey change
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Videos</h1>

      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-4">
          <Input
            type="search"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow"
          />
          <SortOptions value={sortBy} onValueChange={handleSortChange} />
          <Button type="submit" disabled={isLoadingQuery}>
            <SearchIcon className="mr-2 h-4 w-4" />
            {isLoadingQuery ? "Searching..." : "Search"}
          </Button>
        </div>
      </form>

      <Alert className="mb-4">
        <Info className="h-4 w-4" />
        <AlertDescription>Showing videos with 10,000+ views only</AlertDescription>
      </Alert>

      <div className="mb-6">
        <CategoryFilter selected={selectedTopic} onSelect={handleTopicChange} />
      </div>

      <VideoGrid videos={videos} isLoading={isLoadingQuery} />
    </div>
  );
}