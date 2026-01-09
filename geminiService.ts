
import { GoogleGenAI, Type } from "@google/genai";
import { MemoryCategory, AppSettings, KnowledgeType } from './types';

// The categories used for enum validation in responseSchema
const CATEGORY_ENUM = ['GOAL', 'PREFERENCE', 'HABIT', 'BOUNDARY', 'VALUE', 'PROJECT', 'PEOPLE'];

// Default timeout for API calls (30 seconds)
const DEFAULT_API_TIMEOUT = 30000;

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeout: number = DEFAULT_API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// DeepSeek API implementation (OpenAI compatible)
async function callDeepSeek(settings: AppSettings, messages: any[]) {
  const response = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.deepseekKey}`
    },
    body: JSON.stringify({
      model: settings.deepseekModel || "deepseek-chat",
      messages: messages,
      stream: false
    })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`DeepSeek API error: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Create optimized Chinese prompt for DeepSeek extraction
 */
function createDeepSeekExtractionPrompt(text: string): string {
  return `你是一位进化心理学与认知科学专家。请分析以下对话内容，提取具有"泛化性"的用户记忆碎片（Memo）。

【核心任务】
从对话中识别并提取能够长期指导用户行为的认知模式，这些模式应该具有以下特征：
- 泛化性：不是一次性事件，而是可重复的模式
- 稳定性：反映了用户的深层价值观、偏好或习惯
- 可操作性：能够用于指导未来的交互

【提取维度】
必须从以下 7 个维度进行分类：
1. GOAL（目标）：用户想要达成的目标或追求的方向
2. PREFERENCE（偏好）：用户的喜好、倾向、选择偏好
3. HABIT（习惯）：用户的日常行为习惯或固定模式
4. BOUNDARY（边界）：用户的底线、原则、不可接受的事物
5. VALUE（价值观）：用户的核心价值观、信念、原则
6. PROJECT（项目）：用户正在进行的项目或计划
7. PEOPLE（人际）：关于特定人物或人际关系的信息

【层级分类（layer）】
- L0 (0): 临时工作上下文，短期有效
- L1 (1): 短期记忆，30天内有效
- L2 (2): 模式化记忆，从重复观察中形成
- L3 (3): 策略记忆，心智模型和决策框架
- L4 (4): 身份记忆，核心价值和不可变约束

【输出格式要求 - 非常重要】
你必须输出一个有效的 JSON 数组，格式如下：

[
  {
    "content": "记忆内容的文本描述",
    "category": "GOAL|PREFERENCE|HABIT|BOUNDARY|VALUE|PROJECT|PEOPLE",
    "layer": 0-4之间的整数,
    "reasoning": "为什么提取这个记忆的详细推理过程，至少50字",
    "isSensitive": true或false,
    "confidence": 0.0-1.0之间的数字,
    "evidenceStrength": 0.0-1.0之间的数字,
    "qualityIndicators": {
      "generalization": 0.0-1.0之间的数字,
      "specificity": 0.0-1.0之间的数字,
      "consistency": 0.0-1.0之间的数字
    }
  }
]

【严格输出要求】
1. 只输出 JSON 数组，不要有任何其他文字、解释、markdown 代码块
2. 确保 JSON 格式完全正确，可以直接被 JSON.parse() 解析
3. reasoning 字段必须详细说明提取理由，不能为空，至少50字
4. confidence 和 evidenceStrength 必须是 0-1 之间的数字
5. 如果对话中没有可提取的记忆，返回空数组 []
6. 不要使用 markdown 代码块包裹（不要 \`\`\`json ... \`\`\`）
7. 不要添加任何解释性文字

【质量评估标准】
对每个提取的记忆，请评估：
1. confidence (0-1): 你对该记忆提取的置信度
   - 0.9-1.0: 证据非常明确，多次提及或强烈表达
   - 0.7-0.9: 证据较明确，有清晰的表达
   - 0.5-0.7: 证据一般，需要推断
   - <0.5: 证据不足，不建议提取

2. evidenceStrength (0-1): 证据强度
   - 基于支持该记忆的对话片段数量
   - 基于表达的直接性和明确性
   - 基于信息的一致性

3. qualityIndicators:
   - generalization: 该记忆是否具有长期适用性（0-1）
   - specificity: 该记忆是否足够具体可操作（0-1）
   - consistency: 该记忆与对话中其他信息的一致性（0-1）

【示例输出】
[
  {
    "content": "用户偏好深度思考而非快速决策",
    "category": "PREFERENCE",
    "layer": 3,
    "reasoning": "用户在对话中多次提到需要时间思考，不喜欢匆忙做决定，这反映了其认知风格偏好，具有长期指导意义。这种偏好体现在多个场景中，包括工作决策和个人选择。",
    "isSensitive": false,
    "confidence": 0.85,
    "evidenceStrength": 0.8,
    "qualityIndicators": {
      "generalization": 0.9,
      "specificity": 0.7,
      "consistency": 0.85
    }
  }
]

【待分析内容】
${text}

请开始分析并输出 JSON 数组：`;
}

