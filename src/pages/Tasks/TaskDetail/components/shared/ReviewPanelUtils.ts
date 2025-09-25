import type { ReviewSeverity, SeverityStyleDetails } from './ReviewPanelTypes';

// 映射旧的severity值到新的值
export function mapLegacySeverity(severity: string): ReviewSeverity {
  const severityMapping: Record<string, ReviewSeverity> = {
    high: 'risk',
    medium: 'alert',
    low: 'safe',
    // 新的值保持不变
    risk: 'risk',
    alert: 'alert',
    safe: 'safe',
  };

  return severityMapping[severity] || 'safe'; // 默认为safe
}

// 共享的严重程度样式函数
export function getSeverityStyles(severity: ReviewSeverity): SeverityStyleDetails {
  const commonPillTextColor = 'text-white';

  if (severity === 'risk') {
    return {
      textColor: 'text-red-700 dark:text-red-400',
      bgColorClass: 'bg-[#C53030]',
      borderColorClass: 'border-[#C53030]',
      badgeClasses:
        'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700',
      summaryTextClass: 'text-red-600 dark:text-red-500 font-medium',
      pillTextColor: commonPillTextColor,
      pillBgColor: 'bg-[#C53030]',
      pillSelectedBorderColor: 'border-[#C53030]',
    };
  }
  if (severity === 'alert') {
    return {
      textColor: 'text-yellow-700 dark:text-yellow-400',
      bgColorClass: 'bg-[#F7B32B]',
      borderColorClass: 'border-[#F7B32B]',
      badgeClasses:
        'bg-yellow-100 text-yellow-700 border border-yellow-400 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700',
      summaryTextClass: 'text-yellow-600 dark:text-yellow-500 font-medium',
      pillTextColor: commonPillTextColor,
      pillBgColor: 'bg-[#F7B32B]',
      pillSelectedBorderColor: 'border-[#F7B32B]',
    };
  }
  return {
    textColor: 'text-emerald-700 dark:text-emerald-400',
    bgColorClass: 'bg-[#208E3D]',
    borderColorClass: 'border-[#208E3D]',
    badgeClasses:
      'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700',
    summaryTextClass: 'text-emerald-600 dark:text-emerald-500 font-medium',
    pillTextColor: commonPillTextColor,
    pillBgColor: 'bg-[#208E3D]',
    pillSelectedBorderColor: 'border-[#208E3D]',
  };
}

// 共享的严重程度文本和短代码获取函数
export const getSeverityPillTextAndShortCode = (
  severity: ReviewSeverity,
): { text: string; shortCode: 'R' | 'A' | 'S' } => {
  if (severity === 'risk') {
    return { text: 'リスク', shortCode: 'R' };
  }
  if (severity === 'alert') {
    return { text: 'アラート', shortCode: 'A' };
  }
  return { text: 'セーフ', shortCode: 'S' };
};

// 共享的严重程度计数函数
export function calculateSeverityCounts<T extends { severity: ReviewSeverity }>(
  findings: T[],
): Record<ReviewSeverity, number> {
  let risk = 0;
  let alert = 0;
  let safe = 0;

  findings.forEach((finding) => {
    if (finding.severity === 'risk') {
      risk++;
    } else if (finding.severity === 'alert') {
      alert++;
    } else if (finding.severity === 'safe') {
      safe++;
    }
  });

  return { risk, alert, safe };
}

// 共享的过滤逻辑
export function filterFindingsBySeverity<T extends { severity: ReviewSeverity }>(
  findings: T[],
  selectedSeverities: ReviewSeverity[],
): T[] {
  if (selectedSeverities.length === 0) {
    // 当没有选择时，不显示任何内容
    return [];
  }
  return findings.filter((finding) => selectedSeverities.includes(finding.severity));
}
