import { Badge } from "@/components/site/badge";
import type { PostStatus } from "@/db/schema";

const LABELS: Record<PostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <Badge variant={status} dot>
      {LABELS[status]}
    </Badge>
  );
}