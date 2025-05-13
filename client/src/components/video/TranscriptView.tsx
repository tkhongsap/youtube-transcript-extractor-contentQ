import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface TranscriptViewProps {
  videoId: number;
  transcript: string;
}

interface TranscriptResponse {
  format: string;
  data: {
    transcript: string;
  };
}

const TranscriptView = ({ videoId }: TranscriptViewProps) => {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);
  
  // Fetch fresh transcript directly from the API
  const { data: transcriptData, isLoading } = useQuery<TranscriptResponse>({
    queryKey: [`/api/videos/${videoId}/transcript`],
    enabled: !!videoId,
  });
  
  const transcript = transcriptData?.data?.transcript || "";
  
  const handleCopyTranscript = () => {
    setIsCopying(true);
    
    navigator.clipboard.writeText(transcript)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "The transcript has been copied to your clipboard",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Could not copy transcript to clipboard",
          variant: "destructive",
        });
      })
      .finally(() => {
        setIsCopying(false);
      });
  };
  
  // Split transcript into paragraphs
  const paragraphs = transcript
    ? transcript.split(/\n\n+/).filter(p => p.trim().length > 0)
    : [];
  
  return (
    <div className="overflow-y-auto h-full pb-16">
      <div className="max-w-6xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Full Transcript</h3>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1"
              onClick={handleCopyTranscript}
              disabled={isCopying || !transcript}
            >
              {isCopying ? (
                <span className="material-icons text-sm animate-spin">refresh</span>
              ) : (
                <span className="material-icons text-sm">content_copy</span>
              )}
              Copy
            </Button>
          </div>
          
          {isLoading ? (
            <div className="space-y-4">
              {Array(5).fill(0).map((_, index) => (
                <div key={index} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : paragraphs.length > 0 ? (
            <div className="prose max-w-none text-gray-700">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <span className="material-icons text-4xl text-gray-300 mb-2">text_snippet</span>
              <p className="text-gray-500">No transcript available for this video.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TranscriptView;
