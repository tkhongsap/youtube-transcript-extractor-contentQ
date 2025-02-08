import { FC, useState, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CopyButton } from "@/components/ui/copy-button";
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VideoMetadata {
  title: string;
  channelTitle: string;
  viewCount: string;
  publishedAt: string;
  duration: string;
}

const Extractions: FC = () => {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [llmProvider, setLLMProvider] = useState("gpt-4o-mini");
  const [isTranscriptLoading, setIsTranscriptLoading] = useState(false);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [hooks, setHooks] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [flashcards, setFlashcards] = useState<
    Array<{ question: string; answer: string }>
  >([]);
  const [analysisPerformed, setAnalysisPerformed] = useState({
    hooks: false,
    summary: false,
    flashcards: false,
  });
  const { toast } = useToast();

  const handleClear = () => {
    setUrl("");
    setTranscript("");
    setHooks([]);
    setSummary("");
    setFlashcards([]);
    setAnalysisPerformed({
      hooks: false,
      summary: false,
      flashcards: false,
    });
    toast({
      title: "Cleared",
      description: "All content has been cleared. You can start fresh now.",
    });
  };

  const handleExtract = async () => {
    if (!url) {
      toast({
        title: "Error",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      });
      return;
    }

    setHooks([]);
    setSummary("");
    setFlashcards([]);
    setMetadata(null);
    setAnalysisPerformed({
      hooks: false,
      summary: false,
      flashcards: false,
    });

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
      if (parsedData.success) {
        setTranscript(parsedData.transcript);
        if (parsedData.metadata) {
          setMetadata(parsedData.metadata);
        }
        toast({
          title: "Success",
          description:
            "Transcript extracted successfully. Select a tab to analyze content.",
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

    if (value === "transcript" || analysisPerformed[value as keyof typeof analysisPerformed]) {
      return;
    }

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
          setAnalysisPerformed(prev => ({ ...prev, hooks: true }));
          break;
        case "summary":
          setSummary(data);
          setAnalysisPerformed(prev => ({ ...prev, summary: true }));
          break;
        case "flashcards":
          setFlashcards(data);
          setAnalysisPerformed(prev => ({ ...prev, flashcards: true }));
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
      <h1 className="text-4xl font-bold mb-2 gradient-text">
        Your Extractions
      </h1>
      <p className="text-subtle-gray mb-8">
        Extract and analyze your video content
      </p>

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
          <Select value={llmProvider} onValueChange={setLLMProvider}>
            <SelectTrigger className="w-[180px] bg-white border-[#E2E8F0]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-4o-mini">gpt-4o-mini</SelectItem>
              <SelectItem value="o3-mini">o3-mini</SelectItem>
              <SelectItem value="deepseek-v3">deepseek-v3</SelectItem>
              <SelectItem value="deepseek-r1">deepseek-r1</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleExtract}
            disabled={isTranscriptLoading}
            className="btn-primary"
          >
            {isTranscriptLoading ? "Extracting..." : "Extract Now"}
          </Button>
          <Button
            onClick={handleClear}
            variant="destructive"
            className="bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
          >
            Clear
          </Button>
        </div>
      </div>

      <Tabs
        defaultValue="transcript"
        className="w-full"
        onValueChange={handleTabChange}
      >
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
                <CopyButton value={transcript} />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px] w-full rounded-md border border-[#E2E8F0] p-4 bg-white">
                {isTranscriptLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : transcript ? (
                  <div className="space-y-6">
                    {metadata && (
                      <div className="bg-gray-50 p-4 rounded-lg border border-[#E2E8F0] mb-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <h3 className="font-medium text-gray-900">{metadata.title}</h3>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Channel</p>
                            <p className="text-sm font-medium text-gray-900">{metadata.channelTitle}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Published</p>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(metadata.publishedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Views</p>
                            <p className="text-sm font-medium text-gray-900">
                              {parseInt(metadata.viewCount).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Duration</p>
                            <p className="text-sm font-medium text-gray-900">{metadata.duration}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      {transcript.split("\n").map((line, index) => (
                        <p
                          key={index}
                          className="text-sm leading-relaxed text-gray-800 px-2 py-1 rounded hover:bg-gray-50"
                        >
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <Card className="card w-full border-0 shadow-none h-[400px] flex items-center justify-center">
                    <CardContent className="p-12 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Search className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Transcript Yet
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Enter a YouTube URL above and click "Extract Now" to get started. We'll fetch the video transcript for you.
                      </p>
                    </CardContent>
                  </Card>
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
                <CopyButton value={hooks.join("\n")} />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                {isAnalysisLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : hooks.length > 0 ? (
                  <div className="grid gap-4">
                    {hooks.map((hook, index) => {
                      const hookContent = hook.replace(/\*\*.*?\*\*/, "").trim();
                      
                      return (
                        <div
                          key={index}
                          className="p-4 bg-white rounded-lg border border-[#E2E8F0] hover:border-purple-400 transition-colors duration-200 shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="text-gray-700">
                                {hookContent}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="card w-full h-[400px] flex items-center justify-center">
                    <CardContent className="p-12 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Search className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Hooks Generated Yet
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Click this tab to generate attention-grabbing hooks from your content. We'll analyze your content and create compelling hooks to engage your audience.
                      </p>
                    </CardContent>
                  </Card>
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
            <CardContent className="p-6">
              <ScrollArea className="h-[600px] w-full rounded-md border border-[#E2E8F0] p-6 bg-white">
                {isAnalysisLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                ) : summary ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown
                      components={{
                        h1: ({ node, ...props }) => (
                          <h1 className="text-2xl font-bold mb-4 text-gray-900" {...props} />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 className="text-xl font-semibold mb-3 text-gray-800" {...props} />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 className="text-lg font-medium mb-2 text-gray-800" {...props} />
                        ),
                        p: ({ node, ...props }) => (
                          <p className="mb-4 text-gray-700 leading-relaxed" {...props} />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
                        ),
                        li: ({ node, ...props }) => (
                          <li className="text-gray-700" {...props} />
                        ),
                        blockquote: ({ node, ...props }) => (
                          <blockquote className="border-l-4 border-purple-500 pl-4 my-4 italic text-gray-700" {...props} />
                        ),
                        code: ({ node, ...props }) => (
                          <code className="bg-gray-100 text-purple-600 px-1.5 py-0.5 rounded-md text-sm" {...props} />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong className="font-semibold text-gray-900" {...props} />
                        ),
                      }}
                    >
                      {summary}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <Card className="card w-full border-0 shadow-none h-[400px] flex items-center justify-center">
                    <CardContent className="p-12 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Search className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Summary Yet
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Click this tab to generate a comprehensive summary of your content. We'll analyze your video and create a detailed overview.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flashcards Tab */}
        <TabsContent value="flashcards">
          <Card className="card">
            <CardHeader className="border-b border-[#E2E8F0]">
              <div className="flex items-center justify-between">
                <CardTitle>Flashcards</CardTitle>
                <CopyButton value={flashcards.map((card, i) => `Card ${i + 1}\nQ: ${card.question}\nA: ${card.answer}\n`).join('\n')} />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6">
                {isAnalysisLoading ? (
                  Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i} className="card w-full">
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
                ) : flashcards.length > 0 ? (
                  flashcards.map((card, index) => (
                    <Card key={index} className="card w-full overflow-hidden hover:shadow-md transition-shadow duration-200">
                      <CardHeader className="border-b border-[#E2E8F0] bg-purple-50">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg text-purple-900">
                            Flashcard {index + 1}
                          </CardTitle>
                          <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-medium">
                            {index + 1}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-sm uppercase tracking-wide text-purple-600 mb-2 font-medium">
                              Question
                            </h3>
                            <p className="text-gray-800 font-medium">{card.question}</p>
                          </div>
                          <div className="pt-4 border-t border-[#E2E8F0]">
                            <h3 className="text-sm uppercase tracking-wide text-purple-600 mb-2 font-medium">
                              Answer
                            </h3>
                            <p className="text-gray-700">{card.answer}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="card w-full h-[400px] flex items-center justify-center">
                    <CardContent className="p-12 text-center">
                      <div className="mb-4 flex justify-center">
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                          <Search className="h-6 w-6 text-purple-600" />
                        </div>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No Flashcards Yet
                      </h3>
                      <p className="text-gray-500 max-w-md mx-auto">
                        Click this tab to generate learning flashcards from your content. We'll help you create effective study materials.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Extractions;
