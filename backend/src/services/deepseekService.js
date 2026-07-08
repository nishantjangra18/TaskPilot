const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const DEEPSEEK_TIMEOUT_MS = Number(process.env.DEEPSEEK_TIMEOUT_MS || 30000);
const PROJECT_CREATOR_MAX_TOKENS = Number(process.env.DEEPSEEK_PROJECT_CREATOR_MAX_TOKENS || 8000);

const SYSTEM_PROMPT = `You are TaskPilot AI.

You are an expert Software Project Manager.

You ONLY help with software projects, project planning, sprint planning, task breakdown, deadlines, role assignment, estimation, productivity and project management.

Never answer unrelated questions unless the user explicitly asks.

Always give structured responses.

Think like a Senior Engineering Manager.`;

const PLANNING_SYSTEM_PROMPT = `You are TaskPilot AI Planning Mode.

You are a Senior Engineering Manager creating a preview-only execution plan.

Return ONLY valid JSON. Do not wrap it in markdown. Do not include comments.

The JSON must match this shape:
{
  "response": "A concise conversational summary of the plan.",
  "plan": {
    "title": "...",
    "summary": "...",
    "milestones": [
      {
        "title": "...",
        "tasks": [
          {
            "title": "...",
            "description": "...",
            "priority": "low|medium|high|critical",
            "estimatedHours": 6,
            "suggestedAssignee": "...",
            "dependencies": []
          }
        ]
      }
    ]
  }
}

Rules:
- Generate planning previews only.
- Never claim that tasks, milestones, assignments, deadlines, or project data have been created or updated.
- Use project context if provided.
- Use suggestedAssignee from real team members when context supports it; otherwise use "Unassigned".
- Keep task descriptions implementation-focused and actionable.
- Use numeric estimatedHours values.`;

const ACTION_SYSTEM_PROMPT = `You are TaskPilot AI Action Suggestion Mode.

Return ONLY valid JSON. Do not wrap it in markdown. Do not include comments.

The JSON must match this shape:
{
  "response": "A concise conversational explanation of the recommendations.",
  "actions": [
    {
      "type": "reassign_task|update_due_date|change_priority|mark_complete",
      "label": "Human-readable action title",
      "projectId": "existing project id",
      "taskId": "existing task id",
      "newAssigneeId": "existing team member id when type is reassign_task",
      "newDueDate": "YYYY-MM-DD when type is update_due_date",
      "newPriority": "low|medium|high|critical when type is change_priority",
      "reason": "Short explanation",
      "riskLevel": "Low|Medium|High"
    }
  ]
}

Rules:
- Suggest actions only; never claim they have been applied.
- Use only existing task IDs, project IDs, and team member IDs from context.
- Use only these action types: reassign_task, update_due_date, change_priority, mark_complete.
- Do not include create_sprint or archive actions yet.
- Prefer 1 to 4 high-value actions.
- If no safe action exists, return an empty actions array and explain why in response.`;


