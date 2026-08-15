import { Icon, type IconName } from "@/components/Icon";
import { project } from "@/config/project";

const architecture = [
  {
    label: "USER WALLET",
    description: "Wallet approval",
    icon: "wallet" as IconName,
  },
  {
    label: "LIEND INTERFACE",
    description: "Route configuration",
    icon: "transaction" as IconName,
  },
  {
    label: "POSITION CHECK",
    description: "Token and market verification",
    icon: "status" as IconName,
  },
  {
    label: "LIEND PROGRAM",
    description: "Borrow instruction",
    icon: "borrow" as IconName,
  },
  {
    label: "DEX / LIQUIDITY ROUTE",
    description: "Swap path when required",
    icon: "liquidity" as IconName,
  },
  {
    label: "SOL SETTLEMENT",
    description: "Liquidity returned to wallet",
    icon: "sol" as IconName,
  },
] as const;

export function ProtocolArchitecture() {
  return (
    <section
      className="protocol-architecture section-shell"
      id="onchain"
      aria-labelledby="protocol-architecture-title"
    >
      <header className="protocol-architecture__intro section-header">
        <p className="eyebrow section-eyebrow">ONCHAIN ARCHITECTURE</p>
        <h2 className="section-title" id="protocol-architecture-title">
          A visible path through Solana
        </h2>
        <p className="section-description">
          Each stage is designed to remain inspectable from position checks to
          settlement
        </p>
      </header>

      <div className="protocol-architecture__network" aria-label="Network">
        <Icon name="sol" size={18} aria-hidden="true" />
        <span>{project.network}</span>
      </div>

      <ol className="protocol-architecture__route">
        {architecture.map((node, index) => (
          <li className="protocol-architecture__node" key={node.label}>
            <div className="protocol-architecture__node-content">
              <Icon name={node.icon} size={22} aria-hidden="true" />
              <div>
                <h3>{node.label}</h3>
                <p>{node.description}</p>
              </div>
            </div>
            {index < architecture.length - 1 ? (
              <Icon
                className="protocol-architecture__arrow"
                name="arrow"
                size={18}
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>

      <p className="protocol-architecture__footnote">
        Swap routing appears only when the selected borrow route requires an
        exchange step
      </p>
    </section>
  );
}
