-- Add parcel identifiers
ALTER TABLE "properties" ADD COLUMN "map" varchar(5);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "grid" varchar(5);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "parcel" varchar(5);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "section" varchar(5);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "block" varchar(5);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "lot" varchar(5);--> statement-breakpoint
-- Add owner mailing address
ALTER TABLE "properties" ADD COLUMN "owner_address_1" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "owner_address_2" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "owner_city" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "owner_state" varchar(2);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "owner_zip" varchar(5);--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "owner_zip2" varchar(4);--> statement-breakpoint
-- Add construction info
ALTER TABLE "properties" ADD COLUMN "construction_material" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "construction_grade" varchar;--> statement-breakpoint
-- Add deed references
ALTER TABLE "properties" ADD COLUMN "deed_liber" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "deed_folio" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "grantor_liber" varchar;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "grantor_folio" varchar;--> statement-breakpoint
-- Add mortgage
ALTER TABLE "properties" ADD COLUMN "mortgage_amount" integer;--> statement-breakpoint
-- Add homestead
ALTER TABLE "properties" ADD COLUMN "homestead_status" boolean;--> statement-breakpoint
ALTER TABLE "properties" ADD COLUMN "homestead_date" varchar(10);--> statement-breakpoint
-- Recreate staging_parcels with all columns (UNLOGGED, safe to drop)
DROP TABLE IF EXISTS "staging_parcels";--> statement-breakpoint
CREATE UNLOGGED TABLE "staging_parcels" (
	"row_num" serial PRIMARY KEY NOT NULL,
	"address" varchar NOT NULL,
	"city" varchar,
	"zip_code" varchar(10),
	"county" varchar,
	"owner_name_1" varchar,
	"owner_name_2" varchar,
	"property_type" varchar,
	"year_built" integer,
	"square_footage" integer,
	"land_area" numeric(14, 4),
	"land_unit" varchar(2),
	"bldg_story" numeric(5, 1),
	"desc_style" varchar,
	"ooi" varchar(2),
	"legal1" varchar,
	"legal2" varchar,
	"legal3" varchar,
	"zoning" varchar,
	"assessor_id" varchar,
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"sale_date" varchar(10),
	"sale_price" integer,
	"seller" varchar,
	"document_type" varchar,
	"nfm_land_value" numeric(12, 2),
	"nfm_improvement_value" numeric(12, 2),
	"nfm_total_value" numeric(12, 2),
	"subdivision" varchar,
	"map" varchar(5),
	"grid" varchar(5),
	"parcel" varchar(5),
	"section" varchar(5),
	"block" varchar(5),
	"lot" varchar(5),
	"owner_address_1" varchar,
	"owner_address_2" varchar,
	"owner_city" varchar,
	"owner_state" varchar(2),
	"owner_zip" varchar(5),
	"owner_zip2" varchar(4),
	"construction_material" varchar,
	"construction_grade" varchar,
	"deed_liber" varchar,
	"deed_folio" varchar,
	"grantor_liber" varchar,
	"grantor_folio" varchar,
	"mortgage_amount" integer,
	"homestead_code" varchar(1),
	"homestead_date" varchar(10),
	"raw_data" jsonb
);
