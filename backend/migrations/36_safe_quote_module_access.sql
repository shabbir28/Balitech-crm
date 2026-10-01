-- Grant the Safe Quote module to every user that does not already have it.
-- Super admins already bypass this check; this keeps their stored list in sync too.
UPDATE users
SET accessible_modules = COALESCE(accessible_modules, '[]'::jsonb) || '["safe_quote"]'::jsonb
WHERE NOT (COALESCE(accessible_modules, '[]'::jsonb) @> '["safe_quote"]'::jsonb);
