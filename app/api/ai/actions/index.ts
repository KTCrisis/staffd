// app/api/ai/actions/index.ts
// Registry des actions disponibles + types partagés

// ── Types ────────────────────────────────────────────────────

export interface ActionResult {
  success: boolean
  message: string   // réponse naturelle streamée au user
  data?:   unknown  // données optionnelles pour enrichir la réponse
}

export interface ToolCall {
  id:       string
  function: {
    name:      string
    arguments: Record<string, string>
  }
}

// ── Tool definitions — envoyées à kimi ──────────────────────
// Chaque tool = une action que l'agent peut exécuter.
// Le modèle choisit lequel appeler selon le message user.

export const TOOLS = [
  {
    type: 'function',
    function: {
      name:        'approve_leave',
      description: 'Approve a pending leave request for a consultant',
      parameters:  {
        type:       'object',
        properties: {
          consultant_name: {
            type:        'string',
            description: 'Full name of the consultant (used to find the request)',
          },
          leave_id: {
            type:        'string',
            description: 'UUID of the leave request if known',
          },
        },
        required: ['consultant_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'refuse_leave',
      description: 'Refuse a pending leave request for a consultant',
      parameters:  {
        type:       'object',
        properties: {
          consultant_name: {
            type:        'string',
            description: 'Full name of the consultant',
          },
          leave_id: {
            type:        'string',
            description: 'UUID of the leave request if known',
          },
          reason: {
            type:        'string',
            description: 'Optional reason for refusal',
          },
        },
        required: ['consultant_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'update_project_status',
      description: 'Update the status of a project (active, on_hold, completed, draft)',
      parameters:  {
        type:       'object',
        properties: {
          project_name: {
            type:        'string',
            description: 'Name of the project',
          },
          status: {
            type:        'string',
            enum:        ['active', 'on_hold', 'completed', 'draft'],
            description: 'New status for the project',
          },
        },
        required: ['project_name', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name:        'assign_consultant',
      description: 'Assign a consultant to a project with an allocation percentage',
      parameters:  {
        type:       'object',
        properties: {
          consultant_name: {
            type:        'string',
            description: 'Full name of the consultant',
          },
          project_name: {
            type:        'string',
            description: 'Name of the project',
          },
          allocation: {
            type:        'number',
            description: 'Allocation percentage (0-100), default 100',
          },
        },
        required: ['consultant_name', 'project_name'],
      },
    },
  },
] as const