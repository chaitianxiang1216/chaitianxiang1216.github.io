declare module "node:fs/promises" {
  export function readdir(
    path: string,
    options: { withFileTypes: true },
  ): Promise<Array<{ name: string; isDirectory(): boolean }>>;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export const sep: string;
}

declare module "virtual:notes-directories" {
  export const directoryPaths: string[];
}

declare const process: {
  cwd(): string;
};