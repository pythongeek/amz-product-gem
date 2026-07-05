import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { fbaCalculations } from "@db/schema";
import { eq } from "drizzle-orm";

const REFERRAL_FEES: Record<string, number> = {
  "most_categories": 0.15,
  "electronics": 0.08,
  "home_kitchen": 0.15,
  "clothing": 0.15,
  "jewelry": 0.20,
  "device_accessories": 0.45,
};

const FBA_FEES_2026 = {
  small_standard_12oz: 3.22,
  small_standard_16oz: 3.40,
  large_standard_1lb: 3.86,
  large_standard_2lb: 5.77,
  large_standard_3lb: 6.47,
  oversize_base: 9.00,
};

const STORAGE_FEES_2026 = {
  jan_sep: 0.87,
  oct_dec: 2.40,
};

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
      } = input;

      const referralFeeRate = REFERRAL_FEES[category] || 0.15;
      const referralFee = sellingPrice * referralFeeRate;

      const fbaFee =
        FBA_FEES_2026[productSize as keyof typeof FBA_FEES_2026] || 3.86;

      const storageRate = isPeakSeason
        ? STORAGE_FEES_2026.oct_dec
        : STORAGE_FEES_2026.jan_sep;
      const storageFee = storageRate * monthlyStorageMonths;

      const ppcCost = sellingPrice * (ppcAcos / 100);
      const returnsCost = sellingPrice * (returnRate / 100);

      const totalCosts =
        productCost +
        shippingCost +
        referralFee +
        fbaFee +
        storageFee +
        ppcCost +
        returnsCost;
      const netProfit = sellingPrice - totalCosts;
      const marginPercent = (netProfit / sellingPrice) * 100;

      const breakEvenAcos =
        ((sellingPrice - productCost - shippingCost - referralFee - fbaFee - storageFee - returnsCost) /
          sellingPrice) *
        100;

      const db = getDb();
      const insertData: any = {
        productId: input.productId,
        sellingPrice,
        productCost,
        shippingCost,
        referralFee,
        fbaFee,
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
            referral: referralFee,
            fba: fbaFee,
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
