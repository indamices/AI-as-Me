
import { GoogleGenAI, Type } from "@google/genai";
import { MemoryCategory, AppSettings } from './types';

// The categories used for enum validation in responseSchema
const CATEGORY_ENUM = ['GOAL', 'PREFERENCE', 'HABIT', 'BOUNDARY', 'VALUE', 'PROJECT', 'PEOPLE'];

// DeepSeek API implementation (OpenAI compatible)
async function callDeepSeek(settings: AppSettings, messages: any[]) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
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
  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * 分析对话历史并提取认知洞察
 * 使用 Gemini 3 Pro 以处理复杂推理任务
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
    // Correct initialization: always use named parameter and process.env.API_KEY
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview', // Complex analysis task
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
    try {
      const text = await callDeepSeek(settings, [
        { role: "system", content: "You are an expert in persona modeling. Output JSON only. For each insight, include confidence (0-1), evidenceStrength (0-1), and qualityIndicators with generalization, specificity, consistency (all 0-1)." },
        { role: "user", content: prompt }
      ]);
      const cleaned = text.replace(/```json\n?|```/g, '').trim();
      const results = JSON.parse(cleaned) || [];
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
    } catch (e) { return []; }
  }
};

/**
 * 批量解析外部对话记录
 */
export const parseImaConversationsBatch = async (text: string) => {
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

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Complex logic and parsing task
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
    console.error("Batch conversation parse failed:", e);
    return [];
  }
};

/**
 * 生成助理响应
 * 使用 Gemini 3 Flash 以提供低延迟回复
 */
export const generateAgentResponse = async (
  message: string, 
  history: { role: string; content: string }[], 
  memoryContext: string, 
  mode: 'STANDARD' | 'PROBE',
  settings: AppSettings
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
`;

  if (settings.activeProvider === 'GEMINI') {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview', // Basic text/chat task
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
    } catch (e) { return "DeepSeek 链路异常。"; }
  }
};
