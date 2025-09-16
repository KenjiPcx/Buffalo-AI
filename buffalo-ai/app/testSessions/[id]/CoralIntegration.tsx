"use client";

import { useEffect, useState } from 'react';
import { useCoralSession } from '@/lib/coral/useCoralSession';
import { AgentRequestHandler } from '@/components/coral/AgentRequestHandler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CoralIntegrationProps {
  sessionId: string;
  websiteUrl: string;
}

export function CoralIntegration({ sessionId, websiteUrl }: CoralIntegrationProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const {
    session,
    isConnecting,
    error,
    agentRequests,
    createSession,
    respondToAgent,
    closeSession
  } = useCoralSession({
    onAgentRequest: (request) => {
      console.log('New agent request:', request);
      // You could show a notification here
    },
    onAgentAnswer: (data) => {
      console.log('Agent answered:', data);
    }
  });

  // Initialize Coral session
  const initializeCoralSession = async () => {
    try {
      // Example agent graph - customize based on your needs
      const coralSessionId = await createSession({
        host: process.env.NEXT_PUBLIC_CORAL_HOST || 'localhost:8080',
        appId: process.env.NEXT_PUBLIC_CORAL_APP_ID || 'buffalo-ai',
        privacyKey: process.env.NEXT_PUBLIC_CORAL_PRIVACY_KEY || 'test-key',
        agentGraph: {
          agents: {
            'buffalo-qa': {
              type: 'local',
              blocking: false,
              agentType: 'buffalo',
              options: {
                websiteUrl,
                testSessionId: sessionId
              },
              tools: ['user-input-request', 'user-input-respond'],
              systemPrompt: `You are testing the website at ${websiteUrl}.
                            Ask the user questions about the test results and provide feedback.`
            },
            'browser-agent': {
              type: 'local',
              blocking: false,
              agentType: 'browser',
              options: {
                websiteUrl
              },
              tools: ['user-input-request']
            }
          },
          links: [
            ['buffalo-qa', 'browser-agent'] // These agents can communicate
          ]
        }
      });

      console.log('Coral session created:', coralSessionId);
      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize Coral session:', err);
    }
  };

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized && !session) {
      initializeCoralSession();
    }

    // Cleanup on unmount
    return () => {
      if (session) {
        closeSession();
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Coral Integration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Connection Status:</span>
              <span className={session?.connected ? 'text-green-500' : 'text-yellow-500'}>
                {isConnecting ? 'Connecting...' : session?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {session && (
              <>
                <div className="flex items-center justify-between">
                  <span>Session ID:</span>
                  <code className="text-xs">{session.sessionId.slice(0, 12)}...</code>
                </div>
                <div className="flex items-center justify-between">
                  <span>Active Agents:</span>
                  <span>{Object.keys(session.agents).length}</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!session && !isConnecting && (
            <Button
              onClick={initializeCoralSession}
              className="mt-4 w-full"
              disabled={isConnecting}
            >
              Initialize Coral Session
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Agent Requests Handler */}
      {session && (
        <Card>
          <CardHeader>
            <CardTitle>Agent Interactions</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentRequestHandler
              requests={agentRequests}
              onRespond={respondToAgent}
            />
          </CardContent>
        </Card>
      )}

      {/* Session Details (Debug) */}
      {session && process.env.NODE_ENV === 'development' && (
        <Card>
          <CardHeader>
            <CardTitle>Debug: Session State</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-60">
              {JSON.stringify(session, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}