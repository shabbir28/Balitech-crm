#!/usr/bin/env bash
set -euo pipefail

ACTIVE_HEAVY=$(sudo -u postgres psql -d "crm-database" -Atc "
SELECT COUNT(*)
FROM pg_stat_activity
WHERE datname='crm-database'
  AND state='active'
  AND pid <> pg_backend_pid()
  AND (
    query ILIKE '%FOR UPDATE SKIP LOCKED%'
    OR query ILIKE '%UPDATE leads%'
    OR query ILIKE '%UPDATE premium_data%'
    OR query ILIKE '%UPDATE refine_data%'
    OR query ILIKE '%UPDATE van_data%'
    OR query ILIKE '%UPDATE wc_db_data%'
    OR query ILIKE '%UPDATE separation_data%'
    OR query ILIKE '%FROM leads%'
    OR query ILIKE '%FROM premium_data%'
    OR query ILIKE '%FROM refine_data%'
    OR query ILIKE '%FROM van_data%'
    OR query ILIKE '%FROM wc_db_data%'
    OR query ILIKE '%FROM separation_data%'
    OR query ILIKE '%mixed_download%'
    OR query ILIKE '%download_logs%'
    OR query ILIKE '%download_requests%'
    OR query ILIKE '%COPY public.leads%'
    OR query ILIKE '%COPY public.premium_data%'
    OR query ILIKE '%COPY public.refine_data%'
    OR query ILIKE '%COPY public.van_data%'
    OR query ILIKE '%COPY public.wc_db_data%'
    OR query ILIKE '%COPY public.separation_data%'
  );
")

if [ "$ACTIVE_HEAVY" -gt 0 ]; then
  echo "$(date) - Skipping dashboard cache refresh because module download/export/query is active. active_heavy=$ACTIVE_HEAVY"
  exit 0
fi

/usr/bin/node scripts/refresh_dashboard_cache.js
