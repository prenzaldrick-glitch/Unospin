import { WheelSegment } from '../types';
import { WHEEL_SEGMENTS } from '../components/SpinWheel';

export interface SpinOutcome {
  segmentIndex: number;
  rewardAmount: number;
  segment: WheelSegment;
}

export function getNextSpinOutcome(cycleSpinCount: number, currentBalance: number): SpinOutcome {
  // 1st Spin: MEGA +₱200
  if (cycleSpinCount === 0) {
    const baseSeg = WHEEL_SEGMENTS[2]; // Mega
    return {
      segmentIndex: 2,
      rewardAmount: 200,
      segment: {
        ...baseSeg,
        valueText: '₱200.00',
      },
    };
  }

  // 2nd Spin: DOUBLE +₱100
  if (cycleSpinCount === 1) {
    const baseSeg = WHEEL_SEGMENTS[3]; // Double
    return {
      segmentIndex: 3,
      rewardAmount: 100,
      segment: {
        ...baseSeg,
        valueText: '₱100.00',
      },
    };
  }

  // 3rd Spin: RANDOM +₱20
  if (cycleSpinCount === 2) {
    const baseSeg = WHEEL_SEGMENTS[4]; // Random
    return {
      segmentIndex: 4,
      rewardAmount: 20,
      segment: {
        ...baseSeg,
        valueText: '₱20.00',
      },
    };
  }

  // 4th Spin: DOUBLE +₱50
  if (cycleSpinCount === 3) {
    const baseSeg = WHEEL_SEGMENTS[3]; // Double
    return {
      segmentIndex: 3,
      rewardAmount: 50,
      segment: {
        ...baseSeg,
        valueText: '₱50.00',
      },
    };
  }

  // 5th Spin: MINI +₱30
  if (cycleSpinCount === 4) {
    const baseSeg = WHEEL_SEGMENTS[1]; // Mini
    return {
      segmentIndex: 1,
      rewardAmount: 30,
      segment: {
        ...baseSeg,
        valueText: '₱30.00',
      },
    };
  }

  // After 5 spins or if balance >= 400
  if (currentBalance < 450) {
    // Every spin gives DOUBLE +₱10 until ₱450
    const baseSeg = WHEEL_SEGMENTS[3]; // Double
    const reward = Math.min(10, 450 - currentBalance);
    const finalReward = Math.max(0, reward);
    return {
      segmentIndex: 3,
      rewardAmount: finalReward,
      segment: {
        ...baseSeg,
        valueText: `₱${finalReward.toFixed(2)}`,
      },
    };
  }

  if (currentBalance < 490) {
    // From ₱450 to ₱490: Every spin shows MINI +₱5
    const baseSeg = WHEEL_SEGMENTS[1]; // Mini
    const reward = Math.min(5, 490 - currentBalance);
    const finalReward = Math.max(0, reward);
    return {
      segmentIndex: 1,
      rewardAmount: finalReward,
      segment: {
        ...baseSeg,
        valueText: `₱${finalReward.toFixed(2)}`,
      },
    };
  }

  if (currentBalance < 500) {
    // From ₱490 to ₱500: Every spin shows MINI +₱1 until exactly ₱500
    const baseSeg = WHEEL_SEGMENTS[1]; // Mini
    const reward = Math.min(1, 500 - currentBalance);
    const finalReward = Math.max(0, reward);
    return {
      segmentIndex: 1,
      rewardAmount: finalReward,
      segment: {
        ...baseSeg,
        valueText: `₱${finalReward.toFixed(2)}`,
      },
    };
  }

  // Maximum Target Capped at ₱500
  const baseSeg = WHEEL_SEGMENTS[1]; // Mini
  return {
    segmentIndex: 1,
    rewardAmount: 0,
    segment: {
      ...baseSeg,
      valueText: '₱0.00',
    },
  };
}
