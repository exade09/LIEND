import DataExperience from "@/components/DataExperience"
import { FAQ } from "@/components/FAQ"
import { FinalCTA } from "@/components/FinalCTA"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { Hero } from "@/components/Hero"
import { HowItWorks } from "@/components/HowItWorks"
import { NetworkStats } from "@/components/NetworkStats"
import { OnchainJourney } from "@/components/OnchainJourney"
import { ProductConcept } from "@/components/ProductConcept"
import ProductStage from "@/components/ProductStage"
import { SceneMedia } from "@/components/SceneMedia"
import styles from "./page.module.css"

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.main} id="main-content">
        <Hero />
        <div className={styles.statsScene}>
          <NetworkStats />
        </div>
        <ProductConcept />
        <HowItWorks />
        <ProductStage />
        <DataExperience />
        <OnchainJourney />
        <div className={styles.faqScene}>
          <SceneMedia
            src="/assets/loops/webcore-field.mp4"
            poster="/assets/webcore-sky.png"
            className={styles.faqMedia}
          />
          <FAQ />
        </div>
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
