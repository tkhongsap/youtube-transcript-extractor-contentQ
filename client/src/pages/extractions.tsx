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
  const [transcript, setTranscript] = useState("");
  const [llmProvider, setLLMProvider] = useState("gpt-4o-mini");
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [hooks, setHooks] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [flashcards, setFlashcards] = useState<Array<{ question: string; answer: string }>>([]);
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

    setIsTranscriptLoading(true);
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
          description: "Transcript extracted successfully. Select a tab to analyze content.",
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
      setIsTranscriptLoading(false);
    }
  };

  const handleTabChange = async (value: string) => {
    if (!transcript || isAnalysisLoading) return;

    setIsAnalysisLoading(true);
    try {
      const response = await fetch(`/api/analyze/${value}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoId: url,
          llmProvider,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Failed to analyze ${value}`);
      }

      const data = await response.json();
      switch (value) {
        case "hooks":
          setHooks(data);
          break;
        case "summary":
          setSummary(data);
          break;
        case "flashcards":
          setFlashcards(data);
          break;
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  return (
    <div className="p-8 bg-[#F6F8FC] min-h-screen">
      <h1 className="text-4xl font-bold mb-2 gradient-text">Your Extractions</h1>
      <p className="text-subtle-gray mb-8">Extract and analyze your video content</p>

      <div className="flex flex-col gap-4 mb-6">
        <div className="relative w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Paste your YouTube URL here..."
            className="pl-10 bg-white border-[#E2E8F0] focus:border-[#6638F0] w-full"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-4 items-center">
          <Select
            value={llmProvider}
            onValueChange={setLLMProvider}
          >
            <SelectTrigger className="w-[180px] bg-white border-[#E2E8F0]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deepseek-v3">DeepSeek V3</SelectItem>
              <SelectItem value="deepseek-r1">DeepSeek R1</SelectItem>
              <SelectItem value="gpt-4o-mini">GPT-4O Mini</SelectItem>
              <SelectItem value="o3-mini">O3 Mini</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleExtract} 
            disabled={isTranscriptLoading}
            className="btn-primary"
          >
            {isTranscriptLoading ? "Extracting..." : "Extract Now"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="transcript" className="w-full" onValueChange={handleTabChange}>
        <TabsList className="mb-4 bg-white">
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
          <TabsTrigger value="hooks">Hooks</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
        </TabsList>

        {/* Transcript Tab */}
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
                {isTranscriptLoading ? (
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

        {/* Hooks Tab */}
        <TabsContent value="hooks">
          <Card className="card">
            <CardHeader className="border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <CardTitle>Video Hooks</CardTitle>
                <CopyButton value={hooks.join('\n')} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isAnalysisLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : hooks.length > 0 ? (
                  <ul className="space-y-2">
                    {hooks.map((hook, index) => (
                      <li key={index} className="p-3 bg-white rounded-lg border border-[#E2E8F0]">
                        {hook}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-subtle-gray">
                    Click this tab to generate attention-grabbing hooks from your content.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary">
          <Card className="card">
            <CardHeader className="border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <CardTitle>Content Summary</CardTitle>
                <CopyButton value={summary} />
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] w-full rounded-md border border-[#E2E8F0] p-4 bg-white">
                {isAnalysisLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : summary ? (
                  <p className="whitespace-pre-wrap">{summary}</p>
                ) : (
                  <p className="text-subtle-gray">
                    Click this tab to generate a comprehensive summary of your content.
                  </p>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isAnalysisLoading ? (
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
            ) : flashcards.length > 0 ? (
              flashcards.map((card, index) => (
                <Card key={index} className="card">
                  <CardHeader className="border-b border-[#E2E8F0]">
                    <CardTitle className="text-lg">Flashcard {index + 1}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="font-semibold">Question:</p>
                      <p>{card.question}</p>
                    </div>
                    <div>
                      <p className="font-semibold">Answer:</p>
                      <p>{card.answer}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="card">
                <CardHeader className="border-b border-[#E2E8F0]">
                  <CardTitle className="text-lg">Flashcards</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-subtle-gray">
                    Click this tab to generate learning flashcards from your content.
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