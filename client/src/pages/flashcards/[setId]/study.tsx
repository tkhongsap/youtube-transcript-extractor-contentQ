import { useParams } from "wouter";
import EmptyState from "@/components/common/EmptyState";

const FlashcardStudyPage = () => {
  const { setId } = useParams<{ setId: string }>();

  // Study mode not implemented yet
  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Study Mode</h1>
        <EmptyState icon="style" message={`Study mode for set ${setId} coming soon`} />
      </div>
    </main>
  );
};

export default FlashcardStudyPage;
