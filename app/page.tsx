import DataExperience from "@/components/DataExperience"
import { FAQ } from "@/components/FAQ"
import { FinalCTA } from "@/components/FinalCTA"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { Hero } from "@/components/Hero"
import { HowItWorks } from "@/components/HowItWorks"
import { OnchainJourney } from "@/components/OnchainJourney"
import { ProductConcept } from "@/components/ProductConcept"
import ProductStage from "@/components/ProductStage"
import { SceneLoop } from "@/components/SceneLoop"
import { SceneMedia } from "@/components/SceneMedia"
import styles from "./page.module.css"

export default function Home() {
  return (
    <>
      <Header />
      <main className={styles.main} id="main-content">
        <Hero />
        <div className={styles.cloudBand}>
          <div className={styles.cloudSky} aria-hidden="true">
            <SceneLoop src="/assets/loops/meadow-sky.gif" className={styles.cloudLoop} />
          </div>
          <div className={styles.skyFade} aria-hidden="true" />
          <div className={styles.cloudScenes}>
            <ProductConcept />
            <HowItWorks />
          </div>
        </div>
        <ProductStage />
        <DataExperience />
        <div className={styles.closeBand}>
          <div className={styles.closeSky} aria-hidden="true">
            <SceneMedia
              src="/assets/loops/webcore-field.mp4"
              poster="/assets/webcore-sky.png"
              className={styles.closeLoop}
              pixelated
            />
          </div>
          <div className={styles.closeScenes}>
            <OnchainJourney />
            <FAQ />
            <FinalCTA />
            <Footer />
          </div>
        </div>
      </main>
    </>
  )
}