/**
 * Parse DeepSeek JSON response with robust error handling
 */
function parseDeepSeekJSON(text: string): any[] {
  if (!text || typeof text !== 'string') {
    console.error("DeepSeek response is not a string");
    return [];
  }
  
  // 1. 移除 markdown 代码块
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();
  
  // 2. 尝试提取 JSON 数组（可能被其他文本包围）
  const jsonArrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonArrayMatch) {
    cleaned = jsonArrayMatch[0];
  }
  
  // 3. 如果还是找不到，尝试找到第一个 [ 到最后一个 ]
  const firstBracket = cleaned.indexOf('[');
  const lastBracket = cleaned.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
    cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  }
  
  // 4. 解析并验证
  try {
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) {
      console.error("DeepSeek response is not an array");
      return [];
    }
    
    // 5. 验证和清理每个项目
    return parsed
      .filter((item: any) => {
        // 验证必需字段
        return item && 
               typeof item.content === 'string' && 
               item.content.trim().length > 0 &&
               typeof item.category === 'string' &&
               typeof item.reasoning === 'string' &&
               item.reasoning.trim().length > 0;
      })
      .map((item: any) => ({
        ...item,
        // 确保数值字段有效
        layer: typeof item.layer === 'number' ? Math.max(0, Math.min(4, Math.round(item.layer))) : 1,
        confidence: typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.7,
        evidenceStrength: typeof item.evidenceStrength === 'number' ? Math.max(0, Math.min(1, item.evidenceStrength)) : 0.6,
        isSensitive: typeof item.isSensitive === 'boolean' ? item.isSensitive : false,
        qualityIndicators: {
          generalization: typeof item.qualityIndicators?.generalization === 'number' 
            ? Math.max(0, Math.min(1, item.qualityIndicators.generalization)) : 0.6,
          specificity: typeof item.qualityIndicators?.specificity === 'number'
            ? Math.max(0, Math.min(1, item.qualityIndicators.specificity)) : 0.6,
          consistency: typeof item.qualityIndicators?.consistency === 'number'
            ? Math.max(0, Math.min(1, item.qualityIndicators.consistency)) : 0.7,
          ...item.qualityIndicators
        }
      }));
  } catch (e) {
    console.error("DeepSeek JSON parse failed:", e);
    console.error("Raw response:", text);
    console.error("Cleaned text:", cleaned);
    return [];
  }
}

/**
 * Call DeepSeek API for extraction tasks
 */
async function callDeepSeekForExtraction(settings: AppSettings, prompt: string): Promise<string> {
  const messages = [
    {
      role: "system",
      content: `你是一个专业的认知科学分析助手。你的任务是分析对话内容并提取用户记忆。
你必须严格按照要求的 JSON 格式输出，不要添加任何解释性文字。
如果无法提取有效记忆，返回空数组 []。
确保输出的 JSON 格式完全正确，可以直接被解析。`
    },
    {
      role: "user",
      content: prompt
    }
  ];
  
  const response = await fetchWithTimeout("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.deepseekKey}`
    },
    body: JSON.stringify({
      model: settings.deepseekModel || "deepseek-chat",
      messages: messages,
      stream: false,
      temperature: 0.3, // 降低温度以获得更稳定的输出
      max_tokens: 4000  // 确保有足够空间输出完整 JSON
    })
  }, DEFAULT_API_TIMEOUT * 2); // Extraction tasks may take longer
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`DeepSeek API error: ${JSON.stringify(error)}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

/**
 * Analyze conversation history and extract cognitive insights
 * Uses Gemini 3 Pro for complex reasoning tasks
 */
export const extractInsightsFromChat = async (history: { role: string; content: string }[], settings: AppSettings) => {
  const prompt = `你是一位进化心理学与认知科学专家。请分析以下对话，提取具有"泛化性"的用户记忆碎片（Memo）。

