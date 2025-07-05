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
  
  // Get the transcript content from the response or fallback to empty string
  const transcript = transcriptData?.data?.transcript || "";
  
  // For debugging - log the first 500 characters of the transcript
  console.log("Transcript data format:", transcriptData?.format);
  console.log("Transcript data first 500 chars:", transcript.substring(0, 500));
  
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
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900">Full Transcript</h3>
              <div className="text-xs text-gray-500">
                {transcript ? `${transcript.length} characters, ~${Math.ceil(transcript.length/1000)}KB` : "No transcript"}
              </div>
            </div>
            <div className="flex gap-2">
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
              <div className="p-3 mb-4 bg-gray-100 rounded text-sm text-gray-700 font-mono">
                <p>Debug info:</p>
                <p>Text length: {transcript.length} characters</p>
                <p>Paragraphs: {paragraphs.length}</p>
                <p>Format: {transcriptData?.format || "unknown"}</p>
              </div>
              
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : transcript ? (
            <div className="prose max-w-none text-gray-700">
              <div className="p-3 mb-4 bg-amber-50 rounded text-sm text-amber-700 border border-amber-200">
                <p><strong>Debug mode:</strong> Transcript data received but no proper paragraphs detected.</p>
                <p>Text length: {transcript.length} characters</p>
                <p>Format: {transcriptData?.format || "unknown"}</p>
                <p>First 200 chars: <span className="font-mono">{transcript.substring(0, 200)}</span></p>
              </div>
              
              <div className="whitespace-pre-line border border-gray-200 p-4 rounded">
                {transcript}
              </div>
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
