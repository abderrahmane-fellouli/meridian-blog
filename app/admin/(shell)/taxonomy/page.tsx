import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { TaxonomyManager } from "@/components/admin/taxonomy-manager";
import { requireOwnerReady } from "@/lib/auth-server";
import { listCategories, listTags } from "@/lib/services/categories-tags";

export const metadata: Metadata = {
  title: "Taxonomy",
};

export default async function AdminTaxonomyPage() {
  await requireOwnerReady();
  const [categories, tags] = await Promise.all([listCategories(), listTags()]);
  return (
    <div className="p-6 sm:p-8 max-w-5xl mx-auto w-full">
      <PageHeader title="Taxonomy" description="Categories and tags organize your posts." />
      <TaxonomyManager
        categories={categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, description: c.description }))}
        tags={tags.map((t) => ({ id: t.id, name: t.name, slug: t.slug, description: null }))}
      />
    </div>
  );
}