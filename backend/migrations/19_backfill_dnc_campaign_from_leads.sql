-- Best-effort: link existing DNC rows (e.g. BLA scrub) to a campaign via lead campaign_type
UPDATE dnc_numbers d
SET campaign_id = c.campaign_id
FROM (
  SELECT DISTINCT ON (l.phone)
    l.phone,
    l.campaign_type
  FROM leads l
  WHERE l.campaign_type IS NOT NULL AND TRIM(l.campaign_type) <> ''
  ORDER BY l.phone, l.uploaded_at DESC NULLS LAST
) latest
JOIN campaigns c ON c.name = latest.campaign_type
WHERE d.phone = latest.phone
  AND d.campaign_id IS NULL;
