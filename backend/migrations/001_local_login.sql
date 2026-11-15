-- Upgrade an existing local development database without replacing its accounts.
-- Existing accounts need passwords assigned separately before they can log in.
BEGIN;
ALTER TABLE account ADD COLUMN IF NOT EXISTS passwords VARCHAR(255);

-- Match the test administrator in database.sql; never overwrite an existing ID.
INSERT INTO account (
    student_id, first_name, last_name, email, passwords, acc_role,
    department, ethnicity, age, student_level, is_international,
    is_first_generation, approved, expire_date
) VALUES (
    'A001', 'John', 'Smith', 'john.smith@example.com', 'admin123', 'admin',
    'Information Technology', 'Asian', 35, NULL, FALSE,
    FALSE, 'approved', '2027-12-31 23:59:59+00'
) ON CONFLICT DO NOTHING;
COMMIT;
