import Image from "next/image";
import Link from "next/link";
import { CaPlaque } from "@/components/CaPlaque";
import { Icon } from "@/components/Icon";
import { ProductLink } from "@/components/ProductLink";
import { PonsLink } from "@/components/PonsLink";
import { project } from "@/config/project";

const footerLinks = [
  { label: "Product", href: "/#product" },
  { label: "Markets", href: "/#markets" },
  { label: "Onchain", href: "/#onchain" },
  { label: "FAQ", href: "/#faq" },
  { label: "Docs", href: "/docs" },
  { label: "Privacy", href: "/privacy" },
] as const;

export function Footer({ initialMint = null }: { initialMint?: string | null }) {
  return (
    <footer className="site-footer">
      <div className="site-footer__shell">
        <div className="site-footer__main">
          <Link className="site-footer__brand" href="/" aria-label="LONS home">
            <Image src="/assets/lons-mark.png" alt="" width={64} height={64} />
            <span>LONS</span>
          </Link>

          <nav className="site-footer__nav" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <a href={link.href} key={link.label}>
                {link.label}
              </a>
            ))}
          </nav>

          <nav className="site-footer__social" aria-label="LONS social links">
            <ProductLink href={project.xUrl} aria-label="LONS on X">
              <Icon name="x" size={17} />
              <span>X</span>
            </ProductLink>
            <PonsLink aria-label="LONS on pons">
              <Icon name="pump-fun" size={18} />
              <span>pons</span>
            </PonsLink>
          </nav>
        </div>

        <div className="site-footer__ca">
          <CaPlaque variant="footer" initialMint={initialMint} />
        </div>

        <div className="site-footer__meta">
          <div className="site-footer__network">
            <span className="status-dot" aria-hidden="true" />
            <span>Network</span>
            <strong>{project.network}</strong>
          </div>
          <p>{project.name} utility interface</p>
        </div>
      </div>
    </footer>
  );
}
