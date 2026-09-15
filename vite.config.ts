import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const VIRTUAL_NOTES_DIRECTORIES = "virtual:notes-directories";
const RESOLVED_NOTES_DIRECTORIES = `\0${VIRTUAL_NOTES_DIRECTORIES}`;

const collectDirectories = async (
  root: string,
  current = root,
): Promise<string[]> => {
  const entries = await readdir(current, { withFileTypes: true });
  const directories: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const absolutePath = join(current, entry.name);
    const relativePath = relative(root, absolutePath).split(sep).join("/");
    directories.push(
      relativePath,
      ...(await collectDirectories(root, absolutePath)),
    );
  }

  return directories;
};

const notesDirectoriesPlugin = (): Plugin => {
  const notesRoot = join(process.cwd(), "src", "data", "notes");

  return {
    name: "notes-directories",
    resolveId(id) {
      return id === VIRTUAL_NOTES_DIRECTORIES
        ? RESOLVED_NOTES_DIRECTORIES
        : undefined;
    },
    async load(id) {
      if (id !== RESOLVED_NOTES_DIRECTORIES) {
        return undefined;
      }

      const directories = await collectDirectories(notesRoot).catch(() => []);
      return `export const directoryPaths = ${JSON.stringify(directories)};`;
    },
    configureServer(server) {
      const refreshDirectories = (file: string) => {
        if (!file.startsWith(notesRoot)) {
          return;
        }

        const module = server.moduleGraph.getModuleById(
          RESOLVED_NOTES_DIRECTORIES,
        );
        if (module) {
          server.moduleGraph.invalidateModule(module);
        }
        server.ws.send({ type: "full-reload" });
      };

      server.watcher.add(notesRoot);
      server.watcher.on("addDir", refreshDirectories);
      server.watcher.on("unlinkDir", refreshDirectories);
      server.watcher.on("add", refreshDirectories);
      server.watcher.on("unlink", refreshDirectories);
    },
  };
};

export default defineConfig({
  plugins: [notesDirectoriesPlugin(), react()],
});