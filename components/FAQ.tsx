import { Icon } from "@/components/Icon";
import { ProductLink } from "@/components/ProductLink";
import { project } from "@/config/project";

const questions = [
  {
    question: "What is LONS",
    answer:
      "LONS is a utility layer for borrowing against supported migrated token positions on Robinhood Chain",
  },
  {
    question: "Why would I borrow instead of sell",
    answer:
      "Borrowing can provide access to liquidity while allowing a user to keep exposure to the underlying position",
  },
  {
    question: "What is a migrated token",
    answer:
      "A migrated token is a token that has completed its initial bonding curve phase and entered open market liquidity",
  },
  {
    question: "Which tokens are supported",
    answer:
      "Support depends on available liquidity, market conditions and active LONS parameters",
  },
  {
    question: "Do I need LONS to use the platform",
    answer: "LONS utility is available after a connected wallet is verified",
  },
  {
    question: "Where can I get LONS",
    answer:
      "LONS can be accessed through the official pons link available on the website",
  },
  {
    question: "What can I borrow",
    answer: "The initial interface should be designed around borrowing ETH",
  },
  {
    question: "Can my position be liquidated",
    answer:
      "Liquidation behavior depends on active collateral and risk parameters",
  },
  {
    question: "How is collateral valued",
    answer:
      "LONS can use onchain market and liquidity information when evaluating supported positions",
  },
  {
    question: "Are transactions visible onchain",
    answer:
      "Yes, Robinhood Chain transaction activity can be inspected through supported explorers",
  },
  {
    question: "Can I inspect the complete route",
    answer:
      "Yes, LONS provides a detailed transaction trace for supported activity",
  },
  {
    question: "Does LONS include swaps",
    answer:
      "The platform architecture includes swap routing for flows where an exchange step is required",
  },
  {
    question: "Where can I read the documentation",
    answer:
      "The Docs control in the header opens the LONS GitBook",
    link: true,
  },
] as const;

export function FAQ() {
  return (
    <section className="faq section-shell" id="faq" aria-labelledby="faq-title">
      <div className="section-kicker" aria-hidden="true">
        <span>FAQ</span>
      </div>

      <div className="faq__layout">
        <header className="faq__intro">
          <p className="eyebrow">PRODUCT QUESTIONS</p>
          <h2 id="faq-title">Know the route before you enter</h2>
          <p className="faq__lede">
            Product access, position risk and onchain execution explained clearly
          </p>
          <ProductLink className="text-link" href={project.docsUrl}>
            <Icon name="docs" size={18} />
            <span>Read Docs</span>
            <Icon name="external-link" size={15} />
          </ProductLink>
        </header>

        <div className="faq__items">
          {questions.map((item, index) => (
            <details className="faq__item" key={item.question} open={index === 0}>
              <summary>
                <span className="faq__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="faq__question">{item.question}</span>
                <Icon className="faq__chevron" name="chevron" size={18} />
              </summary>
              <div className="faq__answer">
                <p>{item.answer}</p>
                {"link" in item ? (
                  <ProductLink className="faq__answer-link" href={project.docsUrl}>
                    Open Docs
                    <Icon name="external-link" size={14} />
                  </ProductLink>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
