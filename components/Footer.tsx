import { Icon } from "@/components/Icon";
import { project } from "@/config/project";

const footerLinks = [
  { label: "Product", href: "#product" },
  { label: "Markets", href: "#markets" },
  { label: "Onchain", href: "#onchain" },
  { label: "Leaderboard", href: "#leaderboard" },
  { label: "FAQ", href: "#faq" },
] as const;

export function Footer() {
  return (
    <footer className="site-footer section-shell">
      <div className="site-footer__main">
        <a className="site-footer__brand" href="#top" aria-label="LIEND home">
          <span>{project.name}</span>
        </a>

        <nav className="site-footer__nav" aria-label="Footer navigation">
          {footerLinks.map((link) => (
            <a href={link.href} key={link.label}>
              {link.label}
            </a>
          ))}
          <a
            href={project.docsUrl || "#"}
            target={project.docsUrl ? "_blank" : undefined}
            rel={project.docsUrl ? "noreferrer" : undefined}
            aria-disabled={!project.docsUrl || undefined}
          >
            Docs
          </a>
        </nav>

        <nav className="site-footer__social" aria-label="LIEND social links">
          <a
            href={project.xUrl || "#"}
            target={project.xUrl ? "_blank" : undefined}
            rel={project.xUrl ? "noreferrer" : undefined}
            aria-disabled={!project.xUrl || undefined}
            aria-label="LIEND on X"
          >
            <Icon name="x" size={17} />
            <span>X</span>
          </a>
          <a
            href={project.pumpUrl || "#"}
            target={project.pumpUrl ? "_blank" : undefined}
            rel={project.pumpUrl ? "noreferrer" : undefined}
            aria-disabled={!project.pumpUrl || undefined}
            aria-label="LIEND on Pump.fun"
          >
            <Icon name="pump-fun" size={18} />
            <span>Pump.fun</span>
          </a>
        </nav>
      </div>

      <div className="site-footer__meta">
        <div className="site-footer__network">
          <span className="status-dot" aria-hidden="true" />
          <span>Network</span>
          <strong>{project.network}</strong>
        </div>
        <p>{project.name} utility interface</p>
        <p>{project.status} environment</p>
      </div>
    </footer>
  );
}
