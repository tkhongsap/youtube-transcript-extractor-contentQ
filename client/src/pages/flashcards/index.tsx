import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import FlashcardSetCard from "@/components/content/FlashcardSetCard";
import SearchAndFilter from "@/components/common/SearchAndFilter";
import EmptyState from "@/components/common/EmptyState";
import { FlashcardSet } from "@shared/schema";

const FlashcardsPage = () => {
  const [search, setSearch] = useState("");
  const { data: sets, isLoading } = useQuery<FlashcardSet[]>({
    queryKey: ["/api/flashcard-sets"],
  });

  const filtered = sets?.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">My Flashcards</h1>
        <SearchAndFilter value={search} onChange={setSearch} placeholder="Search flashcards" />
        {isLoading ? (
          <p>Loading...</p>
        ) : filtered && filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filtered.map((set) => (
              <FlashcardSetCard key={set.id} flashcardSet={set} />
            ))}
          </div>
        ) : (
          <EmptyState icon="style" message="No flashcard sets found" />
        )}
      </div>
    </main>
  );
};

export default FlashcardsPage;
