-- 4. Change Requests (CRs)
CREATE TABLE change_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cr_number       VARCHAR(32)  NOT NULL UNIQUE,
    title           VARCHAR(255) NOT NULL,
    owner_name      VARCHAR(120) NOT NULL,
    scheduled_date  DATE         NOT NULL,
    window_start    TIMESTAMPTZ  NOT NULL,
    window_end      TIMESTAMPTZ  NOT NULL,
    execution_mode  VARCHAR(32)  NOT NULL DEFAULT 'SINGLE_CLICK', -- MANUAL, SINGLE_CLICK
    status          VARCHAR(32)  NOT NULL DEFAULT 'PLANNED',      -- PLANNED, IN_PROGRESS, COMPLETED, FAILED
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 5. CR Node Execution State Tracking (Pre-Check -> Upgrade -> Post-Check)
CREATE TABLE cr_node_executions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cr_id               UUID        NOT NULL REFERENCES change_requests(id) ON DELETE CASCADE,
    node_id             UUID        NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT,
    from_version        VARCHAR(64) NOT NULL,
    to_version          VARCHAR(64) NOT NULL,
    pre_check_status    VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, PASS, FAIL
    upgrade_status      VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, PASS, FAIL, BLOCKED
    post_check_status   VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, PASS, FAIL, BLOCKED
    version             BIGINT      NOT NULL DEFAULT 0,         -- Optimistic Locking (@Version)
    updated_by          VARCHAR(120),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_cr_node UNIQUE (cr_id, node_id)
);

-- 6. Service Requests (SR Tracking)
CREATE TABLE service_requests (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sr_number         VARCHAR(32)  NOT NULL UNIQUE,
    cr_id             UUID         NOT NULL REFERENCES change_requests(id) ON DELETE RESTRICT,
    node_id           UUID         NOT NULL REFERENCES nodes(id) ON DELETE RESTRICT,
    severity          VARCHAR(8)   NOT NULL, -- S1, S2, S3, S4
    summary           VARCHAR(500) NOT NULL,
    exit_code         VARCHAR(64),
    status            VARCHAR(32)  NOT NULL DEFAULT 'OPEN', -- OPEN, INVESTIGATING, RESOLVED, CLOSED
    assigned_engineer VARCHAR(120) NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- 7. Immutable Audit Trail
CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type     VARCHAR(32)  NOT NULL, -- CR, NODE_EXECUTION, SR
    entity_id       UUID         NOT NULL,
    action          VARCHAR(64)  NOT NULL,
    previous_state  TEXT,
    new_state       TEXT,
    reason          TEXT,
    performed_by    VARCHAR(120) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Composite Indexes for Calendar, Planner Grid & Dashboard Analytics
CREATE INDEX idx_cr_sched_status ON change_requests(scheduled_date, status);
CREATE INDEX idx_exec_cr_id ON cr_node_executions(cr_id);
CREATE INDEX idx_exec_node_id ON cr_node_executions(node_id);
CREATE INDEX idx_sr_status_severity ON service_requests(status, severity);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);