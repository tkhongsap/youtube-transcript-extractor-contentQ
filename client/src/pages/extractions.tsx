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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Extractions: FC = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [llmProvider, setLLMProvider] = useState("deepseek");
  const [analysisData, setAnalysisData] = useState<any>(null); //Added state to store analysis data
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
    setAnalysisData(null); //Reset analysis data on new extraction
    try {
      // First extract the transcript
      const transcriptResponse = await fetch("/api/extract-transcript", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const transcriptData = await transcriptResponse.json();

      if (!transcriptResponse.ok) {
        throw new Error(transcriptData.message || "Failed to extract transcript");
      }

      const parsedData = JSON.parse(transcriptData.transcript);
      if (parsedData.success && parsedData.transcript) {
        setTranscript(parsedData.transcript);

        // Now analyze the content
        const analysisResponse = await fetch("/api/analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videoId: url,
            llmProvider
          }),
        });

        if (!analysisResponse.ok) {
          const errorData = await analysisResponse.json();
          throw new Error(errorData.message || "Failed to analyze content");
        }

        const analysisData = await analysisResponse.json();
        setAnalysisData(analysisData); //Store analysis data
        toast({
          title: "Success",
          description: "Content analyzed successfully",
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
    <div className="p-8 bg-[#F6F8FC] min-h-screen">
      <h1 className="text-4xl font-bold mb-2 gradient-text">Your Extractions</h1>
      <p className="text-subtle-gray mb-8">Extract and analyze your video content</p>

      <div className="relative mb-6 flex gap-4 items-center">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Paste your YouTube URL here..."
            className="pl-10 bg-white border-[#E2E8F0] focus:border-[#6638F0]"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <Select
          value={llmProvider}
          onValueChange={setLLMProvider}
        >
          <SelectTrigger className="w-[180px] bg-white border-[#E2E8F0]">
            <SelectValue placeholder="Select Model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deepseek">DeepSeek</SelectItem>
            <SelectItem value="openai">OpenAI</SelectItem>
          </SelectContent>
        </Select>
        <Button 
          onClick={handleExtract} 
          disabled={isLoading}
          className="btn-primary"
        >
          {isLoading ? "Processing..." : "Extract Now"}
        </Button>
      </div>

      <Tabs defaultValue="transcript" className="w-full">
        <TabsList className="mb-4 bg-white">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="summaries">Summaries</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        </TabsList>

        <TabsContent value="transcript">
          <Card className="card">
            <CardHeader className="border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <CardTitle>Full Transcript</CardTitle>
                {transcript && <CopyButton value={transcript} />}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border border-[#E2E8F0] p-4 bg-white">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : transcript ? (
                  <div className="space-y-2">
                    {transcript.split('\n').map((line, index) => (
                      <p key={index} className="text-sm leading-relaxed text-gray-800 px-2 py-1 rounded hover:bg-gray-50">
                        {line}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-subtle-gray">
                    The full transcript will appear here once a video is processed.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hooks">
          <Card className="card">
            <CardHeader className="border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <CardTitle>Video Hooks</CardTitle>
                <CopyButton value={analysisData ? analysisData.hooks?.join('\n') : "AI-generated hooks will appear here."} /> {/*Conditional rendering of hooks*/}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : analysisData && analysisData.hooks ? (
                  <ul>
                    {analysisData.hooks.map((hook: string, index) => (
                      <li key={index}>{hook}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-subtle-gray mb-4">
                    AI-generated hooks from the video content will appear here.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summaries">
          <Card className="card">
            <CardHeader className="border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <CardTitle>Content Summary</CardTitle>
                <CopyButton value={analysisData ? analysisData.summary : "The AI-generated summary will appear here."} /> {/*Conditional rendering of summary*/}
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border border-[#E2E8F0] p-4 bg-white">
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : analysisData && analysisData.summary ? (
                  <p>{analysisData.summary}</p>
                ) : (
                  <p className="text-subtle-gray">
                    The AI-generated summary will appear here once processed.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flashcards">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="card">
                  <CardHeader>
                    <CardTitle className="text-lg">Loading...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))
            ) : analysisData && analysisData.flashcards ? (
              analysisData.flashcards.map((flashcard: {front: string; back: string}, index) => (
                <Card key={index} className="card">
                  <CardHeader className="border-b border-[#E2E8F0]">
                    <CardTitle className="text-lg">Flashcard {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p><strong>Front:</strong> {flashcard.front}</p>
                    <p><strong>Back:</strong> {flashcard.back}</p>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="card">
                <CardHeader className="border-b border-[#E2E8F0]">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Flashcard Preview</CardTitle>
                    <CopyButton value="AI-generated flashcards will appear here." />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-subtle-gray">
                    AI-generated flashcards will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Extractions;