import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function Analysis() {
  const { videoId } = useParams();
  
  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/analysis", videoId],
    enabled: !!videoId
  });

  if (isLoading) {
    return <div className="container mx-auto p-8">
      <Skeleton className="h-8 w-1/2 mb-4" />
      <Skeleton className="h-64" />
    </div>;
  }

  if (!analysis) return null;

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">{analysis.title}</h1>

      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
          <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
        </TabsList>

        <TabsContent value="summary">
          <Card>
            <CardContent className="pt-6">
              <p className="whitespace-pre-wrap">{analysis.summary}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hooks">
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2">
                {analysis.hooks.map((hook, i) => (
                  <li key={i} className="list-disc ml-6">{hook}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards">
          <div className="grid gap-4">
            {analysis.flashcards.map((card, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <h3 className="font-bold mb-2">Q: {card.question}</h3>
                  <p>A: {card.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="keyPoints">
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2">
                {analysis.keyPoints.map((point, i) => (
                  <li key={i} className="list-disc ml-6">{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
