"use client"

import { useState } from "react"
import type { TestReport, TestSession, Issue } from "@/app/page"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface ResultsDashboardProps {
  report: TestReport
  session: TestSession
  onNewTest: () => void
}

export function ResultsDashboard({ report, session, onNewTest }: ResultsDashboardProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<"all" | "high" | "medium" | "low">("all")

  const getFilteredIssues = () => {
    if (selectedSeverity === "all") {
      return [...report.issues.high, ...report.issues.medium, ...report.issues.low]
    }
    return report.issues[selectedSeverity]
  }

  const getSeverityColor = (severity: Issue["severity"]) => {
    switch (severity) {
      case "high":
        return "text-destructive"
      case "medium":
        return "text-chart-5"
      case "low":
        return "text-chart-2"
    }
  }

  const getSeverityBg = (severity: Issue["severity"]) => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 border-destructive/20"
      case "medium":
        return "bg-chart-5/10 border-chart-5/20"
      case "low":
        return "bg-chart-2/10 border-chart-2/20"
    }
  }

  const filteredIssues = getFilteredIssues()
  const totalIssues = report.issues.high.length + report.issues.medium.length + report.issues.low.length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-mono font-medium text-foreground mb-2">Test Results</h2>
        <p className="text-sm font-mono text-muted-foreground">
          {session.url} • Completed {session.completedAt?.toLocaleTimeString()}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <div className="text-2xl font-mono font-medium text-foreground">{report.summary.total}</div>
          <div className="text-xs font-mono text-muted-foreground">Total Tests</div>
        </div>
        <div className="bg-card border border-chart-4/20 rounded-lg p-4">
          <div className="text-2xl font-mono font-medium text-chart-4">{report.summary.passed}</div>
          <div className="text-xs font-mono text-muted-foreground">Passed</div>
        </div>
        <div className="bg-card border border-destructive/20 rounded-lg p-4">
          <div className="text-2xl font-mono font-medium text-destructive">{report.summary.failed}</div>
          <div className="text-xs font-mono text-muted-foreground">Failed</div>
        </div>
        <div className="bg-card border border-border/40 rounded-lg p-4">
          <div className="text-2xl font-mono font-medium text-foreground">{totalIssues}</div>
          <div className="text-xs font-mono text-muted-foreground">Issues Found</div>
        </div>
      </div>

      {/* Severity Filter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-mono text-muted-foreground">Filter:</span>
        {(["all", "high", "medium", "low"] as const).map((severity) => (
          <button
            key={severity}
            onClick={() => setSelectedSeverity(severity)}
            className={cn(
              "px-3 py-1 text-xs font-mono rounded-md border transition-colors",
              selectedSeverity === severity
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border/40 hover:text-foreground",
            )}
          >
            {severity === "all" ? "All Issues" : `${severity} (${report.issues[severity].length})`}
          </button>
        ))}
      </div>

      {/* Issues List */}
      {filteredIssues.length > 0 ? (
        <div className="space-y-4 mb-8">
          {filteredIssues.map((issue) => (
            <div key={issue.id} className={cn("bg-card border rounded-lg p-6", getSeverityBg(issue.severity))}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={cn("text-xs font-mono font-medium uppercase", getSeverityColor(issue.severity))}>
                      {issue.severity}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">{issue.task}</span>
                  </div>
                  <h3 className="text-lg font-mono font-medium text-foreground mb-2">{issue.title}</h3>
                  <p className="text-sm font-mono text-muted-foreground leading-relaxed">{issue.description}</p>
                </div>
              </div>

              {issue.screenshots.length > 0 && (
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-3">Screenshots showing the issue:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {issue.screenshots.map((screenshot, i) => (
                      <div key={i} className="relative">
                        <img
                          src={screenshot || "/placeholder.svg"}
                          alt={`Issue screenshot ${i + 1}`}
                          className="w-full h-48 object-cover rounded border border-border/40"
                        />
                        <div className="absolute top-2 left-2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono">
                          {i + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">✓</div>
          <h3 className="text-lg font-mono font-medium text-foreground mb-2">No Issues Found</h3>
          <p className="text-sm font-mono text-muted-foreground">
            {selectedSeverity === "all"
              ? "All tests passed successfully"
              : `No ${selectedSeverity} severity issues found`}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center">
        <Button onClick={onNewTest} className="font-mono">
          Run New Test
        </Button>
      </div>
    </div>
  )
}