const PROJECT_CREATOR_SYSTEM_PROMPT = `You are TaskPilot AI Project Creator Mode.

You are a Senior Engineering Manager generating a TaskPilot project-management draft from natural language. You are not a coding assistant in this mode.

OUTPUT CONTRACT - FOLLOW EXACTLY:
- Return exactly one JSON object and nothing else.
- The first character of your response must be { and the last character must be }.
- Do not wrap the JSON in markdown.
- Do not use code fences.
- Do not include explanations outside JSON.
- Do not include comments, trailing commas, undefined, NaN, or single-quoted strings.
- Use null for missing optional dates.

The JSON object must match this shape:
{
  "response": "Concise conversational summary or follow-up request.",
  "needsMoreInfo": false,
  "questions": [],
  "project": {
    "name": "...",
    "description": "...",
    "category": "...",
    "techStack": ["React", "Node.js"],
    "timeline": "3 months",
    "deadline": "YYYY-MM-DD or null",
    "goals": ["..."],
    "features": ["..."],
    "methodology": "Agile|Waterfall|Hybrid|Not specified",
    "sprintDuration": "2 weeks",
    "team": [
      { "name": "...", "role": "...", "userId": "existing user id when confidently matched, otherwise empty string" }
    ],
    "milestones": [
      {
        "title": "...",
        "description": "...",
        "phase": "...",
        "dueDate": "YYYY-MM-DD or null",
        "epics": [
          {
            "title": "...",
            "tasks": [
              {
                "title": "...",
                "description": "...",
                "priority": "low|medium|high|critical",
                "status": "todo",
                "taskType": "feature|bug|design|research|testing|deployment|documentation",
                "estimatedHours": 6,
                "suggestedAssigneeName": "...",
                "suggestedAssigneeId": "existing user id when confidently matched, otherwise empty string",
                "dueDate": "YYYY-MM-DD or null",
                "dependencies": [],
                "subtasks": [
                  { "title": "...", "description": "...", "estimatedHours": 1 }
                ]
              }
            ]
          }
        ]
      }
    ],
    "riskAnalysis": [
      { "title": "...", "level": "Low|Medium|High", "mitigation": "..." }
    ],
    "estimatedDuration": "...",
    "estimatedWorkloadHours": 120
  }
}

Critical information before generating a project: project idea/name, at least one feature or goal, timeline or deadline, and team/roles or explicit solo project.
If critical information is missing, set needsMoreInfo to true, return a non-empty questions array, and set project to null.
Do not guess missing critical information.
Use only availableUsers from context for suggestedAssigneeId. Match by name, email, title, role, and workload.
Keep the draft compact enough to fit in one valid JSON response: maximum 5 milestones, maximum 3 epics per milestone, maximum 5 tasks per epic, and maximum 2 subtasks per task.
Prioritize complete valid JSON over exhaustive detail. If the project is large, summarize work into higher-level TaskPilot tasks instead of creating dozens of tiny implementation tasks.
Keep task and subtask descriptions concise. Avoid long paragraphs.
Prefer role-based assignment: backend/database/API tasks to backend developers, UI tasks to frontend/UI designers, testing tasks to QA, deployment tasks to DevOps, architecture/full-stack tasks to full-stack engineers.
Consider currentWorkload when assigning tasks.
Never output folder structures, file trees, package.json, source code, React components, Express APIs, Node.js boilerplate, or implementation files in Project Creator mode.
Only describe project-management entities: project metadata, goals, features, team, milestones, epics, tasks, subtasks, risks, dates, and estimates.
Nothing is saved in this mode. Generate preview data only.`;
class DeepSeekError extends Error {
  constructor(message, statusCode = 500, code = 'DEEPSEEK_ERROR') {
    super(message);
    this.name = 'DeepSeekError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

const sanitizeHistory = (conversationHistory = []) => {
  if (!Array.isArray(conversationHistory)) return [];

  return conversationHistory
    .filter(item => ['user', 'assistant'].includes(item?.role) && typeof item?.content === 'string')
    .slice(-12)
    .map(item => ({
      role: item.role,
      content: item.content.slice(0, 4000),
    }));
};

const createProjectCreatorDateMessage = () => ({
  role: 'system',
  content: 'Current date for project planning is ' + new Date().toISOString().slice(0, 10) + '. Generate deadlines and task due dates on or after this date unless the user explicitly provided a past date.',
});

const createProjectContextMessage = (projectContext) => {
  if (!projectContext) return null;

  return {
    role: 'system',
    content: `Use the following read-only TaskPilot project context when answering. Do not modify, create, delete, or claim to update any project data. If the user asks for changes, provide recommendations only.\n\n${JSON.stringify(projectContext, null, 2)}`,
  };
};

const createMessages = ({ message, conversationHistory, projectContext, planning = false, actions = false, projectCreator = false }) => [
  { role: 'system', content: SYSTEM_PROMPT },
  createProjectContextMessage(projectContext),
  planning ? { role: 'system', content: PLANNING_SYSTEM_PROMPT } : null,
  actions ? { role: 'system', content: ACTION_SYSTEM_PROMPT } : null,
  projectCreator ? { role: 'system', content: PROJECT_CREATOR_SYSTEM_PROMPT } : null,
  projectCreator ? createProjectCreatorDateMessage() : null,
  ...sanitizeHistory(conversationHistory),
  { role: 'user', content: message.trim() },
].filter(Boolean);

const getDeepSeekHeaders = () => {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new DeepSeekError('DeepSeek API key is not configured', 503, 'MISSING_API_KEY');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  };
};

const mapDeepSeekError = (status, fallbackMessage) => {
  switch (status) {
    case 400:
    case 422:
      return new DeepSeekError(fallbackMessage || 'DeepSeek rejected the request format', 400, 'INVALID_REQUEST');
    case 401:
      return new DeepSeekError('DeepSeek API key is invalid', 503, 'INVALID_API_KEY');
    case 402:
      return new DeepSeekError('DeepSeek quota or balance has been exceeded', 503, 'QUOTA_EXCEEDED');
    case 429:
      return new DeepSeekError('Too many AI requests. Please try again shortly.', 429, 'RATE_LIMITED');
    case 500:
    case 503:
      return new DeepSeekError('DeepSeek is temporarily unavailable', 503, 'PROVIDER_UNAVAILABLE');
    default:
      return new DeepSeekError(fallbackMessage || 'DeepSeek request failed', 502, 'PROVIDER_ERROR');
  }
};

const parseErrorMessage = async (response) => {
  try {
    const data = await response.json();
    return data?.error?.message || data?.message;
  } catch (error) {
    return null;
  }
};

const createAbortController = () => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEEPSEEK_TIMEOUT_MS);
  return { controller, timeout };
};

