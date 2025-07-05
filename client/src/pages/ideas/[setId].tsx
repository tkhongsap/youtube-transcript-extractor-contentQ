import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import IdeaList from "@/components/content/IdeaList";
import EmptyState from "@/components/common/EmptyState";
import { IdeaSet } from "@shared/schema";

const IdeaSetPage = () => {
  const { setId } = useParams<{ setId: string }>();
  const { data: set, isLoading } = useQuery<IdeaSet | null>({
    queryKey: ["/api/idea-sets/" + setId],
  });

  if (isLoading) return <p className="p-4">Loading...</p>;
  if (!set) return <EmptyState icon="lightbulb" message="Idea set not found" />;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">{set.title}</h1>
        <IdeaList title={set.title} ideaSetId={set.id} date={new Date(set.createdAt)} />
      </div>
    </main>
  );
};

export default IdeaSetPage;
