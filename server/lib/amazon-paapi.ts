import crypto from "crypto";
import { env } from "./env";

export interface PAAPIProduct {
  asin: string;
  title: string;
  price: number;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  bsr?: number;
  amazonChoice?: boolean;
  sellerCount?: number;
  fbaSellers?: number;
  fbmSellers?: number;
  variationCount?: number;
  qaCount?: number;
  hasAplusContent?: boolean;
  hasVideo?: boolean;
  reviewVelocity?: number;
  salesEstimate?: number;
  bsrCategory?: string;
}

function getHostAndRegion(marketplace: string) {
  const m = marketplace.toUpperCase();
  switch (m) {
    case "US": return { host: "webservices.amazon.com", region: "us-east-1" };
    case "UK": return { host: "webservices.amazon.co.uk", region: "eu-west-1" };
    case "DE": return { host: "webservices.amazon.de", region: "eu-west-1" };
    case "CA": return { host: "webservices.amazon.ca", region: "us-east-1" };
    case "FR": return { host: "webservices.amazon.fr", region: "eu-west-1" };
    case "IT": return { host: "webservices.amazon.it", region: "eu-west-1" };
    case "ES": return { host: "webservices.amazon.es", region: "eu-west-1" };
    case "JP": return { host: "webservices.amazon.co.jp", region: "us-west-2" };
    default: return { host: "webservices.amazon.com", region: "us-east-1" };
  }
}

function hmac(key: crypto.BinaryLike | crypto.KeyObject, data: string | Buffer): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256(data: string | Buffer): Buffer {
  return crypto.createHash("sha256").update(data).digest();
}

function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Buffer {
  const kDate = hmac("AWS4" + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "aws4_request");
  return kSigning;
}

