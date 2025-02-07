import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const topics = [
  { value: "all", label: "All" },
  { value: "ai-ml", label: "AI & ML" },
  { value: "tech-news", label: "Tech News" },
  { value: "tech-podcasts", label: "Tech Podcasts" },
  { value: "innovation", label: "Innovation" },
  { value: "future-tech", label: "Future Tech" }
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (value: string) => void;
}

export default function CategoryFilter({
  selected,
  onSelect,
}: CategoryFilterProps) {
  return (
    <ScrollArea className="w-full whitespace-nowrap pb-2">
      <div className="flex gap-2">
        {topics.map((topic) => (
          <Button
            key={topic.value}
            variant={selected === topic.value ? "default" : "secondary"}
            size="sm"
            onClick={() => onSelect(topic.value)}
          >
            {topic.label}
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
