CREATE TABLE records (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL,
    labour_id uuid,
    account_name varchar(250),
    category_name varchar(250),
    record_type varchar(250) NOT NULL,
    value decimal(15,2),
    record_unit varchar(15),
    entry_date date NOT NULL,
    entry_time time,
    year integer GENERATED ALWAYS AS (EXTRACT(YEAR FROM entry_date)::integer) STORED,
    month integer GENERATED ALWAYS AS (EXTRACT(MONTH FROM entry_date)::integer) STORED,
    account jsonb NOT NULL DEFAULT '{}'::jsonb,
    category jsonb NOT NULL DEFAULT '{}'::jsonb,
    label jsonb NOT NULL DEFAULT '{}'::jsonb,
    remark varchar(1000),
    created_at timestamptz NOT NULL DEFAULT now(),
    created_by integer,
    updated_at timestamptz NOT NULL DEFAULT now(),
    updated_by integer,

    PRIMARY KEY (id, entry_date)
) PARTITION BY RANGE (entry_date);