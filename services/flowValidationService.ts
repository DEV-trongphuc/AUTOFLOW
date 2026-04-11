
import { Flow, FlowStep } from '../types';

export interface ValidationError {
  msg: string;
  type: 'critical' | 'warning';
  stepId?: string;
}

/**
 * Helper function to recursively check for spam (email followed by another email without a wait/condition).
 * It traverses the flow steps, including linking to other flows.
 * Returns `true` if this path eventually leads to an email *without an intervening safe step*, `false` otherwise.
 * It also directly pushes errors if a spam sequence is detected.
 */
// Helper to recursively check for spam (email followed by another email without a wait/condition).
// It traverses the flow steps, including linking to other flows.
const checkSpamDownstreamRecursive = (
  currentStepId: string | undefined,
  currentFlow: Flow,
  allFlows: Flow[],
  errors: ValidationError[],
  emailSourceStep: FlowStep,
  flowPath: string[],
  visitedStepsInCurrentFlow: Set<string>
): boolean => {
  if (!currentStepId) return false;

  if (visitedStepsInCurrentFlow.has(currentStepId)) {
    errors.push({
      msg: `LỖI LOGIC: Vòng lặp vô hạn phát hiện tại bước "${currentFlow.steps.find(s => s.id === currentStepId)?.label || 'Unknown'}".`,
      type: 'critical',
      stepId: currentStepId
    });
    return false;
  }
  visitedStepsInCurrentFlow.add(currentStepId);

  const currentStep = currentFlow.steps.find(s => s.id === currentStepId);
  if (!currentStep) return false;

  // "Sending" Actions (Email, Zalo) are SPAM points
  // If we hit another sending action, it's spam!
  const isSendingAction = ['action', 'zalo_zns', 'zalo_cs'].includes(currentStep.type);
  if (isSendingAction) {
    const typeLabel = currentStep.type === 'action' ? 'Email' : 'Zalo';
    errors.push({
      msg: `RỦI RO SPAM: ${typeLabel} ("${emailSourceStep.label}") dẫn trực tiếp đến ${typeLabel} ("${currentStep.label}") mà không có bước Chờ (Flow: ${flowPath.join(' -> ')}).`,
      type: 'critical',
      stepId: emailSourceStep.id
    });
    return true;
  }

  // Safe Stops
  if (currentStep.type === 'wait' || currentStep.type === 'condition') {
    return false;
  }

  // Transparent / Instant Steps: Continue searching downstream
  if (['update_tag', 'split_test', 'list_action', 'remove_action'].includes(currentStep.type)) {
    let foundSpam = false;
    if (currentStep.type === 'split_test') {
      const pathASpam = checkSpamDownstreamRecursive(
        currentStep.pathAStepId, currentFlow, allFlows, errors, emailSourceStep,
        flowPath, new Set(visitedStepsInCurrentFlow)
      );
      const pathBSpam = checkSpamDownstreamRecursive(
        currentStep.pathBStepId, currentFlow, allFlows, errors, emailSourceStep,
        flowPath, new Set(visitedStepsInCurrentFlow)
      );
      foundSpam = pathASpam || pathBSpam;
    } else {
      foundSpam = checkSpamDownstreamRecursive(
        currentStep.nextStepId, currentFlow, allFlows, errors, emailSourceStep,
        flowPath, new Set(visitedStepsInCurrentFlow)
      );
    }
    return foundSpam;
  }

  if (currentStep.type === 'advanced_condition') {
    let foundSpam = false;
    if (currentStep.config.branches) {
      for (const b of currentStep.config.branches) {
        if (b.stepId) {
          if (checkSpamDownstreamRecursive(b.stepId, currentFlow, allFlows, errors, emailSourceStep, flowPath, new Set(visitedStepsInCurrentFlow))) {
            foundSpam = true;
          }
        }
      }
    }
    if (currentStep.config.defaultStepId) {
      if (checkSpamDownstreamRecursive(currentStep.config.defaultStepId, currentFlow, allFlows, errors, emailSourceStep, flowPath, new Set(visitedStepsInCurrentFlow))) {
        foundSpam = true;
      }
    }
    return foundSpam;
  }

  // Handle `link_flow`
  if (currentStep.type === 'link_flow') {
    const linkedFlowId = currentStep.config.linkedFlowId;
    if (linkedFlowId) {
      const newFlowPath = [...flowPath, currentStep.label];
      if (flowPath.includes(linkedFlowId)) {
        errors.push({
          msg: `LỖI LOGIC: Vòng lặp Flow: ${newFlowPath.join(' -> ')}.`,
          type: 'critical',
          stepId: currentStep.id
        });
        return false;
      }

      const targetFlow = allFlows.find(f => f.id === linkedFlowId);
      if (targetFlow && targetFlow.status === 'active') {
        const targetTrigger = targetFlow.steps.find(s => s.type === 'trigger');
        if (targetTrigger && targetTrigger.nextStepId) {
          const updatedFlowPath = [...newFlowPath, targetFlow.name];
          return checkSpamDownstreamRecursive(
            targetTrigger.nextStepId, targetFlow, allFlows, errors, emailSourceStep,
            updatedFlowPath, new Set()
          );
        }
      }
    }
    return false;
  }

  return false;
};


