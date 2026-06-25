import { type NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";
export declare let pool: pg.Pool;
export declare let db: NodePgDatabase<typeof schema>;
export * from "./schema";
//# sourceMappingURL=index.d.ts.map