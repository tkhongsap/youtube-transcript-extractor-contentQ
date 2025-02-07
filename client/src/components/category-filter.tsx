import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

export const topics = [
  { value: "all", label: "All" },
  { value: "ai-ml", label: "AI & ML" },
  { value: "tech-news", label: "Tech News" },
  { value: "programming", label: "Programming" },
  { value: "tech-podcasts", label: "Tech Podcasts" },
  { value: "startups", label: "Startups" },
  { value: "digital-tools", label: "Digital Tools" },
  { value: "education-tech", label: "Education Tech" },
  { value: "marketing-tech", label: "Marketing Tech" },
  { value: "productivity", label: "Productivity" },
  { value: "data-science", label: "Data Science" },
  { value: "innovation", label: "Innovation" },
  { value: "business-strategy", label: "Business Strategy" },
  { value: "ux-ui-design", label: "UX/UI Design" },
  { value: "career-growth", label: "Career Growth" },
  { value: "leadership", label: "Leadership" },
  { value: "product-dev", label: "Product Dev" },
  { value: "digital-marketing", label: "Digital Marketing" },
  { value: "automation", label: "Automation" },
  { value: "future-tech", label: "Future Tech" },
];

interface CategoryFilterProps {
  selected: string;
  onSelect: (value: string) => void;
}

export default function CategoryFilter({ selected, onSelect }: CategoryFilterProps) {
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