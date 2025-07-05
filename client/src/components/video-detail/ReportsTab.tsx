import ReportCard from "@/components/content/ReportCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface ReportsTabProps {
  videoId: number;
}

const ReportsTab = ({ videoId }: ReportsTabProps) => {
  const { data: reports, isLoading } = useQuery({
    queryKey: [`/api/videos/${videoId}/reports`],
    enabled: !!videoId,
  });

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(2)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((r: any) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      ) : (
        <p className="text-center py-10 text-gray-500">No reports available.</p>
      )}
    </div>
  );
};

export default ReportsTab;
