import type { Express } from "express";
import type { Server } from "http";
import { registerAppRoutes } from "./routers";

/**
 * @deprecated Use registerAppRoutes from './routers' instead
 */
export async function registerRoutes(app: Express): Promise<Server> {
  return registerAppRoutes(app);
}
