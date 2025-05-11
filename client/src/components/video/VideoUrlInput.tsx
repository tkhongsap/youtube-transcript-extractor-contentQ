import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { youtubeUrlSchema, type YoutubeUrlInput } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import VideoProcessingModal from "./VideoProcessingModal";
import { useLocation } from "wouter";

const VideoUrlInput = () => {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processingData, setProcessingData] = useState<any>(null);
  
  const form = useForm<YoutubeUrlInput>({
    resolver: zodResolver(youtubeUrlSchema),
    defaultValues: {
      url: "",
    },
  });
  
  const processMutation = useMutation({
    mutationFn: async (data: YoutubeUrlInput) => {
      const response = await apiRequest("POST", "/api/videos/process", data);
      return await response.json();
    },
    onSuccess: (data) => {
      setProcessingData(data);
      setShowProcessingModal(true);
      
      if (data.alreadyExists) {
        toast({
          title: "Video already processed",
          description: "This video has already been processed. Redirecting to results...",
          duration: 3000,
        });
        
        // Redirect to video results page
        setTimeout(() => {
          navigate(`/videos/${data.video.id}`);
          setShowProcessingModal(false);
        }, 1500);
      } else {
        toast({
          title: "Processing started",
          description: "Your video is being processed. This may take a minute.",
          duration: 5000,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error processing video",
        description: error.message || "There was a problem processing your video. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: YoutubeUrlInput) => {
    processMutation.mutate(data);
  };
  
  const handleCancelProcessing = () => {
    setShowProcessingModal(false);
  };
  
  const handleProcessingComplete = (videoId: number) => {
    setShowProcessingModal(false);
    navigate(`/videos/${videoId}`);
  };
  
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="url"
            render={({ field }) => (
              <FormItem>
                <div className="flex flex-col sm:flex-row gap-3">
                  <FormControl>
                    <Input
                      placeholder="https://www.youtube.com/watch?v=..."
                      {...field}
                      className="flex-1"
                      disabled={processMutation.isPending}
                    />
                  </FormControl>
                  <Button 
                    type="submit" 
                    className="whitespace-nowrap"
                    disabled={processMutation.isPending}
                  >
                    {processMutation.isPending ? (
                      <>
                        <span className="material-icons mr-2 animate-spin">refresh</span>
                        Processing...
                      </>
                    ) : (
                      "Process"
                    )}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <p className="text-xs text-gray-500">
            Paste a valid YouTube video URL to transcribe and analyze
          </p>
        </form>
      </Form>
      
      {showProcessingModal && (
        <VideoProcessingModal
          videoData={processingData?.video}
          onCancel={handleCancelProcessing}
          onComplete={handleProcessingComplete}
          alreadyProcessed={processingData?.alreadyExists}
        />
      )}
    </>
  );
};

export default VideoUrlInput;
