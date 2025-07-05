import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface FlashcardSetCardProps {
  flashcardSet: {
    id: number;
    videoId: number;
    title: string;
    description?: string | null;
    createdAt: Date | null;
    videoTitle?: string;
    cardCount?: number;
  };
}

const FlashcardSetCard = ({ flashcardSet }: FlashcardSetCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const deleteFlashcardSetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/flashcard-sets/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Flashcard set deleted",
        description: "The flashcard set has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/flashcard-sets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${flashcardSet.videoId}/flashcard-sets`] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete the flashcard set: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this flashcard set?")) {
      deleteFlashcardSetMutation.mutate(flashcardSet.id);
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-gray-500">
            {flashcardSet.cardCount || "?"} cards
          </span>
          <span className="text-xs text-gray-500">
            {flashcardSet.createdAt ? formatDistanceToNow(new Date(flashcardSet.createdAt), { addSuffix: true }) : 'Unknown date'}
          </span>
        </div>
        <h3 className="text-gray-900 font-medium text-md mb-2">{flashcardSet.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {flashcardSet.description || `Based on: ${flashcardSet.videoTitle || "Video"}`}
        </p>
        <div className="flex justify-between items-center">
          <button className="text-primary-500 hover:text-primary-600 text-sm font-medium">
            Study
          </button>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <span className="material-icons text-sm text-gray-400 hover:text-gray-500">more_vert</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <span className="material-icons text-sm mr-2">edit</span>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <span className="material-icons text-sm mr-2">file_download</span>
                  Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDelete}>
                  <span className="material-icons text-sm mr-2">delete</span>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardSetCard;
