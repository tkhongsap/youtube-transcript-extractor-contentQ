import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, BookmarkPlus } from "lucide-react";

interface SaveButtonProps {
  videoId: string;
  videoTitle: string;
  contentType: 'hook' | 'summary' | 'flashcard';
  content: string | { question: string; answer: string };
  className?: string;
}

export function SaveButton({ videoId, videoTitle, contentType, content, className = "" }: SaveButtonProps) {
  const queryClient = useQueryClient();

  const { mutate: saveContent, isPending } = useMutation({
    mutationFn: async () => {
      console.log('Saving content:', {
        videoId,
        videoTitle,
        contentType,
        content
      });

      const response = await fetch('/api/saved-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          videoTitle,
          contentType,
          content,
        }),
      });

      console.log('Save response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Save content error:', errorData);
        throw new Error(errorData.message || "Failed to save content");
      }

      const data = await response.json();
      console.log('Save content success:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-content"] });
      toast({
        title: "Content Saved",
        description: "The content has been saved to your collection.",
      });
    },
    onError: (error: Error) => {
      console.error('Save content mutation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save content. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => saveContent()}
      disabled={isPending}
      className={className}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <BookmarkPlus className="h-4 w-4" />
      )}
      <span className="ml-2">Save</span>
    </Button>
  );
}