import { useEffect, useRef, useState } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import {
  getNoteByReference,
  readNoteHtml,
  readNoteText,
  resolveNoteDirectory,
} from "./notes_setting";
import {
  COMMANDS,
  getCommandHint,
  getNoteOutput,
  getPageOutput,
  getPageTitle,
  getPrompt,
  isCommand,
  type CommandName,
} from "./terminal";

const CLEAR_SCREEN = "\x1b[2J\x1b[3J\x1b[H";

const getInitialPage = (): CommandName => {
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  return isCommand(hash) ? hash : "index";
};

type NoteViewState = {
  title: string;
  html: string;
};

export function TerminalView() {
  const hostRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const returnToNotesRef = useRef<(() => void) | null>(null);
  const [noteView, setNoteView] = useState<NoteViewState | null>(null);

  const closeNoteView = () => {
    setNoteView(null);
    requestAnimationFrame(() => {
      returnToNotesRef.current?.();
      terminalRef.current?.focus();
    });
  };

  useEffect(() => {
    if (!noteView) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeNoteView();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [noteView]);

  useEffect(() => {
    const host = surfaceRef.current;
    if (!host) {
      return;
    }

    const terminal = new Terminal({
      allowTransparency: false,
      convertEol: true,
      cursorBlink: true,
      cursorStyle: "block",
      fontFamily:
        '"JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", monospace',
      fontSize: 16,
      fontWeight: "400",
      fontWeightBold: "700",
      letterSpacing: 0,
      lineHeight: 1.35,
      linkHandler: {
        allowNonHttpProtocols: true,
        activate: (event, uri) => {
          if (uri.startsWith("command://")) {
            const command = uri.slice("command://".length).toLowerCase();
            if (isCommand(command)) {
              event.preventDefault();
              if (command === "note") {
                noteDirectory = "";
              }
              showPage(command);
            }
            return;
          }

          if (/^https?:/i.test(uri)) {
            window.open(uri, "_blank", "noopener,noreferrer");
          }
        },
      },
      scrollback: 3000,
      scrollOnUserInput: true,
      theme: {
        background: "#fafafa",
        foreground: "#2e3338",
        cursor: "#4a5158",
        cursorAccent: "#fafafa",
        selectionBackground: "#d0d7de",
        black: "#2e3436",
        red: "#cc0000",
        green: "#4e9a06",
        yellow: "#c4a000",
        blue: "#3465a4",
        magenta: "#75507b",
        cyan: "#06989a",
        white: "#d3d7cf",
        brightBlack: "#555753",
        brightRed: "#ef2929",
        brightGreen: "#8ae234",
        brightYellow: "#fce94f",
        brightBlue: "#729fcf",
        brightMagenta: "#ad7fa8",
        brightCyan: "#34e2e2",
        brightWhite: "#eeeeec",
      },
    });

    terminalRef.current = terminal;
    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);

    let page = getInitialPage();
    let noteDirectory = "";
    let input = "";
    let historyIndex = 0;
    const history: string[] = [];

    const fit = () => {
      try {
        fitAddon.fit();
      } catch {
        // The terminal may not have measurable dimensions during page teardown.
      }
    };

    const updatePageLineHeight = (nextPage: CommandName) => {
      terminal.options.lineHeight = nextPage === "index" ? 1.2 : 1.35;
      fit();
    };

    const scrollToBottom = () => {
      terminal.scrollToBottom();
      requestAnimationFrame(() => {
        terminal.scrollToBottom();
        requestAnimationFrame(() => terminal.scrollToBottom());
      });
    };

    const writePrompt = () => {
      terminal.write(getPrompt(page, noteDirectory), scrollToBottom);
    };

    const replaceInput = (nextInput: string) => {
      terminal.write("\b \b".repeat(input.length));
      input = nextInput;
      terminal.write(input);
    };

    const showPage = (nextPage: CommandName) => {
      page = nextPage;
      updatePageLineHeight(page);
      document.title = getPageTitle(page);
      window.history.replaceState(
        null,
        "",
        page === "index" ? window.location.pathname : `#${page}`,
      );
      terminal.write(CLEAR_SCREEN);
      terminal.write(`${getPageOutput(page, noteDirectory)}\r\n\r\n`);
      writePrompt();
    };

    returnToNotesRef.current = () => showPage("note");

    const showNoteFile = async (reference: string, mode: "cat" | "read") => {
      const note = getNoteByReference(reference, noteDirectory);

      if (!note) {
        terminal.write(
          `\r\n${mode}: ${reference}: No such file or directory\r\n\r\n`,
        );
        writePrompt();
        return;
      }

      try {
        if (mode === "read") {
          const html = await readNoteHtml(note);
          terminal.write(CLEAR_SCREEN);
          writePrompt();
          setNoteView({ title: note.displayName, html });
          return;
        }

        const content = await readNoteText(note);
        terminal.write(CLEAR_SCREEN);
        terminal.write(`${getNoteOutput(note.displayName, content)}\r\n\r\n`);
        writePrompt();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unable to read file.";
        terminal.write(`\r\n${mode}: ${note.name}: ${message}\r\n\r\n`);
        writePrompt();
      }
    };

    const showCommandNotFound = (command: string) => {
      terminal.write(
        `\r\n\x1b[38;5;1mcommand not found:\x1b[0m ${command}\r\n` +
          `Try: ${COMMANDS.join(", ")}.\r\n\r\n`,
      );
      writePrompt();
    };

    const submitCommand = () => {
      const rawCommand = input.trim();
      const command = rawCommand.toLowerCase();
      terminal.write("\r\n");
      input = "";

      if (!command) {
        writePrompt();
        return;
      }

      if (command === "clear") {
        history.length = 0;
        historyIndex = 0;
        showPage(page);
        return;
      }

      history.push(rawCommand);
      historyIndex = history.length;

      if (page === "note") {
        const cdMatch = rawCommand.match(/^cd(?:\s+(.+))?$/i);
        if (cdMatch) {
          const target = (cdMatch[1] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");
          const nextDirectory = resolveNoteDirectory(noteDirectory, target);

          if (nextDirectory === undefined) {
            terminal.write(`\r\ncd: ${target || "/"}: No such file or directory\r\n\r\n`);
            writePrompt();
            return;
          }

          noteDirectory = nextDirectory;
          showPage("note");
          return;
        }

        if (/^ls\s*$/i.test(rawCommand)) {
          showPage("note");
          return;
        }

        const noteCommand = rawCommand.match(/^(cat|read)(?:\s+(.+))?$/i);
        if (noteCommand) {
          const mode = noteCommand[1].toLowerCase() as "cat" | "read";
          const name = (noteCommand[2] ?? "").trim().replace(/^(["'])(.*)\1$/, "$2");

          if (!name) {
            terminal.write(`usage: ${mode} <filename>\r\n\r\n`);
            writePrompt();
            return;
          }

          void showNoteFile(name, mode);
          return;
        }
      }

      if (isCommand(command)) {
        if (command === "note") {
          noteDirectory = "";
        }
        showPage(command);
        return;
      }

      showCommandNotFound(command);
    };

    const onData = terminal.onData((data) => {
      if (data === "\r") {
        submitCommand();
        return;
      }

      if (data === "\u007f") {
        if (input.length > 0) {
          input = input.slice(0, -1);
          terminal.write("\b \b");
        }
        return;
      }

      if (data === "\x03") {
        terminal.write("^C\r\n");
        input = "";
        writePrompt();
        return;
      }

      if (data === "\x0c") {
        terminal.write(CLEAR_SCREEN);
        terminal.write(`${getPageOutput(page, noteDirectory)}\r\n\r\n`);
        writePrompt();
        return;
      }

      if (data === "\t") {
        const hint = getCommandHint(input);
        if (hint && hint !== input) {
          replaceInput(hint);
        }
        return;
      }

      if (data === "\x1b[A" || data === "\x1b[B") {
        if (history.length === 0) {
          return;
        }

        if (data === "\x1b[A") {
          historyIndex = Math.max(0, historyIndex - 1);
        } else {
          historyIndex = Math.min(history.length, historyIndex + 1);
        }

        replaceInput(history[historyIndex] ?? "");
        return;
      }

      const printable = Array.from(data).filter(
        (character) => character >= " " && character !== "\u007f",
      );
      if (printable.length > 0) {
        const nextInput = printable.join("");
        input += nextInput;
        terminal.write(nextInput);
      }
    });

    const onChange = () => fit();
    const resizeObserver = new ResizeObserver(onChange);
    resizeObserver.observe(host);
    window.addEventListener("resize", onChange);
    host.addEventListener("pointerdown", () => terminal.focus());

    updatePageLineHeight(page);
    terminal.write(CLEAR_SCREEN);
    terminal.write(`${getPageOutput(page, noteDirectory)}\r\n\r\n`);
    writePrompt();
    document.title = getPageTitle(page);
    requestAnimationFrame(() => {
      fit();
      terminal.focus();
    });

    return () => {
      onData.dispose();
      resizeObserver.disconnect();
      window.removeEventListener("resize", onChange);
      terminalRef.current = null;
      returnToNotesRef.current = null;
      terminal.dispose();
    };
  }, []);

  return (
    <div className="terminal-host" ref={hostRef}>
      <div
        className="terminal-surface"
        ref={surfaceRef}
        aria-label="Interactive terminal"
      />

      {noteView && (
        <section
          className="note-viewer"
          role="dialog"
          aria-modal="true"
          aria-label={noteView.title}
        >
          <header className="note-viewer__toolbar">
            <strong>{noteView.title}</strong>
            <button type="button" onClick={closeNoteView}>
              返回终端
            </button>
          </header>
          <article
            className="note-viewer__content"
            dangerouslySetInnerHTML={{ __html: noteView.html }}
          />
        </section>
      )}
    </div>
  );
}