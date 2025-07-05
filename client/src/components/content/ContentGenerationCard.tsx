import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, Sparkles } from 'lucide-react';

interface ContentGenerationCardProps {
  title: string;
  description: string;
  estimatedCost: string;
  estimatedTime: string;
  features: string[];
  onGenerate: () => void;
  isGenerating?: boolean;
  generatedContent?: string;
  onRegenerate?: () => void;
  lastGenerated?: Date;
}

export function ContentGenerationCard({
  title,
  description,
  estimatedCost,
  estimatedTime,
  features,
  onGenerate,
  isGenerating = false,
  generatedContent,
  onRegenerate,
  lastGenerated
}: ContentGenerationCardProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  
  const hasContent = !!generatedContent;
  
  if (hasContent) {
    return (
      <div className="space-y-6">
        {/* Generated Content Display */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              {lastGenerated && (
                <CardDescription>
                  Generated {lastGenerated.toLocaleDateString()} at {lastGenerated.toLocaleTimeString()}
                </CardDescription>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isGenerating}
              className="flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {isGenerating ? 'Regenerating...' : 'Regenerate'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className={`whitespace-pre-line ${!showFullContent && generatedContent.length > 500 ? 'line-clamp-6' : ''}`}>
                {showFullContent ? generatedContent : generatedContent.substring(0, 500)}
                {!showFullContent && generatedContent.length > 500 && '...'}
              </div>
              {generatedContent.length > 500 && (
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setShowFullContent(!showFullContent)}
                >
                  {showFullContent ? 'Show less' : 'Show more'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary-500" />
          Generate {title}
        </CardTitle>
        <CardDescription>
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cost and Time Estimates */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <DollarSign className="w-4 h-4" />
            <span>~{estimatedCost}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>~{estimatedTime}</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">What you'll get:</h4>
          <div className="flex flex-wrap gap-2">
            {features.map((feature, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {feature}
              </Badge>
            ))}
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? 'Generating...' : `Generate ${title}`}
        </Button>
      </CardContent>
    </Card>
  );
}