const buildPayload = ({ message, conversationHistory, userId, projectContext, stream = false, planning = false, actions = false, projectCreator = false }) => ({
  model: DEEPSEEK_MODEL,
  messages: createMessages({ message, conversationHistory, projectContext, planning, actions, projectCreator }),
  stream,
  temperature: planning || actions || projectCreator ? 0.25 : 0.4,
  max_tokens: projectCreator ? PROJECT_CREATOR_MAX_TOKENS : planning ? 2600 : actions ? 1800 : 1200,
  ...(planning || actions || projectCreator ? { response_format: { type: 'json_object' } } : {}),
  user_id: userId,
});

const requestDeepSeek = async (payload) => {
  const { controller, timeout } = createAbortController();

  try {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: getDeepSeekHeaders(),
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw mapDeepSeekError(response.status, await parseErrorMessage(response));
    }

    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new DeepSeekError('DeepSeek request timed out', 504, 'TIMEOUT');
    }

    if (error instanceof DeepSeekError) {
      throw error;
    }

    throw new DeepSeekError('Could not reach DeepSeek. Please try again later.', 503, 'NETWORK_ERROR');
  } finally {
    clearTimeout(timeout);
  }
};

const extractJsonObject = (content) => {
  const raw = String(content || '').trim();
  const candidates = [raw];

  const fencedJson = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedJson?.[1]) {
    candidates.push(fencedJson[1].trim());
  }

  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    candidates.push(raw.slice(start, end + 1));
  }

  let lastError = null;
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('No JSON object found in DeepSeek response');
};

const createProjectCreatorFormatError = (message, rawResponse, cause = null) => {
  const error = new DeepSeekError(message, 502, 'INVALID_PROJECT_CREATOR_FORMAT');
  error.rawResponse = rawResponse;
  error.parseError = cause?.message || null;
  return error;
};

const normalizePriority = (priority) => {
  const value = String(priority || 'medium').toLowerCase();
  return ['low', 'medium', 'high', 'critical'].includes(value) ? value : 'medium';
};

const normalizeRiskLevel = (riskLevel) => {
  const value = String(riskLevel || 'Low').toLowerCase();
  if (value === 'high') return 'High';
  if (value === 'medium') return 'Medium';
  return 'Low';
};

