CREATE TABLE "crawl_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer,
	"address" varchar NOT NULL,
	"site_id" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"crawled_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_crawl_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"site_id" varchar(50) NOT NULL,
	"raw_html" text,
	"raw_data" jsonb,
	"crawled_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "data_source" varchar(20);--> statement-breakpoint
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_crawl_data" ADD CONSTRAINT "site_crawl_data_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "site_crawl_data_property_site_idx" ON "site_crawl_data" USING btree ("property_id","site_id");