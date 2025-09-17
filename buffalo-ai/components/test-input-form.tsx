"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type TestMode = "exploratory" | "user_flow" | "preprod_checklist"

interface TestInputFormProps {
  onStartTest: (url: string, email: string, modes: Array<TestMode>) => void
}

export function TestInputForm({ onStartTest }: TestInputFormProps) {
  const [url, setUrl] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModes, setSelectedModes] = useState<Array<TestMode>>([
    "exploratory",
    "user_flow",
    "preprod_checklist",
  ])

  const AVAILABLE_MODES: Array<{ key: TestMode; label: string; description: string }> = [
    {
      key: "exploratory",
      label: "Exploratory Smoke",
      description:
        "Find interactive elements and derive tests. Runs in parallel with browser agents.",
    },
    {
      key: "user_flow",
      label: "User Flows",
      description:
        "Run user-defined tasks from the base URL to verify users can complete them.",
    },
    {
      key: "preprod_checklist",
      label: "Preprod Checklist",
      description:
        "Common checks to catch mistakes in vibecoded apps before production.",
    },
  ]

  const allSelected = selectedModes.length === AVAILABLE_MODES.length

  const toggleMode = (mode: TestMode) => {
    setSelectedModes((prev) =>
      prev.includes(mode) ? prev.filter((m) => m !== mode) : [...prev, mode]
    )
  }

  const toggleAll = () => {
    setSelectedModes((prev) => (prev.length === AVAILABLE_MODES.length ? [] : AVAILABLE_MODES.map((m) => m.key)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !email) return

    setIsLoading(true)
    // Simulate brief loading
    await new Promise((resolve) => setTimeout(resolve, 800))
    onStartTest(url, email, selectedModes)
    setIsLoading(false)
  }

  const isValidUrl = (string: string) => {
    try {
      new URL(string)
      return true
    } catch (_) {
      return false
    }
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const canSubmit = url && email && isValidUrl(url) && isValidEmail(email) && selectedModes.length > 0 && !isLoading

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-mono font-medium text-foreground mb-4">Browser Agent Testing</h2>
        <p className="text-muted-foreground font-mono text-sm leading-relaxed">
          Enter your website URL and email to begin automated testing.
          <br />
          Our agents will analyze functionality, accessibility, and user experience.
        </p>
      </div>

      <div className="bg-card border border-border/40 rounded-lg p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-mono text-foreground">
              Website URL
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-sm"
              disabled={isLoading}
            />
            {url && !isValidUrl(url) && <p className="text-xs font-mono text-destructive">Please enter a valid URL</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-mono text-foreground">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono text-sm"
              disabled={isLoading}
            />
            {email && !isValidEmail(email) && (
              <p className="text-xs font-mono text-destructive">Please enter a valid email address</p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-mono text-foreground">Test Modes</Label>
            <TooltipProvider>
              <div className="flex flex-wrap gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      role="button"
                      aria-pressed={allSelected}
                      onClick={toggleAll}
                      className="cursor-pointer select-none"
                      variant={allSelected ? "default" : "outline"}
                    >
                      All
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Selects all available test modes.
                  </TooltipContent>
                </Tooltip>

                {AVAILABLE_MODES.map((m) => {
                  const isSelected = selectedModes.includes(m.key)
                  return (
                    <Tooltip key={m.key}>
                      <TooltipTrigger asChild>
                        <Badge
                          role="button"
                          aria-pressed={isSelected}
                          onClick={() => toggleMode(m.key)}
                          className="cursor-pointer select-none"
                          variant={isSelected ? "default" : "outline"}
                        >
                          {m.label}
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {m.description}
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </TooltipProvider>
          </div>

          <Button type="submit" disabled={!canSubmit} className="w-full font-mono text-sm">
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                Initializing Test Session
              </div>
            ) : (
              "Start Testing"
            )}
          </Button>
        </form>
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs font-mono text-muted-foreground">Tests typically complete within 2-5 minutes</p>
      </div>
    </div>
  )
}
