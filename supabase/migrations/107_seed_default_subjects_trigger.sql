-- Automatically seed 'Allgemein' subject when a new school is created
CREATE OR REPLACE FUNCTION public.seed_default_subjects()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.subjects (school_id, name, description, category, is_active)
    VALUES (NEW.id, 'Allgemein', 'Standard-Unterrichtsfach', 'Allgemein', true);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_seed_default_subjects
AFTER INSERT ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.seed_default_subjects();
