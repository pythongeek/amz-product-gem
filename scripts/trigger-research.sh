#!/bin/bash
# cron-jobs.org immediate research trigger script
# This script processes pending research requests

API_KEY="${CRON_JOBS_ORG_API_KEY:-YOUR_CRON_JOBS_ORG_API_KEY}"
API_URL="https://cron-job.org"

# Check for pending research requests
# This would typically be done by your backend polling cron-jobs.org or vice versa
# For immediate triggers, the frontend POSTs directly to /job/triggerResearch

# Example: If you want to trigger immediately via cron-jobs.org:
# curl -X POST "$API_URL/jobs" \
#   -H "Authorization: Bearer $API_KEY" \
#   -H "Content-Type: application/json" \
#   -d '{
#     "title": "Immediate Research Trigger",
#     "url": "https://amz-product-gem.vercel.app/job/triggerResearch",
#     "method": "POST",
#     "headers": {
#       "Content-Type": "application/json",
#       "Authorization": "Bearer YOUR_USER_JWT_TOKEN"
#     },
#     "schedule": "*/1 * * * *",  # Every minute (for testing)
#     "data": "{\"input\":\"test\",\"userId\":1}"
#   }'

echo "Research trigger script ready"