const normalizePlan = (planPayload) => {
  const rawPlan = planPayload?.plan || {};
  const milestones = Array.isArray(rawPlan.milestones) ? rawPlan.milestones : [];

  return {
    response: typeof planPayload?.response === 'string' && planPayload.response.trim()
      ? planPayload.response.trim()
      : 'I created a structured execution plan preview. Nothing has been saved or changed.',
    plan: {
      title: String(rawPlan.title || 'Execution Plan').trim(),
      summary: String(rawPlan.summary || '').trim(),
      milestones: milestones.map((milestone, milestoneIndex) => ({
        title: String(milestone?.title || `Milestone ${milestoneIndex + 1}`).trim(),
        tasks: (Array.isArray(milestone?.tasks) ? milestone.tasks : []).map(task => ({
          title: String(task?.title || 'Untitled task').trim(),
          description: String(task?.description || '').trim(),
          priority: normalizePriority(task?.priority),
          estimatedHours: Number.isFinite(Number(task?.estimatedHours)) ? Number(task.estimatedHours) : 1,
          suggestedAssignee: String(task?.suggestedAssignee || 'Unassigned').trim(),
          dependencies: Array.isArray(task?.dependencies) ? task.dependencies.map(dependency => String(dependency)) : [],
        })),
      })).filter(milestone => milestone.tasks.length > 0),
    },
  };
};

const normalizeActions = (actionPayload) => {
  const actions = Array.isArray(actionPayload?.actions) ? actionPayload.actions : [];
  const allowedTypes = ['reassign_task', 'update_due_date', 'change_priority', 'mark_complete'];

  return {
    response: typeof actionPayload?.response === 'string' && actionPayload.response.trim()
      ? actionPayload.response.trim()
      : 'I found a few preview-only project actions. Review them before applying anything.',
    actions: actions
      .filter(action => allowedTypes.includes(action?.type))
      .slice(0, 6)
      .map(action => ({
        type: action.type,
        label: String(action.label || 'Suggested action').trim(),
        projectId: String(action.projectId || '').trim(),
        taskId: String(action.taskId || '').trim(),
        newAssigneeId: action.newAssigneeId ? String(action.newAssigneeId).trim() : undefined,
        newDueDate: action.newDueDate ? String(action.newDueDate).trim() : undefined,
        newPriority: action.newPriority ? normalizePriority(action.newPriority) : undefined,
        reason: String(action.reason || '').trim(),
        riskLevel: normalizeRiskLevel(action.riskLevel),
      })),
  };
};


const normalizeStringArray = (value) => Array.isArray(value)
  ? value.map(item => String(item || '').trim()).filter(Boolean).slice(0, 30)
  : [];

const normalizeDateString = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : null;

const normalizeStatus = (status) => {
  const value = String(status || 'todo').toLowerCase();
  return ['todo', 'in_progress', 'review', 'done'].includes(value) ? value : 'todo';
};

const normalizeCreatorTask = (task = {}) => ({
  title: String(task.title || 'Untitled task').trim().slice(0, 100),
  description: String(task.description || '').trim().slice(0, 300),
  priority: normalizePriority(task.priority),
  status: normalizeStatus(task.status),
  taskType: String(task.taskType || 'feature').trim().slice(0, 40),
  estimatedHours: Number.isFinite(Number(task.estimatedHours)) ? Math.max(0, Number(task.estimatedHours)) : 1,
  suggestedAssigneeName: String(task.suggestedAssigneeName || '').trim(),
  suggestedAssigneeId: String(task.suggestedAssigneeId || '').trim(),
  dueDate: normalizeDateString(task.dueDate),
  dependencies: normalizeStringArray(task.dependencies).slice(0, 10),
  subtasks: (Array.isArray(task.subtasks) ? task.subtasks : []).slice(0, 8).map(subtask => ({
    title: String(subtask?.title || 'Untitled subtask').trim().slice(0, 100),
    description: String(subtask?.description || '').trim().slice(0, 300),
    status: normalizeStatus(subtask?.status),
    estimatedHours: Number.isFinite(Number(subtask?.estimatedHours)) ? Math.max(0, Number(subtask.estimatedHours)) : 0,
  })),
});


