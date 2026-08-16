export const project = {
  name: "LIEND",
  ticker: "LIEND",
  network: "Solana",
  cluster: "mainnet-beta",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://liend.xyz",
  // Replace these service-root placeholders with the official LIEND destinations
  pumpUrl: "https://pump.fun/",
  xUrl: "https://x.com/",
  docsUrl: "https://www.gitbook.com/",
  explorerUrl: "https://solscan.io",
  contractAddress: "",
  status: "Testing",
  dataMode: "demo",
  access: {
    requiresLiend: true,
    minimumBalance: null,
  },
} as const;

export type ProjectConfig = typeof project;