const checkBurstLimit = (
  startStepId: string | undefined,
  currentFlow: Flow,
  errors: ValidationError[],
  consecutiveCount: number,
  visited: Set<string>
) => {
  if (!startStepId || visited.has(startStepId)) return;
  visited.add(startStepId);

  const step = currentFlow.steps.find(s => s.id === startStepId);
  if (!step) return;

  let newCount = consecutiveCount;
  // All these are "Fast Actions" that expend API/DB resources or obscure logic if bunched
  const isFastAction = ['action', 'update_tag', 'list_action', 'remove_action', 'zalo_zns', 'zalo_cs', 'split_test'].includes(step.type);
  const isWait = step.type === 'wait';

  if (isWait) {
    // Check Wait Duration >= 10 Minutes
    let minutes = 0;
    if (step.config.unit === 'minutes') minutes = step.config.duration;
    if (step.config.unit === 'hours') minutes = step.config.duration * 60;
    if (step.config.unit === 'days') minutes = step.config.duration * 1440;

    if (minutes >= 10) {
      newCount = 0; // Reset
    } else {
      // Wait < 10 mins does NOT reset count
    }
  } else if (isFastAction) {
    newCount++;
  } else if (step.type === 'condition') {
    // Condition takes a little time to check, but isn't a "hard wait".
    // User didn't specify. Assuming Condition does NOT reset burst count unless it has wait? 
    // Condition logic is unique. Let's treat it as neutral (doesn't add, doesn't reset).
  }

  if (newCount > 3) {
    const alreadyreported = errors.some(e => e.stepId === step.id && e.msg.includes('liên tiếp quá nhanh'));
    if (!alreadyreported) {
      errors.push({
        msg: `QUÁ TẢI: Chuỗi hành động liên tiếp quá nhanh (Bước "${step.label}"). Cần thêm bước Chờ (tối thiểu 10 phút) sau mỗi 3 hành động nhanh.`,
        type: 'critical',
        stepId: step.id
      });
    }
    return;
  }

  if (step.nextStepId) checkBurstLimit(step.nextStepId, currentFlow, errors, newCount, new Set(visited));
  if (step.yesStepId) checkBurstLimit(step.yesStepId, currentFlow, errors, newCount, new Set(visited));
  if (step.noStepId) checkBurstLimit(step.noStepId, currentFlow, errors, newCount, new Set(visited));


  if (step.pathBStepId) checkBurstLimit(step.pathBStepId, currentFlow, errors, newCount, new Set(visited));
  if (step.type === 'advanced_condition') {
    step.config.branches?.forEach((b: any) => {
      if (b.stepId) checkBurstLimit(b.stepId, currentFlow, errors, newCount, new Set(visited));
    });
    if (step.config.defaultStepId) {
      checkBurstLimit(step.config.defaultStepId, currentFlow, errors, newCount, new Set(visited));
    }
  }
};
/**
 * [NEW] Helper to check time consistency across the flow.
 * Ensures that specific wait times (Until Date) are at least 10 minutes after the estimated arrival time.
 */