const isPlainObject = (value) => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const isValidDateOrNull = (value) => value === null || value === undefined || /^\d{4}-\d{2}-\d{2}$/.test(String(value));
const hasItems = (value) => Array.isArray(value) && value.length > 0;

const validateProjectCreatorPayload = (payload) => {
  if (!isPlainObject(payload)) return 'Root response must be a JSON object';
  if (!isNonEmptyString(payload.response)) return 'Missing or invalid field: response';
  if (typeof payload.needsMoreInfo !== 'boolean') return 'Missing or invalid field: needsMoreInfo';

  if (payload.needsMoreInfo) {
    if (!hasItems(payload.questions)) return 'Missing or invalid field: questions must contain at least one follow-up question when needsMoreInfo is true';
    return null;
  }

  if (!isPlainObject(payload.project)) return 'Missing or invalid field: project';
  const project = payload.project;
  if (!isNonEmptyString(project.name)) return 'Missing or invalid field: project.name';
  if (!isNonEmptyString(project.description)) return 'Missing or invalid field: project.description';
  if (!isNonEmptyString(project.category)) return 'Missing or invalid field: project.category';
  if (!Array.isArray(project.techStack)) return 'Missing or invalid field: project.techStack must be an array';
  if (!isNonEmptyString(project.timeline) && !isNonEmptyString(project.deadline)) return 'Missing required field: project.timeline or project.deadline';
  if (!isValidDateOrNull(project.deadline)) return 'Invalid field: project.deadline must be YYYY-MM-DD or null';
  if (!hasItems(project.goals) && !hasItems(project.features)) return 'Missing or invalid field: project.goals or project.features must contain at least one item';
  if (!Array.isArray(project.team)) return 'Missing or invalid field: project.team must be an array';
  if (!hasItems(project.milestones)) return 'Missing or invalid field: project.milestones must contain at least one milestone';

  for (const [milestoneIndex, milestone] of project.milestones.entries()) {
    const milestonePath = `project.milestones[${milestoneIndex}]`;
    if (!isPlainObject(milestone)) return `Invalid field: ${milestonePath} must be an object`;
    if (!isNonEmptyString(milestone.title)) return `Missing or invalid field: ${milestonePath}.title`;
    if (!isValidDateOrNull(milestone.dueDate)) return `Invalid field: ${milestonePath}.dueDate must be YYYY-MM-DD or null`;
    if (!hasItems(milestone.epics)) return `Missing or invalid field: ${milestonePath}.epics must contain at least one epic`;

    for (const [epicIndex, epic] of milestone.epics.entries()) {
      const epicPath = `${milestonePath}.epics[${epicIndex}]`;
      if (!isPlainObject(epic)) return `Invalid field: ${epicPath} must be an object`;
      if (!isNonEmptyString(epic.title)) return `Missing or invalid field: ${epicPath}.title`;
      if (!hasItems(epic.tasks)) return `Missing or invalid field: ${epicPath}.tasks must contain at least one task`;

      for (const [taskIndex, task] of epic.tasks.entries()) {
        const taskPath = `${epicPath}.tasks[${taskIndex}]`;
        if (!isPlainObject(task)) return `Invalid field: ${taskPath} must be an object`;
        if (!isNonEmptyString(task.title)) return `Missing or invalid field: ${taskPath}.title`;
        if (!['low', 'medium', 'high', 'critical'].includes(String(task.priority || '').toLowerCase())) return `Missing or invalid field: ${taskPath}.priority`;
        if (!Number.isFinite(Number(task.estimatedHours))) return `Missing or invalid field: ${taskPath}.estimatedHours`;
        if (!isValidDateOrNull(task.dueDate)) return `Invalid field: ${taskPath}.dueDate must be YYYY-MM-DD or null`;
        if (task.subtasks !== undefined && !Array.isArray(task.subtasks)) return `Invalid field: ${taskPath}.subtasks must be an array`;
      }
    }
  }

  return null;
};
const normalizeGeneratedProject = (payload) => {
  const needsMoreInfo = Boolean(payload?.needsMoreInfo);
  const questions = normalizeStringArray(payload?.questions).slice(0, 6);

  if (needsMoreInfo) {
    return {
      response: String(payload?.response || 'I need a few more details before creating a project preview.').trim(),
      needsMoreInfo: true,
      questions,
      project: null,
    };
  }

  const rawProject = payload?.project || {};
  const milestones = (Array.isArray(rawProject.milestones) ? rawProject.milestones : []).slice(0, 12).map((milestone, milestoneIndex) => ({
    title: String(milestone?.title || `Milestone ${milestoneIndex + 1}`).trim(),
    description: String(milestone?.description || '').trim(),
    phase: String(milestone?.phase || '').trim(),
    dueDate: normalizeDateString(milestone?.dueDate),
    epics: (Array.isArray(milestone?.epics) ? milestone.epics : []).slice(0, 12).map((epic, epicIndex) => ({
      title: String(epic?.title || `Epic ${epicIndex + 1}`).trim(),
      tasks: (Array.isArray(epic?.tasks) ? epic.tasks : []).slice(0, 30).map(normalizeCreatorTask).filter(task => task.title),
    })).filter(epic => epic.tasks.length > 0),
  })).filter(milestone => milestone.epics.length > 0);

  const tasks = milestones.flatMap(milestone => milestone.epics.flatMap(epic => epic.tasks));
  const estimatedWorkloadHours = Number.isFinite(Number(rawProject.estimatedWorkloadHours))
    ? Number(rawProject.estimatedWorkloadHours)
    : tasks.reduce((sum, task) => sum + (Number(task.estimatedHours) || 0), 0);

  return {
    response: String(payload?.response || 'I created a complete project preview. Review it before creating anything.').trim(),
    needsMoreInfo: false,
    questions: [],
    project: {
      name: String(rawProject.name || 'AI Generated Project').trim().slice(0, 120),
      description: String(rawProject.description || '').trim().slice(0, 1000),
      category: String(rawProject.category || 'Software').trim().slice(0, 80),
      techStack: normalizeStringArray(rawProject.techStack),
      timeline: String(rawProject.timeline || '').trim().slice(0, 80),
      deadline: normalizeDateString(rawProject.deadline),
      goals: normalizeStringArray(rawProject.goals),
      features: normalizeStringArray(rawProject.features),
      methodology: String(rawProject.methodology || 'Not specified').trim().slice(0, 60),
      sprintDuration: String(rawProject.sprintDuration || '').trim().slice(0, 60),
      team: (Array.isArray(rawProject.team) ? rawProject.team : []).slice(0, 30).map(member => ({
        name: String(member?.name || '').trim(),
        role: String(member?.role || '').trim(),
        userId: String(member?.userId || '').trim(),
      })).filter(member => member.name || member.userId),
      milestones,
      riskAnalysis: (Array.isArray(rawProject.riskAnalysis) ? rawProject.riskAnalysis : []).slice(0, 10).map(risk => ({
        title: String(risk?.title || 'Project risk').trim(),
        level: normalizeRiskLevel(risk?.level),
        mitigation: String(risk?.mitigation || '').trim(),
      })),
      estimatedDuration: String(rawProject.estimatedDuration || rawProject.timeline || '').trim(),
      estimatedWorkloadHours,
    },
  };
};
const callDeepSeekChat = async ({ message, conversationHistory = [], userId, projectContext = null }) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new DeepSeekError('Message is required', 400, 'MESSAGE_REQUIRED');
  }

  const response = await requestDeepSeek(buildPayload({ message, conversationHistory, userId, projectContext }));
  const data = await response.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (!content) {
    throw new DeepSeekError('DeepSeek returned an empty response', 502, 'EMPTY_RESPONSE');
  }

  return {
    response: content.trim(),
    usage: data.usage || null,
    model: data.model || DEEPSEEK_MODEL,
  };
};

