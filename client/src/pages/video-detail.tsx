import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Video, type Summary } from "@shared/schema";
import GenerateContentGrid from "@/components/content/GenerateContentGrid";
import TranscriptView from "@/components/video/TranscriptView";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReportsTab from "@/components/video-detail/ReportsTab";

const VideoDetailPage = () => {
  const [, params] = useRoute("/videos/:id");
  const [, navigate] = useLocation();
  const videoId = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("summary");
  const [isReprocessing, setIsReprocessing] = useState(false);
  
  // Fetch video details
  const { data: video, isLoading: isLoadingVideo } = useQuery<Video>({
    queryKey: [`/api/videos/${videoId}`],
    enabled: !!videoId,
  });
  
  // Fetch video summary
  const { data: summary, isLoading: isLoadingSummary } = useQuery<Summary>({
    queryKey: [`/api/videos/${videoId}/summary`],
    enabled: !!videoId,
  });
  
  // Reprocess video mutation
  const reprocessMutation = useMutation({
    mutationFn: async () => {
      setIsReprocessing(true);
      return apiRequest('POST', `/api/videos/${videoId}/reprocess`);
    },
    onSuccess: () => {
      toast({
        title: "Reprocessing started",
        description: "The video is being reprocessed to retrieve the full transcript and regenerate content. This may take a minute.",
      });
      
      // Invalidate all queries related to this video
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/summary`] });
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/reports`] });
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/flashcard-sets`] });
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/idea-sets`] });
        setIsReprocessing(false);
      }, 30000); // Wait 30 seconds before invalidating queries
    },
    onError: (error) => {
      toast({
        title: "Reprocessing failed",
        description: error instanceof Error ? error.message : "Failed to reprocess video. Please try again.",
        variant: "destructive",
      });
      setIsReprocessing(false);
    },
  });
  
  const handleReprocess = () => {
    reprocessMutation.mutate();
  };
  
  const handleBackClick = () => {
    navigate("/");
  };
  
  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return (
          <div className="overflow-y-auto h-full pb-16">
            <div className="max-w-6xl mx-auto p-4">
              {/* Summary Tab Content */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Summary</h3>
                {isLoadingSummary ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="pt-3"></div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : (
                  <div className="prose max-w-none text-gray-700">
                    {summary ? (
                      <p className="whitespace-pre-line">{summary.summary}</p>
                    ) : (
                      <p className="text-gray-500 italic">No summary available for this video.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Key Topics */}
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Key Topics</h3>
                <div className="flex flex-wrap gap-2">
                  {isLoadingSummary ? (
                    Array(8).fill(0).map((_, index) => (
                      <Skeleton key={index} className="h-6 w-24 rounded-full" />
                    ))
                  ) : (
                    summary?.keyTopics?.length ? (
                      summary.keyTopics.map((topic, index) => (
                        <span key={index} className="bg-gray-100 text-gray-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {topic}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 italic">No topics available.</p>
                    )
                  )}
                </div>
              </div>

              {/* Action Items */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Generate Content</h3>
                <GenerateContentGrid videoId={videoId || 0} />
              </div>
            </div>
          </div>
        );
      case "transcript":
        return (
          <TranscriptView videoId={videoId || 0} transcript="" />
        );
      case "reports":
        return <ReportsTab videoId={videoId || 0} />;
      case "flashcards":
        return (
          <div className="max-w-6xl mx-auto p-4">
            <p className="text-center py-10 text-gray-500">Flashcards view will be implemented soon.</p>
          </div>
        );
      case "ideas":
        return (
          <div className="max-w-6xl mx-auto p-4">
            <p className="text-center py-10 text-gray-500">Ideas view will be implemented soon.</p>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Top Bar */}
      <header className="bg-white border-b border-gray-200 py-4 px-4 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            className="text-gray-500 mr-3 focus:outline-none hover:text-gray-700"
            onClick={handleBackClick}
            aria-label="Go back"
          >
            <span className="material-icons">arrow_back</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">Video Results</h1>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReprocess}
            disabled={isReprocessing || reprocessMutation.isPending}
            className="flex items-center gap-1.5"
          >
            <span className={`material-icons text-sm ${isReprocessing ? "animate-spin" : ""}`}>
              {isReprocessing ? "refresh" : "restart_alt"}
            </span>
            {isReprocessing ? "Reprocessing..." : "Reprocess Video"}
          </Button>
          <button className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Download">
            <span className="material-icons">file_download</span>
          </button>
          <button className="text-gray-500 hover:text-gray-700 focus:outline-none" aria-label="Share">
            <span className="material-icons">share</span>
          </button>
        </div>
      </header>

      {/* Main Content with tabs */}
      <div className="flex-1 overflow-hidden">
        {/* Video Details */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              {isLoadingVideo ? (
                <>
                  <Skeleton className="w-full md:w-64 h-36 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-7 w-3/4 mb-1" />
                    <Skeleton className="h-5 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3 mt-1" />
                  </div>
                </>
              ) : (
                <>
                  {video?.thumbnailUrl ? (
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title} 
                      className="w-full md:w-64 h-36 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full md:w-64 h-36 bg-gray-200 rounded-lg flex items-center justify-center">
                      <span className="material-icons text-gray-400 text-4xl">videocam_off</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">{video?.title}</h2>
                    <p className="text-gray-600 text-sm mb-2">
                      {video?.channelTitle && `Published by ${video.channelTitle}`}
                      {video?.duration && ` • ${video.duration}`}
                    </p>
                    <p className="text-gray-700 text-sm">
                      {video?.description 
                        ? (video.description.length > 150 
                            ? `${video.description.substring(0, 150)}...` 
                            : video.description)
                        : 'No description available.'}
                    </p>
                    {video?.createdAt && (
                      <p className="text-xs text-gray-500 mt-2">
                        Processed {formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto overflow-x-auto">
            <nav className="flex -mb-px whitespace-nowrap">
              <button 
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "summary" 
                    ? "text-primary-600 border-primary-500" 
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("summary")}
              >
                Summary
              </button>
              <button 
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "transcript" 
                    ? "text-primary-600 border-primary-500" 
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("transcript")}
              >
                Transcript
              </button>
              <button 
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "reports" 
                    ? "text-primary-600 border-primary-500" 
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("reports")}
              >
                Reports
              </button>
              <button 
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "flashcards" 
                    ? "text-primary-600 border-primary-500" 
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("flashcards")}
              >
                Flashcards
              </button>
              <button 
                className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === "ideas" 
                    ? "text-primary-600 border-primary-500" 
                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                }`}
                onClick={() => setActiveTab("ideas")}
              >
                Ideas
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </div>
  );
};

export default VideoDetailPage;
