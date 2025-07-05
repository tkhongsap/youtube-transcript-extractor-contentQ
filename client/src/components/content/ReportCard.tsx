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
    if (confirm("Are you sure you want to delete this report?")) {
      deleteReportMutation.mutate(report.id);
    }
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
  
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 overflow-hidden border border-gray-200">
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
        <h3 className="text-gray-900 font-medium text-md mb-2">{report.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-3">
          {report.content.substring(0, 150)}...
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">
            Based on: {report.videoTitle || "Video"}
          </span>
          <div className="flex space-x-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-none">
                <span className="material-icons text-sm text-gray-400 hover:text-gray-500">more_vert</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <span className="material-icons text-sm mr-2">content_copy</span>
                  Copy
                </DropdownMenuItem>
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

export default ReportCard;
