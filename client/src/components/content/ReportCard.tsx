import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ReportCardProps {
  report: {
    id: number;
    videoId: number;
    title: string;
    content: string;
    type: string;
    createdAt: Date | null;
    videoTitle?: string;
  };
}

const ReportCard = ({ report }: ReportCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const deleteReportMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/reports/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Report deleted",
        description: "The report has been successfully deleted",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      queryClient.invalidateQueries({ queryKey: [`/api/videos/${report.videoId}/reports`] });
      setShowModal(false);
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete the report: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    deleteReportMutation.mutate(report.id);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report.content).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: "Report content has been copied to your clipboard",
        });
      },
      (err) => {
        toast({
          title: "Failed to copy",
          description: "Could not copy content to clipboard",
          variant: "destructive",
        });
      }
    );
  };

  const generateLinkedInPost = () => {
    const title = report.title;
    const content = report.content;
    
    // Extract key points from the content (first 3 paragraphs or bullet points)
    const lines = content.split('\n').filter((line: string) => line.trim().length > 0);
    const keyPoints = lines.slice(0, 3).map((line: string) => line.trim().substring(0, 100) + '...');
    
    // Create LinkedIn post format
    const linkedinPost = `🚀 ${title}

${keyPoints.map((point: string, index: number) => `${index + 1}. ${point}`).join('\n')}

What are your thoughts on this? Share your experience in the comments! 👇

#Technology #Innovation #LinkedIn #ContentCreation`;

    navigator.clipboard.writeText(linkedinPost).then(
      () => {
        toast({
          title: "LinkedIn Post Generated",
          description: "LinkedIn post copied to clipboard",
        });
      },
      (err) => {
        toast({
          title: "Failed to generate",
          description: "Could not generate LinkedIn post",
          variant: "destructive",
        });
      }
    );
  };

  // Create preview text (first 100 characters)
  const previewText = report.content.length > 100 
    ? report.content.substring(0, 100) + "..."
    : report.content;

  return (
    <>
      {/* Compact Card - Dashboard Style */}
      <div 
        className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200 cursor-pointer"
        onClick={() => setShowModal(true)}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className={`
              text-xs font-medium px-2 py-0.5 rounded 
              ${report.type === "medium" 
                ? "bg-green-100 text-green-800" 
                : "bg-blue-100 text-blue-800"
              }
            `}>
              {report.type === "medium" ? "Medium" : "LinkedIn"}
            </span>
            <span className="text-xs text-gray-500">
              {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : 'Unknown date'}
            </span>
          </div>
          <h3 className="text-gray-900 font-medium text-md mb-2 line-clamp-2">{report.title}</h3>
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {previewText}
          </p>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">
              Based on: {report.videoTitle || "Video"}
            </span>
            <span className="text-xs text-blue-600 hover:text-blue-800">
              Click to view →
            </span>
          </div>
        </div>
      </div>

      {/* Full Content Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className={`
                  text-xs font-medium px-2 py-0.5 rounded 
                  ${report.type === "medium" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-blue-100 text-blue-800"
                  }
                `}>
                  {report.type === "medium" ? "Medium Report" : "LinkedIn Report"}
                </span>
                <span className="text-xs text-gray-500">
                  {report.createdAt ? formatDistanceToNow(new Date(report.createdAt), { addSuffix: true }) : 'Unknown date'}
                </span>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none">
                  <span className="material-icons text-sm text-gray-400 hover:text-gray-500">more_vert</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopy}>
                    <span className="material-icons text-sm mr-2">content_copy</span>
                    Copy Content
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={generateLinkedInPost}>
                    <span className="material-icons text-sm mr-2">share</span>
                    Generate LinkedIn Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)}>
                    <span className="material-icons text-sm mr-2">delete</span>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <DialogTitle className="text-left">{report.title}</DialogTitle>
            <DialogDescription className="text-left">
              Based on: {report.videoTitle || "Video"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4">
            <div className="prose max-w-none text-gray-700">
              <div className="whitespace-pre-wrap bg-gray-50 rounded p-4 border">
                {report.content}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{report.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleteReportMutation.isPending}
            >
              {deleteReportMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ReportCard; 