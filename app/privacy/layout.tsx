import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import styles from "./privacy.module.css"

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className={styles.frame} id="main-content">
        {children}
      </main>
      <Footer />
    </>
  )
}
