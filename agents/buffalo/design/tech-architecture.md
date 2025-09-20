# Buffalo Technical Architecture

## System Overview

Buffalo is a multi-agent testing system built on the Coral framework that provides automated web application testing with real-time progress monitoring.

### Core Components
- **Frontend**: Next.js application for test management UI
- **Backend**: Convex database for real-time state management
- **Agent Framework**: Coral (MCP-based inter-agent communication)
- **Browser Automation**: Browser-use library with Gemini LLM
- **Real-time Updates**: Convex subscriptions for live progress tracking

## Feature Implementation Status

### ✅ Implemented Features

#### Infrastructure
- [x] Coral agent integration with MCP client
- [x] Google Gemini LLM integration for browser automation
- [x] Convex database setup with real-time subscriptions
- [x] Next.js frontend scaffold
- [x] Agent-to-agent communication via Coral SSE

#### Database Schema
- [x] `websites` table - Website registry
- [x] `tests` table - Test definitions and templates
- [x] `testSessions` table - Test run instances
- [x] `testExecutions` table - Individual test execution tracking

#### Agent Tools
- [x] `get_tests_by_website` - Retrieve tests for a URL
- [x] `upsert_tests` - Create/update test definitions
- [x] `start_test_session` - Execute tests with batch processing

#### Core Testing Capabilities
- [x] Parallel test execution (5 tests per batch)
- [x] Real-time progress updates to Convex
- [x] Screenshot capture during test execution
- [x] Pass/fail status determination
- [x] Error handling and reporting

### 🚧 In Development Features

#### Test Planning Agent
- [ ] **Page Crawler**
  - [ ] Crawl each page of the web application
  - [ ] Identify all interactive elements (buttons, forms, links)
  - [ ] Map site structure and navigation paths

- [ ] **Element Analysis**
  - [ ] Extract key testable elements per page
  - [ ] Identify element types (input, button, link, etc.)
  - [ ] Determine element importance/priority

- [ ] **Test Generation**
  - [ ] Create test cases for each element interaction
  - [ ] Define expected outcomes for each interaction
  - [ ] Generate comprehensive test coverage

- [ ] **Validation Engine**
  - [ ] Execute element interactions
  - [ ] Capture resulting state changes
  - [ ] Validate against expected outcomes
  - [ ] Report discrepancies

### 📋 Planned Features

#### Test Management
- [ ] Test categorization (smoke, regression, E2E)
- [ ] Test scheduling and automation
- [ ] Custom test assertion language
- [ ] Test dependency management
- [ ] Test suite composition

#### Reporting & Analytics
- [ ] Historical test results tracking
- [ ] Failure pattern analysis
- [ ] Performance metrics per test
- [ ] Test coverage visualization
- [ ] Trend analysis dashboards

#### Integration Features
- [ ] CI/CD pipeline integration
- [ ] Webhook notifications for test results
- [ ] Export test results (JSON, CSV, PDF)
- [ ] Import tests from other formats
- [ ] API for external test triggering

### 🔬 Features in Exploration

#### Bug Replay Generation
- [ ] **Full Playback Recording**
  - [ ] Record exact user interaction sequence
  - [ ] Capture timing between actions
  - [ ] Store browser state at each step
  - [ ] Generate reproducible bug replay script
  - [ ] Export as video or step-by-step instructions

#### Stagehand Test Generation
- [ ] **Test Recording from Manual Execution**
  - [ ] Record manual test execution
  - [ ] Convert actions to Stagehand test format
  - [ ] Auto-generate assertions from observed behavior
  - [ ] Create reusable test templates
  - [ ] Support for data-driven test generation

## Agent Architecture

### Buffalo Agent (Browser Automation)
**Purpose**: Execute browser-based tests using AI-driven automation

**Technology Stack**:
- Language: Python
- LLM: Google Gemini 2.5 Flash
- Browser Automation: browser-use library
- Communication: Coral MCP client
- Database: Convex client

**Responsibilities**:
1. Receive test requests from Coral network
2. Query test definitions from Convex
3. Execute browser automation tasks
4. Report results back to Convex
5. Send completion notifications via Coral

**Tools**:
- `get_tests_by_website`: Retrieve test definitions
- `upsert_tests`: Manage test templates
- `start_test_session`: Execute test batches

### Test Planner Agent (Planned)
**Purpose**: Intelligently generate test cases by analyzing web applications

**Planned Capabilities**:
1. **Discovery Phase**
   - Crawl application pages
   - Build site map
   - Identify user flows

2. **Analysis Phase**
   - Extract interactive elements
   - Determine element relationships
   - Identify critical paths

3. **Generation Phase**
   - Create comprehensive test cases
   - Define assertions and validations
   - Prioritize test execution order

4. **Validation Phase**
   - Execute generated tests
   - Verify expected outcomes
   - Refine test accuracy

## Data Flow Architecture

```
User Request → Buffalo AI Frontend (Next.js)
                    ↓
            Convex Database
                    ↓
        Coral Agent Network
                    ↓
        Buffalo Agent (Python)
                    ↓
        Browser Automation (Gemini + browser-use)
                    ↓
        Test Results → Convex
                    ↓
        Real-time Updates → Frontend
```

## Real-time Progress Monitoring

### Implementation
- **Convex Subscriptions**: Live updates from database
- **Progress Tracking**: Batch completion status
- **Result Streaming**: Test results appear as completed
- **Error Reporting**: Immediate failure notifications

### State Management
```typescript
// TestSession States
- pending: Session created, tests queued
- running: Tests executing in batches
- completed: All tests finished
- failed: Session encountered critical error

// TestExecution States
- pending: Test queued for execution
- running: Currently executing
- passed: Test succeeded
- failed: Test failed with errors
```

## Security Considerations

### Current State
- [ ] No authentication on Convex queries/mutations
- [ ] Open Coral agent communication
- [ ] Unencrypted test results

### Planned Security
- [ ] API key authentication for Convex
- [ ] Agent identity verification
- [ ] Encrypted test data storage
- [ ] Rate limiting on test execution
- [ ] Sandboxed browser environments

## Performance Optimizations

### Implemented
- [x] Parallel test execution (5 concurrent)
- [x] Batch processing for efficiency
- [x] Async/await throughout stack

### Planned
- [ ] Dynamic batch sizing based on complexity
- [ ] Test result caching
- [ ] Browser instance pooling
- [ ] Distributed agent scaling
- [ ] Smart test prioritization

## Development Roadmap

### Phase 1: Core Testing (Current)
- ✅ Basic browser automation
- ✅ Test execution and reporting
- ✅ Real-time progress monitoring
- 🚧 Test planner agent

### Phase 2: Intelligence Layer
- [ ] Smart test generation
- [ ] Failure pattern recognition
- [ ] Self-healing tests
- [ ] Performance optimization

### Phase 3: Advanced Capabilities
- [ ] Visual regression testing
- [ ] Accessibility testing
- [ ] Security vulnerability scanning
- [ ] Load testing integration