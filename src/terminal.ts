import { profile } from "./data/profile";

export const COMMANDS = ["index", "bio", "project", "award", "note"] as const;
export type CommandName = (typeof COMMANDS)[number];

const ESC = "\x1b[";
const RESET = `${ESC}0m`;
const BOLD = `${ESC}1m`;
const DIM = `${ESC}2m`;
const ITALIC = `${ESC}3m`;
const UNDERLINE = `${ESC}4m`;

const fg = (color: number, value: string) =>
  `${ESC}38;5;${color}m${value}${RESET}`;
const displayWidth = (value: string) =>
  Array.from(value).reduce(
    (width, character) =>
      width + (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe19\ufe30-\ufe6f\uff00-\uff60\uffe0-\uffe6]/u.test(character) ? 2 : 1),
    0,
  );
const black = (value: string) =>
  `${ESC}38;2;0;0;0m${value}${RESET}`;
const inkBlue = (value: string) =>
  `${ESC}38;2;15;35;70m${value}${RESET}`;
const bold = (value: string) => `${BOLD}${value}${RESET}`;
const dim = (value: string) => `${DIM}${value}${RESET}`;
const italic = (value: string) => `${ITALIC}${value}${RESET}`;
const underline = (value: string) => `${UNDERLINE}${value}${RESET}`;
const dashedUnderline = (value: string) => `${ESC}4:5m${value}${RESET}`;
const OSC = "\x1b]";
const ST = "\x1b\\";

const link = (label: string, target: string) =>
  `${OSC}8;;${target}${ST}${black(underline(label))}${OSC}8;;${ST}`;

const pageLink = (icon: string, command: CommandName) =>
  `${icon}  ${link(command, `command://${command}`)}`;

const BANNER = String.raw`▀▀█▀▀ ─▀─ █▀▀█ █▀▀▄ █─█ ─▀─ █▀▀█ █▀▀▄ █▀▀▀ 　 ░█▀▀█ █──█ █▀▀█ ─▀─ 
─░█── ▀█▀ █▄▄█ █──█ ▄▀▄ ▀█▀ █▄▄█ █──█ █─▀█ 　 ░█─── █▀▀█ █▄▄█ ▀█▀ 
─░█── ▀▀▀ ───▀ ───▀ ──▀ ▀▀▀ ───▀ ───▀ ▀▀▀▀ 　 ░█▄▄█ ───▀ ───▀ ▀▀▀`;

const heading = (title: string) => fg(62, bold(title));

const HOME_HEADER = `${profile.name}  ${profile.email}`;
const HOME_DIVIDER = "─".repeat(displayWidth(HOME_HEADER) + 2);

const renderHome = () =>
  [
    `${fg(62, bold(profile.name))}  ${dim(profile.email)}`,
    inkBlue(HOME_DIVIDER),
    "",
    black(BANNER),
    "",
    `${bold(profile.role)} · ${fg(240, dashedUnderline(profile.organization))}`,
    `${bold(profile.secondaryRole)} · ${fg(240, dashedUnderline(profile.secondaryOrganization))}`,
    "",
    `  ${pageLink("👤", "bio")}  ${dim("·")}  ${pageLink("💻", "project")}  ${dim("·")}  ${pageLink("🏆", "award")}  ${dim("·")}  ${pageLink("📝", "note")}`,
    "",
    `${dim("│")} ${profile.contactLabel}`,
    `${dim("│")} ${profile.location}`,
    "",
    italic(profile.headline),
    "",
    "  • This page doubles as an interactive shell.",
    `    Available commands: ${underline("index")}, ${underline("bio")}, ${underline("project")}, ${underline("award")}, ${underline("note")}.`,
    "",
    `Last update: ${profile.lastUpdated}`,
  ].join("\n");

const renderBio = () => {
  const paragraphs = profile.bio.flatMap((paragraph) => [paragraph, ""]);

  return [heading("BIO"), "", ...paragraphs].join("\n");
};

const renderProjects = () =>
  [
    heading("PROJECTS"),
    "",
    ...profile.projects.flatMap((project, index) => [
      `${fg(62, bold(`${index + 1}. ${project.name}`))}`,
      `   ${dim("技术栈:")} ${project.technology}`,
      `   ${dim("简介:")} ${project.summary}`,
      `   ${dim("职责描述:")}`,
      ...project.responsibility.map((item) => `     • ${item}`),
      "",
    ]),
  ].join("\n");

const renderAwards = () =>
  [
    heading("AWARDS"),
    "",
    ...profile.awards.map((award) => black(bold(`• ${award.title}`))),
  ].join("\n");

const renderNotes = () =>
  [
    heading("NOTES"),
    "",
    ...profile.notes.flatMap((note) => [
      `${fg(62, bold(note.title))}  ${dim(note.date)}`,
      `   ${dim("Tags:")} ${note.tags}`,
      `   ${note.summary}`,
      "",
    ]),
  ].join("\n");

export const getPageOutput = (page: CommandName): string => {
  switch (page) {
    case "bio":
      return renderBio();
    case "project":
      return renderProjects();
    case "award":
      return renderAwards();
    case "note":
      return renderNotes();
    case "index":
    default:
      return renderHome();
  }
};

export const getPrompt = (page: CommandName): string => {
  const path = page === "index" ? "/" : `/${page}`;
  return `${fg(62, bold(profile.handle))}:${fg(33, path)}${dim("$")} `;
};

export const getPageTitle = (page: CommandName): string =>
  `~${profile.handle}: ${page}`;

export const getCommandHint = (value: string): string | null => {
  const normalized = value.toLowerCase();
  const matches = COMMANDS.filter((command) => command.startsWith(normalized));

  return matches.length === 1 ? matches[0] : null;
};

export const isCommand = (value: string): value is CommandName =>
  COMMANDS.includes(value as CommandName);

