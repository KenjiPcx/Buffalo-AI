"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { AgentRequest } from '@/lib/coral/types';

interface AgentRequestHandlerProps {
  requests: AgentRequest[];
  onRespond: (requestId: string, response: string) => void;
}

export function AgentRequestHandler({ requests, onRespond }: AgentRequestHandlerProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleSubmit = (requestId: string) => {
    const response = responses[requestId];
    if (!response) return;

    onRespond(requestId, response);
    setResponses(prev => ({ ...prev, [requestId]: '' }));
  };

  // Group requests by session
  const requestsBySession = requests.reduce((acc, req) => {
    if (!acc[req.sessionId]) {
      acc[req.sessionId] = [];
    }
    acc[req.sessionId].push(req);
    return acc;
  }, {} as Record<string, AgentRequest[]>);

  if (requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No agent requests at this time
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(requestsBySession).map(([sessionId, sessionRequests]) => (
        <div key={sessionId} className="space-y-4">
          <h3 className="text-lg font-semibold">
            Session: <code className="text-sm">{sessionId.slice(0, 8)}...</code>
          </h3>

          {sessionRequests.map(request => (
            <Card key={request.id} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Agent: {request.agentId}
                  </CardTitle>
                  <div className="flex gap-2">
                    {request.userQuestion && (
                      <Badge variant="secondary">Responded</Badge>
                    )}
                    {request.agentAnswer && (
                      <Badge variant="outline">Answered</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Agent asks:
                  </label>
                  <p className="mt-1 text-sm">{request.agentRequest}</p>
                </div>

                {!request.userQuestion ? (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type your response..."
                      value={responses[request.id] || ''}
                      onChange={(e) => setResponses(prev => ({
                        ...prev,
                        [request.id]: e.target.value
                      }))}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSubmit(request.id);
                        }
                      }}
                    />
                    <Button
                      onClick={() => handleSubmit(request.id)}
                      disabled={!responses[request.id]}
                    >
                      Send
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Your response:
                      </label>
                      <p className="mt-1 text-sm font-medium">
                        {request.userQuestion}
                      </p>
                    </div>

                    {request.agentAnswer && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Agent's answer:
                        </label>
                        <p className="mt-1 text-sm">
                          {request.agentAnswer}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}