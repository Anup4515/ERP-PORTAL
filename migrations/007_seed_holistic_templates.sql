-- Migration 007: Seed default holistic templates
-- Populates default_holistic_templates with stage-wise parameters and sub-parameters
-- 4 stages x 5 parameters x 5 sub-parameters = 100 rows

INSERT IGNORE INTO default_holistic_templates (stage, parameter_name, parameter_sort_order, sub_parameter_name, sub_parameter_sort_order) VALUES
-- ═══ FOUNDATIONAL (Pre-primary / Nursery to Class 2) ═══
('foundational', 'Physical Development',    1, 'Gross Motor Skills',        1),
('foundational', 'Physical Development',    1, 'Fine Motor Skills',         2),
('foundational', 'Physical Development',    1, 'Hand-Eye Coordination',     3),
('foundational', 'Physical Development',    1, 'Balance & Posture',         4),
('foundational', 'Physical Development',    1, 'Outdoor Play Participation',5),

('foundational', 'Cognitive Development',   2, 'Pattern Recognition',       1),
('foundational', 'Cognitive Development',   2, 'Memory & Recall',           2),
('foundational', 'Cognitive Development',   2, 'Number Sense',              3),
('foundational', 'Cognitive Development',   2, 'Curiosity & Questioning',   4),
('foundational', 'Cognitive Development',   2, 'Problem Solving',           5),

('foundational', 'Language & Communication',3, 'Listening Skills',          1),
('foundational', 'Language & Communication',3, 'Speaking Clarity',          2),
('foundational', 'Language & Communication',3, 'Vocabulary Building',       3),
('foundational', 'Language & Communication',3, 'Story Comprehension',       4),
('foundational', 'Language & Communication',3, 'Expression',                5),

('foundational', 'Social & Emotional',      4, 'Sharing & Cooperation',     1),
('foundational', 'Social & Emotional',      4, 'Following Instructions',    2),
('foundational', 'Social & Emotional',      4, 'Emotional Regulation',      3),
('foundational', 'Social & Emotional',      4, 'Peer Interaction',          4),
('foundational', 'Social & Emotional',      4, 'Confidence',                5),

('foundational', 'Creativity & Art',        5, 'Drawing & Coloring',        1),
('foundational', 'Creativity & Art',        5, 'Imaginative Play',          2),
('foundational', 'Creativity & Art',        5, 'Music & Rhythm',            3),
('foundational', 'Creativity & Art',        5, 'Craft Skills',              4),
('foundational', 'Creativity & Art',        5, 'Creative Expression',       5),

-- ═══ PREPARATORY (Class 3 to Class 5) ═══
('preparatory', 'Physical Activity',        1, 'Stamina',                   1),
('preparatory', 'Physical Activity',        1, 'Participation in Sports',   2),
('preparatory', 'Physical Activity',        1, 'Teamwork in Games',         3),
('preparatory', 'Physical Activity',        1, 'Fitness Level',             4),
('preparatory', 'Physical Activity',        1, 'Interest in Activities',    5),

('preparatory', 'Academic Performance',     2, 'Subject Understanding',     1),
('preparatory', 'Academic Performance',     2, 'Homework Completion',       2),
('preparatory', 'Academic Performance',     2, 'Class Engagement',          3),
('preparatory', 'Academic Performance',     2, 'Test Preparedness',         4),
('preparatory', 'Academic Performance',     2, 'Reading Habit',             5),

('preparatory', 'Mental Parameters',        3, 'Grasping Ability',          1),
('preparatory', 'Mental Parameters',        3, 'Retention Power',           2),
('preparatory', 'Mental Parameters',        3, 'Conceptual Clarity',        3),
('preparatory', 'Mental Parameters',        3, 'Attention Span',            4),
('preparatory', 'Mental Parameters',        3, 'Learning Speed',            5),

('preparatory', 'Behavioural Parameters',   4, 'Discipline',                1),
('preparatory', 'Behavioural Parameters',   4, 'Respect for Authority',     2),
('preparatory', 'Behavioural Parameters',   4, 'Peer Interaction',          3),
('preparatory', 'Behavioural Parameters',   4, 'Motivation Level',          4),
('preparatory', 'Behavioural Parameters',   4, 'Response to Feedback',      5),

('preparatory', 'Creativity & Innovation',  5, 'Initiative in Projects',    1),
('preparatory', 'Creativity & Innovation',  5, 'Curiosity Level',           2),
('preparatory', 'Creativity & Innovation',  5, 'Problem Solving',           3),
('preparatory', 'Creativity & Innovation',  5, 'Extra Curricular',          4),
('preparatory', 'Creativity & Innovation',  5, 'Idea Generation',           5),

