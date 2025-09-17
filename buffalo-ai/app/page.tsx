"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"
import { TestInputForm } from "@/components/test-input-form"
import { TestStreamingInterface } from "@/components/test-streaming-interface"
import { ResultsDashboard } from "@/components/results-dashboard"
import { useRouter } from "next/navigation"

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

  const handleStartTest = async (
    url: string,
    email: string,
    modes: Array<"exploratory" | "user_flow" | "preprod_checklist">
  ) => {
    try {
      // Create test session in Convex
      const testSessionId = await createTestSession({
        websiteUrl: url,
        modes,
        email: email,
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
        throw new Error("Failed to create Coral session")
      }

      const coralSession = await res.json()

      // Navigate to the test session page
      router.push(`/testSessions/${testSessionId}`)

    } catch (error) {
      console.error("Error starting test:", error)
      // TODO: Show error toast/message to user
    }
  }

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
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <TestInputForm onStartTest={handleStartTest} />
      </main>
    </div>
  )
}