async function fetchWithMicrolink(asin: string, marketplace: string): Promise<PAAPIProduct | null> {
  try {
    const domainMap: Record<string, string> = {
      US: "amazon.com",
      UK: "amazon.co.uk",
      DE: "amazon.de",
      CA: "amazon.ca",
      FR: "amazon.fr",
      IT: "amazon.it",
      ES: "amazon.es",
      JP: "amazon.co.jp"
    };
    const domain = domainMap[marketplace.toUpperCase()] || "amazon.com";
    const targetUrl = `https://www.${domain}/dp/${asin}`;
    const baseUrl = "https://api.microlink.io";
    const params = new URLSearchParams({
      url: targetUrl,
      "data.title.selector": "#productTitle",
      "data.price.selector": ".a-price .a-offscreen",
      "data.image.selector": "#landingImage",
      "data.image.attr": "src",
      "data.rating.selector": "span.a-icon-alt",
      "data.reviews.selector": "#acrCustomerReviewText",
      "data.detailBullets.selector": "#detailBullets_feature_div",
      "data.prodDetails.selector": "#prodDetails",
      "data.aplus.selector": "#aplus",
      "data.aplusV2.selector": ".aplus-v2",
      "data.video.selector": "#videoOuterContainer, .video-player, #video_feature_div",
      "data.qaText.selector": "#askATFLink, a[href*='customerQAHeader']",
      "data.sellersText.selector": "#olpLinkWidget_feature_div, span.olp-from",
      "data.socialProof.selector": "#social-proofing-faceout-title-tk_bought",
      "data.choice.selector": ".ac-badge-wrapper, .ac-badge-feature",
      "data.twister.selector": "#inline-twister-row-size_name, #inline-twister-row-color_name, #twister",
      prerender: "true"
    });
    const url = `${baseUrl}?${params.toString()}`;
    console.log(`[Scraper] Fetching Amazon product via Microlink: ${url}`);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Accept": "application/json"
      }
    });

    if (!response.ok) {
      console.warn(`[Scraper] Microlink request failed with status: ${response.status}`);
      return null;
    }

    const json = (await response.json()) as any;
    if (json.status !== "success" || !json.data) {
      console.warn("[Scraper] Microlink returned non-success response:", json);
      return null;
    }

    const { 
      title, 
      price: priceStr, 
      image, 
      rating: ratingStr, 
      reviews: reviewsStr,
      detailBullets,
      prodDetails,
      aplus,
      aplusV2,
      video,
      qaText,
      sellersText,
      socialProof,
      choice,
      twister
    } = json.data;
    
    const cleanTitle = title ? title.trim() : "Unknown Amazon Product";

    let imageUrl = "";
    if (typeof image === "string") {
      imageUrl = image;
    } else if (image && typeof image === "object") {
      imageUrl = image.url || "";
    }

    let parsedPrice = 0;
    if (priceStr) {
      const match = priceStr.replace(/[^0-9.]/g, "");
      if (match) parsedPrice = parseFloat(match);
    }

    let parsedRating = 0.0;
    if (ratingStr) {
      const match = ratingStr.match(/([0-9.]+)/);
      if (match) parsedRating = parseFloat(match[1]);
    }

    let parsedReviewCount = 0;
    if (reviewsStr) {
      const match = reviewsStr.replace(/[^0-9]/g, "");
      if (match) parsedReviewCount = parseInt(match, 10);
    }

    // Rich fields parsing
    let parsedBsr = 0;
    let parsedBsrCategory = "most_categories";
    const detailsText = `${detailBullets || ""} ${prodDetails || ""}`;

    // 1. Fallback rating extraction from detailsText
    if (parsedRating === 0 && detailsText) {
      const ratingMatch = detailsText.match(/([0-9.]+)\s+out of 5 stars/i) || 
                          detailsText.match(/([0-9.]+)\s+স্টার/i) ||
                          detailsText.match(/acrPopover[\s\S]*?title="([0-9.]+)\s+out of 5/i);
      if (ratingMatch) parsedRating = parseFloat(ratingMatch[1]);
    }

    // 2. Fallback review count extraction from detailsText
    if (parsedReviewCount === 0 && detailsText) {
      const reviewsMatch = detailsText.match(/acrCustomerReviewText[\s\S]*?>\s*\(([^)]+)\)/i) ||
                           detailsText.match(/acrCustomerReviewText[\s\S]*?aria-label="([^"]+)"/i) ||
                           detailsText.match(/([0-9,]+)\s+customer reviews/i) ||
                           detailsText.match(/Customer Reviews[\s\S]*?\(([0-9,]+)\)/i) ||
                           detailsText.match(/([0-9,]+)\s+ratings/i);
      if (reviewsMatch) {
        const val = reviewsMatch[1].replace(/Reviews/gi, "").replace(/[^0-9]/g, "");
        if (val) parsedReviewCount = parseInt(val, 10);
      }
    }

    // 3. Robust BSR parsing
    const bsrMatch = 
      detailsText.match(/Best Sellers Rank[\s\S]*?#([0-9,]+)\s+in\s+([A-Za-z\s&;,\-_/]+)/i) ||
      detailsText.match(/Best Sellers Rank:\s*#?([0-9,]+)\s+in\s+([A-Za-z\s&;,\-_/]+)/i) || 
      detailsText.match(/#([0-9,]+)\s+in\s+([A-Za-z\s&;,\-_/]+)/i) ||
      detailsText.match(/Best Sellers Rank\s*#?([0-9,]+)\s+in\s+([A-Za-z\s&;,\-_/]+)/i);

    if (bsrMatch) {
      parsedBsr = parseInt(bsrMatch[1].replace(/,/g, ""), 10);
      const categoryText = bsrMatch[2].replace(/&amp;/g, "&").trim();
      if (categoryText) {
        parsedBsrCategory = categoryText;
      }
    }

    const normalizedCategory = parsedBsrCategory.toLowerCase();
    let mappedCategory = "most_categories";
    if (normalizedCategory.includes("electron") || normalizedCategory.includes("cell phone")) {
      mappedCategory = "electronics";
    } else if (normalizedCategory.includes("kitchen") || normalizedCategory.includes("home")) {
      mappedCategory = "home_kitchen";
    } else if (normalizedCategory.includes("cloth") || normalizedCategory.includes("shoe") || normalizedCategory.includes("apparel")) {
      mappedCategory = "clothing";
    } else if (normalizedCategory.includes("jewel")) {
      mappedCategory = "jewelry";
    } else if (parsedBsrCategory && parsedBsrCategory !== "most_categories") {
      mappedCategory = parsedBsrCategory;
    }

    const parsedAmazonChoice = !!choice;
    const parsedHasAplusContent = !!(aplus || aplusV2);
    const parsedHasVideo = !!video;
    
    let parsedQaCount = 0;
    if (qaText) {
      const qaMatch = qaText.match(/([0-9,]+)/);
      if (qaMatch) {
        parsedQaCount = parseInt(qaMatch[1].replace(/,/g, ""), 10);
      }
    }

    let parsedSellerCount = 0;
    if (sellersText) {
      const sellersMatch = sellersText.match(/\(([0-9,]+)\)/) || sellersText.match(/([0-9,]+)/);
      if (sellersMatch) {
        parsedSellerCount = parseInt(sellersMatch[1].replace(/,/g, ""), 10);
      }
    }
    const parsedFbaSellers = parsedSellerCount > 0 ? Math.ceil(parsedSellerCount * 0.6) : 0;
    const parsedFbmSellers = parsedSellerCount > 0 ? Math.floor(parsedSellerCount * 0.4) : 0;

    let parsedSalesEstimate = 0;
    if (socialProof) {
      const socialMatch = socialProof.match(/([0-9kK+,]+)/);
      if (socialMatch) {
        const val = socialMatch[1].toUpperCase().replace(/[+,]/g, "");
        if (val.includes("K")) {
          parsedSalesEstimate = parseFloat(val.replace("K", "")) * 1000;
        } else {
          parsedSalesEstimate = parseInt(val, 10);
        }
      }
    } else {
      if (parsedBsr > 0) {
        parsedSalesEstimate = Math.max(10, Math.round(150000 / Math.pow(parsedBsr, 0.45)));
      }
    }

    const parsedReviewVelocity = parsedSalesEstimate > 0 
      ? parseFloat(((parsedSalesEstimate * 0.015) / 30).toFixed(1)) 
      : 0;
    const parsedVariationCount = twister ? 3 : 0;

    console.log("[Scraper] Successfully scraped rich Amazon data:", {
      asin,
      title: cleanTitle,
      price: parsedPrice,
      rating: parsedRating,
      reviewCount: parsedReviewCount,
      bsr: parsedBsr,
      bsrCategory: mappedCategory,
      amazonChoice: parsedAmazonChoice,
      sellerCount: parsedSellerCount,
      fbaSellers: parsedFbaSellers,
      fbmSellers: parsedFbmSellers,
      variationCount: parsedVariationCount,
      qaCount: parsedQaCount,
      hasAplusContent: parsedHasAplusContent,
      hasVideo: parsedHasVideo,
      reviewVelocity: parsedReviewVelocity,
      salesEstimate: parsedSalesEstimate,
      imageUrl
    });

    return {
      asin,
      title: cleanTitle,
      price: parsedPrice,
      imageUrl,
      rating: parsedRating,
      reviewCount: parsedReviewCount,
      bsr: parsedBsr,
      amazonChoice: parsedAmazonChoice,
      sellerCount: parsedSellerCount,
      fbaSellers: parsedFbaSellers,
      fbmSellers: parsedFbmSellers,
      variationCount: parsedVariationCount,
      qaCount: parsedQaCount,
      hasAplusContent: parsedHasAplusContent,
      hasVideo: parsedHasVideo,
      reviewVelocity: parsedReviewVelocity,
      salesEstimate: parsedSalesEstimate,
      bsrCategory: mappedCategory
    };
  } catch (err: any) {
    console.error("[Scraper] Error in Microlink scraper:", err.message);
    return null;
  }
}

export interface PAAPISearchResult {
  totalResultCount: number;
  items: Array<{
    asin: string;
    title: string;
    brand?: string;
    price: number;
    imageUrl: string;
    rating: number;
    reviewCount: number;
    isPrime?: boolean;
  }>;
}

function extractSignedPaapiRequest() {
  const accessKey = env.awsAccessKey;
  const secretKey = env.awsSecretKey;
  const associateTag = env.associateTag;

  if (!accessKey || !secretKey || !associateTag) {
    throw new Error("PA-API credentials missing");
  }

  return { accessKey, secretKey, associateTag };
}

function getSignedPaapiRequest(host: string, region: string, path: string, target: string, payload: any) {
  const accessKey = env.awsAccessKey;
  const secretKey = env.awsSecretKey;
  if (!accessKey || !secretKey) {
    throw new Error("Missing AWS credentials for signing");
  }

  const service = "ProductAdvertisingAPI";
  const body = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const dateStamp = amzDate.substring(0, 8);

  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:${target}\n`;
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const payloadHash = sha256(body).toString("hex");
  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest).toString("hex")}`;

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign).toString("hex");

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    url: `https://${host}${path}`,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Host: host,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": target,
      Authorization: authorizationHeader,
    },
    body,
  };
}