-- ═══ MIDDLE (Class 6 to Class 8) ═══
('middle', 'Physical Activity',             1, 'Sports Performance',        1),
('middle', 'Physical Activity',             1, 'Stamina & Endurance',       2),
('middle', 'Physical Activity',             1, 'Team Spirit',               3),
('middle', 'Physical Activity',             1, 'Fitness Discipline',        4),
('middle', 'Physical Activity',             1, 'Sportsmanship',             5),

('middle', 'Academic Performance',          2, 'Conceptual Understanding',  1),
('middle', 'Academic Performance',          2, 'Analytical Thinking',       2),
('middle', 'Academic Performance',          2, 'Consistency',               3),
('middle', 'Academic Performance',          2, 'Exam Preparedness',         4),
('middle', 'Academic Performance',          2, 'Research Skills',           5),

('middle', 'Mental Parameters',             3, 'Critical Thinking',         1),
('middle', 'Mental Parameters',             3, 'Logical Reasoning',         2),
('middle', 'Mental Parameters',             3, 'Focus & Concentration',     3),
('middle', 'Mental Parameters',             3, 'Memory Retention',          4),
('middle', 'Mental Parameters',             3, 'Decision Making',           5),

('middle', 'Behavioural Parameters',        4, 'Self-Discipline',           1),
('middle', 'Behavioural Parameters',        4, 'Leadership Qualities',      2),
('middle', 'Behavioural Parameters',        4, 'Empathy & Respect',         3),
('middle', 'Behavioural Parameters',        4, 'Conflict Resolution',       4),
('middle', 'Behavioural Parameters',        4, 'Time Management',           5),

('middle', 'Creativity & Innovation',       5, 'Scientific Temper',         1),
('middle', 'Creativity & Innovation',       5, 'Creative Writing',          2),
('middle', 'Creativity & Innovation',       5, 'Digital Literacy',          3),
('middle', 'Creativity & Innovation',       5, 'Project Innovation',        4),
('middle', 'Creativity & Innovation',       5, 'Public Speaking',           5),

-- ═══ SECONDARY (Class 9 to Class 12) ═══
('secondary', 'Physical Activity',          1, 'Athletic Performance',      1),
('secondary', 'Physical Activity',          1, 'Fitness Commitment',        2),
('secondary', 'Physical Activity',          1, 'Competitive Spirit',        3),
('secondary', 'Physical Activity',          1, 'Health Awareness',          4),
('secondary', 'Physical Activity',          1, 'Team Leadership',           5),

('secondary', 'Academic Performance',       2, 'Advanced Conceptual Clarity',1),
('secondary', 'Academic Performance',       2, 'Independent Learning',      2),
('secondary', 'Academic Performance',       2, 'Research & Analysis',       3),
('secondary', 'Academic Performance',       2, 'Exam Strategy',             4),
('secondary', 'Academic Performance',       2, 'Career Orientation',        5),

('secondary', 'Mental Parameters',          3, 'Abstract Thinking',         1),
('secondary', 'Mental Parameters',          3, 'Problem Decomposition',     2),
('secondary', 'Mental Parameters',          3, 'Stress Management',         3),
('secondary', 'Mental Parameters',          3, 'Goal Setting',              4),
('secondary', 'Mental Parameters',          3, 'Self-Awareness',            5),

('secondary', 'Behavioural Parameters',     4, 'Integrity & Ethics',        1),
('secondary', 'Behavioural Parameters',     4, 'Social Responsibility',     2),
('secondary', 'Behavioural Parameters',     4, 'Peer Mentoring',            3),
('secondary', 'Behavioural Parameters',     4, 'Communication Skills',      4),
('secondary', 'Behavioural Parameters',     4, 'Accountability',            5),

('secondary', 'Creativity & Innovation',    5, 'Entrepreneurial Thinking',  1),
('secondary', 'Creativity & Innovation',    5, 'Technology Application',    2),
('secondary', 'Creativity & Innovation',    5, 'Design Thinking',           3),
('secondary', 'Creativity & Innovation',    5, 'Debate & Argumentation',    4),
('secondary', 'Creativity & Innovation',    5, 'Community Projects',        5);

-- Record this migration
INSERT INTO schema_migrations (version, name, applied_at)
VALUES ('007', 'seed_holistic_templates', NOW())
ON DUPLICATE KEY UPDATE applied_at = NOW();
