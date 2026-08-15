import { Icon } from "@/components/Icon";
import { project } from "@/config/project";

const questions = [
  {
    question: "What is LIEND",
    answer:
      "LIEND is a utility layer for borrowing against supported migrated token positions on Solana",
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
      "Support depends on available liquidity, market conditions and active LIEND parameters",
  },
  {
    question: "Do I need LIEND to use the platform",
    answer: "Initial testing access may require holding LIEND",
  },
  {
    question: "Where can I get LIEND",
    answer:
      "LIEND can be accessed through the official Pump.fun link available on the website",
  },
  {
    question: "What can I borrow",
    answer: "The initial interface should be designed around borrowing SOL",
  },
  {
    question: "Can my position be liquidated",
    answer:
      "Liquidation behavior depends on active collateral and risk parameters",
  },
  {
    question: "How is collateral valued",
    answer:
      "LIEND can use onchain market and liquidity information when evaluating supported positions",
  },
  {
    question: "Are transactions visible onchain",
    answer:
      "Yes, Solana transaction activity can be inspected through supported explorers",
  },
  {
    question: "Can I inspect the complete route",
    answer:
      "Yes, LIEND provides a detailed transaction trace for supported activity",
  },
  {
    question: "Does LIEND include swaps",
    answer:
      "The platform architecture includes swap routing for flows where an exchange step is required",
  },
  {
    question: "Where can I read the documentation",
    answer:
      "The Docs link will direct users to the LIEND GitBook when documentation is published",
    link: true,
  },
] as const;

export function FAQ() {
  return (
    <section className="faq section-shell" id="faq" aria-labelledby="faq-title">
      <div className="section-kicker" aria-hidden="true">
        <span>09</span>
        <span>FAQ</span>
      </div>

      <div className="faq__layout">
        <header className="faq__intro">
          <p className="eyebrow">PRODUCT QUESTIONS</p>
          <h2 id="faq-title">Know the route before you enter</h2>
          <p className="faq__lede">
            Product access, position risk and onchain execution explained clearly
          </p>
          <a
            className="text-link"
            href={project.docsUrl || "#"}
            target={project.docsUrl ? "_blank" : undefined}
            rel={project.docsUrl ? "noreferrer" : undefined}
            aria-disabled={!project.docsUrl || undefined}
          >
            <Icon name="docs" size={18} />
            <span>Read Docs</span>
            <Icon name="external-link" size={15} />
          </a>
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
                  <a
                    className="faq__answer-link"
                    href={project.docsUrl || "#"}
                    target={project.docsUrl ? "_blank" : undefined}
                    rel={project.docsUrl ? "noreferrer" : undefined}
                    aria-disabled={!project.docsUrl || undefined}
                  >
                    Open Docs
                    <Icon name="external-link" size={14} />
                  </a>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
