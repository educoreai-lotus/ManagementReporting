-- ====================================================
-- הוספת חברות תוכנה לטבלת directory_cache
-- תאריך: היום (CURRENT_DATE)
-- רק חברות שקשורות לתוכנה
-- ====================================================

INSERT INTO public.directory_cache (
  snapshot_date,
  company_id,
  company_name,
  industry,
  company_size,
  date_registered,
  primary_hr_contact,
  approval_policy,
  decision_maker,
  kpis,
  max_test_attempts,
  website_url,
  verification_status,
  hierarchy
) VALUES
-- חברת תוכנה 1: חברת פיתוח תוכנה גדולה
(
  CURRENT_DATE,
  'SOFTWARE-001',
  'CodeForge Technologies',
  'Software Development',
  '200-500',
  CURRENT_TIMESTAMP - INTERVAL '25 days',
  'hr@codeforge.com',
  'Manager approval required',
  'David Chen',
  '{"active_users": 420, "employee_satisfaction": 4.6, "retention_rate": 0.89, "training_completion": 0.94}'::jsonb,
  3,
  'https://codeforge.example.com',
  'verified',
  '{"ceo": "David Chen", "departments": [{"name": "Engineering", "teams": [{"name": "Backend", "employees": [{"employee_id": "E001", "name": "Alice Developer", "role_type": "Senior Engineer"}, {"employee_id": "E002", "name": "Bob Coder", "role_type": "Engineer"}]}, {"name": "Frontend", "employees": [{"employee_id": "E003", "name": "Charlie UI", "role_type": "Engineer"}]}]}, {"name": "Product", "teams": [{"name": "Product Management", "employees": [{"employee_id": "E004", "name": "Diana PM", "role_type": "Product Manager"}]}]}], "total_employees": 350}'::jsonb
),

-- חברת תוכנה 2: חברת SaaS
(
  CURRENT_DATE,
  'SOFTWARE-002',
  'CloudSync Solutions',
  'Software as a Service (SaaS)',
  '100-200',
  CURRENT_TIMESTAMP - INTERVAL '20 days',
  'people@cloudsync.com',
  'Auto-approval for technical courses',
  'Emma Rodriguez',
  '{"active_users": 180, "employee_satisfaction": 4.5, "retention_rate": 0.91, "training_completion": 0.96}'::jsonb,
  5,
  'https://cloudsync.example.com',
  'approved',
  '{"ceo": "Emma Rodriguez", "departments": [{"name": "Development", "teams": [{"name": "DevOps", "employees": [{"employee_id": "E101", "name": "Frank DevOps", "role_type": "DevOps Engineer"}, {"employee_id": "E102", "name": "Grace Cloud", "role_type": "Cloud Architect"}]}, {"name": "Backend", "employees": [{"employee_id": "E103", "name": "Henry API", "role_type": "Backend Engineer"}]}]}, {"name": "Customer Success", "teams": [{"name": "Support", "employees": [{"employee_id": "E104", "name": "Iris Support", "role_type": "Support Engineer"}]}]}], "total_employees": 150}'::jsonb
),

-- חברת תוכנה 3: חברת AI/ML
(
  CURRENT_DATE,
  'SOFTWARE-003',
  'AI Innovations Lab',
  'Artificial Intelligence',
  '50-200',
  CURRENT_TIMESTAMP - INTERVAL '15 days',
  'hr@aiinnovations.com',
  'HR approval required',
  'James Kim',
  '{"active_users": 95, "employee_satisfaction": 4.8, "retention_rate": 0.93, "training_completion": 0.98}'::jsonb,
  2,
  'https://aiinnovations.example.com',
  'verified',
  '{"ceo": "James Kim", "departments": [{"name": "Research", "teams": [{"name": "ML Research", "employees": [{"employee_id": "E201", "name": "Kevin ML", "role_type": "ML Engineer"}, {"employee_id": "E202", "name": "Laura Data", "role_type": "Data Scientist"}]}, {"name": "Engineering", "employees": [{"employee_id": "E203", "name": "Mike AI", "role_type": "AI Engineer"}]}]}], "total_employees": 120}'::jsonb
),

-- חברת תוכנה 4: חברת Cybersecurity
(
  CURRENT_DATE,
  'SOFTWARE-004',
  'SecureNet Systems',
  'Cybersecurity Software',
  '200-500',
  CURRENT_TIMESTAMP - INTERVAL '12 days',
  'hr@securenet.com',
  'Manager approval required',
  'Nancy Patel',
  '{"active_users": 380, "employee_satisfaction": 4.4, "retention_rate": 0.88, "training_completion": 0.92}'::jsonb,
  3,
  'https://securenet.example.com',
  'approved',
  '{"ceo": "Nancy Patel", "departments": [{"name": "Security", "teams": [{"name": "Penetration Testing", "employees": [{"employee_id": "E301", "name": "Oliver Security", "role_type": "Security Analyst"}, {"employee_id": "E302", "name": "Patricia Pentest", "role_type": "Penetration Tester"}]}, {"name": "Security Engineering", "employees": [{"employee_id": "E303", "name": "Quinn Secure", "role_type": "Security Engineer"}]}]}, {"name": "Product", "teams": [{"name": "Product Security", "employees": [{"employee_id": "E304", "name": "Robert Secure", "role_type": "Product Security Manager"}]}]}], "total_employees": 320}'::jsonb
),

