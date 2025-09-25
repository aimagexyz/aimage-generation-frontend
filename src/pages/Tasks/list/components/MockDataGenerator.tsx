import { format } from 'date-fns';

import type { components } from '@/api/schemas';

type TaskOut = components['schemas']['TaskOut'];

export interface EnhancedTask extends TaskOut {
  // Additional mock properties
  // priority_name?: string; // Will be derived from actual priority_id
  progress?: number;
  category?: string;
  department?: string;
  client?: string;
  budget?: number;
  estimated_hours?: number;
  actual_hours?: number;
  completion_rate?: number;
}

// Mock data generators
const PRIORITIES = [
  { id: 'high', name: '高', color: 'text-red-600' },
  { id: 'medium', name: '中', color: 'text-yellow-600' },
  { id: 'low', name: '低', color: 'text-green-600' },
];

const CATEGORIES = ['開発', 'デザイン', 'マーケティング', '営業', '管理', 'サポート'];
const DEPARTMENTS = ['技術部', 'デザイン部', 'マーケティング部', '営業部', '管理部', 'カスタマーサポート'];
const CLIENTS = ['株式会社A', '株式会社B', 'C商事', 'D企業', 'E会社', 'F組織'];

// Simple seeded random number generator for deterministic mock data
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }
}

function getRandomItem<T>(array: T[], rng: SeededRandom): T {
  return array[Math.floor(rng.next() * array.length)];
}

// Removed unused getRandomDate function

export function enhanceTaskWithMockData(task: TaskOut): EnhancedTask {
  // Create a seeded random generator based on task ID for consistent results
  const seed = task.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const rng = new SeededRandom(seed);

  // const priority = getRandomItem(PRIORITIES, rng); // This line was sourcing the mock priority
  const createdDate = new Date(task.created_at);
  const updatedDate = new Date(createdDate.getTime() + rng.next() * 7 * 24 * 60 * 60 * 1000); // Within 7 days

  const estimatedHours = Math.floor(rng.next() * 40) + 8; // 8-48 hours
  const actualHours = Math.floor(estimatedHours * (0.5 + rng.next() * 0.8)); // 50-130% of estimated
  const progress = Math.floor(rng.next() * 101); // 0-100%
  const completionRate = Math.min(100, progress + Math.floor(rng.next() * 20)); // Slightly higher than progress

  return {
    ...task,
    // priority_id: priority.id, // DO NOT OVERWRITE the original task.priority_id
    // priority_name: priority.name, // This will be handled by the display component using actual taskPriorities
    updated_at: updatedDate.toISOString(),
    progress,
    category: getRandomItem(CATEGORIES, rng),
    department: getRandomItem(DEPARTMENTS, rng),
    client: getRandomItem(CLIENTS, rng),
    budget: Math.floor(rng.next() * 1000000) + 100000, // 100k-1.1M yen
    estimated_hours: estimatedHours,
    actual_hours: actualHours,
    completion_rate: completionRate,
  };
}

export function getPriorityDisplay(priorityId?: string) {
  const priority = PRIORITIES.find((p) => p.id === priorityId);
  return priority || { id: 'medium', name: '中', color: 'text-yellow-600' };
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatHours(hours: number): string {
  return `${hours}h`;
}

export function formatProgress(progress: number): string {
  return `${progress}%`;
}

export function getProgressColor(progress: number): string {
  if (progress >= 80) {
    return 'text-green-600';
  }
  if (progress >= 50) {
    return 'text-yellow-600';
  }
  if (progress >= 20) {
    return 'text-orange-600';
  }
  return 'text-red-600';
}

export function formatDateShort(dateString: string): string {
  return format(new Date(dateString), 'MM/dd');
}

export function formatDateLong(dateString: string): string {
  return format(new Date(dateString), 'yyyy-MM-dd HH:mm');
}
