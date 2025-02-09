import { FC, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
import type { SavedContent as SavedContentType } from "@shared/schema";
import ReactMarkdown from "react-markdown";

const SavedContent: FC = () => {
  const [activeTab, setActiveTab] = useState<string>("all");

  const { data: savedItems, isLoading } = useQuery<SavedContentType[]>({
    queryKey: ["/api/saved-content"],
  });

  const filteredItems = savedItems?.filter(
    item => activeTab === "all" || item.contentType === activeTab
  );

  const formatDate = (dateStr: Date | string | null) => {
    if (!dateStr) return "";
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateStr));
  };

  const renderContent = (item: SavedContentType) => {
    if (item.contentType === 'flashcard') {
      const flashcard = item.content as { question: string; answer: string };
      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Question</h3>
            <p className="mt-1">{flashcard.question}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Answer</h3>
            <p className="mt-1">{flashcard.answer}</p>
          </div>
        </div>
      );
    } else if (item.contentType === 'summary') {
      return (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{item.content as string}</ReactMarkdown>
        </div>
      );
    } else {
      return <p>{item.content as string}</p>;
    }
  };

  return (
    <div className="p-8 bg-[#F6F8FC] min-h-screen">
      <h1 className="text-4xl font-bold mb-2 gradient-text">Saved Content</h1>
      <p className="text-subtle-gray mb-8">Your collection of saved insights and learning materials</p>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="mb-4 bg-white">
          <TabsTrigger value="all">All Content</TabsTrigger>
          <TabsTrigger value="hook">Hooks</TabsTrigger>
          <TabsTrigger value="summary">Summaries</TabsTrigger>
          <TabsTrigger value="flashcard">Flashcards</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid gap-6">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="w-full">
                  <CardHeader>
                    <Skeleton className="h-6 w-32" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : filteredItems?.length ? (
              filteredItems.map((item) => (
                <Card key={item.id} className="w-full overflow-hidden">
                  <CardHeader className="border-b border-[#E2E8F0] bg-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                            {item.contentType.charAt(0).toUpperCase() + item.contentType.slice(1)}
                          </span>
                          <span className="text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>
                        <h3 className="font-medium text-gray-900">{item.videoTitle}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`https://youtube.com/watch?v=${item.videoId}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 bg-white">
                    {renderContent(item)}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="w-full">
                <CardContent className="p-12 text-center">
                  <p className="text-gray-500">No saved content found. Save some content from your extractions!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SavedContent;