export async function fetchListingsForKeyword(
  keyword: string,
  marketplace = "US",
  itemPage = 1
): Promise<PAAPISearchResult> {
  const accessKey = env.awsAccessKey;
  const secretKey = env.awsSecretKey;
  const rainforestApiKey = env.rainforestApiKey;
  const scraperApiKey = env.scraperApiKey;

  const associateTag = env.associateTag;

  if (!accessKey || !secretKey || !associateTag) {
    if (scraperApiKey) {
      console.log(`[Scraper] Using ScraperAPI for keyword search (PA-API keys missing).`);
      return fetchListingsWithScraperAPI(keyword, marketplace, itemPage, scraperApiKey);
    }
    if (rainforestApiKey) {
      console.log(`[Scraper] Using Rainforest API for keyword search (PA-API keys missing).`);
      return fetchListingsWithRainforest(keyword, marketplace, itemPage, rainforestApiKey);
    }
    throw new Error("PA-API credentials missing. Please configure AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AMAZON_ASSOCIATE_TAG, or use SCRAPER_API_KEY as an alternative.");
  }

  const { host, region } = getHostAndRegion(marketplace);
  const path = "/paapi5/searchitems";
  const target = "com.amazon.paapi5.v1.ProductAdvertisingAPIv5.SearchItems";

  const payload = {
    Keywords: keyword,
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "ItemInfo.ByLineInfo",
      "Offers.Listings.Price",
      "Offers.Listings.DeliveryInfo.IsPrimeEligible",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating",
    ],
    PartnerType: "Associates",
    PartnerTag: associateTag,
    ItemPage: itemPage,
  };

  const { url, headers, body } = getSignedPaapiRequest(host, region, path, target, payload);

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });
  } catch (error) {
    if (scraperApiKey) {
      console.log(`[Scraper] PA-API fetch failed. Falling back to ScraperAPI...`);
      return fetchListingsWithScraperAPI(keyword, marketplace, itemPage, scraperApiKey);
    }
    throw error;
  }

  if (!response.ok) {
    if (scraperApiKey) {
      console.log(`[Scraper] PA-API SearchItems failed (${response.status}). Falling back to ScraperAPI...`);
      return fetchListingsWithScraperAPI(keyword, marketplace, itemPage, scraperApiKey);
    }
    const errorText = await response.text();
    throw new Error(`PA-API SearchItems failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const result = data?.SearchResult;

  if (!result) {
    if (scraperApiKey) {
      console.log(`[Scraper] No search results from PA-API. Falling back to ScraperAPI...`);
      return fetchListingsWithScraperAPI(keyword, marketplace, itemPage, scraperApiKey);
    }
    throw new Error(`No search results for keyword "${keyword}"`);
  }

  const totalResultCount = result.TotalResultCount ?? 0;
  const items = (result.Items ?? []).map((item: any) => ({
    asin: item.ASIN,
    title: item.ItemInfo?.Title?.DisplayValue ?? "Unknown",
    brand: item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue,
    price: item.Offers?.Listings?.[0]?.Price?.Amount ?? 0,
    imageUrl: item.Images?.Primary?.Large?.URL ?? "",
    rating: item.CustomerReviews?.StarRating ?? 0,
    reviewCount: item.CustomerReviews?.Count ?? 0,
    isPrime: item.Offers?.Listings?.[0]?.DeliveryInfo?.IsPrimeEligible ?? false,
  }));

  return { totalResultCount, items };
}

export async function fetchAmazonProduct(asin: string, marketplace = "US"): Promise<PAAPIProduct> {
  const accessKey = env.awsAccessKey;
  const secretKey = env.awsSecretKey;
  const associateTag = env.associateTag;

  const scraperApiKey = env.scraperApiKey;

  // Fallback to ScraperAPI or Microlink if credentials are missing
  if (!accessKey || !secretKey || !associateTag) {
    if (scraperApiKey) {
      console.log(`[Scraper] Using ScraperAPI for product fetch (PA-API keys missing).`);
      return fetchProductWithScraperAPI(asin, marketplace, scraperApiKey);
    }

    console.warn("PA-API Credentials missing. Falling back to Microlink live scraper.");
    const scraped = await fetchWithMicrolink(asin, marketplace);
    if (scraped) {
      return scraped;
    }

    console.warn("Scraper fallback failed.");
    throw new Error("Unable to scrape Amazon product details (Microlink/ScraperAPI failed). Please verify the URL/ASIN or enter specifications manually.");
  }

  const { host, region } = getHostAndRegion(marketplace);
  const path = "/paapi5/getitems";
  const service = "ProductAdvertisingAPI";
  
  const payload = {
    ItemIds: [asin],
    Resources: [
      "Images.Primary.Large",
      "ItemInfo.Title",
      "Offers.Listings.Price",
      "CustomerReviews.Count",
      "CustomerReviews.StarRating"
    ],
    PartnerType: "Associates",
    PartnerTag: associateTag
  };

  const body = JSON.stringify(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const dateStamp = amzDate.substring(0, 8);

  const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv5.GetItems\n`;
  const signedHeaders = "content-type;host;x-amz-date;x-amz-target";
  const payloadHash = sha256(body).toString("hex");
  const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest).toString("hex")}`;

  const signingKey = getSignatureKey(secretKey, dateStamp, region, service);
  const signature = hmac(signingKey, stringToSign).toString("hex");

  const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const url = `https://${host}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Host: host,
      "X-Amz-Date": amzDate,
      "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv5.GetItems",
      Authorization: authorizationHeader,
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Amazon PA-API fetch failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  const items = data?.ItemsResult?.Items;
  if (!items || items.length === 0) {
    throw new Error(`Product with ASIN ${asin} not found via PA-API.`);
  }

  const item = items[0];
  const title = item.ItemInfo?.Title?.DisplayValue || "Unknown Product";
  const imageUrl = item.Images?.Primary?.Large?.URL || "";
  const price = item.Offers?.Listings?.[0]?.Price?.Amount || 0;
  const rating = item.CustomerReviews?.StarRating || 4.2;
  const reviewCount = item.CustomerReviews?.Count || 100;

  return {
    asin,
    title,
    price: parseFloat(String(price)),
    imageUrl,
    rating: parseFloat(String(rating)),
    reviewCount: parseInt(String(reviewCount)),
  };
}