-- חברת תוכנה 5: חברת Mobile Apps
(
  CURRENT_DATE,
  'SOFTWARE-005',
  'MobileFirst Apps',
  'Mobile Software Development',
  '10-50',
  CURRENT_TIMESTAMP - INTERVAL '8 days',
  'contact@mobilefirst.com',
  'Auto-approval for courses',
  'Sophia Lee',
  '{"active_users": 28, "employee_satisfaction": 4.7, "retention_rate": 0.92, "training_completion": 0.97}'::jsonb,
  5,
  'https://mobilefirst.example.com',
  'verified',
  '{"ceo": "Sophia Lee", "departments": [{"name": "Mobile Development", "teams": [{"name": "iOS Team", "employees": [{"employee_id": "E401", "name": "Tom iOS", "role_type": "iOS Developer"}]}, {"name": "Android Team", "employees": [{"employee_id": "E402", "name": "Uma Android", "role_type": "Android Developer"}]}, {"name": "React Native", "employees": [{"employee_id": "E403", "name": "Victor RN", "role_type": "React Native Developer"}]}]}], "total_employees": 35}'::jsonb
),

-- חברת תוכנה 6: חברת Enterprise Software
(
  CURRENT_DATE,
  'SOFTWARE-006',
  'EnterpriseSoft Corp',
  'Enterprise Software',
  '500+',
  CURRENT_TIMESTAMP - INTERVAL '5 days',
  'hr@enterprisesoft.com',
  'Manager approval required',
  'William Taylor',
  '{"active_users": 720, "employee_satisfaction": 4.3, "retention_rate": 0.86, "training_completion": 0.90}'::jsonb,
  3,
  'https://enterprisesoft.example.com',
  'verified',
  '{"ceo": "William Taylor", "departments": [{"name": "Engineering", "teams": [{"name": "Platform Team", "employees": [{"employee_id": "E501", "name": "Xavier Platform", "role_type": "Platform Engineer"}, {"employee_id": "E502", "name": "Yara Systems", "role_type": "Systems Engineer"}]}, {"name": "QA", "employees": [{"employee_id": "E503", "name": "Zoe QA", "role_type": "QA Engineer"}]}]}, {"name": "Sales", "teams": [{"name": "Enterprise Sales", "employees": [{"employee_id": "E504", "name": "Adam Sales", "role_type": "Enterprise Sales Manager"}]}]}], "total_employees": 650}'::jsonb
),

-- חברת תוכנה 7: חברת DevOps Tools
(
  CURRENT_DATE,
  'SOFTWARE-007',
  'DevOps Pro Tools',
  'DevOps Software',
  '50-200',
  CURRENT_TIMESTAMP - INTERVAL '3 days',
  'people@devopspro.com',
  'HR approval required',
  'Zara Ahmed',
  '{"active_users": 110, "employee_satisfaction": 4.6, "retention_rate": 0.90, "training_completion": 0.95}'::jsonb,
  4,
  'https://devopspro.example.com',
  'approved',
  '{"ceo": "Zara Ahmed", "departments": [{"name": "Engineering", "teams": [{"name": "Infrastructure", "employees": [{"employee_id": "E601", "name": "Ben Infrastructure", "role_type": "Infrastructure Engineer"}, {"employee_id": "E602", "name": "Carla DevOps", "role_type": "DevOps Engineer"}]}, {"name": "Platform", "employees": [{"employee_id": "E603", "name": "Daniel Platform", "role_type": "Platform Engineer"}]}]}], "total_employees": 140}'::jsonb
),

-- חברת תוכנה 8: חברת FinTech
(
  CURRENT_DATE,
  'SOFTWARE-008',
  'FinTech Solutions Ltd',
  'Financial Technology Software',
  '200-500',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  'hr@fintechsolutions.com',
  'Manager approval required',
  'Elena Martinez',
  '{"active_users": 410, "employee_satisfaction": 4.5, "retention_rate": 0.89, "training_completion": 0.93}'::jsonb,
  3,
  'https://fintechsolutions.example.com',
  'verified',
  '{"ceo": "Elena Martinez", "departments": [{"name": "Engineering", "teams": [{"name": "Backend", "employees": [{"employee_id": "E701", "name": "Felix Backend", "role_type": "Backend Engineer"}, {"employee_id": "E702", "name": "Gina API", "role_type": "API Developer"}]}, {"name": "Security", "employees": [{"employee_id": "E703", "name": "Hugo Security", "role_type": "Security Engineer"}]}]}, {"name": "Compliance", "teams": [{"name": "Regulatory", "employees": [{"employee_id": "E704", "name": "Isabel Compliance", "role_type": "Compliance Officer"}]}]}], "total_employees": 380}'::jsonb
)

ON CONFLICT (snapshot_date, company_id) DO NOTHING;

-- ====================================================
-- בדיקה: כמה חברות נוספו
-- ====================================================
SELECT 
  COUNT(*) as total_companies_added,
  COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count,
  COUNT(CASE WHEN verification_status = 'approved' THEN 1 END) as approved_count,
  SUM(CASE 
    WHEN company_size = '1-10' THEN 8
    WHEN company_size = '10-50' THEN 30
    WHEN company_size = '50-200' THEN 125
    WHEN company_size = '200-500' THEN 350
    WHEN company_size = '500+' THEN 650
    ELSE 50
  END) as estimated_total_users
FROM public.directory_cache
WHERE snapshot_date = CURRENT_DATE
  AND company_id LIKE 'SOFTWARE-%';