const callDeepSeekPlanning = async ({ message, conversationHistory = [], userId, projectContext = null }) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new DeepSeekError('Message is required', 400, 'MESSAGE_REQUIRED');
  }

  const response = await requestDeepSeek(buildPayload({ message, conversationHistory, userId, projectContext, planning: true }));
  const data = await response.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (!content) {
    throw new DeepSeekError('DeepSeek returned an empty planning response', 502, 'EMPTY_RESPONSE');
  }

  try {
    return {
      ...normalizePlan(extractJsonObject(content)),
      usage: data.usage || null,
      model: data.model || DEEPSEEK_MODEL,
    };
  } catch (error) {
    throw new DeepSeekError('DeepSeek returned an invalid planning format', 502, 'INVALID_PLAN_FORMAT');
  }
};

const callDeepSeekActionSuggestions = async ({ message, conversationHistory = [], userId, projectContext = null }) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new DeepSeekError('Message is required', 400, 'MESSAGE_REQUIRED');
  }

  const response = await requestDeepSeek(buildPayload({ message, conversationHistory, userId, projectContext, actions: true }));
  const data = await response.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (!content) {
    throw new DeepSeekError('DeepSeek returned an empty action suggestion response', 502, 'EMPTY_RESPONSE');
  }

  try {
    return {
      ...normalizeActions(extractJsonObject(content)),
      usage: data.usage || null,
      model: data.model || DEEPSEEK_MODEL,
    };
  } catch (error) {
    throw new DeepSeekError('DeepSeek returned an invalid action suggestion format', 502, 'INVALID_ACTION_FORMAT');
  }
};


