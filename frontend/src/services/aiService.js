import { API_BASE_URL } from '../config/api';

const API_URL = API_BASE_URL.endsWith('/api') ? API_BASE_URL : `${API_BASE_URL}/api`;

const getAuthToken = () => localStorage.getItem('taskpilot_token');

const createHeaders = () => {
  const token = getAuthToken();

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseError = async (response) => {
  try {
    const data = await response.json();
    const message = data?.message || 'AI assistant request failed';
    if (data?.rawResponse) {
      return message + '\n\nRaw DeepSeek response:\n' + String(data.rawResponse).slice(0, 3000);
    }
    return message;
  } catch {
    return 'AI assistant request failed';
  }
};
const parseSSELines = (buffer, onDelta) => {
  const events = buffer.split('\n\n');
  const remaining = events.pop() || '';

  for (const event of events) {
    const eventName = event
      .split('\n')
      .find(line => line.startsWith('event:'))
      ?.replace(/^event:\s*/, '')
      .trim();
    const dataLines = event
      .split('\n')
      .filter(line => line.startsWith('data:'))
      .map(line => line.replace(/^data:\s*/, '').trim());

    for (const dataLine of dataLines) {
      if (!dataLine || dataLine === '[DONE]') continue;

      const parsed = JSON.parse(dataLine);
      if (eventName === 'error') {
        throw new Error(parsed?.message || 'AI assistant stream failed');
      }
      const delta = parsed?.choices?.[0]?.delta?.content || parsed?.choices?.[0]?.message?.content || '';
      if (delta) onDelta(delta);
    }
  }

  return remaining;
};

export const AI_REQUEST_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

export const sendAIChatMessage = async ({
  message,
  projectId = null,
  conversationHistory = [],
  onStatusChange,
}) => {
  onStatusChange?.(AI_REQUEST_STATUS.LOADING);

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ message, projectId, conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = await response.json();
    onStatusChange?.(AI_REQUEST_STATUS.SUCCESS);
    return data;
  } catch (error) {
    onStatusChange?.(AI_REQUEST_STATUS.ERROR);
    return {
      success: false,
      message: error.message || 'Could not connect to the AI assistant',
    };
  }
};

export const streamAIChatMessage = async ({
  message,
  projectId = null,
  conversationHistory = [],
  onChunk,
  onStatusChange,
}) => {
  onStatusChange?.(AI_REQUEST_STATUS.LOADING);

  try {
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ message, projectId, conversationHistory, stream: true }),
    });

    if (!response.ok || !response.body) {
      throw new Error(await parseError(response));
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullResponse = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      buffer = parseSSELines(buffer, (delta) => {
        fullResponse += delta;
        onChunk?.(delta);
      });
    }

    if (buffer.trim()) {
      parseSSELines(`${buffer}\n\n`, (delta) => {
        fullResponse += delta;
        onChunk?.(delta);
      });
    }

    onStatusChange?.(AI_REQUEST_STATUS.SUCCESS);
    return { success: true, response: fullResponse };
  } catch (error) {
    onStatusChange?.(AI_REQUEST_STATUS.ERROR);
    return {
      success: false,
      message: error.message || 'Could not connect to the AI assistant',
    };
  }
};
export const applyAIAction = async (action) => {
  try {
    const response = await fetch(`${API_URL}/ai/apply-action`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Could not apply the AI action',
    };
  }
};
export const generateAIProjectPreview = async ({ message, conversationHistory = [], onStatusChange }) => {
  onStatusChange?.(AI_REQUEST_STATUS.LOADING);

  try {
    const response = await fetch(`${API_URL}/ai/project-preview`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ message, conversationHistory }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    const data = await response.json();
    onStatusChange?.(AI_REQUEST_STATUS.SUCCESS);
    return data;
  } catch (error) {
    onStatusChange?.(AI_REQUEST_STATUS.ERROR);
    return {
      success: false,
      message: error.message || 'Could not generate the AI project preview',
    };
  }
};

export const createAIProject = async (project) => {
  try {
    const response = await fetch(`${API_URL}/ai/create-project`, {
      method: 'POST',
      headers: createHeaders(),
      body: JSON.stringify({ project }),
    });

    if (!response.ok) {
      throw new Error(await parseError(response));
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Could not create the AI project',
    };
  }
};
