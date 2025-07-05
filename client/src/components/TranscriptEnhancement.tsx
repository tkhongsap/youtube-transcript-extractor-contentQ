import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AdditionalTextInput } from '@/components/AdditionalTextInput';
import { useAdditionalTextState } from '@/hooks/useAdditionalTextState';
import { useToast } from '@/hooks/use-toast';
import type { 
  OriginalTranscript, 
  AdditionalTextEntry, 
  AdditionalTextCollection,
  CreateAdditionalTextInput 
} from '@/types/transcript';
import { Plus, FileText, NotebookText, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TranscriptEnhancementProps {
  originalTranscript: OriginalTranscript;
  additionalTextCollection?: AdditionalTextCollection;
  onSaveAdditionalText: (data: CreateAdditionalTextInput) => Promise<void>;
  onDeleteAdditionalText?: (id: string) => Promise<void>;
  onUpdateAdditionalText?: (id: string, data: CreateAdditionalTextInput) => Promise<void>;
  className?: string;
  readOnly?: boolean;
}

/**
 * TranscriptEnhancement component for viewing and enhancing video transcripts
 * Fully accessible with ARIA landmarks, keyboard navigation, and screen reader support
 */
export function TranscriptEnhancement({
  originalTranscript,
  additionalTextCollection,
  onSaveAdditionalText,
  onDeleteAdditionalText,
  onUpdateAdditionalText,
  className,
  readOnly = false,
}: TranscriptEnhancementProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'original' | 'enhanced'>('original');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const additionalTextState = useAdditionalTextState({
    onSave: async (data) => {
      try {
        await onSaveAdditionalText(data);
        toast({
          title: 'Success',
          description: 'Additional text saved successfully',
        });
        setShowAddForm(false);
        additionalTextState.reset();
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to save additional text',
          variant: 'destructive',
        });
      }
    },
    onCancel: () => {
      setShowAddForm(false);
      additionalTextState.reset();
    },
  });

  const handleEdit = useCallback((entry: AdditionalTextEntry) => {
    setEditingId(entry.id);
    // You would implement edit functionality here
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!onDeleteAdditionalText) return;
    
    try {
      await onDeleteAdditionalText(id);
      toast({
        title: 'Success',
        description: 'Additional text deleted successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete additional text',
        variant: 'destructive',
      });
    }
  }, [onDeleteAdditionalText, toast]);

  const formatTranscriptSegments = () => {
    const segments = originalTranscript.segments || [];
    const rawText = originalTranscript.rawText;
    
    if (segments.length > 0) {
      return segments;
    }
    
    // If no segments, create paragraphs from raw text
    return rawText.split(/\n\n+/).filter(text => text.trim()).map((text, index) => ({
      id: `para-${index}`,
      text: text.trim(),
    }));
  };

  const segments = formatTranscriptSegments();
  const additionalEntries = additionalTextCollection?.entries || [];

  return (
    <div className={cn('w-full', className)}>
      <Card role="main" aria-label="Transcript enhancement interface">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <FileText className="h-5 w-5" aria-hidden="true" />
              <span>Transcript</span>
            </CardTitle>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 w-full sm:w-auto"
                aria-expanded={showAddForm}
                aria-controls="add-form-section"
                aria-describedby="add-button-help"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>{showAddForm ? 'Hide' : 'Add'} Notes</span>
              </Button>
            )}
            <div id="add-button-help" className="sr-only">
              {showAddForm 
                ? 'Click to hide the form for adding additional notes to the transcript'
                : 'Click to show a form for adding additional notes to the transcript'
              }
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'original' | 'enhanced')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="original" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Original</span>
              </TabsTrigger>
              <TabsTrigger value="enhanced" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <NotebookText className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Enhanced</span>
                {additionalEntries.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 sm:px-2 py-0.5 text-xs text-primary-foreground">
                    {additionalEntries.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {showAddForm && !readOnly && (
              <div 
                id="add-form-section"
                className="mt-4 border rounded-lg p-4 bg-muted/30"
                role="region"
                aria-label="Add additional text form"
              >
                <AdditionalTextInput
                  value={additionalTextState.value}
                  onChange={additionalTextState.setValue}
                  label={additionalTextState.label}
                  onLabelChange={additionalTextState.setLabel}
                  timestamp={additionalTextState.timestamp}
                  onTimestampChange={additionalTextState.setTimestamp}
                  onSave={additionalTextState.handleSave}
                  onCancel={additionalTextState.handleCancel}
                  hasChanges={additionalTextState.hasChanges}
                  isSaving={additionalTextState.isSaving}
                />
              </div>
            )}

            <TabsContent value="original" className="mt-4">
              <ScrollArea 
                className="h-[400px] sm:h-[500px] lg:h-[600px] w-full rounded-md border p-3 sm:p-4"
                aria-label="Original transcript content"
              >
                <div className="space-y-4" role="article" aria-label="Original video transcript">
                  {segments.map((segment, index) => (
                    <div 
                      key={segment.id || index} 
                      className="prose prose-sm max-w-none"
                      tabIndex={0}
                      role="region"
                      aria-label={`Transcript segment ${index + 1}${segment.startTime ? ` at ${formatTime(segment.startTime)}` : ''}`}
                    >
                      {segment.startTime !== undefined && (
                        <span 
                          className="text-xs text-muted-foreground font-mono"
                          aria-label={`Timestamp: ${formatTime(segment.startTime)}`}
                        >
                          [{formatTime(segment.startTime)}]
                        </span>
                      )}
                      <p className="mt-1">{segment.text}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="enhanced" className="mt-4">
              <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px] w-full rounded-md border p-3 sm:p-4">
                {additionalEntries.length === 0 && !showAddForm ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No additional notes yet. Click "Add Notes" to enhance this transcript.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-6">
                    {/* Original transcript sections */}
                    <div className="space-y-4">
                      <div className="border-l-4 border-muted pl-4">
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Original Transcript
                        </h4>
                        {segments.map((segment, index) => (
                          <div key={segment.id || index} className="prose prose-sm max-w-none">
                            {segment.startTime !== undefined && (
                              <span className="text-xs text-muted-foreground font-mono">
                                [{formatTime(segment.startTime)}]
                              </span>
                            )}
                            <p className="mt-1">{segment.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Additional text entries */}
                    {additionalEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="border-l-4 border-primary pl-4 bg-primary/5 rounded-r-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                              {entry.label}
                            </span>
                            {entry.timestamp !== undefined && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                at {formatTime(entry.timestamp)}
                              </span>
                            )}
                          </div>
                          {!readOnly && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(entry)}
                                className="h-8 w-8 p-0"
                              >
                                <span className="sr-only">Edit</span>
                                <FileText className="h-3 w-3" />
                              </Button>
                              {onDeleteAdditionalText && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDelete(entry.id)}
                                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                >
                                  <span className="sr-only">Delete</span>
                                  <span className="text-sm">×</span>
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{entry.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}