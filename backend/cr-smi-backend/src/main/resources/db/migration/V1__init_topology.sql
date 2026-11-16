CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Sites
CREATE TABLE sites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_code   VARCHAR(32)  NOT NULL UNIQUE,
    site_name   VARCHAR(120) NOT NULL,
    region      VARCHAR(64)  NOT NULL,
    nso         VARCHAR(120) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 2. Racks
CREATE TABLE racks (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id     UUID        NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    rack_name   VARCHAR(32) NOT NULL,
    description VARCHAR(255),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_rack_per_site UNIQUE (site_id, rack_name)
);

-- 3. Nodes
CREATE TABLE nodes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rack_id         UUID         NOT NULL REFERENCES racks(id) ON DELETE RESTRICT,
    node_name        VARCHAR(120) NOT NULL UNIQUE,
    node_type       VARCHAR(32)  NOT NULL,
    platform        VARCHAR(32)  NOT NULL DEFAULT 'CNDP',
    current_version VARCHAR(64)  NOT NULL,
    target_version  VARCHAR(64),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_racks_site_id ON racks(site_id);
CREATE INDEX idx_nodes_rack_id ON nodes(rack_id);
CREATE INDEX idx_nodes_type ON nodes(node_type);