import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  date: string;
}

interface VideoGridProps {
  videos: Video[];
  isLoading: boolean;
}

export default function VideoGrid({ videos, isLoading }: VideoGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(20).fill(0).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-0">
              <Skeleton className="h-48 rounded-t-lg" />
              <div className="p-4">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {videos.slice(0, 20).map((video) => (
        <Card key={video.id} className="flex flex-col">
          <CardContent className="p-0 flex-1">
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full aspect-video object-cover rounded-t-lg"
            />
            <div className="p-4">
              <h3 className="font-semibold mb-2 line-clamp-2">{video.title}</h3>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>{video.views.toLocaleString()} views</span>
                <span>{video.date}</span>
              </div>
              <Link href={`/analysis/${video.id}`}>
                <Button className="w-full">Extract</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}