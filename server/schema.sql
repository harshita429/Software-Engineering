DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS enrolments CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS staff CASCADE;
DROP TABLE IF EXISTS modules CASCADE;

--
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE modules (
	code VARCHAR(20) PRIMARY KEY,
	name VARCHAR(150) NOT NULL,
	description TEXT,
	created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE staff (
	staff_id     VARCHAR(20)  PRIMARY KEY,
	name         VARCHAR(100) NOT NULL,
	email        VARCHAR(150) UNIQUE,
	role         VARCHAR(50)  NOT NULL DEFAULT 'Lecturer',
                              -- e.g. 'Module Organiser', 'Lecturer', 'Admin'
    primary_module VARCHAR(20) REFERENCES modules(code) ON DELETE SET NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_staff_primary_module ON staff(primary_module);


CREATE TABLE students (
    student_id   VARCHAR(20)  PRIMARY KEY,
    name         VARCHAR(100) NOT NULL,
    email        VARCHAR(150) UNIQUE,
    year_of_study INTEGER     CHECK (year_of_study BETWEEN 1 AND 6),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ENROLMENTS STUDENT CAN BE ON MANY MODULES, MODULES HAVE MANY STUDENTS

CREATE TABLE enrolments (
    student_id   VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    module_code  VARCHAR(20) NOT NULL REFERENCES modules(code)        ON DELETE CASCADE,
    enrolled_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (student_id, module_code)
);
CREATE INDEX idx_enrolments_module ON enrolments(module_code);

CREATE TABLE assignments (
    id           SERIAL       PRIMARY KEY,
    name         VARCHAR(200) NOT NULL,
    module_code  VARCHAR(20)  NOT NULL REFERENCES modules(code) ON DELETE CASCADE,
    date_set     DATE         NOT NULL,
    due_date     DATE         NOT NULL,
    created_by_id VARCHAR(20) NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (due_date >= date_set)
);
CREATE INDEX idx_assignments_module     ON assignments(module_code);
CREATE INDEX idx_assignments_creator    ON assignments(created_by_id);
CREATE INDEX idx_assignments_due_date   ON assignments(due_date);

CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE announcements (
    id           SERIAL       PRIMARY KEY,
    module_code  VARCHAR(20)  NOT NULL REFERENCES modules(code) ON DELETE CASCADE,
    author_id    VARCHAR(20)  NOT NULL REFERENCES staff(staff_id) ON DELETE RESTRICT,
    title        VARCHAR(200) NOT NULL,
    body         TEXT         NOT NULL,
    posted_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
    id                    SERIAL      PRIMARY KEY,
    recipient_student_id  VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    type                  VARCHAR(30) NOT NULL,
                                      -- e.g. 'announcement', 'assignment_created', 'assignment_due_soon'
    announcement_id       INTEGER     REFERENCES announcements(id) ON DELETE CASCADE,
    assignment_id         INTEGER     REFERENCES assignments(id)   ON DELETE CASCADE,
    is_read               BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_notif_recipient_unread
    ON notifications(recipient_student_id, is_read)
    WHERE is_read = FALSE;

--DATA FOR TESTING

INSERT INTO modules (code, name) VALUES
    ('CMP-5012B', 'Software Engineering'),
    ('CMP-5014A', 'Database Systems'),
    ('CMP-5020A', 'Algorithms');

INSERT INTO staff (staff_id, name, role, primary_module) VALUES
    ('STF-1042', 'Dr. M. Whitaker',  'Module Organiser', 'CMP-5012B'),
    ('STF-2188', 'Prof. J. Ainsley', 'Lecturer',         'CMP-5014A'),
    ('STF-3301', 'Dr. R. Patel',     'Lecturer',         'CMP-5020A');

INSERT INTO students (student_id, name, email, year_of_study) VALUES
    ('STU-100231', 'Alex Carter',  'alex.carter@uni.ac.uk',  2),
    ('STU-100232', 'Bea Lin',      'bea.lin@uni.ac.uk',      2),
    ('STU-100233', 'Cam Osei',     'cam.osei@uni.ac.uk',     2),
    ('STU-100234', 'Dani Rossi',   'dani.rossi@uni.ac.uk',   2);

INSERT INTO enrolments (student_id, module_code) VALUES
    ('STU-100231', 'CMP-5012B'),
    ('STU-100231', 'CMP-5014A'),
    ('STU-100232', 'CMP-5012B'),
    ('STU-100232', 'CMP-5020A'),
    ('STU-100233', 'CMP-5012B'),
    ('STU-100234', 'CMP-5014A');

INSERT INTO assignments (name, module_code, date_set, due_date, created_by_id) VALUES
    ('Requirements & Design Report', 'CMP-5012B', '2026-01-26', '2026-03-02', 'STF-1042'),
    ('Team Demo & Source Code',      'CMP-5012B', '2026-02-09', '2026-04-27', 'STF-1042'),
    ('Database Coursework 1',        'CMP-5014A', '2026-02-02', '2026-03-16', 'STF-2188'),
    ('Algorithms Problem Set',       'CMP-5020A', '2026-02-15', '2026-03-09', 'STF-3301'),
    ('Reflective Report',            'CMP-5012B', '2026-03-02', '2026-05-04', 'STF-1042');

INSERT INTO announcements (module_code, author_id, title, body, posted_at) VALUES
    ('CMP-5012B', 'STF-1042',
     'Sprint 2 demo rooms updated',
     'Demo slots for Week 12 have been moved to LT2. Please check your team''s confirmed slot in Blackboard.',
     '2026-04-28 09:14:00'),
    ('CMP-5012B', 'STF-1042',
     'Reminder - Reflective Report due 04/05',
     'Individual reflective reports are due Monday 4 May at 16:00. Submit via the e-submission portal.',
     '2026-04-25 15:02:00'),
    ('CMP-5012B', 'STF-1042',
     'Office hours moved this week',
     'Tuesday office hours are moved to Thursday 14:00-16:00 due to staff training.',
     '2026-04-21 11:30:00');


SELECT
    a.id,
    a.name,
    a.module_code,
    m.name        AS module_name,
    s.name        AS created_by_name,
    s.staff_id    AS created_by_id,
    a.date_set,
    a.due_date
FROM assignments a
JOIN modules m ON m.code     = a.module_code
JOIN staff   s ON s.staff_id = a.created_by_id
ORDER BY a.due_date;