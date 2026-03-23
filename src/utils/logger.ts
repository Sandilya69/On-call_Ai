import pino from "pino";
const isProduction = process.env["NODE_ENV"] === "production";
export const logger = pino({
  level: process.env["LOG_LEVEL"] || "info",
  ...(isProduction
    ? { formatters: { level: (label: string) => ({ level: label }) }, timestamp: pino.stdTimeFunctions.isoTime }
    : { transport: { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" } } }),
  base: { service: "oncall-maestro" },
});
