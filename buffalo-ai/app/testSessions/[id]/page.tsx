"use client"

import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { TestExecutionCard } from "@/components/test-execution-card"
import { Id } from "@/convex/_generated/dataModel"
import { useState, useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"

type TestReport = NonNullable<ReturnType<typeof useQuery<typeof api.testReports.getReportBySessionId>>>;

function TestReportView({ report, onIssueClick }: { report: TestReport, onIssueClick: (executionId: string) => void }) {
    const severities: Array<"High" | "Medium" | "Low"> = ["High", "Medium", "Low"];

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-xl font-semibold mb-2">Summary</h3>
                <p className="text-muted-foreground">{report.summary}</p>
            </div>
            <div className="space-y-4">
                <h3 className="text-xl font-semibold">Issues</h3>
                {severities.map(severity => {
                    const issues = report.issues.filter(issue => issue.severity === severity);
                    if (issues.length === 0) return null;

                    return (
                        <div key={severity}>
                            <h4 className="text-lg font-medium mb-2 capitalize">{severity} Severity</h4>
                            <div className="border rounded-md">
                                {issues.map((issue, index) => (
                                    <details key={index} className="border-b last:border-b-0">
                                        <summary className="p-3 cursor-pointer flex justify-between items-center hover:bg-muted/50">
                                            <span>{issue.risk}</span>
                                            <button 
                                                onClick={() => onIssueClick(issue.testExecutionId)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                View Test
                                            </button>
                                        </summary>
                                        <div className="p-3 bg-muted/20">
                                            <p className="font-semibold">Details:</p>
                                            <p className="text-sm text-muted-foreground mb-2">{issue.details}</p>
                                            <p className="font-semibold">Advice:</p>
                                            <p className="text-sm text-muted-foreground">{issue.advice}</p>
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}


export default function TestSessionPage() {
    const params = useParams()
    const sessionId = params?.id as string

    const [showReport, setShowReport] = useState(false);

    const testExecutions = useQuery(api.testExecutions.getTestExecutionsBySessionId, {
        testSessionId: sessionId as Id<"testSessions">
    })

    const testSession = useQuery(api.testSessions.getBySessionId, {
        sessionId: sessionId as Id<"testSessions">
    })
    
    const testReport = useQuery(api.testReports.getReportBySessionId, {
        testSessionId: sessionId as Id<"testSessions">
    });

    useEffect(() => {
        if (testReport) {
            setShowReport(true);
        }
    }, [testReport]);

    const lastMessage = testSession?.messages && testSession.messages.length > 0
        ? testSession.messages[testSession.messages.length - 1]
        : null

    const isWaitingForExecutions = !testExecutions || testExecutions.length === 0

    type LocalExecution = {
        _id: string
        websiteUrl?: string
        type?: "exploratory" | "user_flow" | "preprod_checks"
        [key: string]: any
    }

    const groupBy = <T, K extends string | number>(
        items: readonly T[],
        keyFn: (item: T) => K
    ): Record<K, T[]> => {
        const result = {} as Record<K, T[]>
        for (const item of items) {
            const key = keyFn(item)
            if (!result[key]) result[key] = []
            result[key].push(item)
        }
        return result
    }

    const combinedGroups = (() => {
        const groups: Array<{ type: string; pageUrl: string; items: LocalExecution[] }> = []
        if (!testExecutions) return groups
        const map: Record<string, { type: string; pageUrl: string; items: LocalExecution[] }> = {}
        for (const e of (testExecutions as unknown as LocalExecution[])) {
            const type = e.type || "other"
            const pageUrl = e.websiteUrl || testSession?.websiteUrl || "Unknown page"
            const key = `${type}|||${pageUrl}`
            if (!map[key]) map[key] = { type, pageUrl, items: [] }
            map[key].items.push(e)
        }
        return Object.values(map)
    })()

    const isErrorExecution = (e: LocalExecution): boolean => {
        const status = e.status as string | undefined
        const hasErrorMessage = Boolean(e.errorMessage)
        return status === "failed" || hasErrorMessage
    }

    const executionPriority = (e: LocalExecution): number => {
        const status = e.status as string | undefined
        if (isErrorExecution(e)) return 0
        if (status === "running") return 1
        if (status === "pending") return 2
        if (status === "completed") return 3
        if (status === "skipped") return 4
        return 5
    }

    const compareExecutions = (a: LocalExecution, b: LocalExecution): number => {
        const pa = executionPriority(a)
        const pb = executionPriority(b)
        if (pa !== pb) return pa - pb
        const ta = (a._creationTime as number | undefined) ?? 0
        const tb = (b._creationTime as number | undefined) ?? 0
        return ta - tb
    }

    const groupSuccess = (list: LocalExecution[]): boolean => list.length > 0 && list.every((e) => (e.status === "completed") && !isErrorExecution(e))

    const typeSummaryClasses = (list: LocalExecution[]): string => {
        if (groupSuccess(list)) return "px-3 py-2 bg-green-50/60 border-l-4 border-l-green-500 text-sm font-medium flex items-center justify-between"
        return "px-3 py-2 bg-muted/50 text-sm font-medium flex items-center justify-between"
    }

    const pageSummaryClasses = (list: LocalExecution[]): string => {
        if (groupSuccess(list)) return "px-2 py-1 bg-green-50/60 border-l-4 border-l-green-500 text-sm bg-background flex items-center justify-between"
        return "px-2 py-1 text-sm bg-background flex items-center justify-between"
    }
    
    const handleIssueClick = (executionId: string) => {
        setShowReport(false);
        setTimeout(() => {
            const element = document.getElementById(executionId);
            element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the card briefly
            if (element) {
                element.classList.add('highlight');
                setTimeout(() => element.classList.remove('highlight'), 2000);
            }
        }, 100); // delay to allow UI to switch
    };

    return (
        <div className="min-h-screen bg-background">
            <style jsx global>{`
                .highlight {
                    transition: box-shadow 0.3s ease-in-out;
                    box-shadow: 0 0 0 2px oklch(var(--primary)), 0 0 15px oklch(var(--primary) / 0.5);
                }
            `}</style>
            <header className="border-b border-border/40 sticky top-0 bg-background/95 backdrop-blur-sm z-10">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary rounded-sm flex items-center justify-center">
                                <div className="w-4 h-4 bg-primary-foreground rounded-sm"></div>
                            </div>
                            <div>
                                <h1 className="text-xl font-mono font-medium text-foreground">Buffalo.ai</h1>
                                <p className="text-sm text-muted-foreground">Testing {testSession?.websiteUrl ?? "Loading..."}</p>
                            </div>
                        </div>
                        {testReport && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{showReport ? "Report" : "Tests"}</span>
                                <button
                                    onClick={() => setShowReport(!showReport)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showReport ? 'bg-primary' : 'bg-muted'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showReport ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                <div className="mb-6">
                    <h2 className="text-2xl font-semibold mb-2">Test {showReport ? 'Report' : 'Executions'}</h2>
                    <p className="text-muted-foreground">
                        Session: {sessionId} • Status: {testSession?.status ?? "loading"}
                    </p>
                </div>

                <div className="space-y-4">
                    {isWaitingForExecutions ? (
                        <div className="text-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                            <p className="text-muted-foreground">Waiting for test executions...</p>
                            <p className="text-xs text-muted-foreground mt-2 truncate">
                                {lastMessage ?? "Preparing tests..."}
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={showReport ? "report" : "executions"}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                            >
                                {showReport && testReport ? (
                                    <TestReportView report={testReport} onIssueClick={handleIssueClick} />
                                ) : (
                                    combinedGroups
                                        .sort((a, b) => {
                                            const aHasErr = a.items.some(isErrorExecution)
                                            const bHasErr = b.items.some(isErrorExecution)
                                            if (aHasErr !== bHasErr) return aHasErr ? -1 : 1
                                            const order = (t: string) => (t === "exploratory" ? 0 : t === "user_flow" ? 1 : t === "preprod_checks" ? 2 : 3)
                                            const oa = order(a.type)
                                            const ob = order(b.type)
                                            if (oa !== ob) return oa - ob
                                            return a.pageUrl.localeCompare(b.pageUrl)
                                        })
                                        .map((group) => (
                                            <details key={`${group.type}-${group.pageUrl}`} className="border rounded-md" open>
                                                <summary className={`cursor-pointer ${typeSummaryClasses(group.items)}`}>
                                                    <span className="truncate mr-2">{group.type.replaceAll("_", " ")} — {group.pageUrl}</span>
                                                    <span className="text-muted-foreground">{group.items.length}</span>
                                                </summary>
                                                <div className="px-3 py-3 space-y-3">
                                                    {group.items
                                                        .slice()
                                                        .sort(compareExecutions)
                                                        .map((execution) => (
                                                            <div key={execution._id} id={execution._id}>
                                                                <TestExecutionCard execution={execution as any} />
                                                            </div>
                                                        ))}
                                                </div>
                                            </details>
                                        ))
                                )}
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>
            </main>
        </div>
    )
}
