-- Migration 68: Disable Row Level Security on rooms and stations tables to allow MVP client operations
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE stations DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE rooms TO anon, authenticated, service_role;
GRANT ALL ON TABLE stations TO anon, authenticated, service_role;
