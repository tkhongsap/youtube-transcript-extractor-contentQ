import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface GenerateContentGridProps {
  videoId: number;
}

type ContentType = 
  | "medium" 
  | "linkedin" 
  | "flashcards" 
  | "blog_ideas" 
  | "social_hooks"
  | "questions";

interface ContentOption {
  id: ContentType;
  icon: string;
  label: string;
  path: string;
  pendingMessage: string;
  successMessage: string;
  errorMessage: string;
}

const GenerateContentGrid = ({ videoId }: GenerateContentGridProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingContent, setPendingContent] = useState<ContentType | null>(null);
  
  const contentOptions: ContentOption[] = [
    {
      id: "medium",
      icon: "description",
      label: "Medium-style Report",
      path: `/api/videos/${videoId}/generate-report?type=medium`,
      pendingMessage: "Generating Medium article...",
      successMessage: "Medium article generated successfully!",
      errorMessage: "Failed to generate Medium article"
    },
    {
      id: "linkedin",
      icon: "work",
      label: "LinkedIn Post",
      path: `/api/videos/${videoId}/generate-report?type=linkedin`,
      pendingMessage: "Generating LinkedIn post...",
      successMessage: "LinkedIn post generated successfully!",
      errorMessage: "Failed to generate LinkedIn post"
    },
    {
      id: "flashcards",
      icon: "style",
      label: "Flashcards",
      path: `/api/videos/${videoId}/generate-flashcards`,
      pendingMessage: "Generating flashcards...",
      successMessage: "Flashcards generated successfully!",
      errorMessage: "Failed to generate flashcards"
    },
    {
      id: "blog_ideas",
      icon: "lightbulb",
      label: "Blog Ideas",
      path: `/api/videos/${videoId}/generate-ideas?type=blog_titles`,
      pendingMessage: "Generating blog ideas...",
      successMessage: "Blog ideas generated successfully!",
      errorMessage: "Failed to generate blog ideas"
    },
    {
      id: "social_hooks",
      icon: "forum",
      label: "Social Media Hooks",
      path: `/api/videos/${videoId}/generate-ideas?type=social_media_hooks`,
      pendingMessage: "Generating social media hooks...",
      successMessage: "Social media hooks generated successfully!",
      errorMessage: "Failed to generate social media hooks"
    },
    {
      id: "questions",
      icon: "help_outline",
      label: "Follow-up Questions",
      path: `/api/videos/${videoId}/generate-ideas?type=questions`,
      pendingMessage: "Generating follow-up questions...",
      successMessage: "Follow-up questions generated successfully!",
      errorMessage: "Failed to generate follow-up questions"
    }
  ];
  
  // Mutation to call backend endpoints for content generation
  const generateContentMutation = useMutation({
    mutationFn: async (option: ContentOption) => {
      const response = await apiRequest("POST", option.path);
      return await response.json();
    },
    onMutate: (option) => {
      setPendingContent(option.id);
      toast({
        title: "Processing",
        description: option.pendingMessage,
      });
    },
    onSuccess: (_, option) => {
      toast({
        title: "Success",
        description: option.successMessage,
      });
      
      // Invalidate relevant queries
      if (option.id === "medium" || option.id === "linkedin") {
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/reports`] });
        queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      } else if (option.id === "flashcards") {
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/flashcard-sets`] });
        queryClient.invalidateQueries({ queryKey: ["/api/flashcard-sets"] });
      } else {
        queryClient.invalidateQueries({ queryKey: [`/api/videos/${videoId}/idea-sets`] });
        queryClient.invalidateQueries({ queryKey: ["/api/idea-sets"] });
      }
      
      setPendingContent(null);
    },
    onError: (error, option) => {
      toast({
        title: "Error",
        description: `${option.errorMessage}: ${error}`,
        variant: "destructive",
      });
      setPendingContent(null);
    }
  });
  
  const handleGenerate = (option: ContentOption) => {
    generateContentMutation.mutate(option);
  };
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {contentOptions.map((option) => (
        <Button
          key={option.id}
          variant="outline"
          className="flex flex-col items-center justify-center p-4 h-auto"
          onClick={() => handleGenerate(option)}
          disabled={pendingContent !== null}
        >
          {pendingContent === option.id ? (
            <span className="material-icons text-2xl text-primary-500 mb-2 animate-spin">refresh</span>
          ) : (
            <span className="material-icons text-2xl text-primary-500 mb-2">{option.icon}</span>
          )}
          <span className="text-sm font-medium text-gray-700">{option.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default GenerateContentGrid;
