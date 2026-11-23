import { Prisma } from "@prisma/client";
import { normalizeSearchText } from "shared";

const vietnamese = "àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
const combiningMarks = Array.from({ length: 0x70 }, (_, index) => String.fromCharCode(0x300 + index)).join("");

/** Parameterized accent-insensitive search using built-in PostgreSQL functions. */
export function sqlSearchText(expression: Prisma.Sql, query: string): Prisma.Sql {
  const words = normalizeSearchText(query).split(" ").filter(Boolean);
  if (!words.length) return Prisma.sql`TRUE`;
  const normalized = Prisma.sql`translate(lower(${expression}), ${vietnamese + combiningMarks}, ${normalizeSearchText(vietnamese)})`;
  const literal = normalizeSearchText(query).replace(/[\\%_]/g, "\\$&");
  const phrase = Prisma.sql`${normalized} LIKE ${`%${literal}%`}`;
  if (words.length === 1) return phrase;
  const tokens = words.map(word => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return Prisma.sql`${normalized} ~ ${`(^|[^a-z0-9])${escaped}`}`;
  });
  return Prisma.sql`(${phrase} OR (${Prisma.join(tokens, " AND ")}))`;
}
