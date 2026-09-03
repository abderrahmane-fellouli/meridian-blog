import type { Metadata } from "next";
import { PostEditorForm } from "@/components/admin/post-editor-form";
import { requireOwnerReady } from "@/lib/auth-server";
import { listCategories, listTags } from "@/lib/services/categories-tags";

export const metadata: Metadata = {
  title: "New post",
};

export default async function AdminNewPostPage() {
  await requireOwnerReady();
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);

  return (
    <PostEditorForm
      categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug }))}
      tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug }))}
      initial={null}
    />
  );
}