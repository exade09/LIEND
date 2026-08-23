import type { Metadata } from "next"

import { AdminConsole } from "./AdminConsole"
import styles from "./admin.module.css"

export const metadata: Metadata = {
  title: "Admin | LIEND",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <main className={styles.page} id="main-content">
      <AdminConsole />
    </main>
  )
}
