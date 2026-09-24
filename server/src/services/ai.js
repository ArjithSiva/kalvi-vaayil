import Groq from 'groq-sdk';
import { config } from '../config/env.js';

const groq = new Groq({ apiKey: config.groqApiKey });

const SYSTEM_PROMPT = 'You are a multilingual workshop education chatbot and test generator for Kalvi Vaayil. You answer questions based ONLY on the workshop content provided to you. Do not invent information that is absent from the supplied material. Respond in the same language the user writes in (Tamil or English).';

export async function chatCompletion(messages, options = {}) {
  const models = [config.aiModel, config.aiFallbackModel].filter(Boolean);
  let lastError;

  for (const model of models) {
    try {
      const response = await groq.chat.completions.create({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
      });
      return response.choices[0]?.message?.content || '';
    } catch (err) {
      lastError = err;
      console.warn(`AI model ${model} failed, trying fallback...`, err.message);
    }
  }

  throw new Error(`All AI models failed: ${lastError?.message || 'unknown'}`);
}

export function buildGroundedPrompt(workshopContext, userMessage) {
  const NL = String.fromCharCode(10);
  const contextStr = `Workshop context:${NL}Title: ${workshopContext.title || ''}${NL}Topics: ${(workshopContext.topics || []).join(', ')}${NL}${NL}Workshop content:${NL}${workshopContext.extractedContent || 'No additional content available.'}`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: contextStr },
    { role: 'user', content: userMessage },
  ];
}

export async function generateQuiz(workshopContext, questionCount = 5) {
  const NL = String.fromCharCode(10);
  const contentSlice = (workshopContext.extractedContent || '').slice(0, 3000) || 'Use topics only.';
  const quizPrompt = `Generate a quiz based on this workshop:${NL}Title: ${workshopContext.title || ''}${NL}Topics: ${(workshopContext.topics || []).join(', ')}${NL}Content: ${contentSlice}${NL}${NL}Generate ${questionCount} multiple-choice questions. Return JSON array of objects with question, options (array of 4), and correctAnswer fields.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: quizPrompt },
    { role: 'user', content: `Generate a ${questionCount}-question quiz.` },
  ];

  const response = await chatCompletion(messages, { temperature: 0.8 });

  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [{ question: response, options: [], correctAnswer: '' }];
  } catch {
    return [{ question: response, options: [], correctAnswer: '' }];
  }
}

export async function generateRecommendations(participantHistory) {
  const NL = String.fromCharCode(10);
  const workshopsStr = (participantHistory.availableWorkshops || [])
    .map((w) => `${w.title} (${(w.topics || []).join(', ')})`)
    .join('; ') || 'None';

  const userContent = `Participant history:${NL}Registered workshops: ${(participantHistory.registrations || []).join(', ') || 'None'}${NL}Attended topics: ${(participantHistory.attendedTopics || []).join(', ') || 'None'}${NL}Interests: ${(participantHistory.interests || []).join(', ') || 'None'}${NL}${NL}Available workshops: ${workshopsStr}${NL}${NL}Recommend up to 3 workshops. Return JSON array of objects with title and reason fields.`;

  const messages = [
    { role: 'system', content: 'You are a workshop recommendation engine. Suggest relevant workshops based on the participant history.' },
    { role: 'user', content: userContent },
  ];

  const response = await chatCompletion(messages, { temperature: 0.7 });
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return [];
  } catch {
    return [];
  }
}

export default { chatCompletion, buildGroundedPrompt, generateQuiz, generateRecommendations };
