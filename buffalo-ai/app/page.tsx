"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"
import { TestInputForm } from "@/components/test-input-form"
import { TestStreamingInterface } from "@/components/test-streaming-interface"
import { ResultsDashboard } from "@/components/results-dashboard"

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
  const [currentView, setCurrentView] = useState<"input" | "streaming" | "results">("input")
  const [testSession, setTestSession] = useState<TestSession | null>(null)
  const [testReport, setTestReport] = useState<TestReport | null>(null)

  const createTestSession = useMutation(api.testSessions.createTestSession)

  const handleStartTest = async (url: string, email: string) => {
    try {
      // Generate external UUID for this session
      const externalId = uuidv4()

      // Create test session in Convex
      await createTestSession({
        externalId,
        websiteUrl: url,
        mode: "all",
      })

      // Navigate to the test session page
      window.location.href = `/testSessions/${externalId}`

    } catch (error) {
      console.error("Error starting test:", error)
      // TODO: Show error toast/message to user
    }
  }

  const simulateTestExecution = (session: TestSession) => {
    let taskIndex = 0
    const updateInterval = setInterval(() => {
      if (taskIndex >= session.tasks.length) {
        clearInterval(updateInterval)
        // Generate mock report
        const mockReport: TestReport = {
          summary: { total: 5, passed: 3, failed: 2 },
          issues: {
            high: [
              {
                id: "issue_1",
                title: "Critical Navigation Failure",
                description: "Main navigation menu fails to load on mobile devices",
                severity: "high",
                screenshots: ["/mobile-navigation-error.jpg"],
                task: "Navigation Test",
              },
            ],
            medium: [
              {
                id: "issue_2",
                title: "Form Validation Issues",
                description: "Contact form accepts invalid email formats",
                severity: "medium",
                screenshots: ["/form-validation-error.png"],
                task: "Form Interaction Test",
              },
            ],
            low: [],
          },
        }
        setTestReport(mockReport)
        setTestSession((prev) => (prev ? { ...prev, status: "completed", completedAt: new Date() } : null))
        setCurrentView("results")
        return
      }

      setTestSession((prev) => {
        if (!prev) return null
        const updatedTasks = [...prev.tasks]
        updatedTasks[taskIndex] = {
          ...updatedTasks[taskIndex],
          status: "started",
        }
        return { ...prev, tasks: updatedTasks, status: "running" }
      })

      setTimeout(() => {
        setTestSession((prev) => {
          if (!prev) return null
          const updatedTasks = [...prev.tasks]
          updatedTasks[taskIndex] = {
            ...updatedTasks[taskIndex],
            status: taskIndex === 1 || taskIndex === 2 ? "failed" : "completed",
            result: taskIndex === 1 || taskIndex === 2 ? "fail" : "success",
            duration: Math.floor(Math.random() * 5000) + 1000,
            screenshots:
              taskIndex === 1 || taskIndex === 2
                ? [`/placeholder.svg?height=400&width=600&query=test failure screenshot ${taskIndex + 1}`]
                : undefined,
          }
          return { ...prev, tasks: updatedTasks }
        })
        taskIndex++
      }, 1500)
    }, 2000)
  }

  const handleNewTest = () => {
    setCurrentView("input")
    setTestSession(null)
    setTestReport(null)
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
              <h1 className="text-xl font-mono font-medium text-foreground">VibeTest</h1>
            </div>
            {currentView !== "input" && (
              <button
                onClick={handleNewTest}
                className="text-sm font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                New Test
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        {currentView === "input" && <TestInputForm onStartTest={handleStartTest} />}

        {currentView === "streaming" && testSession && <TestStreamingInterface session={testSession} />}

        {currentView === "results" && testReport && testSession && (
          <ResultsDashboard report={testReport} session={testSession} onNewTest={handleNewTest} />
        )}
      </main>
    </div>
  )
}
