import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { type Video, type Summary } from "@shared/schema";
import GenerateContentGrid from "@/components/content/GenerateContentGrid";
import { ContentGenerationCard } from "@/components/content/ContentGenerationCard";
import { TranscriptEnhancement } from "@/components/TranscriptEnhancement";
import type { OriginalTranscript, CreateAdditionalTextInput } from "@/types/transcript";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const VideoDetailPage = () => {
  const [, params] = useRoute("/videos/:id");
  const [, navigate] = useLocation();
  const videoId = params?.id ? parseInt(params.id, 10) : null;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("transcript");
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

  // Fetch transcript data for enhancement
  const { data: transcriptData } = useQuery<{ format: string; data: { transcript: string } }>({
    queryKey: [`/api/videos/${videoId}/transcript`],
    enabled: !!videoId,
  });

  // Fetch generated reports
  const { data: reportsData } = useQuery({
    queryKey: [`/api/videos/${videoId}/reports`],
    enabled: !!videoId,
  });
  const reports = (reportsData as any[]) || [];

  // Fetch generated flashcard sets
  const { data: flashcardSetsData } = useQuery({
    queryKey: [`/api/videos/${videoId}/flashcard-sets`],
    enabled: !!videoId,
  });
  const flashcardSets = (flashcardSetsData as any[]) || [];

  // Fetch generated idea sets
  const { data: ideaSetsData } = useQuery({
    queryKey: [`/api/videos/${videoId}/idea-sets`],
    enabled: !!videoId,
  });
  const ideaSets = (ideaSetsData as any[]) || [];
  
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

  // Mutation for saving additional text
  const saveAdditionalTextMutation = useMutation({
    mutationFn: async (data: CreateAdditionalTextInput) => {
      return apiRequest('POST', `/api/videos/${videoId}/additional-text`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Additional text saved successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/additional-text`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save additional text",
        variant: "destructive",
      });
    },
  });

  // Mutation for updating additional text
  const updateAdditionalTextMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CreateAdditionalTextInput }) => {
      return apiRequest('PUT', `/api/videos/${videoId}/additional-text/${id}`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Additional text updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/additional-text`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update additional text",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting additional text
  const deleteAdditionalTextMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/videos/${videoId}/additional-text/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Additional text deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/additional-text`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete additional text",
        variant: "destructive",
      });
    },
  });

  // Mutation for generating summary using enhanced transcripts
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${videoId}/generate-enhanced-summary`, {
        transcriptPreference: 'auto', // Uses enhanced if available, original otherwise
        includeProfessionalContext: true,
        emphasizeAdditionalInsights: true,
      });
    },
    onSuccess: () => {
      toast({
        title: "Summary Generated",
        description: "AI summary created using your enhanced transcript",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/summary`] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate summary",
        variant: "destructive",
      });
    },
  });

  // Mutations for content generation
  const generateMediumReportMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${videoId}/generate-report?type=medium`);
    },
    onSuccess: () => {
      toast({
        title: "Medium Article Generated",
        description: "AI-generated Medium-style article created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/reports`] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate Medium article",
        variant: "destructive",
      });
    },
  });

  const generateLinkedInPostMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${videoId}/generate-report?type=linkedin`);
    },
    onSuccess: () => {
      toast({
        title: "LinkedIn Post Generated",
        description: "AI-generated LinkedIn post created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/reports`] });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate LinkedIn post",
        variant: "destructive",
      });
    },
  });

  const generateFlashcardsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${videoId}/generate-flashcards`);
    },
    onSuccess: () => {
      toast({
        title: "Flashcards Generated",
        description: "AI-generated flashcard set created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/flashcard-sets`] });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-sets"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate flashcards",
        variant: "destructive",
      });
    },
  });

  const generateBlogIdeasMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${videoId}/generate-ideas?type=blog_titles`);
    },
    onSuccess: () => {
      toast({
        title: "Blog Ideas Generated",
        description: "AI-generated blog title ideas created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/idea-sets`] });
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sets"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate blog ideas",
        variant: "destructive",
      });
    },
  });

  const generateSocialHooksMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/videos/${videoId}/generate-ideas?type=social_media_hooks`);
    },
    onSuccess: () => {
      toast({
        title: "Social Hooks Generated",
        description: "AI-generated social media hooks created successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/idea-sets`] });
      queryClient.invalidateQueries({ queryKey: ["/api/idea-sets"] });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate social hooks",
        variant: "destructive",
      });
    },
  });

  // Query for additional text collection
  const { data: additionalTextResponse } = useQuery<{success: boolean; data: any}>({
    queryKey: [`/api/videos/${videoId}/additional-text`],
    enabled: !!videoId,
  });
  
  const additionalTextCollection = additionalTextResponse?.data;
  
  const handleReprocess = () => {
    reprocessMutation.mutate();
  };
  
  const handleBackClick = () => {
    navigate("/");
  };

  // Transform transcript data to OriginalTranscript format
  const createOriginalTranscript = (): OriginalTranscript | null => {
    if (!video || !transcriptData?.data?.transcript) return null;
    
    return {
      videoId: video.id,
      rawText: transcriptData.data.transcript || video.transcript || '',
      source: 'youtube',
      generatedAt: video.createdAt ? new Date(video.createdAt) : new Date(),
      language: 'en', // Default to English for now
      duration: video.duration ? parseDuration(video.duration) : undefined,
    };
  };

  // Helper function to parse duration string to seconds
  const parseDuration = (duration: string): number => {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    } else if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    }
    return 0;
  };
  
  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return (
          <div className="overflow-y-auto h-full pb-16">
            <div className="max-w-6xl mx-auto p-4">
              {isLoadingSummary ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                </div>
              ) : (
                <ContentGenerationCard
                  title="Summary"
                  description="Get a comprehensive overview with key points, main topics, and actionable insights from the video transcript."
                  estimatedCost="$0.05-0.15"
                  estimatedTime="15-30s"
                  features={["Key Points", "Main Topics", "Actionable Insights", "Quick Overview"]}
                  onGenerate={() => generateSummaryMutation.mutate()}
                  isGenerating={generateSummaryMutation.isPending}
                  generatedContent={summary?.summary}
                  onRegenerate={() => generateSummaryMutation.mutate()}
                  lastGenerated={summary?.createdAt ? new Date(summary.createdAt) : undefined}
                />
              )}
            </div>
          </div>
        );
      case "transcript":
        const originalTranscript = createOriginalTranscript();
        
        if (!originalTranscript) {
          return (
            <div className="overflow-y-auto h-full pb-16">
              <div className="max-w-6xl mx-auto p-4">
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Transcript</h3>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </div>
              </div>
            </div>
          );
        }
        
        return (
          <div className="overflow-y-auto h-full pb-16">
            <div className="max-w-6xl mx-auto p-4">
              <TranscriptEnhancement
                originalTranscript={originalTranscript}
                additionalTextCollection={additionalTextCollection}
                onSaveAdditionalText={async (data) => {
                  await saveAdditionalTextMutation.mutateAsync(data);
                }}
                onUpdateAdditionalText={async (id, data) => {
                  await updateAdditionalTextMutation.mutateAsync({ id, data });
                }}
                onDeleteAdditionalText={async (id) => {
                  await deleteAdditionalTextMutation.mutateAsync(id);
                }}
              />
            </div>
          </div>
        );
      case "reports":
        return (
          <div className="overflow-y-auto h-full max-h-screen pb-16">
            <div className="max-w-6xl mx-auto p-4 space-y-6">
              {/* Show generated reports if they exist */}
              {reports.length > 0 && (
                <div className="space-y-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Reports</h3>
                  {reports.map((report: any) => (
                    <div key={report.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-md font-medium text-gray-900 capitalize">{report.type} Report</h4>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <h5 className="text-lg font-semibold text-gray-800 mb-3">{report.title}</h5>
                      <div className="prose max-w-none text-gray-700">
                        <div className="whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {report.content}
                        </div>
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(report.content)}
                        >
                          Copy Content
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Generation cards */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {reports.length > 0 ? "Generate Additional Reports" : "Generate Reports"}
                </h3>
                <ContentGenerationCard
                  title="Medium-Style Article"
                  description="Create a comprehensive, publication-ready article suitable for Medium, LinkedIn, or your blog."
                  estimatedCost="$0.15-0.25"
                  estimatedTime="20-40s"
                  features={["Professional Formatting", "Engaging Headlines", "800-2000 words", "SEO-Optimized"]}
                  onGenerate={() => generateMediumReportMutation.mutate()}
                  isGenerating={generateMediumReportMutation.isPending}
                />
                <ContentGenerationCard
                  title="LinkedIn Post"
                  description="Generate an engaging LinkedIn post with professional tone and call-to-action."
                  estimatedCost="$0.08-0.15"
                  estimatedTime="10-20s"
                  features={["Professional Tone", "Call-to-Action", "150-300 words", "Hashtag Suggestions"]}
                  onGenerate={() => generateLinkedInPostMutation.mutate()}
                  isGenerating={generateLinkedInPostMutation.isPending}
                />
              </div>
            </div>
          </div>
        );
      case "flashcards":
        return (
          <div className="overflow-y-auto h-full max-h-screen pb-16">
            <div className="max-w-6xl mx-auto p-4 space-y-6">
              {/* Show generated flashcard sets if they exist */}
              {flashcardSets.length > 0 && (
                <div className="space-y-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Flashcard Sets</h3>
                  {flashcardSets.map((set: any) => (
                    <div key={set.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-md font-medium text-gray-900">{set.title}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(set.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      {set.description && (
                        <p className="text-gray-600 mb-4">{set.description}</p>
                      )}
                      <div className="text-sm text-blue-600 mb-3">
                        Click to view {set.flashcardCount || 'generated'} flashcards →
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Generation card */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {flashcardSets.length > 0 ? "Generate Additional Flashcards" : "Generate Flashcards"}
                </h3>
                <ContentGenerationCard
                  title="Flashcard Set"
                  description="Create interactive Q&A flashcards for learning and retention of key concepts from the video."
                  estimatedCost="$0.08-0.20"
                  estimatedTime="15-30s"
                  features={["10-50 Cards", "Q&A Format", "Difficulty Levels", "Spaced Repetition Ready"]}
                  onGenerate={() => generateFlashcardsMutation.mutate()}
                  isGenerating={generateFlashcardsMutation.isPending}
                />
              </div>
            </div>
          </div>
        );
      case "ideas":
        return (
          <div className="overflow-y-auto h-full max-h-screen pb-16">
            <div className="max-w-6xl mx-auto p-4 space-y-6">
              {/* Show generated idea sets if they exist */}
              {ideaSets.length > 0 && (
                <div className="space-y-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Generated Ideas</h3>
                  {ideaSets.map((set: any) => (
                    <div key={set.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-md font-medium text-gray-900 capitalize">{set.type.replace('_', ' ')}</h4>
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(set.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-sm text-blue-600 mb-3">
                        {set.ideaCount || 'Multiple'} ideas generated →
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Generation cards */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  {ideaSets.length > 0 ? "Generate Additional Ideas" : "Generate Ideas"}
                </h3>
                <ContentGenerationCard
                  title="Blog Title Ideas"
                  description="Generate compelling blog titles and article ideas based on the video content."
                  estimatedCost="$0.05-0.10"
                  estimatedTime="10-20s"
                  features={["15-25 Titles", "SEO-Focused", "Multiple Angles", "Engaging Headlines"]}
                  onGenerate={() => generateBlogIdeasMutation.mutate()}
                  isGenerating={generateBlogIdeasMutation.isPending}
                />
                <ContentGenerationCard
                  title="Social Media Hooks"
                  description="Create attention-grabbing social media hooks and content ideas for various platforms."
                  estimatedCost="$0.05-0.10"
                  estimatedTime="10-20s"
                  features={["Platform-Specific", "Engagement-Focused", "15-30 Hooks", "Trend-Aware"]}
                  onGenerate={() => generateSocialHooksMutation.mutate()}
                  isGenerating={generateSocialHooksMutation.isPending}
                />
              </div>
            </div>
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
