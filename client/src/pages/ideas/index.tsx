import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import IdeaList from "@/components/content/IdeaList";
import SearchAndFilter from "@/components/common/SearchAndFilter";
import EmptyState from "@/components/common/EmptyState";
import { IdeaSet } from "@shared/schema";

const IdeasPage = () => {
  const [search, setSearch] = useState("");
  const { data: sets, isLoading } = useQuery<IdeaSet[]>({
    queryKey: ["/api/idea-sets"],
  });

  const filtered = sets?.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">Ideas Hub</h1>
        <SearchAndFilter value={search} onChange={setSearch} placeholder="Search ideas" />
        {isLoading ? (
          <p>Loading...</p>
        ) : filtered && filtered.length > 0 ? (
          filtered.map((set) => (
            <IdeaList
              key={set.id}
              title={set.title}
              ideaSetId={set.id}
              date={new Date(set.createdAt)}
            />
          ))
        ) : (
          <EmptyState icon="lightbulb" message="No ideas found" />
        )}
      </div>
    </main>
  );
};

export default IdeasPage;
