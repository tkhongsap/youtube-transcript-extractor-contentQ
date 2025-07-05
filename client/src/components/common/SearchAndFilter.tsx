import React from "react";
import { Input } from "@/components/ui/input";

interface SearchAndFilterProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchAndFilter = ({ value, onChange, placeholder }: SearchAndFilterProps) => {
  return (
    <div className="mb-4">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "Search"}
      />
    </div>
  );
};

export default SearchAndFilter;
