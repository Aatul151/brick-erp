CREATE TABLE IF NOT EXISTS public.records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    account_name varchar(250),
    category_name varchar(250),
    record_type varchar(250) NOT NULL,
    value numeric(15, 2),
    record_unit varchar(15),
    entry_date date NOT NULL,
    entry_time time without time zone,
    year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM entry_date)::integer) STORED,
    month integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM entry_date)::integer) STORED,
    account jsonb NOT NULL DEFAULT '{}'::jsonb,
    category jsonb NOT NULL DEFAULT '{}'::jsonb,
    label jsonb NOT NULL DEFAULT '{}'::jsonb,
    remark varchar(1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer REFERENCES public.users (id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by integer REFERENCES public.users (id) ON DELETE SET NULL,
    CONSTRAINT records_pkey PRIMARY KEY (id, entry_date),
    CONSTRAINT records_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants (id) ON DELETE CASCADE
) PARTITION BY RANGE (entry_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_tenant_entry_idx ON public.records (tenant_id, entry_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS records_tenant_type_idx ON public.records (tenant_id, record_type);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public."records_2026_H1" PARTITION OF public.records FOR VALUES FROM ('2026-01-01') TO ('2026-07-01');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS public."records_2026_H2" PARTITION OF public.records FOR VALUES FROM ('2026-07-01') TO ('2027-01-01');
