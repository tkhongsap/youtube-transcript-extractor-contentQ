import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import VideoGrid from "@/components/video-grid";
import CategoryFilter from "@/components/category-filter";
import { Search as SearchIcon } from "lucide-react";
import type { Video } from "@shared/schema";

const categories = [
  "All", "AI & ML", "Tech News", "Programming", "Tech Podcasts",
  "Startups", "Digital Tools", "Education Tech", "Marketing Tech", "Productivity"
];

export default function Search() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: videos = [], isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos", search, selectedCategory],
    enabled: !!search
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Discover Videos</h1>

      <div className="flex gap-4 mb-6">
        <Input
          placeholder="Search videos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button>
          <SearchIcon className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>

      <div className="mb-6">
        <CategoryFilter
          categories={categories}
          selected={selectedCategory}
          onSelect={setSelectedCategory}
        />
      </div>

      <VideoGrid videos={videos} isLoading={isLoading} />
    </div>
  );
}