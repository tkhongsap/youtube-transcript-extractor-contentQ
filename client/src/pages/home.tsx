import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import FeatureCard from "@/components/feature-card";
import { Brain, FlaskConical, FileSearch } from "lucide-react";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Unlock the Power of YouTube Insights
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Analyze, summarize, and extract valuable content from YouTube videos
        </p>
        <Link href="/search">
          <Button size="lg">Get Started</Button>
        </Link>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        <FeatureCard
          icon={Brain}
          title="Smart Summaries"
          description="Get concise summaries of long videos in seconds"
        />
        <FeatureCard
          icon={FlaskConical}
          title="Flashcard Generation"
          description="Create study materials from educational content"
        />
        <FeatureCard
          icon={FileSearch}
          title="Content Analysis"
          description="Gain insights into video structure and key points"
        />
      </div>
    </div>
  );
}
