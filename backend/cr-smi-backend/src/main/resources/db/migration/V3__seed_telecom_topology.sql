-- Seed Site: Andhra Pradesh (South)
INSERT INTO sites (id, site_code, site_name, region, nso) VALUES
    ('11111111-1111-1111-1111-111111111101', 'ANP', 'Andhra Pradesh', 'South', 'nso123');

-- Seed Rack: APCP0100 (SMFs Upgrade)
INSERT INTO racks (id, site_id, rack_name, description) VALUES
    ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 'APCP0100', 'SMFs Upgrade');

-- Seed Node: APSMFI21 (SMF)
INSERT INTO nodes (id, rack_id, node_name, node_type, platform, current_version, target_version) VALUES
    ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'APSMFI21', 'SMF', 'SMI', '2024.02.1', '2026.01.0');