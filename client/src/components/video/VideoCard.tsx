import { formatDistanceToNow } from "date-fns";
import { type Video } from "@shared/schema";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

interface VideoCardProps {
  video: Video;
}

const VideoCard = ({ video }: VideoCardProps) => {
  const [, navigate] = useLocation();
  
  const handleViewClick = () => {
    navigate(`/videos/${video.id}`);
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden">
      {/* Video thumbnail */}
      {video.thumbnailUrl ? (
        <img 
          src={video.thumbnailUrl} 
          alt={video.title} 
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
          <span className="material-icons text-gray-400 text-4xl">videocam_off</span>
        </div>
      )}
      <div className="p-4">
        <h3 className="text-gray-900 font-medium text-md mb-1 line-clamp-2">{video.title}</h3>
        <p className="text-gray-500 text-sm mb-3 line-clamp-2">
          {video.description || `Video by ${video.channelTitle || 'Unknown channel'}`}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
          </span>
          <Button
            variant="ghost"
            className="text-primary-500 hover:text-primary-600 p-0"
            onClick={handleViewClick}
          >
            View
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VideoCard;