const callDeepSeekProjectCreator = async ({ message, conversationHistory = [], userId, workspaceContext = null }) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new DeepSeekError('Project description is required', 400, 'MESSAGE_REQUIRED');
  }

  const response = await requestDeepSeek(buildPayload({
    message,
    conversationHistory,
    userId,
    projectContext: workspaceContext,
    projectCreator: true,
  }));
  const data = await response.json();
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;

  if (choice?.finish_reason === 'length') {
    throw createProjectCreatorFormatError('DeepSeek project creator response was cut off before valid JSON completed. Please generate a smaller preview or try again.', content || '');
  }

  if (!content) {
    throw new DeepSeekError('DeepSeek returned an empty project creator response', 502, 'EMPTY_RESPONSE');
  }

  console.log('[TaskPilot AI Project Creator raw response]', content);

  try {
    const parsed = extractJsonObject(content);
    const normalized = normalizeGeneratedProject(parsed);
    const validationError = validateProjectCreatorPayload(normalized);
    if (validationError) {
      throw createProjectCreatorFormatError(`DeepSeek project creator response validation failed: ${validationError}`, content);
    }

    return {
      ...normalized,
      usage: data.usage || null,
      model: data.model || DEEPSEEK_MODEL,
    };
  } catch (error) {
    if (error instanceof DeepSeekError) {
      throw error;
    }
    throw createProjectCreatorFormatError('DeepSeek returned an invalid project creator format', content, error);
  }
};
const createDeepSeekStream = async ({ message, conversationHistory = [], userId, projectContext = null }) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    throw new DeepSeekError('Message is required', 400, 'MESSAGE_REQUIRED');
  }

  const response = await requestDeepSeek(buildPayload({ message, conversationHistory, userId, projectContext, stream: true }));
  return response.body;
};

module.exports = {
  SYSTEM_PROMPT,
  DeepSeekError,
  callDeepSeekChat,
  callDeepSeekPlanning,
  callDeepSeekActionSuggestions,
  callDeepSeekProjectCreator,
  createDeepSeekStream,
};






