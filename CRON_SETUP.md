# Cron-Jobs.org Setup Guide for AMZ Product Gem

## 1. Cron-Jobs.org API Key
Your API key: `<CRON_JOBS_ORG_API_KEY>` (Configure in Vercel/local environment variables)

## 2. Cron Jobs to Create

### Job 1: Background Product Analysis (Every 2 Hours)
```
Title: Product Analysis Job
URL: https://amz-product-gem.vercel.app/job/runAnalysisJob
Method: POST
Schedule: 0 */2 * * *
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <USER_JWT_TOKEN>
```

**Body (JSON):**
```json
{
  "productId": 123,
  "title": "Product Name",
  "asin": "B0123456789",
  "marketplace": "US"
}
```

### Job 2: Immediate Research Trigger (Every Minute)
```
Title: Immediate Research Trigger
URL: https://amz-product-gem.vercel.app/job/triggerResearch
Method: POST
Schedule: */1 * * * *
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <USER_JWT_TOKEN>
```

**Body (JSON):**
```json
{
  "input": "user_query_here",
  "userId": 1
}
```

## 3. Vercel Environment Variables Needed

### For Cron Jobs to Work:

```bash
# In Vercel Project Settings → Environment Variables:

# Required for auth
JWT_SECRET=your-random-secret-key-min-32-chars

# AI Providers
KIMI_API_KEY=your_kimi_key_here
KIMI_BASE_URL=https://api.moonshot.cn/v1
KIMI_MODEL=moonshot-v1-128k

MINIMAX_API_KEY=your_minimax_key_here
MINIMAX_BASE_URL=https://api.minimax.chat/v1
MINIMAX_MODEL=abab6.5s-chat

# Database
DATABASE_URL=your_postgres_connection_string

# Supabase (if using)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Cron job token for service account
CRON_JOB_TOKEN=your_service_token_for_cron_auth
```

## 4. Vercel Function Configuration

Create/Update `vercel.json`:

```json
{
  "functions": {
    "server/**/*.ts": {
      "maxDuration": 300
    },
    "api/**/*.ts": {
      "maxDuration": 300
    }
  }
}
```

## 5. How User Input Triggers Work

### Frontend Flow:
1. User enters URL/keyword → Frontend POSTs to `/job/triggerResearch`
2. Vercel function processes request
3. Cron job runs every minute and processes pending research

### Backend Flow:
```typescript
// server/jobRouter.ts
export const jobRouter = createRouter({
  triggerResearch: authedQuery
    .input(z.object({
      input: z.string(),
      userId: z.number(),
    }))
    .mutation(async ({ input }) => {
      // Call AI for immediate research
      const research = await callAIWithFallback([...]);
      // Save to database
      await db.insert(productResearch).values({...});
      return { success: true };
    }),
});
```

## 6. Alternative: Server-Side Cron Job

If you want cron-jobs.org to automatically poll your database for pending research:

### Update `server/jobRouter.ts`:

```typescript
export const jobRouter = createRouter({
  processPendingResearch: publicQuery.query(async () => {
    const pending = await db
      .select()
      .from(productResearch)
      .where(eq(productResearch.status, 'pending'));

    for (const item of pending) {
      const result = await callAIWithFallback([...]);
      await db
        .update(productResearch)
        .set({ result, status: 'completed' })
        .where(eq(productResearch.id, item.id));
    }

    return { processed: pending.length };
  }),
});
```

Then create cron job:
```
URL: https://amz-product-gem.vercel.app/job/processPendingResearch
Method: GET
```

## 7. Testing the Cron Jobs

### Test Immediate Research:
```bash
curl -X POST https://amz-product-gem.vercel.app/job/triggerResearch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"input":"test keyword","userId":1}'
```

### Test Background Analysis:
```bash
curl -X POST https://amz-product-gem.vercel.app/job/runAnalysisJob \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"productId":123,"title":"Test Product","asin":"B0123456789","marketplace":"US"}'
```

## 8. Troubleshooting

### Issue: Cron jobs fail with 401 Unauthorized
**Fix:** Ensure JWT_SECRET is set in Vercel environment variables and consistent across frontend/backend.

### Issue: Vercel function times out
**Fix:** Increase `maxDuration` in vercel.json to 300 seconds (5 minutes).

### Issue: Cron jobs don't trigger
**Fix:** 
1. Check cron-jobs.org service status
2. Verify URL is accessible: https://amz-product-gem.vercel.app/job/runAnalysisJob
3. Check Vercel function logs for errors

## 9. Security Notes

- **JWT_SECRET**: Change to a random 32+ character string
- **API Keys**: Never commit to git
- **Database**: Use environment variables only
- **Cron Job Token**: If using service account, rotate regularly
