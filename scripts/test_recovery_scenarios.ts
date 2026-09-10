import { autonomousTaskEngine } from '../server/services/task/autonomousTaskEngine.js';
import { orchestrateChatRequest } from '../server/services/orchestrator.js';
import { storage } from '../server/storage.js';

async function runAllTests() {
  console.log('====================================================');
  console.log('PHASE 9: RECOVERY + OBSERVABILITY ENGINE TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // Ensure storage is initialized
  storage.updateRecoveryObservabilityConfig({
    enabled: true,
    maxRecoveryAttempts: 3,
    retryFailedNetworkRequests: true,
    logTraceObservability: true,
    autoAlternativeTools: true,
    failoverOnRateLimit: true,
  });

  // ----------------------------------------------------
  // TEST 1: Normal Execution
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Normal Execution ---');
  try {
    const res1 = await autonomousTaskEngine.runTask({
      userPrompt: 'Open Google and search for Super AI architecture',
      taskScopedAuthorization: true,
    });
    assert(res1.state === 'COMPLETED', 'Test 1: State is COMPLETED', `State was: ${res1.state}`);
    assert(res1.steps.length > 0, 'Test 1: Plan generated steps', `Steps: ${res1.steps.length}`);
    const hasTrace = res1.traces.some((t) => t.agent === 'TASK' || t.agent === 'TOOL');
    assert(hasTrace, 'Test 1: Cognitive traces emitted for TASK and TOOL');
  } catch (err: any) {
    assert(false, 'Test 1: Normal Execution Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 2: Transient Network Failure (Auto-recovered)
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Network Failure (Transient ECONNRESET) ---');
  try {
    const res2 = await autonomousTaskEngine.runTask({
      userPrompt: 'Research quantum computing neural architectures',
      taskScopedAuthorization: true,
      simulationFlags: { networkFailureOnce: true },
    });
    assert(res2.state === 'COMPLETED', 'Test 2: State is COMPLETED after recovery', `State was: ${res2.state}`);
    assert(Boolean(res2.recovered), 'Test 2: Recovered flag is true');
    assert((res2.recoveryCount || 0) >= 1, 'Test 2: Recovery count incremented', `Recoveries: ${res2.recoveryCount}`);
    const hasRecoveryTrace = res2.traces.some((t) => t.agent === 'RECOVERY');
    assert(hasRecoveryTrace, 'Test 2: Recovery agent trace emitted');
    const hasHinglishNotice = res2.text.toLowerCase().includes('recover') || res2.text.includes('thik') || res2.text.includes('re-execute');
    assert(hasHinglishNotice, 'Test 2: Hinglish recovery notice included in response');
  } catch (err: any) {
    assert(false, 'Test 2: Network Failure Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 3: Repeated Failure (Budget Exhausted -> Safe Halt)
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Repeated Failure (Budget Exhausted) ---');
  try {
    const res3 = await autonomousTaskEngine.runTask({
      userPrompt: 'Search for recent machine learning papers and summarize',
      taskScopedAuthorization: true,
      simulationFlags: { repeatedFailure: true },
    });
    assert(res3.state === 'FAILED', 'Test 3: State is FAILED (Safe Halt)', `State was: ${res3.state}`);
    assert(!res3.success, 'Test 3: Success is false');
    const hasFailedTrace = res3.traces.some((t) => t.agent === 'TASK' && t.status === 'FALLBACK');
    assert(hasFailedTrace, 'Test 3: Safe fallback trace logged');
    assert(res3.text.length > 0, 'Test 3: Informative Hinglish error returned');
  } catch (err: any) {
    assert(false, 'Test 3: Repeated Failure Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 4: Authorization Denied
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Authorization Denied ---');
  try {
    const res4 = await autonomousTaskEngine.runTask({
      userPrompt: 'Launch notepad and write my daily agenda',
      simulationFlags: { authorizationDenied: true },
    });
    assert(res4.state === 'CANCELLED', 'Test 4: State is CANCELLED', `State was: ${res4.state}`);
    const hasAuthTrace = res4.traces.some((t) => t.agent === 'RECOVERY' && t.action === 'AUTHORIZATION_DENIED');
    assert(hasAuthTrace, 'Test 4: Authorization denied trace emitted');
  } catch (err: any) {
    assert(false, 'Test 4: Authorization Denied Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 5: Task Cancelled (Engine API)
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Task Cancelled ---');
  try {
    const plan = autonomousTaskEngine.planTask('Browse technical documentation');
    const cancelSuccess = autonomousTaskEngine.cancelTask(plan.taskId);
    assert(cancelSuccess, 'Test 5: cancelTask returned true');
    const current = autonomousTaskEngine.getCurrentTask();
    assert(!current || current.state === 'CANCELLED', 'Test 5: Task state transitioned to CANCELLED');
  } catch (err: any) {
    assert(false, 'Test 5: Task Cancelled Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 6: Skill Disabled Check
  // ----------------------------------------------------
  console.log('\n--- TEST 6: Skill Disabled Check ---');
  try {
    const res6 = await autonomousTaskEngine.runTask({
      userPrompt: 'Open Chrome and navigate to github.com',
      taskScopedAuthorization: true,
      simulationFlags: { skillDisabled: true },
    });
    assert(res6.state === 'FAILED', 'Test 6: State is FAILED when skill disabled', `State: ${res6.state}`);
    assert(res6.errorCategory === 'SKILL_DISABLED', 'Test 6: errorCategory is SKILL_DISABLED');
    assert(res6.text.includes('Control Panel'), 'Test 6: Informs user to enable skill in Control Panel');
  } catch (err: any) {
    assert(false, 'Test 6: Skill Disabled Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 7: Invalid Arguments (Planner Auto-Correction)
  // ----------------------------------------------------
  console.log('\n--- TEST 7: Invalid Arguments (Auto-Correction) ---');
  try {
    const res7 = await autonomousTaskEngine.runTask({
      userPrompt: 'Open Google and search for latest open weights LLM releases',
      taskScopedAuthorization: true,
      simulationFlags: { invalidArgumentOnce: true },
    });
    assert(res7.state === 'COMPLETED', 'Test 7: State is COMPLETED after parameter correction', `State: ${res7.state}`);
    const hasCorrectionTrace = res7.traces.some((t) => t.action === 'ARGUMENT_CORRECTION' || t.action === 'PLANNER_CORRECT_ARGUMENTS' || (t.agent === 'RECOVERY' && t.action === 'INVALID_ARGUMENT'));
    assert(hasCorrectionTrace, 'Test 7: Argument correction trace emitted');
  } catch (err: any) {
    assert(false, 'Test 7: Invalid Arguments Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 8: Judge Rejection (1 Revision Cycle)
  // ----------------------------------------------------
  console.log('\n--- TEST 8: Judge Rejection (Revision Cycle) ---');
  try {
    const res8 = await autonomousTaskEngine.runTask({
      userPrompt: 'Compare Transformer and Mamba architectures in detail',
      taskScopedAuthorization: true,
      simulationFlags: { judgeRejectionOnce: true },
    });
    assert(res8.state === 'COMPLETED', 'Test 8: State is COMPLETED after judge revision', `State: ${res8.state}`);
    const hasJudgeRevisionTrace = res8.traces.some((t) => t.agent === 'JUDGE' && t.action === 'REVISE');
    assert(hasJudgeRevisionTrace, 'Test 8: Judge REVISE trace recorded');
    const hasSpecialistRevised = res8.traces.some((t) => t.agent === 'SPECIALIST' && t.action === 'REVISED');
    assert(hasSpecialistRevised, 'Test 8: Specialist REVISED trace recorded');
  } catch (err: any) {
    assert(false, 'Test 8: Judge Rejection Exception', err.message);
  }

  // ----------------------------------------------------
  // TEST 9: Voice / Text Cancel Command
  // ----------------------------------------------------
  console.log('\n--- TEST 9: Voice / Text Cancel Command ---');
  try {
    // Create an active task in the engine
    const plan = autonomousTaskEngine.planTask('Multi step research task', 'conv-test-9');

    // Call orchestrateChatRequest with natural voice cancel command
    const res9 = await orchestrateChatRequest({
      message: 'task cancel karo',
      conversationId: 'conv-test-9',
    });

    assert(Boolean(res9.success), 'Test 9: Orchestrator handled cancellation request', `success was: ${res9.success}`);
    assert(res9.taskState === 'CANCELLED' || res9.text.toLowerCase().includes('cancel') || res9.text.toLowerCase().includes('rok'),
      'Test 9: Task cancelled response returned', `Output: ${res9.text}`);
  } catch (err: any) {
    assert(false, 'Test 9: Voice Cancel Exception', err.message);
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests().catch((e) => {
  console.error('Fatal error running tests:', e);
  process.exit(1);
});