const checkTimeConsistency = (
  currentStepId: string | undefined,
  currentFlow: Flow,
  errors: ValidationError[],
  cumulativeOffsetMins: number,
  visited: Set<string>,
  isDirty: boolean = false // [ISSUE #5 FIX] Add isDirty parameter
) => {
  if (!currentStepId || visited.has(currentStepId)) return;
  visited.add(currentStepId);
  const step = currentFlow.steps.find(s => s.id === currentStepId);
  if (!step) return;
  let nextOffset = cumulativeOffsetMins;
  if (step.type === 'wait') {
    const config = step.config;
    const mode = config.mode || 'duration';
    if (mode === 'duration') {
      let mins = 0;
      if (config.unit === 'minutes') mins = config.duration;
      else if (config.unit === 'hours') mins = config.duration * 60;
      else if (config.unit === 'days') mins = config.duration * 1440;
      nextOffset += mins;
    } else if (mode === 'until_date') {
      const dateStr = config.specificDate;
      const timeStr = config.untilTime || '00:00';
      if (dateStr) {
        // We use local time for UI validation consistency
        const target = new Date(`${dateStr}T${timeStr}`);
        const now = new Date();
        const targetOffset = (target.getTime() - now.getTime()) / 60000;
        // Logic: Target Time must be >= ArrivalTime + 10 mins
        // [ISSUE #5 FIX] Only show warning if editing or flow is draft
        if (targetOffset < cumulativeOffsetMins + 10 && (currentFlow.status !== 'active' || isDirty)) {
          const expectedArrival = new Date(now.getTime() + cumulativeOffsetMins * 60000);
          const arrivalStr = expectedArrival.getHours().toString().padStart(2, '0') + ':' + expectedArrival.getMinutes().toString().padStart(2, '0');
          errors.push({
            msg: `Lỗi thời gian bước trước (Bước này bắt đầu sớm nhất phải là ${arrivalStr}) bấm để tự sửa`,
            type: currentFlow.status === 'active' ? 'warning' : 'critical',
            stepId: step.id
          });
        }
        // Advance offset to the target time for subsequent steps
        nextOffset = Math.max(nextOffset, targetOffset);
      }
    }
  }
  // Follow all possible paths - [ISSUE #5 FIX] Pass isDirty to recursive calls
  if (step.nextStepId) checkTimeConsistency(step.nextStepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
  if (step.yesStepId) checkTimeConsistency(step.yesStepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
  if (step.noStepId) checkTimeConsistency(step.noStepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
  if (step.pathAStepId) checkTimeConsistency(step.pathAStepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
  if (step.pathBStepId) checkTimeConsistency(step.pathBStepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
  if (step.type === 'advanced_condition') {
    step.config?.branches?.forEach((b: any) => {
      if (b.stepId) checkTimeConsistency(b.stepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
    });
    if (step.config?.defaultStepId) {
      checkTimeConsistency(step.config.defaultStepId, currentFlow, errors, nextOffset, new Set(visited), isDirty);
    }
  }
};

// Helper: Check Adjacent Splits
const checkAdjacentSplits = (step: FlowStep, nextStepId: string | undefined, flow: Flow, errors: ValidationError[]) => {
  if (!nextStepId) return;
  const nextStep = flow.steps.find(s => s.id === nextStepId);
  if (nextStep && nextStep.type === 'split_test' && step.type === 'split_test') {
    errors.push({
      msg: `LOGIC PHỨC TẠP: Không được đặt 2 bước A/B Test ("${step.label}" -> "${nextStep.label}") liền kề nhau.`,
      type: 'critical',
      stepId: step.id
    });
  }
};

// Helper: Check Redundant Steps
const checkRedundantSteps = (step: FlowStep, nextStepId: string | undefined, flow: Flow, errors: ValidationError[]) => {
  if (!nextStepId) return;
  const nextStep = flow.steps.find(s => s.id === nextStepId);
  if (!nextStep) return;

  // Same Type Check
  if (step.type === nextStep.type && ['update_tag', 'list_action', 'remove_action'].includes(step.type)) {
    // Deep Compare Config
    const strA = JSON.stringify(step.config);
    const strB = JSON.stringify(nextStep.config);
    if (strA === strB) {
      errors.push({
        msg: `DƯ THỪA: Hành động "${step.label}" lặp lại y hệt nhau liên tiếp.`,
        type: 'warning',
        stepId: nextStep.id
      });
    }
  }
};

// Helper: Check Identical Branches (First Step Only)
const checkIdenticalBranches = (step: FlowStep, flow: Flow, errors: ValidationError[]) => {
  if (step.type === 'condition') {
    const yesStep = flow.steps.find(s => s.id === step.yesStepId);
    const noStep = flow.steps.find(s => s.id === step.noStepId);

    if (yesStep && noStep) {
      if (yesStep.type === noStep.type && JSON.stringify(yesStep.config) === JSON.stringify(noStep.config)) {
        errors.push({
          msg: `LOGIC NHÁNH: Hai nhánh Đúng/Sai bắt đầu bằng hành động giống hệt nhau ("${yesStep.label}"). Hãy gộp lại hoc thay đổi logic.`,
          type: 'warning',
          stepId: step.id
        });
      }
    }
  }

  if (step.type === 'split_test') {
    const aStep = flow.steps.find(s => s.id === step.pathAStepId);
    const bStep = flow.steps.find(s => s.id === step.pathBStepId);
    if (aStep && bStep) {
      if (aStep.type === bStep.type && JSON.stringify(aStep.config) === JSON.stringify(bStep.config)) {
        errors.push({
          msg: `LOGIC A/B: Hai nhánh A/B bắt đầu giống hệt nhau. Điều này làm mất ý nghĩa của A/B Test.`,
          type: 'warning',
          stepId: step.id
        });
      }
    }
  }
}

// Helper: Cross-Flow Triggers (Smart Notification)
const checkCrossFlowTriggers = (step: FlowStep, allFlows: Flow[]): ValidationError | null => {
  if (step.type === 'update_tag' && step.config.tags && step.config.tags.length > 0) {
    for (const tag of step.config.tags) {
      const triggeredFlow = allFlows.find(f =>
        f.status === 'active' &&
        f.steps.some(s => s.type === 'trigger' && s.config.type === 'tag' && (s.config.targetId === tag || (s.config.tags && s.config.tags.includes(tag))))
      );

      if (triggeredFlow) {
        return {
          msg: `AUTO-TRIGGER: Hành động gắn tag "${tag}" sẽ kích hoạt ngay lập tức Flow đang chạy: "${triggeredFlow.name}".`,
          type: 'warning',
          stepId: step.id
        };
      }
    }
  }
  // Check List Action triggering List Trigger? (Segment usually)
  return null;
}



// Helper: Check for Duplicate Triggers in OTHER Active Flows
// Returns conflicting flow info or null
export const findDuplicateTriggerFlow = (currentFlow: Flow, allFlows: Flow[]): { id: string, name: string } | null => {
  const currentTrigger = currentFlow.steps.find(s => s.type === 'trigger');
  if (!currentTrigger || !currentTrigger.config.type || !currentTrigger.config.targetId) return null;

  const currentType = currentTrigger.config.type;
  const currentTarget = currentTrigger.config.targetId;

  // Special checks for complex triggers
  // 1. Tag Trigger: might use config.tags array instead of targetId? 
  // Let's assume standard trigger uses targetId for single select, or we check specific config schema.
  // In `checkCrossFlowTriggers` we used `config.tags`.
  // Standardize: If type='tag', check `config.tagId` OR `config.tags`?
  // Current implementation (StepEditor) usually saves single IDs for triggers like 'form', 'campaign'.
  // For 'tag' trigger, `StepEditor` might save to `config.tags` array or `targetId`.
  // Let's standardize on checking both if available.

  for (const otherFlow of allFlows) {
    if (otherFlow.id === currentFlow.id || otherFlow.status !== 'active') continue;

    const otherTrigger = otherFlow.steps.find(s => s.type === 'trigger');
    if (!otherTrigger || otherTrigger.config.type !== currentType) continue;

    let isDuplicate = false;

    // Type-specific comparison
    switch (currentType) {
      case 'campaign':
      case 'form':
      case 'purchase':
      case 'custom_event':
      case 'segment':
        // Direct ID Match
        if (otherTrigger.config.targetId === currentTarget) {
          isDuplicate = true;
        }
        break;

      case 'date':
        // Check dateField (birthday/anniversary)
        if (otherTrigger.config.dateField === currentTrigger.config.dateField) {
          isDuplicate = true;
        }
        break;

      case 'tag':
        // Check overlap in tags
        // If config.tags is array
        const currentTags = currentTrigger.config.tags || (currentTarget ? [currentTarget] : []);
        const otherTags = otherTrigger.config.tags || (otherTrigger.config.targetId ? [otherTrigger.config.targetId] : []);
        // If ANY tag overlaps? Or ALL?
        // Trigger usually fires if ANY of the selected tags is added.
        // So if they share ANY tag, it's a conflict for that specific tag event.
        const hasOverlap = currentTags.some((t: string) => otherTags.includes(t));
        if (hasOverlap) {
          isDuplicate = true;
        }
        break;
    }

    if (isDuplicate) {
      return { id: otherFlow.id, name: otherFlow.name };
    }
  }

  return null;
}

// Helper: Check Frequency Cap Risk
const checkFrequencyCapRisk = (
  startStepId: string | undefined,
  currentFlow: Flow,
  errors: ValidationError[],
  actionCount: number,
  visited: Set<string>,
  cap: number,
  simulatedTimeMs: number
) => {
  if (!startStepId || visited.has(startStepId)) return;
  visited.add(startStepId);

  const step = currentFlow.steps.find(s => s.id === startStepId);
  if (!step) return;

  let newCount = actionCount;
  let nextSimulatedTime = simulatedTimeMs;
  const isAction = ['action', 'zalo_zns', 'zalo_cs'].includes(step.type);
  const isWait = step.type === 'wait';

  if (isWait) {
    let waitMinutes = 0;
    const config = step.config || {};
    const mode = config.mode || 'duration';

    if (mode === 'duration') {
      if (config.unit === 'minutes') waitMinutes = config.duration;
      else if (config.unit === 'hours') waitMinutes = config.duration * 60;
      else if (config.unit === 'days') waitMinutes = config.duration * 1440;

      // Advance time
      nextSimulatedTime += waitMinutes * 60000;
    } else if (mode === 'until_date') {
      // Calculate gap from current simulated time to target date
      if (config.specificDate) {
        const timeStr = config.untilTime || '00:00';
        const targetDate = new Date(`${config.specificDate}T${timeStr}`);
        if (!isNaN(targetDate.getTime())) {
          // If target is in future compared to current simulated flow time
          if (targetDate.getTime() > simulatedTimeMs) {
            waitMinutes = (targetDate.getTime() - simulatedTimeMs) / 60000;
            nextSimulatedTime = targetDate.getTime();
          }
        }
      }
    } else if (mode === 'until') {
      // "Wait until 08:00" (daily recurrence or next occurrence)
      // Hard to predict without knowing current day, but usually implies waiting for next slot.
      // If we are at 07:00, it's 1 hour. If 09:00, it's 23 hours.
      // Conservatively, we don't reset unless we are sure.
      // Or we can assume it's at least a 'break' in immediate spam.
      // For Frequency Cap (Day), we might not reset unless it's clearly > 20h.
      // Let's stick to 0 waitMinutes for 'until' to be safe (conservative counting -> more warnings), 
      // or maybe 12 hours? No, keep 0 to avoid false negatives.
    }

    // Reset count if wait is significant (> 20 hours)
    if (waitMinutes >= 1200) {
      newCount = 0;
    }
  } else if (isAction) {
    newCount++;
  }

  if (newCount > cap) {
    // Only report once per step to avoid spamming errors
    const already = errors.some(e => e.stepId === step.id && e.msg.includes('Frequency Cap'));
    if (!already) {
      errors.push({
        msg: `CẢNH BÁO FREQUENCY CAP: Flow này có thể gửi ${newCount} tin trong vòng 1 ngày, vượt quá giới hạn ${cap} tin/ngày được cài đặt. Hệ thống sẽ hoãn các tin thừa sang ngày hôm sau.`,
        type: 'warning',
        stepId: step.id
      });
    }
    // Don't return, allow verifying downstream
  }

  if (step.nextStepId) checkFrequencyCapRisk(step.nextStepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
  if (step.yesStepId) checkFrequencyCapRisk(step.yesStepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
  if (step.noStepId) checkFrequencyCapRisk(step.noStepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
  if (step.pathAStepId) checkFrequencyCapRisk(step.pathAStepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
  if (step.pathBStepId) checkFrequencyCapRisk(step.pathBStepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
  if (step.type === 'advanced_condition') {
    step.config?.branches?.forEach((b: any) => {
      if (b.stepId) checkFrequencyCapRisk(b.stepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
    });
    if (step.config?.defaultStepId) {
      checkFrequencyCapRisk(step.config.defaultStepId, currentFlow, errors, newCount, new Set(visited), cap, nextSimulatedTime);
    }
  }
};

export const validateFlow = (flowToCheck: Flow, allFlows: Flow[] = [], isStrict: boolean = false, isDirty: boolean = false): ValidationError[] => {
  let errors: ValidationError[] = [];
  const rawSteps = flowToCheck.steps || [];

  // ... (Reachable steps logic same as before) ...
  const reachableStepIds = new Set<string>();
  const trigger = rawSteps.find(s => s.type === 'trigger');

  if (trigger) {
    const queue = [trigger.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (reachableStepIds.has(currentId)) continue;
      reachableStepIds.add(currentId);

      const step = rawSteps.find(s => s.id === currentId);
      if (step) {
        if (step.nextStepId) queue.push(step.nextStepId);
        if (step.yesStepId) queue.push(step.yesStepId);
        if (step.noStepId) queue.push(step.noStepId);
        if (step.pathAStepId) queue.push(step.pathAStepId);
        if (step.pathBStepId) queue.push(step.pathBStepId);
        if (step.type === 'advanced_condition') {
          if (step.config && step.config.branches) {
            step.config.branches.forEach((b: any) => {
              if (b.stepId) queue.push(b.stepId);
            });
          }
          if (step.config && step.config.defaultStepId) {
            queue.push(step.config.defaultStepId);
          }
        }
      }
    }
  }

  const steps = trigger ? rawSteps.filter(s => reachableStepIds.has(s.id)) : rawSteps;

  if (trigger) {
    checkBurstLimit(trigger.nextStepId, flowToCheck, errors, 0, new Set());
    checkTimeConsistency(trigger.nextStepId, flowToCheck, errors, 0, new Set(), isDirty); // [ISSUE #5 FIX] Pass isDirty

    // NEW: Check Frequency Cap Risk
    const cap = (flowToCheck.config as any)?.frequencyCap ?? 3;
    if (cap > 0) { // Only check if cap is active
      checkFrequencyCapRisk(trigger.nextStepId, flowToCheck, errors, 0, new Set(), cap, Date.now());
    }
  }

  // SPAM Check: For each email step, check if it leads to another email without a wait
  steps.forEach(s => {
    if (['action', 'zalo_zns', 'zalo_cs'].includes(s.type)) {
      const nextId = s.type === 'action' ? s.nextStepId : (s as any).nextStepId; // Zalo also uses nextStepId
      if (nextId) {
        checkSpamDownstreamRecursive(
          nextId,
          flowToCheck,
          allFlows,
          errors,
          s,
          [flowToCheck.name],
          new Set()
        );
      }
    }
  });

  // DUPLICATE TRIGGER CHECK (STRICT MODE ONLY?)
  // User wants to block activation. So check if Active or if `isStrict` (which we use on Activation attempt).
  if (isStrict || flowToCheck.status === 'active') {
    const conflict = findDuplicateTriggerFlow(flowToCheck, allFlows);
    if (conflict) {
      errors.push({
        msg: `XUNG ĐỘT KÍCH HOẠT: Flow này có cùng điều kiện kích hoạt với Flow đang chạy: "${conflict.name}". Vui lòng kiểm tra lại để tránh xử lý trùng.`,
        type: 'critical',
        stepId: trigger?.id
      });
    }
  }



  // ... (Rest of existing validation) ...
  // Find all steps that are inside a Split Test branch
  const splitTestDescendants = new Set<string>();
  steps.filter(s => s.type === 'split_test').forEach(splitStep => {
    // ... (existing helper) ...
    const getAllDescendantStepIds = (startStepId: string | undefined, flowSteps: FlowStep[], collectedIds = new Set<string>()): Set<string> => {
      if (!startStepId || collectedIds.has(startStepId)) {
        return collectedIds;
      }
      collectedIds.add(startStepId);
      const step = flowSteps.find(s => s.id === startStepId);
      if (!step) return collectedIds;

      if (step.nextStepId) getAllDescendantStepIds(step.nextStepId, flowSteps, collectedIds);
      if (step.yesStepId) getAllDescendantStepIds(step.yesStepId, flowSteps, collectedIds);
      if (step.noStepId) getAllDescendantStepIds(step.noStepId, flowSteps, collectedIds);
      if (step.pathAStepId) getAllDescendantStepIds(step.pathAStepId, flowSteps, collectedIds);
      if (step.pathBStepId) getAllDescendantStepIds(step.pathBStepId, flowSteps, collectedIds);
      return collectedIds;
    };

    const branchA = getAllDescendantStepIds(splitStep.pathAStepId, steps);
    const branchB = getAllDescendantStepIds(splitStep.pathBStepId, steps);
    branchA.forEach(id => splitTestDescendants.add(id));
    branchB.forEach(id => splitTestDescendants.add(id));
  });

  if (!trigger) {
    errors.push({ msg: 'Thiếu điểm bắt đầu (Trigger)', type: 'critical' });
  } else {
    // ... (existing trigger checks) ...
    if ((['segment', 'form', 'purchase', 'custom_event', 'tag', 'campaign'].includes(trigger.config.type || '')) && !trigger.config.targetId) {
      // Note: Tag might allow array only, but we check targetId usually
      // Let's relax for Tag if tags array exists
      if (trigger.config.type === 'tag' && (!trigger.config.tags || trigger.config.tags.length === 0) && !trigger.config.targetId) {
        errors.push({ msg: `Chưa chọn thẻ (Tag) cho Trigger`, type: isStrict ? 'critical' : 'warning', stepId: trigger.id });
      } else if (trigger.config.type !== 'tag' && !trigger.config.targetId) {
        errors.push({ msg: `Chưa chọn nguồn kích hoạt cho Trigger (${trigger.config.type})`, type: isStrict ? 'critical' : 'warning', stepId: trigger.id });
      }
    }
    // ...
    if (trigger.config.type === 'campaign') {
      const nextStep = steps.find(n => n.id === trigger.nextStepId);
      if (nextStep && nextStep.type === 'action') {
        errors.push({ msg: 'BẮT BUỘC có bước "Chờ" giữa Trigger Campaign và Email để tránh lỗi quá tải (Spam).', type: 'critical', stepId: trigger.id });
      }
    }
  }

  steps.forEach(s => {
    checkAdjacentSplits(s, s.pathAStepId, flowToCheck, errors);
    checkAdjacentSplits(s, s.pathBStepId, flowToCheck, errors);
    checkRedundantSteps(s, s.nextStepId, flowToCheck, errors);
    checkIdenticalBranches(s, flowToCheck, errors);
    const triggerWarn = checkCrossFlowTriggers(s, allFlows);
    if (triggerWarn) errors.push(triggerWarn);

    // ... (Rest of existing step checks) ...
    if (s.type === 'action') {
      if (!s.config.subject) errors.push({ msg: `Bước "${s.label}": Thiếu tiêu đề Email`, type: 'critical', stepId: s.id });
      if (!s.config.templateId && !s.config.customHtml) errors.push({ msg: `Bước "${s.label}": Thiếu nội dung Email`, type: 'critical', stepId: s.id });
      if (!s.config.senderEmail) errors.push({ msg: `Bước "${s.label}": Thiếu email người gửi`, type: 'warning', stepId: s.id });
    }

    if (s.type === 'wait') {
      const waitMode = s.config.mode || 'duration';

      if (waitMode === 'duration') {
        if (!s.config.duration || !s.config.unit) {
          errors.push({ msg: `Bước "${s.label}": Chưa đặt thời gian chờ`, type: 'critical', stepId: s.id });
        }
      } else if (waitMode === 'until_date') {
        const dateStr = s.config.specificDate;
        const timeStr = s.config.untilTime || '00:00';
        if (!dateStr) {
          errors.push({ msg: `Bước "${s.label}": Chưa chọn ngày chờ cụ thể`, type: 'critical', stepId: s.id });
        } else {
          // Validate date isn't in past or too soon
          const target = new Date(`${dateStr}T${timeStr}`);
          const now = new Date();
          const tenMins = new Date(now.getTime() + 10 * 60 * 1000);

          if (isNaN(target.getTime())) {
            errors.push({ msg: `Bước "${s.label}": Định dạng ngày giờ không hợp lệ`, type: 'critical', stepId: s.id });
          } else if (target < now) {
            // [ISSUE #5 FIX] Only show past date warning if:
            // 1. Flow is draft (not active yet), OR
            // 2. Flow is active AND being edited (isDirty = true)
            // Skip warning when just viewing an active flow (view mode)
            if (flowToCheck.status !== 'active' || isDirty) {
              errors.push({ msg: `Bước "${s.label}": Thời gian chờ đã ở quá khứ (bấm để tự sửa)`, type: flowToCheck.status === 'active' ? 'warning' : 'critical', stepId: s.id });
            }
          } else if (target < tenMins) {
            // Same logic for "too soon" warnings
            if (flowToCheck.status !== 'active' || isDirty) {
              errors.push({ msg: `Bước "${s.label}": Thời gian chờ quá gần (bấm để tự sửa)`, type: flowToCheck.status === 'active' ? 'warning' : 'critical', stepId: s.id });
            }
          }
        }
      } else if (waitMode === 'until') {
        if (!s.config.untilTime) {
          errors.push({ msg: `Bước "${s.label}": Chưa đặt giờ chờ cụ thể`, type: 'critical', stepId: s.id });
        }
      } else if (waitMode === 'until_attribute') {
        if (!s.config.attributeKey) {
          errors.push({ msg: `Bước "${s.label}": Chưa chọn thuộc tính ngày (sinh nhật, gia nhập...)`, type: 'critical', stepId: s.id });
        }
      }

      const nextStep = steps.find(n => n.id === s.nextStepId);
      if (nextStep && nextStep.type === 'wait') {
        errors.push({ msg: `CẢNH BÁO: Hai bước chờ liên tiếp ("${s.label}" -> "${nextStep.label}"). Thời gian sẽ cộng dồn.`, type: 'warning', stepId: s.id });
      }
    }

    if (s.type === 'link_flow') {
      if (!s.config.linkedFlowId) {
        errors.push({ msg: `Bước "${s.label}": Chưa chọn Flow đích`, type: 'critical', stepId: s.id });
      } else {
        const target = allFlows.find(f => f.id === s.config.linkedFlowId);
        if (!target || target.status === 'archived') {
          errors.push({ msg: `Bước "${s.label}": Flow đích không tồn tại hoặc đã bị xóa`, type: 'critical', stepId: s.id });
        } else {
          if (s.config.linkedFlowId === flowToCheck.id) {
            errors.push({ msg: `Bước "${s.label}": Không thể link về chính nó (vòng lặp)`, type: 'critical', stepId: s.id });
          }
          if (target.status !== 'active') {
            errors.push({ msg: `Bước "${s.label}": Flow đích "${target.name}" chưa được kích hoạt (Active).`, type: 'warning', stepId: s.id });
          }
          // New check valid?
          const targetTrigger = target.steps?.find(step => step.type === 'trigger');
          if (targetTrigger && targetTrigger.config.type === 'campaign') {
            errors.push({ msg: `Bước "${s.label}": Không thể link đến Flow "${target.name}" vì nó phụ thuộc vào Chiến dịch.`, type: 'critical', stepId: s.id });
          }
        }
      }
    }

    if (s.type === 'condition') {
      if (!s.yesStepId && !s.noStepId) {
        errors.push({ msg: `Bước "${s.label}": Cần ít nhất một nhánh tiếp theo`, type: isStrict ? 'critical' : 'warning', stepId: s.id });
      }
      if (!s.config.conditionType) {
        errors.push({ msg: `Bước "${s.label}": Chưa chọn loại điều kiện`, type: 'critical', stepId: s.id });
      }
      if (!s.config.waitDuration || !s.config.waitUnit) {
        errors.push({ msg: `Bước "${s.label}": Chưa đặt thời gian chờ của điều kiện`, type: 'critical', stepId: s.id });
      }
      if (s.config.conditionType === 'clicked' && (s.config.linkTargets === undefined || s.config.linkTargets === null)) {
        errors.push({ msg: `Bước "${s.label}": Chưa chọn link cần theo dõi`, type: 'warning', stepId: s.id });
      }
    }

    if (s.type === 'zalo_zns') {
      if (!s.config.zalo_oa_id) errors.push({ msg: `Bước "${s.label}": Chưa chọn Zalo OA`, type: 'critical', stepId: s.id });
      if (!s.config.template_id) errors.push({ msg: `Bước "${s.label}": Chưa chọn Template ZNS`, type: 'critical', stepId: s.id });

      // Robust Content Validation
      if (s.config.template_id) {
        if (s.config.input_mode === 'csv') {
          if (!s.config.csv_filename) {
            errors.push({ msg: `Bước "${s.label}": Chưa upload file CSV danh sách gửi`, type: 'critical', stepId: s.id });
          } else {
            // Check required phone column
            if (!s.config.template_data?.['phone_column']) {
              errors.push({ msg: `Bước "${s.label}": File CSV chưa xác định cột Số điện thoại (Phone)`, type: 'critical', stepId: s.id });
            }
            // Check if fallback behavior is set (warning/info logic, but essential for operation)
            if (!s.config.fallback_behavior) {
              // Default is usually 'skip', so maybe not an error, just assumed.
            }
          }
        } else {
          // Manual Mode - Check required params
          const requiredParams = s.config.required_params || [];
          const templateData = s.config.template_data || {};
          const missingParams = requiredParams.filter((p: string) => !templateData[p] || templateData[p].trim() === '');

          if (missingParams.length > 0) {
            errors.push({ msg: `Bước "${s.label}": Thiếu tham số bắt buộc: ${missingParams.join(', ')}`, type: 'critical', stepId: s.id });
          }
        }
      }
    }

    if (s.type === 'zalo_cs') {
      if (!s.config.zalo_oa_id) errors.push({ msg: `Bước "${s.label}": Chưa chọn Zalo OA`, type: 'critical', stepId: s.id });
      if (!s.config.content) errors.push({ msg: `Bước "${s.label}": Chưa nhập nội dung tin nhắn tư vấn`, type: 'critical', stepId: s.id });
    }

    if (s.type === 'update_tag') {
      if (!s.config.tags || s.config.tags.length === 0) {
        errors.push({ msg: `Bước "${s.label}": Chưa chọn nhãn cần cập nhật`, type: 'critical', stepId: s.id });
      }
    }

    if (s.type === 'list_action') {
      if (!s.config.listId) {
        errors.push({ msg: `Bước "${s.label}": Chưa chọn danh sách cần cập nhật`, type: 'critical', stepId: s.id });
      }
    }

    if (s.type === 'remove_action') {
      if (!s.config.actionType) {
        errors.push({ msg: `Bước "${s.label}": Chưa chọn hành động xóa/hủy đăng ký`, type: 'critical', stepId: s.id });
      }
    }

    if (s.type === 'split_test') {
      if (!s.pathAStepId || !s.pathBStepId) {
        errors.push({ msg: `Bước "${s.label}": A/B Test cần có cả 2 nhánh A và B`, type: 'critical', stepId: s.id });
      }
    }

    if (s.type === 'advanced_condition') {
      const branches = s.config.branches || [];
      const defaultStepId = s.config.defaultStepId;

      if (branches.length === 0) {
        errors.push({ msg: `Bước "${s.label}": Phải có ít nhất 1 nhánh điều kiện.`, type: 'critical', stepId: s.id });
      }

      // Check for empty conditions in branches
      branches.forEach((b: any, index: number) => {
        if (!b.conditions || b.conditions.length === 0) {
          errors.push({ msg: `Bước "${s.label}" (Nhánh ${index + 1}): Phải có ít nhất 1 điều kiện.`, type: 'critical', stepId: s.id });
        }
      });
    }

    // TERMINAL STEP VALIDATION
    if (['wait', 'condition', 'split_test', 'advanced_condition'].includes(s.type)) {
      let hasNextStep = false;
      if (s.type === 'wait') hasNextStep = !!s.nextStepId;
      else if (s.type === 'condition') hasNextStep = !!s.yesStepId || !!s.noStepId;
      else if (s.type === 'split_test') hasNextStep = !!s.pathAStepId || !!s.pathBStepId;
      else if (s.type === 'advanced_condition') {
        // It has next step if ANY branch has stepId OR defaultStepId exists
        hasNextStep = (s.config.branches && s.config.branches.some((b: any) => !!b.stepId)) || !!s.config.defaultStepId;
      }

      if (!hasNextStep) {
        const typeLabel = s.type === 'wait' ? 'Chờ đợi' : (
          s.type === 'advanced_condition' ? 'Rẽ nhánh nâng cao' :
            (s.type === 'condition' ? 'Điều kiện' : 'A/B Test')
        );
        errors.push({
          msg: `Bước "${s.label}" (${typeLabel}) không thể là bước cuối cùng của flow. Cần thêm bước tiếp theo để flow có thể hoàn tất.`,
          type: 'critical',
          stepId: s.id
        });
      }
    }
  });

  // PRODUCTIVE STEP CHECK
  const productiveTypes = ['action', 'update_tag', 'list_action', 'remove_action', 'link_flow', 'zalo_zns', 'zalo_cs'];
  const hasProductiveStep = steps.some(s => productiveTypes.includes(s.type));

  if (!hasProductiveStep && steps.length > 0) {
    errors.push({
      msg: 'Quy trình chưa có hành động thực tế nào (Email, Tag, List, Zalo...).',
      type: 'critical'
    });
  }

  // [USER REQUEST] Filter and group time-related warnings if active and not dirty
  if (flowToCheck.status === 'active' && !isDirty && !isStrict) {
    const timeErrorKeywords = ['thời gian chờ đã ở quá khứ', 'Lỗi thời gian bước trước', 'thời gian chờ quá gần'];
    const timeErrorsFound = errors.filter(e => timeErrorKeywords.some(key => e.msg.includes(key)));

    if (timeErrorsFound.length > 0) {
      // Remove specific errors
      errors = errors.filter(e => !timeErrorKeywords.some(key => e.msg.includes(key)));

      // Add a single generic warning
      errors.unshift({
        msg: "Các bước 'Chờ' kích hoạt trong quá khứ cần check lại nếu có người mới vào kịch bản.",
        type: 'warning'
      });
    }
  }

  return errors;
};

/**
 * Async extension của validateFlow — kiểm tra thêm:
 * 1. Email step: template có bị xóa không (API templates?id=xxx)
 * 2. ZNS step: template có tồn tại và còn active không (API zalo_templates?id=xxx)
 *
 * Gọi song song tất cả các check để tránh chậm.
 * Trả về ValidationError[] để merge với validateFlow().
 */
export const validateFlowAsync = async (
  flowToCheck: Flow,
  apiGet: (endpoint: string) => Promise<{ success: boolean; data?: any }>
): Promise<ValidationError[]> => {
  const asyncErrors: ValidationError[] = [];
  const rawSteps = flowToCheck.steps || [];

  // Thu thập tất cả email steps có templateId
  const emailStepsWithTemplate = rawSteps.filter(
    s => s.type === 'action' && s.config?.sourceMode !== 'html' && s.config?.templateId
  );

  // Thu thập tất cả ZNS steps có template_id
  const znsSteps = rawSteps.filter(
    s => s.type === 'zalo_zns' && s.config?.template_id
  );

  // Deduplicate templateIds để tránh gọi API trùng
  const emailTemplateIds = [...new Set(emailStepsWithTemplate.map(s => s.config.templateId as string))];
  const znsTemplateIds = [...new Set(znsSteps.map(s => s.config.template_id as string))];

  // Gọi API song song
  const emailChecks = emailTemplateIds.map(async (tid) => {
    try {
      const res = await apiGet(`templates?id=${tid}`);
      return { tid, exists: res.success && !!res.data };
    } catch {
      return { tid, exists: false };
    }
  });

  const znsChecks = znsTemplateIds.map(async (tid) => {
    try {
      // Dùng template_id (Zalo numeric ID) — KHÔNG dùng id (internal UUID)
      const res = await apiGet(`zalo_templates?template_id=${tid}`);
      if (!res.success || !res.data) return { tid, exists: false, active: false };
      // Status trong DB: 'approved' (sau sync), Zalo API trả về 'ENABLE' / 'enable'
      const status = (res.data.status ?? '').toLowerCase();
      const isApproved = status === 'approved' || status === 'enable';
      return { tid, exists: true, active: isApproved, statusLabel: res.data.status ?? status };
    } catch {
      return { tid, exists: false, active: false };
    }
  });

  const [emailResults, znsResults] = await Promise.all([
    Promise.all(emailChecks),
    Promise.all(znsChecks),
  ]);

  // Map kết quả email template
  const emailStatusMap = new Map(emailResults.map(r => [r.tid, r.exists]));

  // Map kết quả ZNS template
  const znsStatusMap = new Map(znsResults.map(r => [r.tid, r]));

  // Báo lỗi cho từng email step
  for (const step of emailStepsWithTemplate) {
    const tid = step.config.templateId as string;
    const exists = emailStatusMap.get(tid);
    if (exists === false) {
      asyncErrors.push({
        msg: `Bước "${step.label}": Mẫu email đã bị xóa khỏi hệ thống! Email sẽ không gửi được. Hãy chọn lại mẫu khác.`,
        type: 'critical',
        stepId: step.id,
      });
    }
  }

  // Báo lỗi cho từng ZNS step
  for (const step of znsSteps) {
    const tid = step.config.template_id as string;
    const result = znsStatusMap.get(tid);
    if (!result) continue;

    if (!result.exists) {
      asyncErrors.push({
        msg: `Bước "${step.label}": Template ZNS không tồn tại hoặc đã bị xóa! ZNS sẽ không gửi được.`,
        type: 'critical',
        stepId: step.id,
      });
    } else if (!result.active) {
      asyncErrors.push({
        msg: `Bước "${step.label}": Template ZNS đang ở trạng thái "${result.statusLabel || 'không active'}" — chưa được Zalo duyệt hoặc đã bị từ chối. ZNS sẽ không gửi được.`,
        type: 'critical',
        stepId: step.id,
      });
    }
  }

  return asyncErrors;
};
