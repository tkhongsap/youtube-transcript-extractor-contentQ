import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import VideoCard from "@/components/video/VideoCard";
import SearchAndFilter from "@/components/common/SearchAndFilter";
import EmptyState from "@/components/common/EmptyState";
import { Video } from "@shared/schema";

const VideosPage = () => {
  const [search, setSearch] = useState("");

  const { data: videos, isLoading } = useQuery<Video[]>({
    queryKey: ["/api/videos"],
  });

  const filtered = videos?.filter((v) =>
    v.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">My Videos</h1>
        <SearchAndFilter value={search} onChange={setSearch} placeholder="Search videos" />
        {isLoading ? (
          <p>Loading...</p>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        ) : (
          <EmptyState icon="videocam_off" message="No videos found" />
        )}
      </div>
    </main>
  );
};

export default VideosPage;
