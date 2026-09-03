import { config } from "dotenv";

/* eslint-disable @typescript-eslint/no-explicit-any -- dev-only service
   verification script; builds throwaway Tiptap body fixtures with `as any`. */

async function main() {
  config({ path: ".env.local" });

  const {
    createPost,
    updatePost,
    deletePost,
    getPublishedPosts,
    getPublishedPostBySlug,
    getPostsForAdmin,
    getAdjacentPosts,
    getCategoriesWithCounts,
    isPubliclyVisible,
    PostConflictError,
    duplicatePost,
    getAdminStats,
    countPublishedPosts,
    getHeroPost,
    getPostForAdmin,
  } = await import("@/lib/services/posts");
  const { getOrCreateCategory, getOrCreateTag, deleteCategory, deleteTag } = await import(
    "@/lib/services/categories-tags"
  );
  const { saveUpload, deleteMedia, listMedia, validateMediaInput, MediaValidationError, countMedia } =
    await import("@/lib/services/media");
  const { createRedirect, resolveRedirect, deleteRedirect, normalizeSourcePath } =
    await import("@/lib/services/redirects");
  const { searchPublishedPosts, searchPublishedPostsBySubstring, sanitizeSearchQuery } =
    await import("@/lib/services/search");
  const { headingIndex, extractPlainText, deriveExcerpt, estimateReadingTime } = await import(
    "@/lib/body"
  );
  const { getSettings, updateSettings, mergeSettingsStored, defaultSiteSettings, SETTINGS_KEYS } =
    await import("@/lib/services/settings");
  const { db } = await import("@/lib/db");
  const { eq, inArray } = await import("drizzle-orm");
  const { redirect, setting } = await import("@/db/schema");

  const now = Date.now();
  const prefix = `svc${Math.floor(now / 1000)}_`;

  const created: {
    posts: string[];
    categories: string[];
    tags: string[];
    redirects: string[];
    media: string[];
  } = { posts: [], categories: [], tags: [], redirects: [], media: [] };

  const failures: string[] = [];
  let oldSlug: string | null = null;
  function check(name: string, cond: boolean, detail?: string) {
    if (cond) {
      console.log(`  PASS  ${name}`);
    } else {
      console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
      failures.push(name);
    }
  }
  async function expectError(name: string, fn: () => Promise<unknown>, ErrorType: new (...a: any[]) => Error) {
    try {
      await fn();
      check(name, false, "did not throw");
    } catch (e) {
      check(name, e instanceof ErrorType, `threw ${(e as Error).constructor.name}`);
    }
  }

  try {
    console.log("── categories & tags ──");
    const catA = await getOrCreateCategory(`${prefix}Cat A`, "Service test category");
    const catB = await getOrCreateCategory(`${prefix}Cat B`);
    const reCat = await getOrCreateCategory(`${prefix}Cat A`);
    created.categories.push(catA.id, catB.id);
    check("getOrCreateCategory idempotent", reCat.id === catA.id, `got ${reCat.id} want ${catA.id}`);
    const existingCat = await getOrCreateCategory(`${prefix}Cat A`);
    check("categories stable name/slug", existingCat.slug === catA.slug);

    const tagA = await getOrCreateTag(`${prefix}Tag A`);
    const tagB = await getOrCreateTag(`${prefix}Tag B`);
    created.tags.push(tagA.id, tagB.id);
    check("getOrCreateTag idempotent", (await getOrCreateTag(`${prefix}Tag A`)).id === tagA.id);

    console.log("── visibility model ──");
    const past = new Date(now - 200_000);
    const mid = new Date(now - 100_000);
    const future = new Date(now + 86_400_000);
    check(
      "isPubliclyVisible published+past",
      isPubliclyVisible("published", past) === true
    );
    check("isPubliclyVisible published+future false", isPubliclyVisible("published", future) === false);
    check("isPubliclyVisible draft true/false", isPubliclyVisible("draft", past) === false);
    check("isPubliclyVisible scheduled false", isPubliclyVisible("scheduled", past) === false);
    check("isPubliclyVisible null publishedAt false", isPubliclyVisible("published", null) === false);

    const bodyDraft = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Drafting is private" }] },
        { type: "paragraph", content: [{ type: "text", text: "This must never appear publicly." }] },
      ],
    };
    const bodyPub = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Public Post Title" }] },
        { type: "paragraph", content: [{ type: "text", text: "The secret phrase is meridian-archipelago." }] },
        { type: "codeBlock", attrs: { language: "bash" }, content: [{ type: "text", text: "pnpm db:seed" }] },
      ],
    };
    const bodyScheduled = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "Scheduled later" }] },
        { type: "paragraph", content: [{ type: "text", text: "Not now." }] },
      ],
    };

    console.log("── posts: create + visibility isolation ──");
    const draftPost = await createPost({
      title: `${prefix}Draft Post`,
      bodyJson: bodyDraft as any,
      status: "draft",
      categoryId: catA.id,
      excerpt: "Draft excerpt",
    });
    created.posts.push(draftPost.id);
    const pubPost = await createPost({
      title: `${prefix}Published Post`,
      bodyJson: bodyPub as any,
      status: "published",
      categoryId: catA.id,
      publishedAt: mid,
      tagIds: [tagA.id, tagB.id],
    });
    created.posts.push(pubPost.id);
    const pub2 = await createPost({
      title: `${prefix}Second Published`,
      bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "second" }] }] } as any,
      status: "published",
      categoryId: catB.id,
      publishedAt: past,
    });
    created.posts.push(pub2.id);
    const sched = await createPost({
      title: `${prefix}Scheduled Post`,
      bodyJson: bodyScheduled as any,
      status: "scheduled",
      categoryId: catA.id,
      publishedAt: future,
    });
    created.posts.push(sched.id);
    const archived = await createPost({
      title: `${prefix}Archived Post`,
      bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "gone" }] }] } as any,
      status: "archived",
      categoryId: catA.id,
      publishedAt: past,
    });
    created.posts.push(archived.id);
    const hiddenFuture = await createPost({
      title: `${prefix}Published-but-future`,
      bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "future" }] }] } as any,
      status: "published",
      categoryId: catA.id,
      publishedAt: future,
    });
    created.posts.push(hiddenFuture.id);

    const pubPosts = await getPublishedPosts();
    const slugs = pubPosts.map((p) => p.slug);
    check("draft excluded from public", !slugs.includes(draftPost.slug));
    check("scheduled excluded from public", !slugs.includes(sched.slug));
    check("archived excluded from public", !slugs.includes(archived.slug));
    check("published-with-future-date excluded", !slugs.includes(hiddenFuture.slug));
    check("published included", slugs.includes(pubPost.slug) && slugs.includes(pub2.slug));
    check("public order by publishedAt desc", pubPosts.findIndex((p) => p.slug === pubPost.slug) < pubPosts.findIndex((p) => p.slug === pub2.slug));

    const draftBySlug = await getPublishedPostBySlug(draftPost.slug);
    check("draft unreachable by public slug lookup", draftBySlug === null);
    const pubBySlug = await getPublishedPostBySlug(pubPost.slug);
    check(
      "published reachable with relations",
      !!pubBySlug && pubBySlug.category?.slug === catA.slug && pubBySlug.tags.length === 2,
      `tags=${pubBySlug?.tags.length}`
    );

    const adminPosts = await getPostsForAdmin();
    check("admin sees all statuses", adminPosts.some((p) => p.slug === draftPost.slug));

    console.log("── posts: autosave version guard ──");
    const savedAt = (await getPostsForAdmin()).find((p) => p.id === pubPost.id)?.updatedAt;
    check("read updatedAt", savedAt instanceof Date);
    const patched = await updatePost(
      pubPost.id,
      { excerpt: "New published excerpt with secret meridian-shield" },
      { expectedUpdatedAt: savedAt }
    );
    check("update with fresh version ok", patched.excerpt?.includes("meridian-shield") === true);
    await expectError(
      "stale version rejected",
      () => updatePost(pubPost.id, { title: "stale clobber" }, { expectedUpdatedAt: new Date(savedAt!.getTime() - 60_000) }),
      PostConflictError
    );

    console.log("── posts: slug change → one-hop redirect ──");
    const renamed = await updatePost(pubPost.id, { title: `${prefix}Renamed Post` });
    oldSlug = pubPost.slug;
    check("slug actually changed", renamed.slug !== oldSlug);
    const hop = await resolveRedirect(`/${oldSlug}`);
    check("redirect recorded for old slug", hop?.targetPath === `/${renamed.slug}`, `target=${hop?.targetPath}`);
    const noHop = await resolveRedirect(`/${renamed.slug}`);
    check("target path has no redirect (no loops)", noHop === null || noHop.sourcePath !== `/${renamed.slug}`);

    console.log("── posts: adjacent + category counts ──");
    const adj = await getAdjacentPosts({ publishedAt: mid, status: "published", id: pubPost.id });
    check("adjacent prev exists", adj.prev?.id === pub2.id, `prev=${adj.prev?.slug}`);
    const counts = await getCategoriesWithCounts();
    const catAcount = counts.find((c) => c.id === catA.id)?.postCount ?? -1;
    check("category counts published only", catAcount === 1, `catAcount=${catAcount}`);

    console.log("── posts: featured + extended fields ──");
    const featuredSeed = await createPost({
      title: `${prefix}Featured Post`,
      bodyJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "featured" }] }] } as any,
      status: "published",
      categoryId: catA.id,
      publishedAt: new Date(now + 1),
      featured: true,
      affiliateDisclosure: true,
      seoTitle: `${prefix}SEO Title`,
      seoDescription: `${prefix}SEO Description`,
      canonicalUrl: "https://example.test/canon",
      ogImagePath: "/og.svg",
      noindex: true,
    });
    created.posts.push(featuredSeed.id);
    const hero = await getHeroPost();
    check("getHeroPost selects featured", hero?.id === featuredSeed.id, `got ${hero?.slug}/${hero?.featured}`);
    const ext = await getPostForAdmin(featuredSeed.id);
    check(
      "extended fields persisted",
      !!ext &&
        ext.seoTitle === `${prefix}SEO Title` &&
        ext.seoDescription === `${prefix}SEO Description` &&
        ext.canonicalUrl === "https://example.test/canon" &&
        ext.ogImagePath === "/og.svg" &&
        ext.noindex === true &&
        ext.affiliateDisclosure === true &&
        ext.featured === true,
      `seoTitle=${ext?.seoTitle} featured=${ext?.featured}`
    );
    const dupFeatured = await duplicatePost(featuredSeed.id);
    created.posts.push(dupFeatured.id);
    check(
      "duplicate keeps affiliate but never hero slot",
      dupFeatured.affiliateDisclosure === true &&
        dupFeatured.featured === false &&
        dupFeatured.status === "draft",
      `aff=${dupFeatured.affiliateDisclosure} feat=${dupFeatured.featured} status=${dupFeatured.status}`
    );
    const noIndex = await getPostsForAdmin();
    check(
      "admin read exposes noindex",
      noIndex.find((p) => p.id === featuredSeed.id)?.noindex === true
    );
    await updatePost(featuredSeed.id, { featured: false, noindex: false });
    const heroAfter = await getHeroPost();
    check("getHeroPost falls back to newest published", heroAfter?.status === "published", `got ${heroAfter?.slug}`);

    console.log("── search ──");
    const full = await searchPublishedPosts("meridian");
    check("fuzzy full-text finds published", full.results.some((r) => r.slug === renamed.slug), `results=${full.results.length}`);
    const none = await searchPublishedPosts("zzzq-nonexistent");
    check("no results for garbage", none.total === 0);
    // NOTE: under regconfig 'simple' (no stopwords) bare AND/OR/NOT are literal
    // terms, not operators; quoted + and - still work as real tsquery operators.
    const keyword = await searchPublishedPosts('"published" +"post"');
    check("tsquery operator filter works", keyword.total >= 1);
    const sub = await searchPublishedPostsBySubstring("Second"); 
    check("substring fallback works", sub.results.length >= 1);
    check("empty query returns nothing", (await searchPublishedPosts("  ")).total === 0);
    check("sanitize strips control chars", sanitizeSearchQuery("ab\u0000cd") === "ab cd");

    console.log("── media ──");
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      "base64"
    );
    const savedMedia = await saveUpload({ data: png, mimeType: "image/png", createdBy: null });
    created.media.push(savedMedia.id);
    check("media row created with dims", savedMedia.width === 1 && savedMedia.height === 1, `w=${savedMedia.width}`);
    check("media url path looks right", savedMedia.urlPath.startsWith("/uploads/"), savedMedia.urlPath);
    const listed = await listMedia();
    check("media listed", listed.some((m) => m.id === savedMedia.id));
    await expectError(
      "rejects non-image mime",
      () => saveUpload({ data: Buffer.from("<html></html>"), mimeType: "text/html" }),
      MediaValidationError
    );
    check(
      "validateMediaInput rejects svg",
      (() => {
        try {
          validateMediaInput(Buffer.from("x"), "image/svg+xml");
          return false;
        } catch {
          return true;
        }
      })()
    );

    console.log("── redirects service ──");
    const r1 = await createRedirect(`/${prefix}cat`, `/category/${catA.slug}`);
    created.redirects.push(r1.id);
    const res = await resolveRedirect(`/${prefix}cat`);
    check("resolve returns target", res?.targetPath === `/category/${catA.slug}`, `got ${res?.targetPath}`);
    await expectError(
      "refuses source===target",
      () => createRedirect("/dup/src", "/dup/src"),
      Error
    );
    check("normalize strips trailing slash", normalizeSourcePath("/foo/") === "/foo");
    check("normalize adds leading slash", normalizeSourcePath("foo/bar") === "/foo/bar");
    check("normalize keeps root", normalizeSourcePath("/") === "/");
    check("normalize strips query", normalizeSourcePath("/a?x=1") === "/a");

    console.log("── admin: duplicate + stats ──");
    const duped = await duplicatePost(pubPost.id);
    created.posts.push(duped.id);
    check(
      "duplicate has title prefix",
      duped.title === `Copy of ${renamed.title}`,
      `got ${duped.title}`
    );
    check(
      "duplicate slug suffixed -copy",
      duped.slug === `${renamed.slug}-copy`,
      `got ${duped.slug}`
    );
    check("duplicate forced to draft", duped.status === "draft");
    check("duplicate copies category+tags", duped.categoryId === pubPost.categoryId && duped.tags.length === 2, `tags=${duped.tags.length}`);
    const dupedAgain = await duplicatePost(pubPost.id);
    created.posts.push(dupedAgain.id);
    check("duplicate slug deduped on repeat", dupedAgain.slug !== duped.slug, `got ${dupedAgain.slug}`);

    const stats = await getAdminStats();
    check("stats total includes dups", stats.total >= created.posts.length, `total=${stats.total}`);
    check("stats byStatus draft >= 2 dups", stats.byStatus.draft >= 2, `draft=${stats.byStatus.draft}`);
    check(
      "stats published visible excludes future",
      stats.publishedVisible === (await countPublishedPosts()),
      `pv=${stats.publishedVisible}`
    );
    check("stats nextScheduled is the future post", stats.nextScheduled?.id === sched.id, `next=${stats.nextScheduled?.id}`);
    check("stats recent capped at 5", stats.recent.length <= 5, `recent=${stats.recent.length}`);

    console.log("── settings ──");
    const merged = mergeSettingsStored({ site_name: `${prefix}Name`, social_links: [{ label: prefix, url: `https://example.com/${prefix}` }] });
    const defs = defaultSiteSettings();
    check("merge overrides siteName", merged.siteName === `${prefix}Name`);
    check("merge keeps default tagline", merged.tagline === defs.tagline);
    check("merge keeps default og path null", merged.defaultOgImagePath === null);
    check("merge normalizes social links", merged.socialLinks.length === 1 && merged.socialLinks[0].url.startsWith("https://"));
    check("merge ignores empty text", mergeSettingsStored({ site_tagline: "   " }).tagline === defs.tagline);

    await updateSettings({ siteName: `${prefix}Name`, footerTagline: `${prefix}Footer` });
    const live = await getSettings();
    check("updateSettings persisted siteName", live.siteName === `${prefix}Name`, `got ${live.siteName}`);
    check("updateSettings persisted footerTagline", live.footerTagline === `${prefix}Footer`);
    check("others still default after partial update", live.authorName === defs.authorName && live.authorBio === defs.authorBio);

    console.log("── media count ──");
    const mediaCount = await countMedia();
    check("countMedia sees saved uploads", mediaCount >= 1, `count=${mediaCount}`);

    console.log("── body helpers ──");
    const idx = headingIndex(bodyPub as any);
    check("headingIndex finds heading", idx.length === 1 && idx[0].id === "public-post-title", idx[0]?.id);
    check(
      "extractPlainText captures code text",
      extractPlainText(bodyPub as any).includes("pnpm db:seed") === true
    );
    check(
      "deriveExcerpt truncates >220 chars",
      deriveExcerpt({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x".repeat(300) }] }] } as any).length <= 220
    );
    const rt = estimateReadingTime({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: (Array.from({ length: 500 }, () => "word")).join(" ") }] }] } as any);
    check("reading time plausible", rt >= 2 && rt <= 3, `rt=${rt}`);

    console.log("── cleanup ──");
  } finally {
    for (const id of created.posts) {
      await deletePost(id).catch(() => undefined);
    }
    for (const id of created.media) {
      await deleteMedia(id).catch(() => undefined);
    }
    for (const id of created.redirects) {
      await deleteRedirect(id).catch(() => undefined);
    }
    for (const id of created.tags) {
      await deleteTag(id).catch(() => undefined);
    }
    for (const id of created.categories) {
      await deleteCategory(id).catch(() => undefined);
    }
    // remove leftover redirect from slug-change test
    if (oldSlug) {
      const leftovers = await db.select().from(redirect).where(eq(redirect.sourcePath, `/${oldSlug}`)).catch(() => []);
      for (const lr of leftovers) await deleteRedirect(lr.id).catch(() => undefined);
    }
    // remove any settings rows created by this run
    const touchedKeys = [SETTINGS_KEYS.siteName, SETTINGS_KEYS.footerTagline];
    const touched = await db
      .select()
      .from(setting)
      .where(inArray(setting.key, touchedKeys))
      .catch(() => []);
    for (const row of touched) {
      const value = row.value as unknown;
      if (typeof value === "string" && value.startsWith(prefix)) {
        await db.delete(setting).where(eq(setting.key, row.key)).catch(() => undefined);
      }
    }
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} CHECK(S) FAILED: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\nAll service checks passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});