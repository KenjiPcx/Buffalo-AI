"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface UserInputRequest {
    id: string
    sessionId: string
    agentId: string
    agentRequest: string
    userQuestion?: string
    agentAnswer?: string
}

interface UserInputModalProps {
    request: UserInputRequest
    onSubmit: (value: string) => void
    onClose: () => void
}

export function UserInputModal({ request, onSubmit, onClose }: UserInputModalProps) {
    const [inputValue, setInputValue] = useState("")

    const handleSubmit = () => {
        if (inputValue.trim()) {
            onSubmit(inputValue.trim())
            setInputValue("")
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Agent Input Required</DialogTitle>
                    <DialogDescription>
                        Agent <strong>{request.agentId}</strong> from session <code>{request.sessionId}</code> needs your input:
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    <div className="p-3 bg-muted rounded-md border-l-4 border-l-primary">
                        <p className="text-sm font-medium text-foreground">
                            "{request.agentRequest}"
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-input">Your Response</Label>
                        <Input
                            id="user-input"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Enter your reply..."
                            disabled={request.userQuestion !== undefined}
                            autoFocus
                        />
                    </div>

                    {request.agentAnswer && (
                        <div className="p-3 bg-green-50 rounded-md border-l-4 border-l-green-500">
                            <p className="text-sm text-green-700">
                                <strong>Agent Response:</strong> {request.agentAnswer}
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!inputValue.trim() || request.userQuestion !== undefined}
                    >
                        Send
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