[核心框架]：必须从 价值观(VALUE)、边界(BOUNDARY)、隐性目标(GOAL)、偏好(PREFERENCE)、习惯(HABIT)、人际(PEOPLE) 维度进行提炼。
[输出要求]：仅输出符合结构的 JSON 数组。
[质量评估]：对每个提取的记忆，请评估：
1. confidence (0-1): 你对该记忆提取的置信度，基于证据的明确性和一致性
2. evidenceStrength (0-1): 证据强度，基于支持该记忆的对话片段数量和明确程度
3. qualityIndicators: 
   - generalization (0-1): 泛化性，该记忆是否具有长期适用性
   - specificity (0-1): 具体性，该记忆是否足够具体可操作
   - consistency (0-1): 一致性，该记忆与对话中其他信息的一致性

对话历史：
${history.map(h => `${h.role}: ${h.content}`).join('\n')}`;

  if (settings.activeProvider === 'GEMINI') {
    // Use API key from settings, fallback to environment variable
    const apiKey = settings.geminiApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key not configured");
      return [];
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
      const model = settings.geminiModel || 'gemini-3-pro-preview';
      const response = await ai.models.generateContent({
        model, // Use model from settings
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                category: { type: Type.STRING, enum: CATEGORY_ENUM },
                layer: { type: Type.INTEGER },
                reasoning: { type: Type.STRING },
                isSensitive: { type: Type.BOOLEAN },
                // 新增字段
                confidence: { type: Type.NUMBER },
                evidenceStrength: { type: Type.NUMBER },
                qualityIndicators: {
                  type: Type.OBJECT,
                  properties: {
                    generalization: { type: Type.NUMBER },
                    specificity: { type: Type.NUMBER },
                    consistency: { type: Type.NUMBER }
                  }
                }
              },
              required: ["content", "category", "layer", "reasoning", "isSensitive", "confidence", "evidenceStrength", "qualityIndicators"]
            }
          }
        }
      });
      // Correct extraction: use .text property
      const results = JSON.parse(response.text || '[]');
      // 确保所有结果都有默认值
      return results.map((r: any) => ({
        ...r,
        confidence: r.confidence ?? 0.7,
        evidenceStrength: r.evidenceStrength ?? 0.6,
        qualityIndicators: {
          generalization: r.qualityIndicators?.generalization ?? 0.6,
          specificity: r.qualityIndicators?.specificity ?? 0.6,
          consistency: r.qualityIndicators?.consistency ?? 0.7,
          ...r.qualityIndicators
        }
      }));
    } catch (e) {
      console.error("Gemini insights extraction failed:", e);
      return [];
    }
  } else {
    // DeepSeek path - use optimized Chinese prompt
    try {
      if (!settings.deepseekKey) {
        console.error("DeepSeek API key not configured");
        return [];
      }
      const deepSeekPrompt = createDeepSeekExtractionPrompt(
        history.map(h => `${h.role}: ${h.content}`).join('\n')
      );
      const text = await callDeepSeekForExtraction(settings, deepSeekPrompt);
      const results = parseDeepSeekJSON(text);
      // Results are already validated and cleaned by parseDeepSeekJSON
      return results;
    } catch (e) {
      console.error("DeepSeek insights extraction failed:", e);
      return [];
    }
  }
};

/**
 * Batch parse external conversation records
 */
export const parseImaConversationsBatch = async (text: string, settings?: AppSettings) => {
  // Check which provider to use
  const activeProvider = settings?.activeProvider || 'GEMINI';
  
  if (activeProvider === 'DEEPSEEK') {
    // DeepSeek path - use optimized Chinese prompt
    try {
      if (!settings?.deepseekKey) {
        console.error("DeepSeek API key not configured");
        return [];
      }
      const deepSeekPrompt = createDeepSeekExtractionPrompt(text);
      const responseText = await callDeepSeekForExtraction(settings, deepSeekPrompt);
      const results = parseDeepSeekJSON(responseText);
      // Results are already validated and cleaned by parseDeepSeekJSON
      return results;
    } catch (e) {
      console.error("DeepSeek batch conversation parse failed:", e);
      return [];
    }
  } else {
    // Gemini path
    const prompt = `你是一位进化心理学与认知科学专家。请分析以下批量导入的对话内容，提取具有"泛化性"的用户记忆碎片（Memo）。

