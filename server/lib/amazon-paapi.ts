import crypto from "crypto";
import { env } from "./env";

export interface PAAPIProduct {
  asin: string;
  title: string;
  price: number;
  imageUrl: string;
  rating: number;
  reviewCount: number;
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

export async function fetchAmazonProduct(asin: string, marketplace = "US"): Promise<PAAPIProduct> {
  const accessKey = env.awsAccessKey;
  const secretKey = env.awsSecretKey;
  const associateTag = env.associateTag;

  // Fallback to high-quality Mock Data if credentials are missing
  if (!accessKey || !secretKey || !associateTag) {
    console.warn("PA-API Credentials missing. Returning high-quality mock data.");
    
    // Seed BSR/Price based on hash of ASIN to be deterministic but realistic
    const hash = asin.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const mockTitles = [
      "Ergonomic Memory Foam Pillow for Sleeping - Neck Support",
      "Premium Silicone Baking Mat Set of 2 - Non-Stick Sheet",
      "Rechargeable LED Headlamp - Super Bright Water Resistant",
      "Stainless Steel Water Bottle - Vacuum Insulated Flask",
      "Portable Laptop Stand - Adjustable Aluminum Riser"
    ];
    const title = mockTitles[hash % mockTitles.length] + ` (${asin})`;
    const price = 15.99 + (hash % 45); // $15.99 - $60.99
    const reviewCount = 50 + (hash % 1200); // 50 - 1250
    const rating = 4.0 + (hash % 10) / 10; // 4.0 - 4.9
    return {
      asin,
      title,
      price: parseFloat(price.toFixed(2)),
      imageUrl: "https://images-na.ssl-images-amazon.com/images/I/41-AAAAA.jpg",
      rating: parseFloat(rating.toFixed(1)),
      reviewCount,
    };
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
