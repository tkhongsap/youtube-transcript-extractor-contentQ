import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoGrid from "@/components/video-grid";
import CategoryFilter from "@/components/category-filter";
import SortOptions from "@/components/sort-options";
import { Search as SearchIcon } from "lucide-react";
import type { Video } from "@shared/schema";

const categories = [
  "All", "AI & ML", "Tech News", "Programming", "Tech Podcasts",
  "Startups", "Digital Tools", "Education Tech", "Marketing Tech", "Productivity"
];

export default function Search() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState("relevance");

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", selectedCategory, sortBy],
    enabled: true,
  });

  const handleSearch = () => {
    // Trigger a new search
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Videos</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4 flex-1">
          <Input
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={handleSearch}>
            <SearchIcon className="mr-2 h-4 w-4" />
            Search
          </Button>
        </div>
        <SortOptions value={sortBy} onValueChange={setSortBy} />
      </div>

      <div className="mb-6">
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Showing videos with 10,000+ views
      </div>

      <VideoGrid videos={videos} isLoading={isLoading} />
    </div>
  );
}