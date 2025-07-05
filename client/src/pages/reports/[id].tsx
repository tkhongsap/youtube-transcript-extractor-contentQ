import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Report } from "@shared/schema";
import ContentCard from "@/components/common/ContentCard";
import EmptyState from "@/components/common/EmptyState";

const ReportDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { data: report, isLoading } = useQuery<Report | null>({
    queryKey: ["/api/reports/" + id],
  });

  if (isLoading) return <p className="p-4">Loading...</p>;
  if (!report) return <EmptyState icon="description" message="Report not found" />;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">{report.title}</h1>
        <ContentCard>
          <pre className="whitespace-pre-wrap text-sm text-gray-800">{report.content}</pre>
        </ContentCard>
      </div>
    </main>
  );
};

export default ReportDetailPage;
