import { FC } from "react";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface VideoCardProps {
  title: string;
  thumbnail: string;
  channelName: string;
  videoId: string;
  views?: string;
  publishedAt?: string;
}

export const VideoCard: FC<VideoCardProps> = ({
  title,
  thumbnail,
  channelName,
  videoId,
  views,
  publishedAt,
}) => {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <a href={videoUrl} target="_blank" rel="noopener noreferrer">
        <div className="relative aspect-video">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="font-semibold line-clamp-2 mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground mb-2">{channelName}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {views && <span>{views} views</span>}
            {publishedAt && (
              <>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(publishedAt))} ago</span>
              </>
            )}
          </div>
        </div>
      </a>
    </Card>
  );
};
