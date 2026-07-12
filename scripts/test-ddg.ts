async function main() {
  const url = "https://html.duckduckgo.com/html/?q=site:amazon.com/dp/B0831KY16F";
  console.log(`Fetching DDG URL: ${url}`);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    console.log("Status:", res.status);
    const html = await res.text();
    console.log("HTML Length:", html.length);
    if (html.includes("Burlap") || html.includes("COTTON CRAFT")) {
      console.log("SUCCESS! FOUND THE PRODUCT NAME!");
      // Print first match
      const match = html.match(/<a class="result__url"[^>]*>([\s\S]*?)<\/a>/i);
      console.log("Result Match:", match ? match[0] : "None");
    } else {
      console.log("DDG didn't return the product or got blocked.");
    }
  } catch (err: any) {
    console.error("DDG fetch failed:", err.message);
  }
}

main();