[核心框架]：必须从 价值观(VALUE)、边界(BOUNDARY)、隐性目标(GOAL)、偏好(PREFERENCE)、习惯(HABIT)、人际(PEOPLE) 维度进行提炼。
[输出要求]：仅输出符合结构的 JSON 数组。
[质量评估]：对每个提取的记忆，请评估：
1. confidence (0-1): 你对该记忆提取的置信度，基于证据的明确性和一致性
2. evidenceStrength (0-1): 证据强度，基于支持该记忆的对话片段数量和明确程度
3. qualityIndicators: 
   - generalization (0-1): 泛化性，该记忆是否具有长期适用性
   - specificity (0-1): 具体性，该记忆是否足够具体可操作
   - consistency (0-1): 一致性，该记忆与对话中其他信息的一致性

内容：
${text}`;

    // Use API key from settings if provided, otherwise fallback to environment variable
    const apiKey = settings?.geminiApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key not configured");
      return [];
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
      const model = settings?.geminiModel || 'gemini-3-pro-preview';
      const response = await ai.models.generateContent({
        model, // Use model from settings
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                content: { type: Type.STRING },
                category: { type: Type.STRING, enum: CATEGORY_ENUM },
                layer: { type: Type.INTEGER },
                reasoning: { type: Type.STRING },
                isSensitive: { type: Type.BOOLEAN },
                // 新增字段
                confidence: { type: Type.NUMBER },
                evidenceStrength: { type: Type.NUMBER },
                qualityIndicators: {
                  type: Type.OBJECT,
                  properties: {
                    generalization: { type: Type.NUMBER },
                    specificity: { type: Type.NUMBER },
                    consistency: { type: Type.NUMBER }
                  }
                }
              },
              required: ["content", "category", "layer", "reasoning", "isSensitive", "confidence", "evidenceStrength", "qualityIndicators"]
            }
          }
        }
      });
      const results = JSON.parse(response.text || '[]');
      // 确保所有结果都有默认值
      return results.map((r: any) => ({
        ...r,
        confidence: r.confidence ?? 0.7,
        evidenceStrength: r.evidenceStrength ?? 0.6,
        qualityIndicators: {
          generalization: r.qualityIndicators?.generalization ?? 0.6,
          specificity: r.qualityIndicators?.specificity ?? 0.6,
          consistency: r.qualityIndicators?.consistency ?? 0.7,
          ...r.qualityIndicators
        }
      }));
    } catch (e) {
      console.error("Gemini batch conversation parse failed:", e);
      return [];
    }
  }
};

/**
 * Generate assistant response
 * Uses Gemini 3 Flash for low-latency responses
 */
export const generateAgentResponse = async (
  message: string, 
  history: { role: string; content: string }[], 
  memoryContext: string, 
  mode: 'STANDARD' | 'PROBE',
  settings: AppSettings,
  knowledgeContext?: string
) => {
  const probeInstruction = `你是一个“人格探针”。目标是通过对话立体化建模用户。
[协议]：1.反单点聚焦，话题需跨越维度转场；2.主动寻找记忆留白；3.基于已知记忆提出深层质疑。`;

  const standardInstruction = `你是一个贴心的数字孪生助手。
[协议]：基于用户的长期记忆提供个性化建议。保持自然对话，不主动攻击。`;

  const layoutInstruction = `
[输出格式协议]：
为了提升可读性，你**必须**使用 Markdown 格式化你的回答：
1. **多级标题**：使用 ### 或 #### 划分逻辑区块。
2. **结构化列表**：使用无序列表记录要点，有序列表记录步骤。
3. **关键点强调**：对术语、核心结论、待办事项使用 **加粗**。
4. **数据对比**：如果涉及多项参数或选项，请使用 Markdown 表格。
5. **引用说明**：对于基于用户记忆的推论，可以使用 > 块引用。
请确保回答视觉排版优雅，像一份精密的诊断报告。`;

  const systemInstruction = `
