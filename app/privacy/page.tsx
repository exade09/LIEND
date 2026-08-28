import type { Metadata } from "next"
import styles from "./privacy.module.css"

export const metadata: Metadata = {
  title: "Privacy Policy | LONS",
  description:
    "How the LONS Chrome extension and related LONS surfaces handle data on supported Robinhood Chain token pages",
}

export default function PrivacyPage() {
  return (
    <div className={styles.shell}>
      <div className={styles.titlebar}>
        <span>LONS</span>
        <span>Privacy</span>
      </div>
      <article className={styles.article}>
        <p className={styles.kicker}>Chrome extension</p>
        <h1>Privacy Policy</h1>
        <p className={styles.lede}>
          Last updated 20 August 2026. This policy covers the LONS Chrome extension
          and how it talks to the LONS App and LONS API
        </p>

        <section className={styles.section}>
          <h2>What LONS is</h2>
          <p>
            LONS is a utility layer for supported migrated token positions on Robinhood Chain.
            The Chrome extension adds liquidity context on supported token pages. It
            currently runs on pons coin pages. It is not a wallet, not a trading
            bot, and not a sniper. It does not sign transactions. Signing stays in the
            LONS App with the user&apos;s own wallet
          </p>
        </section>

        <section className={styles.section}>
          <h2>Data the extension uses</h2>
          <p>The extension only processes what it needs for that single purpose:</p>
          <ul>
            <li>
              The active tab URL on pons, plus the page&apos;s canonical and Open
              Graph URL when present, to read the token mint from a coin route
            </li>
            <li>
              Short-lived per-tab context in Chrome session storage, such as the
              detected mint and whether a token page is open
            </li>
            <li>
              A device identifier and a device credential in Chrome local storage after
              you pair this browser with the LONS App Those let the extension mint a
              short-lived access token They are not a seed phrase, private key, or
              wallet password
            </li>
            <li>
              A generic device label (for example &quot;Chrome&quot;) and the extension
              version, sent during pairing so you can recognise this browser in App
              settings
            </li>
          </ul>
          <p>
            The content script is declared only for pons. It is not injected on
            other sites. It does not read wallets, cookies, keystrokes, form fields,
            prices, or balances from the host page
          </p>
        </section>

        <section className={styles.section}>
          <h2>What we do not collect</h2>
          <p>
            The extension does not collect your name, email, payment cards, health
            data, location, browsing history as a list of visited pages, messages, or
            a record of clicks and keystrokes. It does not scrape the host page for
            financial figures. The side panel does not display a balance, price, or
            liquidity number from pons
          </p>
        </section>

        <section className={styles.section}>
          <h2>Where data goes</h2>
          <p>
            Pairing and session requests go only to the LONS API origin baked into
            the extension at build time. The extension does not load remote JavaScript
            or Wasm. All extension scripts ship inside the Chrome Web Store package
          </p>
          <p>
            LONS does not sell this data. It is not used to determine creditworthiness
            or for lending decisions about you as a person. It is not used for purposes
            unrelated to showing liquidity context and connecting this browser to the
            LONS App
          </p>
        </section>

        <section className={styles.section}>
          <h2>Storage and control</h2>
          <p>
            Device credentials stay in chrome.storage.local so pairing survives a
            browser restart. Access tokens stay in chrome.storage.session and expire
            after about one hour. You can disconnect this browser in the LONS App
            under Settings, Browser connections. That revokes the credential. You can
            also remove the extension in Chrome, which deletes local extension storage
          </p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>
            Questions about this policy: use LONS App Settings to manage or revoke
            this browser, or write through the LONS presence on this site. The
            public policy URL is /privacy on the LONS website
          </p>
        </section>
      </article>
    </div>
  )
}
