ALTER TABLE "post" ADD COLUMN "featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "affiliate_disclosure" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "canonical_url" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "og_image_path" text;--> statement-breakpoint
ALTER TABLE "post" ADD COLUMN "noindex" boolean DEFAULT false NOT NULL;