${mode === 'PROBE' ? probeInstruction : standardInstruction}
${layoutInstruction}
[已知记忆库]：
${memoryContext}
${knowledgeContext ? `\n[相关知识库]：\n${knowledgeContext}` : ''}
`;

  if (settings.activeProvider === 'GEMINI') {
    // Use API key from settings, fallback to environment variable
    const apiKey = settings.geminiApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key not configured");
      return "认知同步失败：未配置 API Key。";
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
      // For chat, use flash model by default, but allow override
      const model = settings.geminiModel || 'gemini-3-flash-preview';
      const response = await ai.models.generateContent({
        model, // Use model from settings
        contents: history.concat([{role: 'user', content: message}]).map(h => ({
           role: h.role === 'assistant' ? 'model' : 'user',
           parts: [{ text: h.content }]
        })),
        config: { systemInstruction: systemInstruction }
      });
      return response.text || "认知同步失败。";
    } catch (e) { 
      console.error("Gemini agent response failed:", e);
      return "认知链路异常。"; 
    }
  } else {
    try {
      const msgs = [{ role: "system", content: systemInstruction }, ...history, { role: "user", content: message }];
      return await callDeepSeek(settings, msgs);
    } catch (e) {       return "DeepSeek 链路异常。"; }
  }
};

/**
 * Create knowledge extraction prompt
 */
function createKnowledgeExtractionPrompt(text: string): string {
  return `你是一位知识管理专家。请分析以下内容，提取其中的知识、事实、上下文信息。

【核心任务】
识别并提取以下类型的知识内容：
1. 事实性知识：客观事实、数据、统计信息
2. 概念性知识：理论、概念、定义、原理
3. 程序性知识：方法、步骤、流程、技巧
4. 上下文信息：背景信息、项目信息、工作环境
5. 参考资料：文档、链接、资源

【注意】
- 这些内容不是关于"用户是什么样的人"，而是"用户知道什么"
- 不要提取个人特质（偏好、习惯、价值观等）
- 专注于可复用的知识和信息

【知识类型分类】
- DOCUMENT: 文档类（文章、笔记、报告）
- REFERENCE: 参考资料（链接、资源、引用）
- CONTEXT: 上下文信息（背景、环境、项目信息）
- FACT: 事实性知识（数据、统计、客观事实）
- NOTE: 笔记类（学习笔记、工作笔记）

【输出格式要求】
你必须输出一个有效的 JSON 数组，格式如下：

[
  {
    "title": "知识项的标题",
    "content": "知识内容的详细描述",
    "type": "DOCUMENT|REFERENCE|CONTEXT|FACT|NOTE",
    "tags": ["标签1", "标签2"],
    "summary": "简要摘要"
  }
]

【严格输出要求】
1. 只输出 JSON 数组，不要有任何其他文字、解释、markdown 代码块
2. 确保 JSON 格式完全正确，可以直接被 JSON.parse() 解析
3. title 和 content 字段必须详细，不能为空
4. tags 应该是相关的关键词数组
5. 如果内容中没有可提取的知识，返回空数组 []
6. 不要使用 markdown 代码块包裹（不要 \`\`\`json ... \`\`\`）
7. 不要添加任何解释性文字

【待分析内容】
${text}

请开始分析并输出 JSON 数组：`;
}

/**
 * Extract knowledge items from text
 */
export async function extractKnowledgeFromText(
  text: string,
  settings: AppSettings
): Promise<Array<{
  title: string;
  content: string;
  type: KnowledgeType;
  tags: string[];
  summary: string;
}>> {
  if (settings.activeProvider === 'GEMINI') {
    const apiKey = settings.geminiApiKey || process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Gemini API key not configured");
      return [];
    }
    const ai = new GoogleGenAI({ apiKey });
    try {
      const model = settings.geminiModel || 'gemini-3-pro-preview';
      const prompt = createKnowledgeExtractionPrompt(text);
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.STRING },
                type: { 
                  type: Type.STRING, 
                  enum: ['DOCUMENT', 'REFERENCE', 'CONTEXT', 'FACT', 'NOTE'] 
                },
                tags: { 
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                summary: { type: Type.STRING }
              },
              required: ["title", "content", "type", "tags", "summary"]
            }
          }
        }
      });
      const results = JSON.parse(response.text || '[]');
      return results;
    } catch (e) {
      console.error("Gemini knowledge extraction failed:", e);
      return [];
    }
  } else {
    // DeepSeek path
    try {
      if (!settings.deepseekKey) {
        console.error("DeepSeek API key not configured");
        return [];
      }
      const prompt = createKnowledgeExtractionPrompt(text);
      const text = await callDeepSeekForExtraction(settings, prompt);
      const results = parseDeepSeekJSON(text);
      // Map to knowledge format
      return results.map((item: any) => ({
        title: item.title || item.content?.slice(0, 50) || '未命名知识',
        content: item.content || item.summary || '',
        type: (item.type || 'NOTE') as KnowledgeType,
        tags: item.tags || [],
        summary: item.summary || item.content?.slice(0, 100) || ''
      }));
    } catch (e) {
      console.error("DeepSeek knowledge extraction failed:", e);
      return [];
    }
  }
}
