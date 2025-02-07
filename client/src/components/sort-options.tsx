import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const sortOptions = [
  { value: "relevance", label: "Relevance" },
  { value: "date", label: "Date" },
  { value: "rating", label: "Rating" },
  { value: "viewCount", label: "View Count" },
];

interface SortOptionsProps {
  value: string;
  onValueChange: (value: string) => void;
}

export default function SortOptions({ value, onValueChange }: SortOptionsProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
