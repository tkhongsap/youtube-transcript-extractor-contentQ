import { FC } from "react";
import { Card } from "@/components/ui/card";
import { formatDistanceToNow, isValid } from "date-fns";

interface VideoCardProps {
  title: string;
  thumbnail: string;
  channelName: string;
  videoId: string;
  publishedAt?: string;
}

export const VideoCard: FC<VideoCardProps> = ({
  title,
  thumbnail,
  channelName,
  videoId,
  publishedAt,
}) => {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;

    // Try to parse relative time strings
    if (dateStr.includes('ago') || dateStr.includes('week') || dateStr.includes('day') || dateStr.includes('month') || dateStr.includes('year')) {
      return dateStr;
    }

    const date = new Date(dateStr);
    if (!isValid(date)) return dateStr; // Return original string if invalid date

    try {
      return `${formatDistanceToNow(date)} ago`;
    } catch (error) {
      return dateStr; // Fallback to original string if formatting fails
    }
  };

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
            {publishedAt && <span>{formatDate(publishedAt)}</span>}
          </div>
        </div>
      </a>
    </Card>
  );
};