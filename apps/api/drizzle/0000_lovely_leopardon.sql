CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"rentcast_id" varchar,
	"address" varchar NOT NULL,
	"formatted_address" varchar,
	"city" varchar,
	"state" varchar(2),
	"zip_code" varchar(10),
	"county" varchar,
	"neighborhood" varchar,
	"subdivision" varchar,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"property_type" varchar,
	"year_built" integer,
	"square_footage" integer,
	"lot_size" integer,
	"bedrooms" integer,
	"bathrooms" numeric(4, 1),
	"stories" integer,
	"basement" varchar,
	"garage_spaces" integer,
	"last_sale_date" varchar,
	"last_sale_price" integer,
	"owner_names" varchar,
	"owner_occupied" boolean,
	"hoa_fee" numeric(10, 2),
	"zoning" varchar,
	"assessor_id" varchar,
	"legal_description" text,
	"features" jsonb,
	"raw_response" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp,
	"access_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_taxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"year" integer NOT NULL,
	"total" numeric(12, 2)
);
--> statement-breakpoint
CREATE TABLE "sale_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"sale_date" varchar,
	"sale_price" integer,
	"buyer" varchar,
	"seller" varchar,
	"document_type" varchar,
	"recording_date" varchar
);
--> statement-breakpoint
CREATE TABLE "tax_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"property_id" integer NOT NULL,
	"year" integer NOT NULL,
	"land_value" numeric(12, 2),
	"improvement_value" numeric(12, 2),
	"total_value" numeric(12, 2)
);
--> statement-breakpoint
ALTER TABLE "property_taxes" ADD CONSTRAINT "property_taxes_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_history" ADD CONSTRAINT "sale_history_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "properties_address_idx" ON "properties" USING btree ("address");--> statement-breakpoint
CREATE UNIQUE INDEX "property_taxes_property_year_idx" ON "property_taxes" USING btree ("property_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "tax_assessments_property_year_idx" ON "tax_assessments" USING btree ("property_id","year");