async function fetchListingsWithRainforest(keyword: string, marketplace: string, itemPage: number, apiKey: string): Promise<PAAPISearchResult> {
  const domainMap: Record<string, string> = {
    US: "amazon.com", UK: "amazon.co.uk", DE: "amazon.de", CA: "amazon.ca",
    FR: "amazon.fr", IT: "amazon.it", ES: "amazon.es", JP: "amazon.co.jp"
  };
  const domain = domainMap[marketplace.toUpperCase()] || "amazon.com";
  
  const params = new URLSearchParams({
    api_key: apiKey,
    type: "search",
    amazon_domain: domain,
    search_term: keyword,
    page: String(itemPage)
  });

  const url = `https://api.rainforestapi.com/request?${params.toString()}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Rainforest API failed: ${res.status}`);
  }
  
  const json = (await res.json()) as any;
  if (!json.search_results) {
    throw new Error("No search results from Rainforest API");
  }

  const items = json.search_results.map((item: any) => ({
    asin: item.asin || "",
    title: item.title || "Unknown",
    brand: item.brand,
    price: item.price?.value || 0,
    imageUrl: item.image || "",
    rating: item.rating || 0,
    reviewCount: item.ratings_total || 0,
    isPrime: !!item.is_prime
  }));

  return {
    totalResultCount: json.search_results.length * 10,
    items
  };
}

