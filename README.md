# AMZ Product Gem

... (existing content)

## AI Configuration

This app uses two AI providers with fallback:
1. **Primary:** Kimi (Moonshot)
2. **Fallback:** Minimax

### Environment Variables

Add these to your `.env` file:

```dotenv
# Primary AI (Kimi)
KIMI_API_KEY=your_kimi_key_here
KIMI_BASE_URL=https://api.moonshot.cn/v1  # or your custom endpoint
KIMI_MODEL=moonshot-v1-128k

# Fallback AI (Minimax)
MINIMAX_API_KEY=your_minimax_key_here
MINIMAX_BASE_URL=https://api.minimax.chat/v1  # optional
MINIMAX_MODEL=abab6.5s-chat
```

## Cron-Job Setup (for Background Analysis)

To run product analyses periodically, set up a cron-job on [cron-job.org](https://cron-job.org):

1. **URL:** `https://amz-product-gem.vercel.app/job/runAnalysisJob`
2. **Method:** POST
3. **Headers:**
   - `Authorization: Bearer <your_jwt_token>` (get from a logged-in session)
   - `Content-Type: application/json`
4. **Body (JSON):**
   ```json
   {
     "productId": 123,
     "title": "Product Name",
     "asin": "B0123456789",
     "marketplace": "US"
   }
   ```
5. **Schedule:** e.g., `0 */2 * * *` (every 2 hours)

... (existing content)
