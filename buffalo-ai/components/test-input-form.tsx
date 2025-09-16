"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface TestInputFormProps {
  onStartTest: (url: string, email: string) => void
}

export function TestInputForm({ onStartTest }: TestInputFormProps) {
  const [url, setUrl] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url || !email) return

    setIsLoading(true)
    // Simulate brief loading
    await new Promise((resolve) => setTimeout(resolve, 800))
    onStartTest(url, email)
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

  const canSubmit = url && email && isValidUrl(url) && isValidEmail(email) && !isLoading

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
