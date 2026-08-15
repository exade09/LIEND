import { Icon } from "@/components/Icon";
import { project } from "@/config/project";

export function FinalCTA() {
  return (
    <section
      className="final-cta section-shell"
      id="launch"
      aria-labelledby="final-cta-title"
    >
      <div className="edge-surface edge-surface--violet" aria-hidden="true" />
      <div className="edge-surface edge-surface--cyan" aria-hidden="true" />

      <div className="final-cta__content">
        <p className="eyebrow">
          LEND {"\u2022"} BORROW {"\u2022"} BUILD
        </p>
        <h2 className="liquid-display" id="final-cta-title">
          <span>KEEP THE POSITION</span>
          {" "}
          <span>ACCESS THE LIQUIDITY</span>
        </h2>
        <p className="final-cta__copy">
          A second route for supported migrated token positions on Solana
        </p>

        <div className="final-cta__actions">
          <a className="button button--primary" href="#app">
            Launch App
            <Icon name="arrow" size={18} />
          </a>
          <a
            className="button button--secondary"
            href={project.pumpUrl || "#holder-access"}
            target={project.pumpUrl ? "_blank" : undefined}
            rel={project.pumpUrl ? "noreferrer" : undefined}
          >
            <Icon name="pump-fun" size={18} />
            Get LIEND
          </a>
        </div>

        <nav className="final-cta__links" aria-label="LIEND external links">
          <a
            href={project.pumpUrl || "#"}
            target={project.pumpUrl ? "_blank" : undefined}
            rel={project.pumpUrl ? "noreferrer" : undefined}
            aria-disabled={!project.pumpUrl || undefined}
          >
            <Icon name="pump-fun" size={17} />
            Pump.fun
          </a>
          <a
            href={project.xUrl || "#"}
            target={project.xUrl ? "_blank" : undefined}
            rel={project.xUrl ? "noreferrer" : undefined}
            aria-disabled={!project.xUrl || undefined}
          >
            <Icon name="x" size={16} />
            X
          </a>
          <a
            href={project.docsUrl || "#"}
            target={project.docsUrl ? "_blank" : undefined}
            rel={project.docsUrl ? "noreferrer" : undefined}
            aria-disabled={!project.docsUrl || undefined}
          >
            <Icon name="docs" size={17} />
            Docs
          </a>
        </nav>
      </div>
    </section>
  );
}
