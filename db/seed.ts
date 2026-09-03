import { config } from "dotenv";

async function main() {
  config({ path: ".env.local" });

  const [{ randomUUID }, { eq, inArray }, { hashPassword }, { createLocalAccountIssuer }] =
    await Promise.all([
      import("node:crypto"),
      import("drizzle-orm"),
      import("better-auth/crypto"),
      import("@better-auth/core/db"),
    ]);

  const [{ account, user, post: postTable }, { db }] = await Promise.all([
    import("@/db/schema"),
    import("@/lib/db"),
  ]);

  const { getOrCreateCategory, getOrCreateTag } = await import("@/lib/services/categories-tags");
  const { createPost } = await import("@/lib/services/posts");
  const { saveUpload } = await import("@/lib/services/media");

  const ownerEmail = (process.env.OWNER_EMAIL ?? "").trim().toLowerCase();
  if (!ownerEmail) {
    console.error("OWNER_EMAIL must be set in .env.local");
    process.exit(1);
  }

  /* ── Owner ─────────────────────────────────────────────── */
  let owner: { id: string } | undefined = (await db.select().from(user).where(eq(user.email, ownerEmail)))[0];

  if (!owner) {
    const bootstrapPassword = process.env.OWNER_BOOTSTRAP_PASSWORD ?? "";
    if (bootstrapPassword.length < 12) {
      console.error("OWNER_BOOTSTRAP_PASSWORD must be at least 12 characters when creating the owner.");
      process.exit(1);
    }
    const ownerId = randomUUID();
    const password = await hashPassword(bootstrapPassword);
    await db.insert(user).values({
      id: ownerId,
      name: "Owner",
      email: ownerEmail,
      emailVerified: true,
      isOwner: true,
      mustChangePassword: true,
    });
    await db.insert(account).values({
      id: randomUUID(),
      accountId: ownerId,
      providerId: "credential",
      issuer: createLocalAccountIssuer("credential"),
      userId: ownerId,
      password,
    });
    owner = { id: ownerId };
    console.log(`Owner created: ${ownerEmail} (forced password change on first login).`);
  } else {
    await db.update(user).set({ isOwner: true }).where(eq(user.id, owner.id));
    console.log(`Owner present: ${ownerEmail}`);
  }

  await db.update(user).set({ name: "Alex Chen" }).where(eq(user.id, owner.id));

  /* ── Categories + tags ─────────────────────────────────── */
  const categories: Array<[string, string]> = [
    ["Engineering", "Systems, languages, and the craft of building software."],
    ["Design", "Interfaces, typography, and visual decisions."],
    ["Essays", "Long-form writing about software and the people who make it."],
    ["Guides", "Step-by-step writeups you can follow to the letter."],
    ["Tools", "The utilities and workflows we reach for every day."],
    ["News", "Announcements and short updates."],
  ];
  const categoryRels = new Map<string, { id: string; name: string; slug: string }>();
  for (const [name, description] of categories) {
    const row = await getOrCreateCategory(name, description);
    categoryRels.set(name, { id: row.id, name: row.name, slug: row.slug });
  }

  const tagNames = ["TypeScript", "Bash", "React", "Performance", "Clean Code", "Workflow", "Opinion", "Learning", "Visual Design", "Remote Work"];
  const tagRels = new Map<string, { id: string; name: string; slug: string }>();
  for (const name of tagNames) {
    const row = await getOrCreateTag(name);
    tagRels.set(name, { id: row.id, name: row.name, slug: row.slug });
  }

  console.log(`Categories ensured (${categories.length}); tags ensured (${tagNames.length}).`);

  /* ── Posts (idempotent by slug) ────────────────────────── */
  const slugs = {
    tooling: "rethinking-typescript-tooling-on-the-command-line",
    unnoticeable: "the-best-software-is-the-software-you-never-notice",
    brutalist: "brutalist-interfaces-and-the-beauty-of-the-unpolished",
  };
  const existing = (
    await db
      .select({ slug: postTable.slug })
      .from(postTable)
      .where(inArray(postTable.slug, [slugs.tooling, slugs.unnoticeable, slugs.brutalist]))
  ).map((r) => r.slug);
  const missing = new Set([slugs.tooling, slugs.unnoticeable, slugs.brutalist].filter((s) => !existing.includes(s)));

  /* ── Images for the image-rich post (only when post is missing) ── */
  async function makePng(width: number, height: number, color: { r: number; g: number; b: number }): Promise<Buffer> {
    const { default: sharp } = await import("sharp");
    return sharp({ create: { width, height, channels: 3, background: color } }).png().toBuffer();
  }

  let featured = null;
  let inlineShot = null;
  if (missing.has(slugs.brutalist)) {
    try {
      featured = await saveUpload({
        data: await makePng(1200, 800, { r: 226, g: 232, b: 240 }),
        mimeType: "image/png",
        createdBy: owner.id,
      });
      inlineShot = await saveUpload({
        data: await makePng(900, 600, { r: 30, g: 42, b: 60 }),
        mimeType: "image/png",
        createdBy: owner.id,
      });
      console.log(`Media seeded: ${featured.urlPath}, ${inlineShot.urlPath}`);
    } catch (error) {
      console.warn("Image generation skipped:", error);
    }
  }

  const tagIdFor = (name: string) => tagRels.get(name)!.id;
  const catIdFor = (name: string) => categoryRels.get(name)!.id;

  if (missing.has(slugs.tooling)) {
    await createPost({
      title: "Rethinking TypeScript Tooling on the Command Line",
      slug: slugs.tooling,
      status: "published",
      publishedAt: new Date("2026-08-18T09:00:00Z"),
      categoryId: catIdFor("Engineering"),
      tagIds: [tagIdFor("TypeScript"), tagIdFor("Bash"), tagIdFor("Workflow")],
      authorId: owner.id,
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "It is easy to forget that TypeScript ships without a single official CLI. The compiler is a JavaScript library first, and everything else — ts-node, tsx, esbuild, ripgrep — grew up around it. After a recent cleanup of an old monorepo, I realized the command line had quietly become the place where all of my favorite TypeScript decisions actually live." },
            ],
          },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Compile first, ask questions later" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Type-checking on save has saved me more time than any formatter. The trick is to make the check fast enough that you never think about it:" },
            ],
          },
          {
            type: "codeBlock",
            attrs: { language: "typescript" },
            content: [
              {
                type: "text",
                text: "const watch = () => {\n  const chokidar = require('chokidar');\n  const watcher = chokidar.watch('src', { ignoreInitial: true });\n  watcher.on('change', () => runTypecheck());\n};\n\nfunction runTypecheck() {\n  execSync('tsc --noEmit --incremental', { stdio: 'inherit' });\n}",
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Add that loop to your dev script and keep the terminal open on a second monitor. You will catch a full class of bugs before the browser ever sees them." },
            ],
          },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "The shell can still be the UI" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Not every tool deserves a dashboard. A short shell function turns a repetitive job into a single keystroke:" },
            ],
          },
          {
            type: "codeBlock",
            attrs: { language: "bash" },
            content: [
              { type: "text", text: "check() {\n  pnpm tsc --noEmit && echo 'ok' || echo 'fix the types'\n}" },
            ],
          },
          { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "What changes immediately" }] },
          {
            type: "bulletList",
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Feedback drops from minutes to milliseconds." }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "CI type-checks become an afterthought, not a bottleneck." }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Incremental builds keep the pinwheel spinning instead of freezing the editor." }] }] },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Your editor already knows. The details of " },
              { type: "text", text: "tsc --incremental", marks: [{ type: "code" }] },
              { type: "text", text: " are worth knowing anyway — the command line, unlike an extension, is a contract you can take anywhere." },
            ],
          },
        ],
      } as never,
    });
    console.log(`Post seeded: ${slugs.tooling}`);
  } else {
    console.log(`Post present: ${slugs.tooling}`);
  }

  if (missing.has(slugs.unnoticeable)) {
    await createPost({
      title: "The Best Software Is the Software You Never Notice",
      slug: slugs.unnoticeable,
      status: "published",
      publishedAt: new Date("2026-08-25T08:00:00Z"),
      categoryId: catIdFor("Essays"),
      tagIds: [tagIdFor("Opinion"), tagIdFor("Clean Code"), tagIdFor("Learning")],
      authorId: owner.id,
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Nobody writes a blog post praising a database migration. Nobody screenshots a good ORM. The software that gets talked about is the software that announces itself — the splash screen, the shimmering dashboard, the deploy confetti. The software that gets used for twenty years is the software that stays out of the way." },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "Good tools are quiet. Loud tools are asking you to forgive their lack of quietness." },
                ],
              },
            ],
          },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Invisibility is a feature" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "The best libraries tend to have the smallest diff to your mental model. They accept what you have, do the obvious thing, and leave the same trace a handshake leaves — none at all. Notice the tools you stopped noticing: the HTTP client you no longer read the docs for, the router that never throws, the formatter you forgot you installed. That is not boredom. That is engineering." },
            ],
          },
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What quiet costs" }] },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Quiet software is rarely an accident. It takes discipline to remove the fourth option, to ship the boring API, to refuse the config key someone will ask for next Tuesday. Invisibility is bought with judgment, and judgment is the most expensive thing a team produces." },
            ],
          },
          {
            type: "blockquote",
            content: [
              {
                type: "paragraph",
                content: [
                  { type: "text", text: "The sign of a great interface is that you cannot describe it, only complain when it is missing." },
                ],
              },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "If you run a service that people rely on, ask the unfashionable question: is the day people stop mentioning you the day you have won? If the answer is " },
              { type: "text", text: "yes, because it just works", marks: [{ type: "italic" }] },
              { type: "text", text: ", keep working." },
            ],
          },
        ],
      } as never,
    });
    console.log(`Post seeded: ${slugs.unnoticeable}`);
  } else {
    console.log(`Post present: ${slugs.unnoticeable}`);
  }

  if (missing.has(slugs.brutalist)) {
    await createPost({
      title: "Brutalist Interfaces and the Beauty of the Unpolished",
      slug: slugs.brutalist,
      status: "published",
      publishedAt: new Date("2026-08-28T07:00:00Z"),
      categoryId: catIdFor("Design"),
      tagIds: [tagIdFor("Visual Design"), tagIdFor("Learning")],
      authorId: owner.id,
      featuredImagePath: featured?.urlPath ?? null,
      featuredImageAlt: "A calm, high-contrast placeholder gradient by Meridian.",
      bodyJson: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Brutalism in interface design is less about concrete than about honesty: visible grid, hard edges, no gradient marketing. Done well, it reads as confidence; done badly, as a filing cabinet. The line between the two is intent." },
            ],
          },
          ...(inlineShot
            ? [
                {
                  type: "image",
                  attrs: { src: inlineShot.urlPath, alt: "An example of a stark, unpolished layout.", title: "Perimeter lines, direct color, no decoration." },
                },
              ]
            : []),
          { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Three rules that hold" }] },
          {
            type: "orderedList",
            content: [
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Every element must earn its border." }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Hierarchy comes from scale, not from shadow." }] }] },
              { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Never apologize for whitespace." }] }] },
            ],
          },
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Brutalism is a speed run towards the content. When every ornament is gone, what remains is the information and the decisions behind it. That is a flattering thing to be remembered for." },
            ],
          },
        ],
      } as never,
    });
    console.log(`Post seeded: ${slugs.brutalist}`);
  } else {
    console.log(`Post present: ${slugs.brutalist}`);
  }

  const posts = await db.select({ slug: postTable.slug }).from(postTable);
  console.log(`Seed complete. Total posts: ${posts.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});