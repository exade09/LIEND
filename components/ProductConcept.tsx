import { Icon } from "@/components/Icon";

const sellRoute = ["Token", "Market Sale", "SOL", "Position Reduced"];
const liendRoute = ["Token", "Position", "Borrow", "SOL", "Exposure Maintained"];

function Route({
  label,
  steps,
  variant,
}: {
  label: string;
  steps: readonly string[];
  variant: "sell" | "liend";
}) {
  return (
    <article className={`concept-route concept-route--${variant}`}>
      <header className="concept-route__header">
        <span className="concept-route__marker" aria-hidden="true" />
        <h3>{label}</h3>
      </header>

      <ol className="concept-route__steps" aria-label={`${label} route`}>
        {steps.map((step, index) => (
          <li className="concept-route__step" key={step}>
            <span>{step}</span>
            {index < steps.length - 1 ? (
              <Icon
                className="concept-route__arrow"
                name="arrow"
                size={16}
                aria-hidden="true"
              />
            ) : null}
          </li>
        ))}
      </ol>
    </article>
  );
}

export function ProductConcept() {
  return (
    <section
      className="product-concept section-shell"
      id="product"
      aria-labelledby="product-concept-title"
    >
      <header className="product-concept__intro section-header">
        <p className="eyebrow section-eyebrow">ANOTHER ROUTE TO LIQUIDITY</p>
        <h2 className="section-title" id="product-concept-title">
          <span>Selling is one route</span>
          {" "}
          <span>LIEND adds another</span>
        </h2>
        <p className="section-description">
          Use supported migrated token positions inside a borrowing flow instead
          of making a market sale your first move
        </p>
      </header>

      <div className="product-concept__comparison">
        <Route label="SELL" steps={sellRoute} variant="sell" />
        <div className="product-concept__divider" aria-hidden="true">
          <span>OR</span>
        </div>
        <Route label="LIEND" steps={liendRoute} variant="liend" />
      </div>

      <p className="product-concept__risk-note">
        Borrowing involves collateral, liquidity and liquidation risk
      </p>
    </section>
  );
}
