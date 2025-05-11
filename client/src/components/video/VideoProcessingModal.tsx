import { useState, useEffect } from "react";
import { type Video } from "@shared/schema";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface VideoProcessingModalProps {
  videoData?: Video;
  onCancel: () => void;
  onComplete: (videoId: number) => void;
  alreadyProcessed?: boolean;
}

const VideoProcessingModal = ({ 
  videoData, 
  onCancel, 
  onComplete,
  alreadyProcessed = false
}: VideoProcessingModalProps) => {
  const [progress, setProgress] = useState(15);
  const [isMinimized, setIsMinimized] = useState(false);
  
  useEffect(() => {
    if (alreadyProcessed) {
      setProgress(100);
      return;
    }
    
    // Simulate progress for demonstration
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (videoData?.id) {
            onComplete(videoData.id);
          }
          return 100;
        }
        return prev + 5;
      });
    }, 800);
    
    return () => clearInterval(interval);
  }, [alreadyProcessed, onComplete, videoData]);
  
  const handleMinimize = () => {
    setIsMinimized(true);
  };
  
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 z-50 max-w-[300px] border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium">Processing Video...</h4>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 w-6 p-0"
            onClick={() => setIsMinimized(false)}
          >
            <span className="material-icons text-gray-500 text-sm">open_in_full</span>
          </Button>
        </div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-700">Progress</span>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
    );
  }
  
  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-icons text-primary-500">auto_awesome</span>
            Processing Video
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-sm text-gray-500 mb-4">
            We're transcribing and analyzing your video. This may take a few minutes depending on the video length.
          </p>
          
          {/* Video preview */}
          {videoData?.thumbnailUrl ? (
            <img 
              src={videoData.thumbnailUrl} 
              alt={videoData.title || "Video being processed"} 
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
          ) : (
            <div className="w-full h-40 bg-gray-200 rounded-lg mb-4 flex items-center justify-center">
              <span className="material-icons text-gray-400 text-4xl">videocam_off</span>
            </div>
          )}
          
          <h4 className="font-medium text-gray-900 text-md mb-2">{videoData?.title || "Processing your video"}</h4>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              {progress < 30 ? "Transcribing" : 
                progress < 60 ? "Analyzing" : 
                progress < 90 ? "Generating content" : "Finishing up"}
            </span>
            <span className="text-sm text-gray-500">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary h-2.5 rounded-full" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={handleMinimize}>
            Minimize
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VideoProcessingModal;
