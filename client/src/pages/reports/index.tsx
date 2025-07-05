import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import ReportCard from "@/components/content/ReportCard";
import SearchAndFilter from "@/components/common/SearchAndFilter";
import EmptyState from "@/components/common/EmptyState";
import { Report } from "@shared/schema";

const ReportsPage = () => {
  const [search, setSearch] = useState("");
  const { data: reports, isLoading } = useQuery<Report[]>({
    queryKey: ["/api/reports"],
  });

  const filtered = reports?.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">My Reports</h1>
        <SearchAndFilter value={search} onChange={setSearch} placeholder="Search reports" />
        {isLoading ? (
          <p>Loading...</p>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        ) : (
          <EmptyState icon="description" message="No reports found" />
        )}
      </div>
    </main>
  );
};

export default ReportsPage;
