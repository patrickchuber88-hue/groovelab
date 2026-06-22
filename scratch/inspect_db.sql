-- Find admins and their ausweis_nummer values
SELECT id, role, first_name, last_name, ausweis_nummer 
FROM public.users 
WHERE role = 'admin';
