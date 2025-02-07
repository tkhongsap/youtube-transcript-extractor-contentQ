import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoGrid from "@/components/video-grid";
import CategoryFilter from "@/components/category-filter";
import SortOptions from "@/components/sort-options";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search as SearchIcon } from "lucide-react";
import type { Video } from "@shared/schema";

const categories = [
  "All", "AI & ML", "Tech News", "Programming", "Tech Podcasts",
  "Startups", "Digital Tools", "Education Tech", "Marketing Tech", "Productivity"
];

export default function Search() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: videos = [], isLoading, refetch } = useQuery<Video[]>({
    queryKey: ["/api/videos", selectedTopic, sortBy],
    enabled: true, // Always fetch videos on mount
  });

  const handleSearch = async () => {
    refetch();
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      scrollContainerRef.current.scrollTo({
        left: direction === "left" ? currentScroll - scrollAmount : currentScroll + scrollAmount,
        behavior: "smooth",
      });
    }
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
        <SortOptions value={sortBy} onValueChange={setSortBy} />
      </div>

      <div className="relative mb-6">
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => handleScroll("left")}
        >
          ←
        </Button>
        <ScrollArea
          ref={scrollContainerRef}
          className="overflow-x-auto whitespace-nowrap px-8"
        >
          <CategoryFilter
            categories={categories}
            selected={selectedTopic}
            onSelect={setSelectedTopic}
          />
        </ScrollArea>
        <Button
          variant="outline"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10"
          onClick={() => handleScroll("right")}
        >
          →
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Showing videos with 10,000+ views only
      </div>

      <VideoGrid videos={videos} isLoading={isLoading} />
    </div>
  );
}