import { FC, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CopyButton } from "@/components/ui/copy-button";

const Extractions: FC = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const { toast } = useToast();

  const handleExtract = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/extract-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to extract transcript");
      }

      const parsedData = JSON.parse(data.transcript);
      if (parsedData.success && parsedData.transcript) {
        setTranscript(parsedData.transcript);
        toast({
          title: "Success",
          description: "Transcript extracted successfully",
        });
      } else {
        throw new Error(parsedData.error || "Failed to parse transcript");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Your Extractions</h1>

      <div className="relative mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Paste your YouTube URL here..."
            className="pl-10"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Button onClick={handleExtract} disabled={isLoading}>
          {isLoading ? "Extracting..." : "Extract Now"}
        </Button>
      </div>

      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="summaries">Summaries</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        </TabsList>

        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Full Transcript</CardTitle>
                {transcript && <CopyButton value={transcript} />}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : transcript ? (
                  <div className="space-y-4">
                    {transcript.split('\n').map((line, index) => (
                      <p key={index} className="text-sm leading-relaxed py-2 border-b border-border last:border-0">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    The full transcript will appear here once a video is processed.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hooks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Video Hooks</CardTitle>
                <CopyButton value="AI-generated hooks will appear here." />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground mb-4">
                  AI-generated hooks from the video content will appear here.
                </p>
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Content Summary</CardTitle>
                <CopyButton value="The AI-generated summary will appear here." />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border p-4">
                <p className="text-muted-foreground">
                  The AI-generated summary will appear here once processed.
                </p>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Flashcard Preview</CardTitle>
                  <CopyButton value="AI-generated flashcards will appear here." />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI-generated flashcards will appear here.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Extractions;