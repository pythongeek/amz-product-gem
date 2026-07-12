// Use global fetch available in Node 18+

async function main() {
  const targetUrl = "https://www.amazon.com/dp/B0831KY16F";
  const baseUrl = "https://api.microlink.io";
  const params = new URLSearchParams({
    url: targetUrl,
    "data.title.selector": "#productTitle",
    "data.price.selector": ".a-price .a-offscreen",
    "data.image.selector": "#landingImage",
    "data.image.attr": "src",
    "data.rating.selector": "span.a-icon-alt",
    "data.reviews.selector": "#acrCustomerReviewText",
    prerender: "true"
  });
  const url = `${baseUrl}?${params.toString()}`;
  console.log(`Fetching Microlink URL: ${url}`);

  const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"
  ];

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgents[0],
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1"
      }
    });

    console.log("Status:", res.status);
    const data = await res.json() as any;
    console.log("Data:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Fetch failed:", err.message);
  }
}

main();
