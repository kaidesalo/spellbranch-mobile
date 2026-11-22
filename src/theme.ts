/**
 * Spellbranch's own chrome: ink on parchment, with a green branch.
 * The small mana pips use the familiar color for each letter so `{W}` is
 * readable. They are plain circles, not Wizards' mana font or icons.
 */
export const colors = {
  parchment: "#f4efe4",
  parchmentDeep: "#e6dcc8",
  ink: "#1c2430",
  muted: "#5c6770",
  card: "#fffdf8",
  line: "#ddd3c2",
  branch: "#1f6b4a",
  branchDark: "#143528",
  cream: "#f7f3ea",
  danger: "#8c2f2f",
  dangerBg: "#f8e6e2",
  warning: "#8a5a12",
  pip: {
    W: { background: "#f4efe4", text: "#1c2430", border: "#c9bfae" },
    U: { background: "#2f6fbe", text: "#ffffff", border: "#2f6fbe" },
    B: { background: "#2c3136", text: "#ffffff", border: "#2c3136" },
    R: { background: "#c4472f", text: "#ffffff", border: "#c4472f" },
    G: { background: "#2f6d3c", text: "#ffffff", border: "#2f6d3c" },
    C: { background: "#9aa3ad", text: "#1c2430", border: "#9aa3ad" },
  },
} as const;

export type PipLetter = keyof typeof colors.pip;
