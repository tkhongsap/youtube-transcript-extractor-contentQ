import { useState } from 'react';
import { useTags } from '@/hooks/useTags';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface TagInputProps {
  onAdd?: (tagId: number) => void;
}

const TagInput: React.FC<TagInputProps> = ({ onAdd }) => {
  const { createTag } = useTags();
  const [name, setName] = useState('');

  const handleAdd = async () => {
    if (!name.trim()) return;
    const tag = await createTag.mutateAsync({ name });
    onAdd?.(tag.id);
    setName('');
  };

  return (
    <div className="flex items-center space-x-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag" />
      <Button onClick={handleAdd} disabled={createTag.isPending}>
        Add
      </Button>
    </div>
  );
};

export default TagInput;
