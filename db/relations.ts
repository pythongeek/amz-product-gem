import { relations } from "drizzle-orm";
import {
  users,
  products,
  productScores,
  reports,
  fbaCalculations,
  alerts,
  launchStrategies,
  folders,
} from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  products: many(products),
  reports: many(reports),
  alerts: many(alerts),
  launchStrategies: many(launchStrategies),
  folders: many(folders),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  user: one(users, { fields: [products.userId], references: [users.id] }),
  scores: many(productScores),
  reports: many(reports),
  fbaCalculations: many(fbaCalculations),
  alerts: many(alerts),
  launchStrategies: many(launchStrategies),
}));

export const productScoresRelations = relations(productScores, ({ one }) => ({
  product: one(products, {
    fields: [productScores.productId],
    references: [products.id],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  product: one(products, { fields: [reports.productId], references: [products.id] }),
  user: one(users, { fields: [reports.userId], references: [users.id] }),
}));

export const fbaCalculationsRelations = relations(fbaCalculations, ({ one }) => ({
  product: one(products, {
    fields: [fbaCalculations.productId],
    references: [products.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  product: one(products, { fields: [alerts.productId], references: [products.id] }),
  user: one(users, { fields: [alerts.userId], references: [users.id] }),
}));

export const launchStrategiesRelations = relations(launchStrategies, ({ one }) => ({
  product: one(products, {
    fields: [launchStrategies.productId],
    references: [products.id],
  }),
  user: one(users, { fields: [launchStrategies.userId], references: [users.id] }),
}));

export const foldersRelations = relations(folders, ({ one }) => ({
  user: one(users, { fields: [folders.userId], references: [users.id] }),
}));
