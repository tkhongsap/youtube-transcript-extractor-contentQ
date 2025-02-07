import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoGrid from "@/components/video-grid";
import CategoryFilter from "@/components/category-filter";
import SortOptions from "@/components/sort-options";
import { Search as SearchIcon } from "lucide-react";
import type { Video } from "@shared/schema";

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  const { data: videos = [], isLoading, refetch } = useQuery<Video[]>({
    queryKey: ["/api/videos", { q: searchTerm, topic: selectedTopic, sortBy }],
    enabled: true,
  });

  const handleSearch = () => {
    console.log('Searching with:', { searchTerm, selectedTopic, sortBy });
    refetch();
  };

  const handleTopicChange = (topic: string) => {
    console.log('Topic changed to:', topic);
    setSelectedTopic(topic);
    // Clear search term when changing topics to get pure topic-based results
    setSearchTerm("");
    refetch();
  };

  const handleSortChange = (sort: string) => {
    console.log('Sort changed to:', sort);
    setSortBy(sort);
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Videos</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4 flex-1">
          <Input
            type="search"
            placeholder="Search videos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={isLoading}>
            <SearchIcon className="mr-2 h-4 w-4" />
            {isLoading ? "Searching..." : "Search"}
          </Button>
        </div>
        <SortOptions value={sortBy} onValueChange={handleSortChange} />
      </div>

      <div className="mb-6">
        <CategoryFilter
          selected={selectedTopic}
          onSelect={handleTopicChange}
        />
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Showing videos with 10,000+ views only
      </div>

      <VideoGrid videos={videos} isLoading={isLoading} />
    </div>
  );
}