-- Entity Tables
CREATE TABLE IF NOT EXISTS account (
    student_id VARCHAR(30) PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    acc_role VARCHAR(30) NOT NULL
        CHECK(acc_role IN ('admin', 'staff', 'dean', 'student')),
    department VARCHAR(150),
    ethnicity VARCHAR(100),
    age INTEGER CHECK (age IS NULL OR age >= 0),
    student_level VARCHAR(20)
        CHECK (student_level IN ('undergraduate', 'graduate')),
    is_international BOOLEAN,
    is_first_generation BOOLEAN,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (approved IN ('pending', 'approved', 'rejected')),
    expire_date TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS groups (
    organization_id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    organization_type VARCHAR(30) NOT NULL
        CHECK (organization_type IN (
            'student_org', 'office', 'service'
        ))
);

CREATE TABLE IF NOT EXISTS meetings (
    meeting_id VARCHAR(30) PRIMARY KEY,
    organization_id VARCHAR(30) NOT NULL
        REFERENCES groups(organization_id),
    meeting_name VARCHAR(200) NOT NULL,
    event_type VARCHAR(30) NOT NULL
        CHECK (event_type IN (
            'meeting', 'workshop', 'service', 'other'
        )),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    duration NUMERIC(6,2)
        CHECK (duration IS NULL OR duration >= 0),
    food_lb DECIMAL,
    loc VARCHAR(100) NOT NULL,
    CHECK (ends_at IS NULL OR ends_at >= starts_at)
);

CREATE TABLE IF NOT EXISTS files (
    file_name VARCHAR(255) PRIMARY KEY,
    contents BYTEA,
    up_dte TIMESTAMPTZ
);

-- Relation Tables

CREATE TABLE IF NOT EXISTS part_of (
    student_id VARCHAR(30) NOT NULL
        REFERENCES account(student_id)
        ON DELETE CASCADE,
    organization_id VARCHAR(30) NOT NULL
        REFERENCES groups(organization_id)
        ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (student_id, organization_id)
);

CREATE TABLE IF NOT EXISTS attends (
    student_id VARCHAR(30) NOT NULL
        REFERENCES account(student_id)
        ON DELETE CASCADE,
    meeting_id VARCHAR(30) NOT NULL
        REFERENCES meetings(meeting_id)
        ON DELETE CASCADE,
    attendance_status VARCHAR(20) NOT NULL DEFAULT 'registered'
        CHECK (attendance_status IN (
            'registered', 'attended', 'absent', 'cancelled'
        )),

    PRIMARY KEY (student_id, meeting_id)
);

CREATE TABLE IF NOT EXISTS transfers (
    transfer_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sender_id VARCHAR(30) NOT NULL
        REFERENCES account(student_id)
        ON DELETE RESTRICT,
    recipient_id VARCHAR(30) NOT NULL
        REFERENCES account(student_id)
        ON DELETE RESTRICT,
    file_name VARCHAR(255) NOT NULL
        REFERENCES files(file_name)
        ON DELETE RESTRICT,
    transferred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (sender_id <> recipient_id)
);

-- Test insertion into tables, not including file imports
-- 1. Accounts
INSERT INTO account (
    student_id,
    first_name,
    last_name,
    email,
    acc_role,
    department,
    ethnicity,
    age,
    student_level,
    is_international,
    is_first_generation,
    approved,
    expire_date
)
VALUES
(
    'A001',
    'John',
    'Smith',
    'john.smith@example.com',
    'admin',
    'Information Technology',
    'Asian',
    35,
    NULL,
    FALSE,
    FALSE,
    'approved',
    '2027-12-31 23:59:59+00'
),
(
    'S001',
    'Sarah',
    'Johnson',
    'sarah.johnson@example.com',
    'staff',
    'Student Affairs',
    'Black',
    29,
    NULL,
    FALSE,
    TRUE,
    'approved',
    '2027-12-31 23:59:59+00'
),
(
    'D001',
    'Michael',
    'Brown',
    'michael.brown@example.com',
    'dean',
    'Engineering',
    'White',
    48,
    NULL,
    FALSE,
    FALSE,
    'pending',
    '2028-12-31 23:59:59+00'
),
(
    'ST001',
    'Emily',
    'Davis',
    'emily.davis@example.com',
    'student',
    'Computer Science',
    'Hispanic',
    21,
    'undergraduate',
    TRUE,
    TRUE,
    'approved',
    '2027-05-31 23:59:59+00'
);
-- 2. Groups
INSERT INTO groups (organization_id, name, organization_type) VALUES
('G001', 'Computer Science Club', 'student_org'),
('G002', 'International Student Association', 'student_org'),
('G003', 'Student Support Office', 'office'),
('G004', 'Community Service Team', 'service');

-- 3. Meetings
INSERT INTO meetings (
    meeting_id, organization_id, meeting_name, event_type,
    starts_at, ends_at, duration, food_lb, loc
) VALUES
('M001', 'G001', 'Coding Workshop', 'workshop',
 '2026-11-02 14:00:00+00', '2026-11-02 16:00:00+00',
 2.00, 10, 'Room 101'),
('M002', 'G001', 'Monthly Club Meeting', 'meeting',
 '2026-11-05 17:00:00+00', '2026-11-05 18:00:00+00',
 1.00, 5, 'Room 102'),
('M003', 'G002', 'International Student Mixer', 'other',
 '2026-11-08 18:00:00+00', '2026-11-08 20:00:00+00',
 2.00, 15, 'Student Center'),
('M004', 'G003', 'Student Resources Workshop', 'workshop',
 '2026-11-10 13:00:00+00', '2026-11-10 14:30:00+00',
 1.50, 8, 'Room 205'),
('M005', 'G004', 'Community Cleanup', 'service',
 '2026-11-14 09:00:00+00', '2026-11-14 12:00:00+00',
 3.00, 12, 'Main Entrance');

-- 4. Accounts belong to groups
INSERT INTO part_of (student_id, organization_id, joined_at) VALUES
('S001', 'G001', '2026-10-01 12:00:00+00'),
('S001', 'G002', '2026-10-02 12:00:00+00'),
('S002', 'G001', '2026-10-02 13:00:00+00'),
('S003', 'G002', '2026-10-03 14:00:00+00'),
('S003', 'G004', '2026-10-04 14:00:00+00'),
('S004', 'G003', '2026-10-05 15:00:00+00'),
('S005', 'G002', '2026-10-06 16:00:00+00'),
('S005', 'G004', '2026-10-07 16:00:00+00');

-- 5. Accounts attend meetings
INSERT INTO attends (student_id, meeting_id, attendance_status) VALUES
('S001', 'M001', 'attended'),
('S001', 'M002', 'registered'),
('S001', 'M003', 'attended'),
('S002', 'M001', 'attended'),
('S002', 'M002', 'absent'),
('S003', 'M003', 'registered'),
('S003', 'M005', 'attended'),
('S004', 'M004', 'registered'),
('S005', 'M003', 'attended'),
('S005', 'M005', 'registered');