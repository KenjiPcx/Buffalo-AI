"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, Clock, AlertCircle, Play, Pause } from "lucide-react"

interface TestExecution {
    _id: string
    _creationTime: number
    testSessionId: string
    name: string
    prompt: string
    status: "pending" | "running" | "completed" | "failed" | "skipped"
    passed?: boolean
    message?: string
    errorMessage?: string
    screenshots?: string[]
    executionTime?: number
    startedAt?: number
    completedAt?: number
}

interface TestExecutionCardProps {
    execution: TestExecution
}

export function TestExecutionCard({ execution }: TestExecutionCardProps) {
    const isError = () => execution.status === "failed" || Boolean(execution.errorMessage)

    const getStatusIcon = () => {
        switch (execution.status) {
            case "pending":
                return <Clock className="w-4 h-4" />
            case "running":
                return <Play className="w-4 h-4 animate-pulse" />
            case "completed":
                return isError()
                    ? <XCircle className="w-4 h-4 text-red-500" />
                    : <CheckCircle className="w-4 h-4 text-green-500" />
            case "failed":
                return <XCircle className="w-4 h-4 text-red-500" />
            case "skipped":
                return <Pause className="w-4 h-4 text-yellow-500" />
            default:
                return <AlertCircle className="w-4 h-4" />
        }
    }

    const getStatusColor = () => {
        switch (execution.status) {
            case "pending":
                return "bg-gray-100 text-gray-800"
            case "running":
                return "bg-blue-100 text-blue-800"
            case "completed":
                return isError()
                    ? "bg-red-100 text-red-800"
                    : "bg-green-100 text-green-800"
            case "failed":
                return "bg-red-100 text-red-800"
            case "skipped":
                return "bg-yellow-100 text-yellow-800"
            default:
                return "bg-gray-100 text-gray-800"
        }
    }

    const formatDuration = (ms?: number) => {
        if (!ms) return null
        if (ms < 1000) return `${ms}ms`
        return `${(ms / 1000).toFixed(1)}s`
    }

    const formatTime = (timestamp?: number) => {
        if (!timestamp) return null
        return new Date(timestamp).toLocaleTimeString()
    }

    return (
        <Card className="w-full">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        {getStatusIcon()}
                        {execution.name}
                    </CardTitle>
                    <Badge className={getStatusColor()}>
                        {execution.status}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-3">
                <div>
                    <p className="text-sm text-muted-foreground font-medium mb-1">Prompt:</p>
                    <p className="text-sm bg-muted p-2 rounded border-l-4 border-l-primary/20">
                        {execution.prompt}
                    </p>
                </div>

                {execution.message && (
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-1">Result:</p>
                        <p className="text-sm text-foreground">
                            {execution.message}
                        </p>
                    </div>
                )}

                {execution.errorMessage && (
                    <div>
                        <p className="text-sm text-red-600 font-medium mb-1">Error:</p>
                        <p className="text-sm text-red-600 bg-red-50 p-2 rounded border-l-4 border-l-red-500">
                            {execution.errorMessage}
                        </p>
                    </div>
                )}

                {execution.screenshots && execution.screenshots.length > 0 && (
                    <div>
                        <p className="text-sm text-muted-foreground font-medium mb-2">Screenshots:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {execution.screenshots.map((screenshot, index) => (
                                <img
                                    key={index}
                                    src={screenshot}
                                    alt={`Screenshot ${index + 1}`}
                                    className="rounded border border-border max-h-32 w-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => window.open(screenshot, '_blank')}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <div className="flex items-center gap-4">
                        {execution.startedAt && (
                            <span>Started: {formatTime(execution.startedAt)}</span>
                        )}
                        {execution.completedAt && (
                            <span>Completed: {formatTime(execution.completedAt)}</span>
                        )}
                    </div>
                    {execution.executionTime && (
                        <span>Duration: {formatDuration(execution.executionTime)}</span>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
