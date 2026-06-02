-- Automatically create corresponding subjects for teacher instruments
DO $$
DECLARE
    t_rec RECORD;
    inst_name TEXT;
    exist_id UUID;
BEGIN
    FOR t_rec IN 
        SELECT DISTINCT school_id, regexp_split_to_table(instrument, '[\/,;]+') AS raw_inst 
        FROM users 
        WHERE role = 'teacher' AND instrument IS NOT NULL AND instrument <> ''
    LOOP
        inst_name := trim(t_rec.raw_inst);
        IF inst_name <> '' THEN
            -- Check if a subject with this name exists for this school_id
            SELECT id INTO exist_id 
            FROM subjects 
            WHERE school_id = t_rec.school_id AND lower(name) = lower(inst_name);
            
            IF exist_id IS NULL THEN
                INSERT INTO subjects (school_id, name, description, category, is_active)
                VALUES (t_rec.school_id, inst_name, NULL, 'Allgemein', true);
            END IF;
        END IF;
    END LOOP;
END $$;
