import { sqliteTable, text, primaryKey } from "drizzle-orm/sqlite-core";

export const translationOverrides = sqliteTable("translation_overrides", {
  unit: text("unit").notNull(),
  term: text("term").notNull(),
  ru: text("ru").notNull(),
}, table => [primaryKey({ columns: [table.unit, table.term] })]);
