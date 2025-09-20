"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"
import { TestInputForm } from "@/components/test-input-form"
import { TestStreamingInterface } from "@/components/test-streaming-interface"
import { ResultsDashboard } from "@/components/results-dashboard"
import { useRouter } from "next/navigation"
import { SignedIn, SignedOut, SignIn, UserButton, useUser } from "@clerk/nextjs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useEffect } from "react"

export type TestSession = {
  id: string
  url: string
  email: string
  status: "pending" | "running" | "completed" | "failed"
  tasks: Task[]
  createdAt: Date
  completedAt?: Date
}

export type Task = {
  id: string
  name: string
  status: "pending" | "started" | "completed" | "failed"
  result?: "success" | "fail"
  screenshots?: string[]
  error?: string
  duration?: number
}

export type TestReport = {
  summary: {
    total: number
    passed: number
    failed: number
  }
  issues: {
    high: Issue[]
    medium: Issue[]
    low: Issue[]
  }
}

export type Issue = {
  id: string
  title: string
  description: string
  severity: "high" | "medium" | "low"
  screenshots: string[]
  task: string
}

export default function HomePage() {
  const router = useRouter()
  const createTestSession = useMutation(api.testSessions.createTestSession)
  const { isSignedIn } = useUser()
  const [signInOpen, setSignInOpen] = useState(false)
  const [pendingSubmission, setPendingSubmission] = useState<{
    url: string
    email: string
    modes: Array<"exploratory" | "user_flow" | "preprod_checklist">
    credentials?: Record<string, string>
  } | null>(null)
  const STORAGE_PENDING = "buffalo:pendingSubmission"

  const handleStartTest = async (
    url: string,
    email: string,
    modes: Array<"exploratory" | "user_flow" | "preprod_checklist">,
    credentials?: Record<string, string>
  ) => {
    try {
      if (!isSignedIn) {
        const pending = { url, email, modes, credentials }
        setPendingSubmission(pending)
        try { if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_PENDING, JSON.stringify(pending)) } catch {}
        setSignInOpen(true)
        return
      }
      // Create test session in Convex
      const testSessionId = await createTestSession({
        websiteUrl: url,
        modes,
        email: email,
        credentials,
      })

      // Create Coral session by calling our endpoint
      const res = await fetch("/api/create-coral-session", {
        method: "POST",
        body: JSON.stringify({
          testSessionId,
          websiteUrl: url,
          email: email,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to create Coral session", { cause: res.statusText })
      }

      const coralSession = await res.json()

      // Navigate to the test session page
      router.push(`/testSessions/${testSessionId}`)

    } catch (error) {
      console.error("Error starting test:", error)
      // TODO: Show error toast/message to user
    }
  }

  // Auto-continue after successful sign-in
  useEffect(() => {
    // Hydrate pending submission
    if (!pendingSubmission && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(STORAGE_PENDING)
        if (raw) setPendingSubmission(JSON.parse(raw))
      } catch {}
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isSignedIn && (signInOpen || pendingSubmission)) {
      setSignInOpen(false)
      const data = pendingSubmission
      setPendingSubmission(null)
      try { if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_PENDING) } catch {}
      if (data) void handleStartTest(data.url, data.email, data.modes, data.credentials)
    }
  }, [isSignedIn])

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                <div className="w-4 h-4 bg-primary-foreground rounded-sm"></div>
              </div>
              <h1 className="text-xl font-mono font-medium text-foreground">Buffalo.ai</h1>
            </div>
            <div className="flex items-center">
              <SignedIn>
                <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
              </SignedIn>
              <SignedOut>
                <button
                  onClick={() => setSignInOpen(true)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Sign in
                </button>
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <TestInputForm onStartTest={handleStartTest} />
      </main>

      {/* Sign-in Modal */}
      <Dialog open={signInOpen} onOpenChange={setSignInOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
            <DialogDescription>
              Please sign in to start testing. Your form entries are preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <SignIn routing="hash" signUpForceRedirectUrl="/" afterSignInUrl="/" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
