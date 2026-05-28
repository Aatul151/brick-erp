CREATE TYPE "public"."permission_action" AS ENUM('create', 'read', 'update', 'delete', 'menu');--> statement-breakpoint
CREATE TYPE "public"."role_scope" AS ENUM('global', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"tenant_id" uuid,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100),
	"resource_id" varchar(100),
	"details" text,
	"ip_address" varchar(45),
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"icon" varchar(50),
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "modules_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"resource_name" varchar(100) NOT NULL,
	"action" "permission_action" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"scope" "role_scope" DEFAULT 'tenant' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subdomain" varchar(100),
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"theme_setting" jsonb,
	"settings" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid,
	"email" varchar(255) NOT NULL,
	"mobile" varchar(20),
	"password_hash" text NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "form_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"title" varchar(500) NOT NULL,
	"form_type" varchar(20) DEFAULT 'custom' NOT NULL,
	"collection_name" varchar(200),
	"sections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_definition_id" uuid NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_uploaded_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"form_name" varchar(200) NOT NULL,
	"field_name" varchar(200) NOT NULL,
	"public_id" varchar(20) NOT NULL,
	"storage_path" varchar(1000) NOT NULL,
	"original_name" varchar(500) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"mime_type" varchar(200),
	"size" integer,
	"uploaded_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_uploaded_files_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "master_form_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"form_name" varchar(200) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" integer,
	"updated_by" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "labours" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"account_name" varchar(250),
	"labour_code" varchar(50),
	"labour_type" varchar(100),
	"full_name" varchar(250) NOT NULL,
	"mobile_number" varchar(20),
	"mobile_number2" varchar(20),
	"gender" varchar(20) DEFAULT 'male',
	"address" varchar(1000),
	"aadhaar_number" varchar(30),
	"default_rate" numeric(15, 2),
	"brick_builder_rate" numeric(15, 2),
	"brick_mover_rate" numeric(15, 2),
	"sapa_rate" numeric(15, 2),
	"roj_rate" numeric(15, 2),
	"account" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"remark" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "labours_id_pk" PRIMARY KEY("id")
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"labour_id" uuid,
	"account_name" varchar(250),
	"category_name" varchar(250),
	"record_type" varchar(250) NOT NULL,
	"value" numeric(15, 2),
	"record_unit" varchar(15),
	"entry_date" date NOT NULL,
	"entry_time" time,
	"year" integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM entry_date)::integer) STORED,
	"month" integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM entry_date)::integer) STORED,
	"account" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"category" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"label" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"remark" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "records_id_entry_date_pk" PRIMARY KEY("id","entry_date")
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_form_definition_id_form_definitions_id_fk" FOREIGN KEY ("form_definition_id") REFERENCES "public"."form_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_uploaded_files" ADD CONSTRAINT "form_uploaded_files_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_uploaded_files" ADD CONSTRAINT "form_uploaded_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_form_entries" ADD CONSTRAINT "master_form_entries_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "master_form_entries" ADD CONSTRAINT "master_form_entries_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labours" ADD CONSTRAINT "labours_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labours" ADD CONSTRAINT "labours_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "labours" ADD CONSTRAINT "labours_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_labour_id_labours_id_fk" FOREIGN KEY ("labour_id") REFERENCES "public"."labours"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "records" ADD CONSTRAINT "records_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_user_idx" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "audit_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_timestamp_idx" ON "audit_logs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "audit_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "module_slug_idx" ON "modules" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "module_active_idx" ON "modules" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_token_idx" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_resource_action_idx" ON "permissions" USING btree ("resource_name","action");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_token_idx" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refresh_token_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_permission_idx" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "rp_role_idx" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "rp_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_name_idx" ON "roles" USING btree ("name");--> statement-breakpoint
CREATE INDEX "role_scope_idx" ON "roles" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "tenant_status_idx" ON "tenants" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_subdomain_idx" ON "tenants" USING btree ("subdomain");--> statement-breakpoint
CREATE UNIQUE INDEX "user_role_idx" ON "user_roles" USING btree ("user_id","role_id");--> statement-breakpoint
CREATE INDEX "ur_user_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ur_role_idx" ON "user_roles" USING btree ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "user_mobile_idx" ON "users" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX "user_tenant_idx" ON "users" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "user_status_idx" ON "users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "form_def_tenant_name_uidx" ON "form_definitions" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE INDEX "form_def_tenant_idx" ON "form_definitions" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "form_entries_tenant_form_created_idx" ON "form_entries" USING btree ("tenant_id","form_definition_id","created_at");--> statement-breakpoint
CREATE INDEX "form_entries_payload_gin_idx" ON "form_entries" USING gin ("payload");--> statement-breakpoint
CREATE INDEX "form_upload_tenant_idx" ON "form_uploaded_files" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "master_form_entries_form_created_idx" ON "master_form_entries" USING btree ("form_name","created_at");--> statement-breakpoint
CREATE INDEX "master_form_entries_payload_gin_idx" ON "master_form_entries" USING gin ("payload");--> statement-breakpoint
CREATE INDEX "labours_tenant_idx" ON "labours" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "labours_tenant_code_idx" ON "labours" USING btree ("tenant_id","labour_code");--> statement-breakpoint
CREATE INDEX "labours_tenant_type_idx" ON "labours" USING btree ("tenant_id","labour_type");--> statement-breakpoint
CREATE INDEX "records_tenant_entry_idx" ON "records" USING btree ("tenant_id","entry_date");--> statement-breakpoint
CREATE INDEX "records_tenant_type_idx" ON "records" USING btree ("tenant_id","record_type");--> statement-breakpoint
CREATE INDEX "records_tenant_labour_date_idx" ON "records" USING btree ("tenant_id","labour_id","entry_date");--> statement-breakpoint
CREATE INDEX "records_tenant_labour_type_idx" ON "records" USING btree ("tenant_id","labour_id","record_type");