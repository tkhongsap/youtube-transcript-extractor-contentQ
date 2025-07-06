import { useQuery } from "@tanstack/react-query";
import { type Report } from "@shared/schema";
import ReportCard from "@/components/content/ReportCard";
import { Skeleton } from "@/components/ui/skeleton";

const ReportsPage = () => {
  // Fetch all user reports
  const { data: reportsResponse, isLoading: isLoadingReports } = useQuery<{success: boolean; data: Report[]}>({
    queryKey: ["/api/reports"],
    refetchInterval: false,
  });

  const reports = reportsResponse?.data || [];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-4">
        <div className="flex items-center">
          <span className="material-icons mr-3 text-gray-500">description</span>
          <h1 className="text-lg font-semibold text-gray-900">My Reports</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        <div className="max-w-7xl mx-auto p-6">
          {isLoadingReports ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-2/3 mb-3" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-3 w-36" />
                    <div className="flex space-x-2">
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                      <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : reports.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <span className="material-icons text-4xl text-gray-400">description</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
              <p className="text-gray-500 mb-6">
                Generate your first report by processing a video and creating content.
              </p>
              <a
                href="/"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <span className="material-icons mr-2 text-sm">add</span>
                Process Video
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage; 