"use client"

import type { TestSession, Task } from "@/app/page"
import { cn } from "@/lib/utils"

interface TestStreamingInterfaceProps {
  session: TestSession
}

export function TestStreamingInterface({ session }: TestStreamingInterfaceProps) {
  const getStatusIcon = (status: Task["status"]) => {
    switch (status) {
      case "pending":
        return <div className="w-2 h-2 bg-muted-foreground/40 rounded-full"></div>
      case "started":
        return <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse"></div>
      case "completed":
        return <div className="w-2 h-2 bg-chart-4 rounded-full"></div>
      case "failed":
        return <div className="w-2 h-2 bg-destructive rounded-full"></div>
    }
  }

  const getStatusText = (task: Task) => {
    if (task.status === "completed" && task.duration) {
      return `Completed in ${(task.duration / 1000).toFixed(1)}s`
    }
    if (task.status === "failed") {
      return "Failed"
    }
    if (task.status === "started") {
      return "Running..."
    }
    return "Pending"
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-mono font-medium text-foreground mb-2">Testing in Progress</h2>
        <p className="text-sm font-mono text-muted-foreground">{session.url}</p>
      </div>

      <div className="bg-card border border-border/40 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-chart-2 rounded-full animate-pulse"></div>
            <span className="text-sm font-mono text-foreground">Session {session.id}</span>
          </div>
          <div className="text-xs font-mono text-muted-foreground">
            Started {session.createdAt.toLocaleTimeString()}
          </div>
        </div>

        <div className="space-y-4">
          {session.tasks.map((task, index) => (
            <div
              key={task.id}
              className={cn(
                "flex items-center justify-between p-4 rounded-md border transition-all duration-300",
                task.status === "started" && "bg-chart-2/5 border-chart-2/20",
                task.status === "completed" && "bg-chart-4/5 border-chart-4/20",
                task.status === "failed" && "bg-destructive/5 border-destructive/20",
                task.status === "pending" && "bg-muted/20 border-border/40",
              )}
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-6">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {getStatusIcon(task.status)}
                </div>
                <div>
                  <div className="text-sm font-mono text-foreground">{task.name}</div>
                  {task.status === "failed" && task.screenshots && (
                    <div className="mt-2">
                      <p className="text-xs font-mono text-muted-foreground mb-2">
                        Screenshots captured for debugging:
                      </p>
                      <div className="flex gap-2">
                        {task.screenshots.map((screenshot, i) => (
                          <img
                            key={i}
                            src={screenshot || "/placeholder.svg"}
                            alt={`Screenshot ${i + 1}`}
                            className="w-16 h-12 object-cover rounded border border-border/40"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs font-mono text-muted-foreground">{getStatusText(task)}</div>
            </div>
          ))}
        </div>

        {session.status === "running" && (
          <div className="mt-6 pt-6 border-t border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin"></div>
              <span className="text-sm font-mono text-muted-foreground">Running automated tests...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
