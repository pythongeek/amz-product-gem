const apiKey = "a1f77bf4cacd457f155d803eb1c4142a";
const keyword = "Portable Cornhole Board Set";
const url = `https://api.scraperapi.com/structured/amazon/search?api_key=${apiKey}&query=${encodeURIComponent(keyword)}&country=us`;

fetch(url)
  .then(r => r.json())
  .then(json => {
    console.log("ScraperAPI Search Results length:", json.results?.length);
    console.log("Sample result 0:", json.results[0]);
    console.log("Sample result 1:", json.results[1]);
  })
  .catch(console.error);
