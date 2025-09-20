"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

type TestMode = "exploratory" | "user_flow" | "preprod_checklist"

interface TestInputFormProps {
  onStartTest: (
    url: string,
    email: string,
    modes: Array<TestMode>,
    credentials?: Record<string, string>
  ) => void
}

export function TestInputForm({ onStartTest }: TestInputFormProps) {
  const STORAGE_KEY = "buffalo:testInput"
  const [url, setUrl] = useState("")
  const [email, setEmail] = useState("")
  const [credsOpen, setCredsOpen] = useState(false)
  const [credRows, setCredRows] = useState<Array<{ id: string; key: string; value: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModes, setSelectedModes] = useState<Array<TestMode>>([
    "exploratory",
    "user_flow",
    "preprod_checklist",
  ])
  const credCount = credRows.filter(r => r.key.trim().length > 0).length
  const [testsOpen, setTestsOpen] = useState(false)
  const websiteTests = useQuery(api.tests.getTestsForWebsiteUrl, url ? { websiteUrl: url } : "skip")
  const websiteDoc = useQuery(api.websites.getByUrl, url ? { url } : "skip")
  const upsertTest = useMutation(api.tests.upsertTest)
  const deleteTest = useMutation(api.tests.deleteTest)
  const upsertWebsite = useMutation(api.websites.upsertWebsite)
  const [newTestName, setNewTestName] = useState("")
  const [newTestPrompt, setNewTestPrompt] = useState("")

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null
      if (!raw) return
      const parsed: any = JSON.parse(raw)
      if (parsed.url && typeof parsed.url === "string") setUrl(parsed.url)
      if (parsed.email && typeof parsed.email === "string") setEmail(parsed.email)
      if (Array.isArray(parsed.selectedModes)) {
        const allowed: Array<TestMode> = ["exploratory", "user_flow", "preprod_checklist"]
        const filtered = parsed.selectedModes.filter((m: any) => allowed.includes(m)) as Array<TestMode>
        if (filtered.length > 0) setSelectedModes(filtered)
      }
      if (Array.isArray(parsed.credRows)) {
        const rows = parsed.credRows
          .filter((r: any) => r && typeof r === "object")
          .map((r: any, idx: number) => ({ id: r.id || `${Date.now()}-${idx}`, key: String(r.key || ""), value: String(r.value || "") }))
        setCredRows(rows)
      }
      if (parsed.testsOpen) setTestsOpen(Boolean(parsed.testsOpen))
    } catch {
      // ignore
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      const payload = { url, email, selectedModes, credRows, testsOpen }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
      }
    } catch {
      // ignore
    }
  }, [url, email, selectedModes, credRows, testsOpen])

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
    const trimmed = credRows
      .map(r => ({ key: r.key.trim(), value: r.value }))
      .filter(r => r.key.length > 0)
    const credentials = trimmed.length > 0
      ? trimmed.reduce<Record<string, string>>((acc, { key, value }) => { acc[key] = value; return acc }, {})
      : undefined
    onStartTest(url, email, selectedModes, credentials)
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
            <div className="pt-1 flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative inline-block">
                      <Badge
                        role="button"
                        onClick={() => setCredsOpen(true)}
                        className="cursor-pointer select-none px-2 py-0.5 text-[10px]"
                        variant="outline"
                      >
                        credentials
                      </Badge>
                      {credCount > 0 && (
                        <span
                          aria-label="credentials count"
                          className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] leading-none flex items-center justify-center border border-background"
                        >
                          {credCount}
                        </span>
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs font-mono text-xs">
                    Supply only if the site requires login. We recommend a dummy account.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative inline-block">
                      <Badge
                        role="button"
                        onClick={() => setTestsOpen(true)}
                        className="cursor-pointer select-none px-2 py-0.5 text-[10px]"
                        variant="outline"
                      >
                        saved tests
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs font-mono text-xs">
                    View or manage your saved user flow tests for this URL.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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


          {/* Credentials Modal */}
          <Dialog open={credsOpen} onOpenChange={setCredsOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Credentials</DialogTitle>
                <DialogDescription>
                  Provide env-style key/value pairs required to log in (e.g., USERNAME, PASSWORD). Use a dummy account.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {credRows.length === 0 && (
                  <p className="text-xs text-muted-foreground font-mono">No credentials added yet.</p>
                )}
                {credRows.map((row, idx) => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                    <Input
                      value={row.key}
                      onChange={(e) => setCredRows(prev => prev.map(r => r.id === row.id ? { ...r, key: e.target.value } : r))}
                      placeholder="KEY"
                      className="font-mono text-sm"
                    />
                    <Input
                      value={row.value}
                      onChange={(e) => setCredRows(prev => prev.map(r => r.id === row.id ? { ...r, value: e.target.value } : r))}
                      placeholder="value"
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCredRows(prev => prev.filter(r => r.id !== row.id))}
                      className="px-2 py-1 h-8 text-xs"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
                <div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCredRows(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, key: "", value: "" }])}
                    className="h-8 text-xs"
                  >
                    Add row
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCredRows([])}
                >
                  Clear
                </Button>
                <Button type="button" onClick={() => setCredsOpen(false)}>
                  Done
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Saved Tests Modal */}
          <Dialog open={testsOpen} onOpenChange={setTestsOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Saved Tests</DialogTitle>
                <DialogDescription>
                  Manage your saved user flow tests for {url || "this website"}.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                {!url && (
                  <p className="text-xs text-destructive font-mono">Enter a valid website URL to view saved tests.</p>
                )}

                {url && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground font-mono">Existing tests</p>
                    <div className="space-y-2">
                      {websiteTests?.websiteSpecific?.length ? (
                        websiteTests.websiteSpecific.map((t) => (
                          <div key={t._id} className="border rounded-md p-2 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{t.name}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2">{t.prompt}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={async () => { await deleteTest({ testId: (t as any)._id }); }}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground font-mono">No saved tests yet.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <p className="text-xs text-muted-foreground font-mono">Add new test</p>
                  <Input
                    placeholder="Test name"
                    value={newTestName}
                    onChange={(e) => setNewTestName(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <Input
                    placeholder="Prompt / instructions"
                    value={newTestPrompt}
                    onChange={(e) => setNewTestPrompt(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <div>
                    <Button
                      type="button"
                      className="h-8 text-xs"
                      onClick={async () => {
                        if (!url || !newTestName.trim() || !newTestPrompt.trim()) return
                        let websiteId = websiteDoc?._id as any
                        if (!websiteId) {
                          websiteId = await upsertWebsite({ url })
                        }
                        await upsertTest({ name: newTestName.trim(), prompt: newTestPrompt.trim(), type: "website-specific", websiteId })
                        setNewTestName("")
                        setNewTestPrompt("")
                      }}
                    >
                      Save test
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setTestsOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

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
