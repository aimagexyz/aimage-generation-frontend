// RPD测试相关的类型定义

// 测试请求的输入类型
export interface RPDTestRequest {
  // RPD配置信息
  rpd_key: string;
  rpd_title: string;
  rpd_content: string;
  project_id: string;

  // 测试输入
  input_type: 'text' | 'image' | 'document';
  input_content?: string; // 文本输入
  file_url?: string; // 文件URL（用于图片和文档）
  file_name?: string; // 文件名
  context?: string; // 额外的上下文信息
}

// 测试响应类型
export interface RPDTestResponse {
  success: boolean;
  test_id: string;

  // RPD处理结果
  results: {
    analysis: string; // AI分析结果
    findings: RPDTestFinding[]; // 发现的问题
    score?: number; // 评分（如果适用）
    suggestions?: string[]; // 改进建议
  };

  // 元数据
  metadata: {
    processing_time_ms: number;
    rpd_version?: string;
    model_version?: string;
    timestamp: string;
  };

  error?: string; // 错误信息（如果失败）
}

// RPD测试发现的问题
export interface RPDTestFinding {
  id: string;
  type: 'error' | 'warning' | 'info';
  category: string; // 问题分类
  title: string;
  description: string;
  confidence: number; // 置信度 0-1
  location?: {
    // 对于图片，可能包含坐标信息
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  suggested_action?: string; // 建议的修正行动
}

// 测试历史记录
export interface RPDTestHistory {
  test_id: string;
  request: RPDTestRequest;
  response: RPDTestResponse;
  created_at: string;
}

// 批量测试请求
export interface RPDBatchTestRequest {
  rpd_key: string;
  rpd_title: string;
  rpd_content: string;
  project_id: string;

  test_cases: {
    id: string;
    name: string;
    input_type: 'text' | 'image' | 'document';
    input_content?: string;
    file_url?: string;
    file_name?: string;
    expected_result?: 'pass' | 'fail'; // 期望结果（用于验证）
  }[];
}

// 批量测试响应
export interface RPDBatchTestResponse {
  success: boolean;
  batch_id: string;
  results: {
    test_case_id: string;
    result: RPDTestResponse;
  }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    average_processing_time_ms: number;
  };
}

// 文件上传响应（用于测试中的文件上传）
export interface RPDTestFileUploadResponse {
  success: boolean;
  file_url: string;
  file_name: string;
  file_size: number;
  expires_at: string; // 临时URL过期时间
}

// 新增：直接图片RPD测试请求
export interface RPDImageTestRequest {
  // RPD配置信息
  rpd_title: string;
  rpd_parent_key: string; // 'general_ng_review' | 'copyright_review' | 'visual_review'
  rpd_description_for_ai?: string; // 用于copyright_review和visual_review
  // rpd_eng_description_for_ai: Deprecated, using rpd_description_for_ai instead
  rpd_tag_list?: string; // 逗号分隔的标签列表
  rpd_reference_images?: string; // 逗号分隔的参考图片路径

  // 测试配置
  mode?: 'quality' | 'speed';
  cr_check?: boolean;
}

// 新增：直接图片RPD测试响应
export interface RPDImageTestResponse {
  success: boolean;
  message: string;
  findings_count: number;
  findings: RPDImageTestFinding[];
  processing_time_seconds: number;
  rpd_title: string;
  rpd_type: string;
}

// 新增：图片RPD测试发现的问题格式
export interface RPDImageTestFinding {
  rpd_key: string;
  description: string;
  severity: string;
  suggestion: string;
  confidence: number;
  tag?: string;
  area?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
