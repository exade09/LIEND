import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import styles from "./docs.module.css"

export default function DocsLayout({ children }: { children: React.ReactNode }) {
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