async function fetchListingsWithScraperAPI(keyword: string, marketplace: string, itemPage: number, apiKey: string): Promise<PAAPISearchResult> {
  const domainMap: Record<string, string> = {
    US: "amazon.com", UK: "amazon.co.uk", DE: "amazon.de", CA: "amazon.ca",
    FR: "amazon.fr", IT: "amazon.it", ES: "amazon.es", JP: "amazon.co.jp"
  };
  const domain = domainMap[marketplace.toUpperCase()] || "amazon.com";
  
  const targetUrl = `https://www.${domain}/s?k=${encodeURIComponent(keyword)}&page=${itemPage}`;
  
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    autoparse: "true"
  });

  const url = `https://api.scraperapi.com/?${params.toString()}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ScraperAPI failed: ${res.status}`);
  }
  
  const json = (await res.json()) as any;
  if (!json || !json.results) {
    throw new Error("No search results from ScraperAPI");
  }

  const items = json.results.map((item: any) => ({
    asin: item.asin || "",
    title: item.name || "Unknown",
    brand: item.brand,
    price: item.price || 0,
    imageUrl: item.image || "",
    rating: item.stars || 0,
    reviewCount: item.total_reviews || 0,
    isPrime: !!item.is_prime
  }));

  return {
    totalResultCount: items.length * 10,
    items
  };
}

export async function fetchProductWithScraperAPI(asin: string, marketplace: string, apiKey: string): Promise<PAAPIProduct> {
  const domainMap: Record<string, string> = {
    US: "amazon.com", UK: "amazon.co.uk", DE: "amazon.de", CA: "amazon.ca",
    FR: "amazon.fr", IT: "amazon.it", ES: "amazon.es", JP: "amazon.co.jp"
  };
  const domain = domainMap[marketplace.toUpperCase()] || "amazon.com";
  
  const targetUrl = `https://www.${domain}/dp/${asin}`;
  
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    autoparse: "true"
  });

  const url = `https://api.scraperapi.com/?${params.toString()}`;
  
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`ScraperAPI failed to fetch product: ${res.status}`);
  }
  
  const json = (await res.json()) as any;
  if (!json || (!json.name && !json.title)) {
    throw new Error("No product data found from ScraperAPI");
  }

  return {
    asin: asin,
    title: json.name || json.title || "Unknown",
    brand: json.brand || "Unknown",
    price: json.price || 0,
    imageUrl: json.image || json.images?.[0] || "",
    rating: json.stars || json.rating || 0,
    reviewCount: json.total_reviews || json.reviews_total || 0,
    isPrime: !!json.is_prime
  };
}
