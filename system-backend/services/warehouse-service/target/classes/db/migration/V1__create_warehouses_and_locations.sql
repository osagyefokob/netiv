CREATE TABLE warehouses (
    warehouse_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(255) NOT NULL,
    street         VARCHAR(255),
    city           VARCHAR(100),
    country        VARCHAR(100),
    type           VARCHAR(30) NOT NULL CHECK (type IN ('MAIN','SATELLITE','TRANSIT','RETURNS')),
    capacity       INTEGER NOT NULL CHECK (capacity > 0),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    version        BIGINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE storage_locations (
    location_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    warehouse_id       UUID NOT NULL,
    zone               VARCHAR(10) NOT NULL,
    aisle              VARCHAR(10) NOT NULL,
    shelf              VARCHAR(10) NOT NULL,
    bin                VARCHAR(10) NOT NULL,
    location_code      VARCHAR(50) GENERATED ALWAYS AS (zone || '-' || aisle || '-' || shelf || '-' || bin) STORED,
    location_type      VARCHAR(20) NOT NULL DEFAULT 'PICK' CHECK (location_type IN ('BULK','PICK','OVERFLOW','QUARANTINE','RETURNS')),
    max_capacity       INTEGER NOT NULL CHECK (max_capacity > 0),
    current_occupancy  INTEGER NOT NULL DEFAULT 0 CHECK (current_occupancy >= 0),
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_location_warehouse FOREIGN KEY (warehouse_id) REFERENCES warehouses(warehouse_id),
    CONSTRAINT uq_location_code_warehouse UNIQUE (warehouse_id, zone, aisle, shelf, bin),
    CONSTRAINT chk_occupancy_lte_capacity CHECK (current_occupancy <= max_capacity)
);

CREATE INDEX idx_warehouse_active   ON warehouses(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_location_warehouse ON storage_locations(warehouse_id);
CREATE INDEX idx_location_code      ON storage_locations(location_code);
CREATE INDEX idx_location_available ON storage_locations(warehouse_id, current_occupancy) WHERE is_active = TRUE;
