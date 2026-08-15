import { ActivityFeed } from "@/components/ActivityFeed"
import { Application } from "@/components/Application"
import { FAQ } from "@/components/FAQ"
import { FinalCTA } from "@/components/FinalCTA"
import { Footer } from "@/components/Footer"
import { Header } from "@/components/Header"
import { Hero } from "@/components/Hero"
import { HolderGate } from "@/components/HolderGate"
import { HowItWorks } from "@/components/HowItWorks"
import { Leaderboard } from "@/components/Leaderboard"
import { LoanCalculator } from "@/components/LoanCalculator"
import { NetworkStats } from "@/components/NetworkStats"
import { OnchainExamples } from "@/components/OnchainExamples"
import { ProductConcept } from "@/components/ProductConcept"
import { ProtocolArchitecture } from "@/components/ProtocolArchitecture"

export default function Home() {
  return (
    <>
      <Header />
      <main id="main-content">
        <Hero />
        <NetworkStats />
        <ProductConcept />
        <HowItWorks />
        <HolderGate />
        <Application />
        <LoanCalculator />
        <OnchainExamples />
        <ActivityFeed />
        <Leaderboard />
        <ProtocolArchitecture />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  )
}
