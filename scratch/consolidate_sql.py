import os

migrations_dir = 'supabase/migrations'
output_file = 'supabase/production_schema.sql'

# List files and sort them (numerical/alphabetical order)
files = sorted([f for f in os.listdir(migrations_dir) if f.endswith('.sql')])

# Seeds to skip
seeds = ['01_seed_data.sql', '02_seed_teacher.sql', '04_seed_admin.sql']

with open(output_file, 'w') as outfile:
    outfile.write("-- GrooveLab Production Schema\n")
    outfile.write("-- Generated on 2026-05-11\n\n")
    
    for filename in files:
        if filename in seeds:
            print(f"Skipping seed file: {filename}")
            continue
            
        print(f"Adding migration: {filename}")
        outfile.write(f"-- START: {filename}\n")
        with open(os.path.join(migrations_dir, filename), 'r') as infile:
            outfile.write(infile.read())
        outfile.write(f"\n-- END: {filename}\n\n")

print(f"\nSuccessfully created {output_file}")
