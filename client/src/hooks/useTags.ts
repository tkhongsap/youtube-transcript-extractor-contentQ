import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Tag, InsertTag } from "@shared/schema";

export function useTags() {
  const { data: tags } = useQuery<Tag[]>({ queryKey: ["/api/tags"] });

  const createTag = useMutation((tag: Omit<InsertTag, "userId">) =>
    apiRequest("POST", "/api/tags", tag).then((r) => r.json() as Promise<Tag>)
  );

  return { tags, createTag };
}
