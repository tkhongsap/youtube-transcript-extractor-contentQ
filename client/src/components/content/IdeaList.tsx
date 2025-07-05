import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { type Idea } from "@shared/schema";

interface IdeaListProps {
  title: string;
  ideaSetId: number;
  source?: string;
  date: Date;
}

const IdeaList = ({ title, ideaSetId, source, date }: IdeaListProps) => {
  const { toast } = useToast();
  
  // Fetch ideas for this set
  const { data: ideas, isLoading } = useQuery<Idea[]>({
    queryKey: [`/api/idea-sets/${ideaSetId}/ideas`],
  });
  
  const handleCopyIdea = (content: string) => {
    navigator.clipboard.writeText(content)
      .then(() => {
        toast({
          title: "Copied to clipboard",
          description: "The idea has been copied to your clipboard",
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Could not copy idea to clipboard",
          variant: "destructive",
        });
      });
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{title}</h3>
        <span className="text-xs text-gray-500">
          {formatDistanceToNow(date, { addSuffix: true })}
        </span>
      </div>
      
      {isLoading ? (
        <ul className="divide-y divide-gray-200">
          {Array(3).fill(0).map((_, index) => (
            <li key={index} className="px-4 py-3">
              <Skeleton className="h-5 w-full mb-1" />
              <div className="mt-1 flex justify-between items-center">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-5 w-5 rounded-full" />
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-gray-200">
          {ideas && ideas.length > 0 ? (
            ideas.map((idea) => (
              <li key={idea.id} className="px-4 py-3 hover:bg-gray-50">
                <p className="text-gray-800">{idea.content}</p>
                <div className="mt-1 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Based on: {source || "Video"}
                  </span>
                  <button 
                    className="text-gray-400 hover:text-gray-500"
                    onClick={() => handleCopyIdea(idea.content)}
                    aria-label="Copy idea"
                  >
                    <span className="material-icons text-sm">content_copy</span>
                  </button>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-6 text-center">
              <p className="text-gray-500">No ideas found in this set.</p>
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default IdeaList;
