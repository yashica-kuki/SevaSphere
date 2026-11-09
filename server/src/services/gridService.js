import { prisma } from "../config/prisma.js";
import { HttpError } from "../utils/httpError.js";

/**
 * Translates AG Grid (Community, Infinite Row Model) requests into Prisma queries.
 * Only whitelisted columns can be sorted/filtered, which prevents arbitrary field access.
 *
 * columns: { fieldName: { path: "a.b.c", type: "text"|"number"|"date"|"enum"|"bool", scale?: 100 } }
 */
const nest = (path, leaf) => path.split(".").reduceRight((acc, key) => ({ [key]: acc }), leaf);

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  try {
    return typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    throw new HttpError(400, "Invalid grid request");
  }
};

const toValue = (col, raw) => {
  if (col.type === "number") {
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new HttpError(400, "Invalid numeric filter");
    // Money columns are shown in rupees but stored as BigInt paise.
    return col.scale ? BigInt(Math.round(n * col.scale)) : col.bigint ? BigInt(Math.trunc(n)) : n;
  }
  if (col.type === "date") {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) throw new HttpError(400, "Invalid date filter");
    return d;
  }
  if (col.type === "bool") return raw === true || raw === "true";
  return String(raw);
};

const singleFilter = (col, f) => {
  const op = f.type;
  if (col.type === "text" || col.type === "enum") {
    const v = String(f.filter ?? "");
    const mode = col.type === "enum" ? undefined : "insensitive";
    const base = { mode };
    switch (op) {
      case "equals": return col.type === "enum" ? { equals: v } : { equals: v, ...base };
      case "notEqual": return { not: v };
      case "startsWith": return { startsWith: v, ...base };
      case "endsWith": return { endsWith: v, ...base };
      case "notContains": return { not: { contains: v, ...base } };
      case "blank": return null;
      default: return col.type === "enum" ? { equals: v } : { contains: v, ...base };
    }
  }
  if (col.type === "number") {
    const v = toValue(col, f.filter);
    switch (op) {
      case "notEqual": return { not: v };
      case "lessThan": return { lt: v };
      case "lessThanOrEqual": return { lte: v };
      case "greaterThan": return { gt: v };
      case "greaterThanOrEqual": return { gte: v };
      case "inRange": return { gte: v, lte: toValue(col, f.filterTo) };
      default: return { equals: v };
    }
  }
  if (col.type === "date") {
    const from = toValue(col, f.dateFrom ?? f.filter);
    const dayEnd = (d) => new Date(d.getTime() + 24 * 3600 * 1000);
    switch (op) {
      case "lessThan": return { lt: from };
      case "greaterThan": return { gte: dayEnd(from) };
      case "inRange": return { gte: from, lt: dayEnd(toValue(col, f.dateTo)) };
      case "notEqual": return { OR: [{ lt: from }, { gte: dayEnd(from) }] };
      default: return { gte: from, lt: dayEnd(from) };
    }
  }
  if (col.type === "bool") return { equals: toValue(col, f.filter) };
  return null;
};

const buildFilter = (col, model) => {
  const conditions = model.conditions ?? [model];
  const parts = conditions
    .map((c) => {
      const cond = singleFilter(col, c);
      if (cond === null) return null;
      // `not`-style wrappers and `OR` helpers are passed through as the value
      return cond.OR ? { OR: cond.OR.map((x) => nest(col.path, x)) } : nest(col.path, cond);
    })
    .filter(Boolean);
  if (!parts.length) return null;
  return parts.length === 1 ? parts[0] : { [model.operator === "OR" ? "OR" : "AND"]: parts };
};

export const buildQuery = (query, { columns, searchFields = [], defaultSort = { field: "createdAt", dir: "desc" } }) => {
  const filterModel = parseJson(query.filterModel, {});
  const sortModel = parseJson(query.sortModel, []);
  const and = [];

  for (const [field, model] of Object.entries(filterModel)) {
    const col = columns[field];
    if (!col) continue; // ignore unknown columns rather than exposing arbitrary fields
    const clause = buildFilter(col, model);
    if (clause) and.push(clause);
  }

  const search = String(query.search ?? "").trim().slice(0, 100);
  if (search && searchFields.length) {
    and.push({ OR: searchFields.map((path) => nest(path, { contains: search, mode: "insensitive" })) });
  }

  const orderBy = [];
  for (const s of Array.isArray(sortModel) ? sortModel : []) {
    const col = columns[s.colId];
    if (col && (s.sort === "asc" || s.sort === "desc")) orderBy.push(nest(col.path, s.sort));
  }
  if (!orderBy.length) {
    const col = columns[defaultSort.field];
    orderBy.push(col ? nest(col.path, defaultSort.dir) : { createdAt: "desc" });
  }
  orderBy.push({ id: "asc" }); // stable pagination
  return { and, orderBy };
};

const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
};

export const toCsv = (headers, rows) =>
  [headers.map((h) => csvCell(h.headerName)).join(","), ...rows.map((r) => headers.map((h) => csvCell(r[h.field])).join(","))].join("\r\n");

/**
 * Creates an Express handler for one grid.
 * base(req) -> Promise<prisma where> restricting rows to what the caller may see (role-based access).
 */
export const createGridHandler = ({ model, columns, searchFields, defaultSort, base, select, include, mapRow, csvHeaders, filename }) =>
  async (req, res, next) => {
    try {
      const scope = (await base(req)) ?? {};
      const { and, orderBy } = buildQuery(req.query, { columns, searchFields, defaultSort });
      const where = { AND: [scope, ...and] };
      const delegate = prisma[model];
      const args = select ? { select } : include ? { include } : {};

      if (req.query.format === "csv") {
        const rows = await delegate.findMany({ where, orderBy, take: 10000, ...args });
        const headers = csvHeaders ?? [];
        const body = toCsv(headers, rows.map(mapRow));
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename ?? model}-${new Date().toISOString().slice(0, 10)}.csv"`);
        return res.send(body);
      }

      const startRow = Math.max(0, Number.parseInt(req.query.startRow, 10) || 0);
      const endRow = Math.min(startRow + 200, Math.max(startRow + 1, Number.parseInt(req.query.endRow, 10) || startRow + 50));
      const [rows, total] = await Promise.all([
        delegate.findMany({ where, orderBy, skip: startRow, take: endRow - startRow, ...args }),
        delegate.count({ where }),
      ]);
      res.json({ success: true, rows: rows.map(mapRow), total });
    } catch (error) {
      next(error);
    }
  };
