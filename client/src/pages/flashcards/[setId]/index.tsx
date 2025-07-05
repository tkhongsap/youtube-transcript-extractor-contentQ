import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FlashcardSet } from "@shared/schema";
import EmptyState from "@/components/common/EmptyState";
import ContentCard from "@/components/common/ContentCard";

const FlashcardSetPage = () => {
  const { setId } = useParams<{ setId: string }>();
  const { data: set, isLoading } = useQuery<FlashcardSet | null>({
    queryKey: ["/api/flashcard-sets/" + setId],
  });

  if (isLoading) return <p className="p-4">Loading...</p>;
  if (!set) return <EmptyState icon="style" message="Set not found" />;

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-semibold text-gray-900">{set.title}</h1>
        <ContentCard>
          <p className="text-gray-700 mb-4">{set.description}</p>
          <a href={`/flashcards/${setId}/study`} className="text-primary-500">
            Start Study Mode
          </a>
        </ContentCard>
      </div>
    </main>
  );
};

export default FlashcardSetPage;
