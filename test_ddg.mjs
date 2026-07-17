import { search } from 'duck-duck-scrape';

async function test() {
  try {
    const results = await search('site:amazon.com/dp/ garlic press');
    
    const asins = [];
    for (const result of results.results) {
      const match = result.url.match(/\/dp\/([A-Z0-9]{10})/);
      if (match) {
        asins.push(match[1]);
      }
    }
    console.log("Found ASINs:", asins);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
