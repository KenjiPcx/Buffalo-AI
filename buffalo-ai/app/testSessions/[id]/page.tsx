"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useCoralConnections } from "@/hooks/useCoralConnections"
import { TestExecutionCard } from "@/components/test-execution-card"
import { UserInputModal } from "@/components/user-input-modal"
import { requestUserInput } from "@/lib/mcpClient"


export default function TestSessionPage() {
    const params = useParams()
    const sessionId = params.id as string

    // Use the custom hook for WebSocket connections
    const {
        coralSession,
        userInput,
        activeUserInputRequest,
        handleUserInput,
        closeUserInputModal,
        isCoralConnected,
        isUserInputConnected,
        agentId,
    } = useCoralConnections({ sessionId })

    // Query test executions from Convex
    const testExecutions = useQuery(api.testExecution.getTestExecutionsBySessionExternalId, {
        sessionExternalId: sessionId
    })

    const testSession = useQuery(api.testSessions.getByExternalId, {
        externalId: sessionId
    })

    if (!testSession) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading test session...</p>
                </div>
            </div>
        )
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
                            <div>
                                <h1 className="text-xl font-mono font-medium text-foreground">Buffalo.ai</h1>
                                <p className="text-sm text-muted-foreground">Testing {testSession.websiteUrl}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isCoralConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-xs text-muted-foreground">Coral</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isUserInputConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <span className="text-xs text-muted-foreground">User Input</span>
                            </div>
                            <button
                                className="px-3 py-1 rounded bg-primary text-primary-foreground text-xs disabled:opacity-50"
                                disabled={!agentId}
                                onClick={async () => {
                                    if (!agentId) return
                                    try {
                                        await requestUserInput({
                                            baseUrl: '', // same-origin to Next route handlers
                                            sessionId,
                                            agentId,
                                            message: 'Please provide a search query for the test.'
                                        })
                                    } catch (e) {
                                        console.error(e)
                                    }
                                }}
                            >
                                Trigger Input
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold mb-2">Test Executions</h2>
                    <p className="text-muted-foreground">
                        Session: {sessionId} • Status: {testSession.status}
                    </p>
                </div>

                <div className="space-y-4">
                    {!testExecutions || testExecutions.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Waiting for test executions...</p>
                        </div>
                    ) : (
                        testExecutions.map((execution) => (
                            <TestExecutionCard key={execution._id} execution={execution} />
                        ))
                    )}
                </div>
            </main>

            {activeUserInputRequest && (
                <UserInputModal
                    request={activeUserInputRequest}
                    onSubmit={(value) => handleUserInput(activeUserInputRequest.id, value)}
                    onClose={closeUserInputModal}
                />
            )}
        </div>
    )
}
