import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { fbaCalculations } from "@db/schema";
import { eq } from "drizzle-orm";
import { matchFeeRate } from "./queries/knowledge-base";

async function calculateFbaFees(
  marketplace: string,
  productSize: string,
  sellingPrice: number,
  category: string
) {
  let sizeTier = "large_standard";
  let weightOz = 16;
  if (productSize.includes("small_standard")) {
    sizeTier = "small_standard";
    weightOz = productSize.includes("12oz") ? 12 : 16;
  } else if (productSize.includes("large_standard")) {
    sizeTier = "large_standard";
    if (productSize.includes("1lb")) weightOz = 16;
    else if (productSize.includes("2lb")) weightOz = 32;
    else if (productSize.includes("3lb")) weightOz = 48;
  } else if (productSize.includes("oversize")) {
    sizeTier = "oversize";
    weightOz = 96; 
  }

  // 1. Referral fee
  const referralRate = await matchFeeRate(marketplace, "referral", category, null, sellingPrice);
  const referralFeeRate = referralRate ? parseFloat(String(referralRate.rateValue)) : 0.15;
  const referralFee = sellingPrice * referralFeeRate;

  // 2. Fulfillment fee
  const fbaRate = await matchFeeRate(marketplace, "fulfillment", null, weightOz, null, sizeTier);
  let fbaFee = fbaRate ? parseFloat(String(fbaRate.rateValue)) : 3.86;

  // Surcharges / Penalties
  // Fuel surcharge (3.5%)
  const fuelRate = await matchFeeRate(marketplace, "fuel_surcharge");
  const fuelSurcharge = fuelRate ? fbaFee * parseFloat(String(fuelRate.rateValue)) : fbaFee * 0.035;

  // Inbound placement fee
  const inboundRate = await matchFeeRate(marketplace, "inbound_placement");
  const inboundPlacementFee = inboundRate ? parseFloat(String(inboundRate.rateValue)) : 0.90;

  // Low-price FBA discount (for items priced under $10)
  let lowPriceDiscount = 0;
  if (sellingPrice < 10) {
    const discountRate = await matchFeeRate(marketplace, "low_price_fba_discount");
    lowPriceDiscount = discountRate ? parseFloat(String(discountRate.rateValue)) : 0.86;
  }

  // Aged-inventory fee (estimate or default)
  const agedRate = await matchFeeRate(marketplace, "aged_inventory");
  const agedInventoryFee = agedRate ? parseFloat(String(agedRate.rateValue)) : 0.50;

  // SIPP packaging penalty
  const sippRate = await matchFeeRate(marketplace, "sipp_packaging_penalty");
  const sippPenalty = sippRate ? parseFloat(String(sippRate.rateValue)) : 2.07;

  return {
    referralFee,
    fbaFee,
    fuelSurcharge,
    inboundPlacementFee,
    lowPriceDiscount,
    agedInventoryFee,
    sippPenalty,
  };
}

export const fbaRouter = createRouter({
  calculate: authedQuery
    .input(
      z.object({
        productId: z.number(),
        sellingPrice: z.number(),
        productCost: z.number(),
        shippingCost: z.number().default(1.50),
        category: z.string().default("most_categories"),
        productSize: z.string().default("large_standard_1lb"),
        ppcAcos: z.number().default(25),
        returnRate: z.number().default(5),
        monthlyStorageMonths: z.number().default(3),
        isPeakSeason: z.boolean().default(false),
        marketplace: z.string().default("US"),
      })
    )
    .mutation(async ({ input }) => {
      const {
        sellingPrice,
        productCost,
        shippingCost,
        category,
        productSize,
        ppcAcos,
        returnRate,
        monthlyStorageMonths,
        isPeakSeason,
        marketplace,
      } = input;

      const fees = await calculateFbaFees(marketplace, productSize, sellingPrice, category);

      // Storage fee
      const storageRateRecord = await matchFeeRate(
        marketplace,
        "storage",
        isPeakSeason ? "oct_dec" : "jan_sep"
      );
      const storageRate = storageRateRecord ? parseFloat(String(storageRateRecord.rateValue)) : (isPeakSeason ? 2.40 : 0.87);
      const storageFee = storageRate * monthlyStorageMonths;

      const ppcCost = sellingPrice * (ppcAcos / 100);
      const returnsCost = sellingPrice * (returnRate / 100);

      // Total costs including new fees
      const totalCosts =
        productCost +
        shippingCost +
        fees.referralFee +
        fees.fbaFee +
        fees.fuelSurcharge +
        fees.inboundPlacementFee +
        fees.agedInventoryFee +
        fees.sippPenalty -
        fees.lowPriceDiscount +
        storageFee +
        ppcCost +
        returnsCost;

      const netProfit = sellingPrice - totalCosts;
      const marginPercent = (netProfit / sellingPrice) * 100;

      const breakEvenAcos =
        ((sellingPrice - productCost - shippingCost - fees.referralFee - fees.fbaFee - fees.fuelSurcharge - fees.inboundPlacementFee - fees.agedInventoryFee - fees.sippPenalty + fees.lowPriceDiscount - storageFee - returnsCost) /
          sellingPrice) *
        100;

      const db = getDb();
      const insertData: any = {
        productId: input.productId,
        sellingPrice,
        productCost,
        shippingCost,
        referralFee: fees.referralFee,
        fbaFee: fees.fbaFee,
        storageFee,
        ppcCost,
        returnsCost,
        netProfit,
        marginPercent,
        breakEvenAcos,
        category,
        productSize,
      };
      const result = await db.insert(fbaCalculations).values(insertData).returning();

      return {
        calculation: result[0],
        breakdown: {
          sellingPrice,
          costs: {
            product: productCost,
            shipping: shippingCost,
            referral: fees.referralFee,
            fba: fees.fbaFee,
            fuelSurcharge: fees.fuelSurcharge,
            inboundPlacement: fees.inboundPlacementFee,
            lowPriceDiscount: fees.lowPriceDiscount,
            agedInventory: fees.agedInventoryFee,
            sippPenalty: fees.sippPenalty,
            storage: storageFee,
            ppc: ppcCost,
            returns: returnsCost,
          },
          totalCosts,
          netProfit,
          marginPercent,
          breakEvenAcos,
          recommendation:
            marginPercent >= 25
              ? "✅ ভাল মার্জিন (Good Margin)"
              : marginPercent >= 15
              ? "⚠️ গ্রহণযোগ্য (Acceptable)"
              : "❌ ঝুঁকিপূর্ণ (Risky)",
        },
      };
    }),

  getByProduct: authedQuery
    .input(z.object({ productId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(fbaCalculations)
        .where(eq(fbaCalculations.productId, input.productId))
        .orderBy(fbaCalculations.createdAt);
    }),
});
