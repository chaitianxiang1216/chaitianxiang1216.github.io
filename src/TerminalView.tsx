import { useEffect, useRef } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import {
  COMMANDS,
  getCommandHint,
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

export function TerminalView() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
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

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(host);

    let page = getInitialPage();
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

    const scrollToBottom = () => {
      terminal.scrollToBottom();
      requestAnimationFrame(() => {
        terminal.scrollToBottom();
        requestAnimationFrame(() => terminal.scrollToBottom());
      });
    };

    const writePrompt = () => {
      terminal.write(getPrompt(page), scrollToBottom);
    };

    const replaceInput = (nextInput: string) => {
      terminal.write("\b \b".repeat(input.length));
      input = nextInput;
      terminal.write(input);
    };

    const showPage = (nextPage: CommandName) => {
      page = nextPage;
      document.title = getPageTitle(page);
      window.history.replaceState(
        null,
        "",
        page === "index" ? window.location.pathname : `#${page}`,
      );
      terminal.write(CLEAR_SCREEN);
      terminal.write(`${getPageOutput(page)}\r\n\r\n`);
      writePrompt();
    };

    const showCommandNotFound = (command: string) => {
      terminal.write(
        `\r\n\x1b[38;5;1mcommand not found:\x1b[0m ${command}\r\n` +
          `Try: ${COMMANDS.join(", ")}.\r\n\r\n`,
      );
      writePrompt();
    };

    const submitCommand = () => {
      const command = input.trim().toLowerCase();
      terminal.write("\r\n");
      input = "";

      if (!command) {
        writePrompt();
        return;
      }

      history.push(command);
      historyIndex = history.length;

      if (isCommand(command)) {
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
        terminal.write(`${getPageOutput(page)}\r\n\r\n`);
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

    terminal.write(CLEAR_SCREEN);
    terminal.write(`${getPageOutput(page)}\r\n\r\n`);
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
      terminal.dispose();
    };
  }, []);

  return <div className="terminal-host" ref={hostRef} aria-label="Interactive terminal" />;
}
