import { Icon, type IconName } from "@/components/Icon";

const steps: Array<{
  number: string;
  title: string;
  description: string;
  icon: IconName;
}> = [
  {
    number: "01",
    title: "CONNECT",
    description: "Connect a Solana wallet",
    icon: "wallet",
  },
  {
    number: "02",
    title: "VERIFY",
    description: "LIEND reads wallet positions and supported markets",
    icon: "status",
  },
  {
    number: "03",
    title: "SELECT",
    description: "Choose a migrated token position",
    icon: "token",
  },
  {
    number: "04",
    title: "CONFIGURE",
    description: "Choose collateral and requested liquidity",
    icon: "collateral",
  },
  {
    number: "05",
    title: "EXECUTE",
    description: "Review and approve the transaction route",
    icon: "transaction",
  },
  {
    number: "06",
    title: "RECEIVE",
    description: "Receive SOL after successful execution",
    icon: "sol",
  },
];

export function HowItWorks() {
  return (
    <section
      className="how-it-works section-shell"
      id="how-it-works"
      aria-labelledby="how-it-works-title"
    >
      <header className="how-it-works__intro section-header">
        <p className="eyebrow section-eyebrow">HOW IT WORKS</p>
        <h2 className="section-title" id="how-it-works-title">
          From position to liquidity
        </h2>
        <p className="section-description">
          A reviewable six-step flow from wallet connection to SOL settlement
        </p>
      </header>

      <ol className="how-it-works__route">
        {steps.map((step, index) => (
          <li className="how-it-works__step" key={step.number}>
            <article>
              <header className="how-it-works__step-header">
                <span className="how-it-works__number" aria-hidden="true">
                  {step.number}
                </span>
                <Icon
                  className="how-it-works__icon"
                  name={step.icon}
                  size={22}
                  aria-hidden="true"
                />
              </header>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
            {index < steps.length - 1 ? (
              <span className="how-it-works__connector" aria-hidden="true" />
            ) : null}
          </li>
        ))}
      </ol>
    </section>
  );
}
