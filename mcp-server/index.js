import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const HOME = process.env.HOME || process.env.USERPROFILE || '';
const CONFIG_PATH = join(HOME, '.slate', 'config.json');

function loadConfig() {
  // Prefer env var
  if (process.env.SLATE_API_KEY) {
    return { apiKey: process.env.SLATE_API_KEY };
  }
  // Fall back to config file
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.apiKey) return { apiKey: parsed.apiKey };
    } catch {
      // ignore parse errors
    }
  }
  return { apiKey: null };
}

const config = loadConfig();
const BASE_URL =
  process.env.SLATE_BASE_URL || 'https://slate.opsapp.co/api/v1';

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

async function slateApi(method, path, body, queryParams) {
  const url = new URL(`${BASE_URL}${path}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }

  const opts = { method, headers };
  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), opts);
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `Slate API ${method} ${path} returned ${res.status}: ${JSON.stringify(data)}`
    );
  }

  return data;
}

/** Standard MCP success response */
function ok(data) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  };
}

/** Standard MCP error response */
function err(message) {
  return {
    isError: true,
    content: [{ type: 'text', text: message }],
  };
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: 'slate',
  version: '1.0.0',
});

// ===========================
// Task 8 — 13 CRUD tools
// ===========================

// ---- List tools (4) -------------------------------------------------------

server.tool(
  'slate_list_pages',
  'List all pages in your Slate workspace.',
  {
    deleted: z
      .enum(['include', 'only'])
      .optional()
      .describe('Include or exclusively show deleted pages.'),
  },
  async ({ deleted }) => {
    try {
      const qp = {};
      if (deleted) qp.deleted = deleted;
      const data = await slateApi('GET', '/pages', null, qp);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_list_sections',
  'List sections for a given page.',
  {
    page_id: z.string().describe('The page ID to list sections for.'),
    deleted: z
      .enum(['include', 'only'])
      .optional()
      .describe('Include or exclusively show deleted sections.'),
  },
  async ({ page_id, deleted }) => {
    try {
      const qp = { page_id };
      if (deleted) qp.deleted = deleted;
      const data = await slateApi('GET', '/sections', null, qp);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_list_notes',
  'List notes with optional filters.',
  {
    page_id: z.string().optional().describe('Filter by page ID.'),
    section_id: z.string().optional().describe('Filter by section ID.'),
    tags: z.string().optional().describe('Comma-separated tag names to filter by.'),
    completed: z
      .boolean()
      .optional()
      .describe('Filter by completion status.'),
    search: z.string().optional().describe('Full-text search query.'),
    date_from: z
      .string()
      .optional()
      .describe('Start date filter (ISO 8601).'),
    date_to: z.string().optional().describe('End date filter (ISO 8601).'),
    limit: z.number().optional().describe('Max number of notes to return.'),
    deleted: z
      .enum(['include', 'only'])
      .optional()
      .describe('Include or exclusively show deleted notes.'),
  },
  async (params) => {
    try {
      const qp = {};
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          qp[key] = value;
        }
      }
      const data = await slateApi('GET', '/notes', null, qp);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_list_tags',
  'List all tags in the workspace.',
  {},
  async () => {
    try {
      const data = await slateApi('GET', '/tags');
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

// ---- Create tools (3) -----------------------------------------------------

server.tool(
  'slate_create_page',
  'Create a new page.',
  {
    name: z.string().describe('Name of the new page.'),
  },
  async ({ name }) => {
    try {
      const data = await slateApi('POST', '/pages', { name });
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_create_section',
  'Create a new section inside a page.',
  {
    name: z.string().describe('Name of the new section.'),
    page_id: z.string().describe('The page to create the section in.'),
  },
  async ({ name, page_id }) => {
    try {
      const data = await slateApi('POST', '/sections', { name, page_id });
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_create_note',
  'Create a new note inside a section.',
  {
    content: z.string().describe('The text content of the note.'),
    section_id: z.string().describe('The section to create the note in.'),
    tags: z
      .array(z.string())
      .optional()
      .describe('Tags to apply to the note.'),
    date: z.string().optional().describe('Date for the note (ISO 8601).'),
  },
  async ({ content, section_id, tags, date }) => {
    try {
      const body = { content, section_id };
      if (tags) body.tags = tags;
      if (date) body.date = date;
      const data = await slateApi('POST', '/notes', body);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

// ---- Update tools (3) -----------------------------------------------------

server.tool(
  'slate_update_page',
  'Update a page (rename or star/unstar).',
  {
    id: z.string().describe('The page ID to update.'),
    name: z.string().optional().describe('New name for the page.'),
    starred: z
      .boolean()
      .optional()
      .describe('Whether the page is starred.'),
  },
  async ({ id, name, starred }) => {
    try {
      const body = {};
      if (name !== undefined) body.name = name;
      if (starred !== undefined) body.starred = starred;
      const data = await slateApi('PATCH', `/pages/${id}`, body);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_update_section',
  'Rename a section.',
  {
    id: z.string().describe('The section ID to update.'),
    name: z.string().describe('New name for the section.'),
  },
  async ({ id, name }) => {
    try {
      const data = await slateApi('PATCH', `/sections/${id}`, { name });
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_update_note',
  'Update a note (content, tags, completion, date).',
  {
    id: z.string().describe('The note ID to update.'),
    content: z.string().optional().describe('New content for the note.'),
    tags: z
      .array(z.string())
      .optional()
      .describe('New set of tags for the note.'),
    completed: z
      .boolean()
      .optional()
      .describe('Mark the note as completed or not.'),
    date: z.string().optional().describe('New date for the note (ISO 8601).'),
  },
  async ({ id, content, tags, completed, date }) => {
    try {
      const body = {};
      if (content !== undefined) body.content = content;
      if (tags !== undefined) body.tags = tags;
      if (completed !== undefined) body.completed = completed;
      if (date !== undefined) body.date = date;
      const data = await slateApi('PATCH', `/notes/${id}`, body);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

// ---- Delete tools (3) -----------------------------------------------------

server.tool(
  'slate_delete_page',
  'Soft-delete a page.',
  {
    id: z.string().describe('The page ID to delete.'),
  },
  async ({ id }) => {
    try {
      const data = await slateApi('DELETE', `/pages/${id}`);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_delete_section',
  'Soft-delete a section.',
  {
    id: z.string().describe('The section ID to delete.'),
  },
  async ({ id }) => {
    try {
      const data = await slateApi('DELETE', `/sections/${id}`);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_delete_note',
  'Soft-delete a note.',
  {
    id: z.string().describe('The note ID to delete.'),
  },
  async ({ id }) => {
    try {
      const data = await slateApi('DELETE', `/notes/${id}`);
      return ok(data);
    } catch (e) {
      return err(e.message);
    }
  }
);

// ===========================
// Task 9 — 3 high-level tools
// ===========================

server.tool(
  'slate_sync',
  'Fetch a structured summary of all pages, sections, and incomplete notes. Optionally scope to a single page.',
  {
    page_id: z
      .string()
      .optional()
      .describe('If provided, only sync this page.'),
  },
  async ({ page_id }) => {
    try {
      // 1. Fetch pages
      let pages;
      if (page_id) {
        // When scoped to one page, still fetch the list and filter
        const allPages = await slateApi('GET', '/pages');
        pages = (allPages.data || allPages).filter((p) => p.id === page_id);
        if (pages.length === 0) {
          return err(`Page not found: ${page_id}`);
        }
      } else {
        const allPages = await slateApi('GET', '/pages');
        pages = allPages.data || allPages;
      }

      // 2. For each page, fetch sections and incomplete notes
      const summary = [];
      for (const page of pages) {
        const sectionsRes = await slateApi('GET', '/sections', null, {
          page_id: page.id,
        });
        const sections = sectionsRes.data || sectionsRes;

        const notesRes = await slateApi('GET', '/notes', null, {
          page_id: page.id,
          completed: false,
        });
        const notes = notesRes.data || notesRes;

        // Group notes by section
        const notesBySection = {};
        for (const note of notes) {
          const sid = note.section_id || '_unsectioned';
          if (!notesBySection[sid]) notesBySection[sid] = [];
          notesBySection[sid].push(note);
        }

        const sectionSummaries = sections.map((sec) => ({
          id: sec.id,
          name: sec.name,
          incomplete_notes: (notesBySection[sec.id] || []).map((n) => ({
            id: n.id,
            content: n.content,
            tags: n.tags,
            date: n.date,
          })),
        }));

        summary.push({
          id: page.id,
          name: page.name,
          starred: page.starred,
          sections: sectionSummaries,
          total_incomplete: notes.length,
        });
      }

      return ok(summary);
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_search',
  'Search notes with optional tag, completion, and date filters.',
  {
    query: z.string().describe('Full-text search query.'),
    tags: z.string().optional().describe('Comma-separated tag names.'),
    completed: z.boolean().optional().describe('Filter by completion.'),
    date_from: z.string().optional().describe('Start date (ISO 8601).'),
    date_to: z.string().optional().describe('End date (ISO 8601).'),
  },
  async ({ query, tags, completed, date_from, date_to }) => {
    try {
      const qp = { search: query };
      if (tags) qp.tags = tags;
      if (completed !== undefined) qp.completed = completed;
      if (date_from) qp.date_from = date_from;
      if (date_to) qp.date_to = date_to;

      const data = await slateApi('GET', '/notes', null, qp);
      const notes = data.data || data;

      // Enrich with a result count for convenience
      return ok({ count: notes.length, results: notes });
    } catch (e) {
      return err(e.message);
    }
  }
);

server.tool(
  'slate_create_checklist',
  'Bulk-create a checklist of notes. Optionally creates a new section first.',
  {
    section_id: z
      .string()
      .optional()
      .describe('Existing section to add items to.'),
    page_id: z
      .string()
      .optional()
      .describe('Page to create a new section in (used with section_name).'),
    section_name: z
      .string()
      .optional()
      .describe('Name for a new section (requires page_id).'),
    items: z
      .array(
        z.object({
          content: z.string().describe('Note content.'),
          tags: z
            .array(z.string())
            .optional()
            .describe('Tags for this note.'),
        })
      )
      .describe('List of checklist items to create.'),
  },
  async ({ section_id, page_id, section_name, items }) => {
    try {
      let targetSectionId = section_id;

      // If no section_id, create a new section
      if (!targetSectionId) {
        if (!page_id) {
          return err(
            'Either section_id or both page_id and section_name must be provided.'
          );
        }
        const sectionData = await slateApi('POST', '/sections', {
          name: section_name || 'Checklist',
          page_id,
        });
        const section = sectionData.data || sectionData;
        targetSectionId = section.id;
      }

      // Create each note
      const created = [];
      for (const item of items) {
        const body = {
          content: item.content,
          section_id: targetSectionId,
        };
        if (item.tags) body.tags = item.tags;
        const noteData = await slateApi('POST', '/notes', body);
        created.push(noteData.data || noteData);
      }

      return ok({
        section_id: targetSectionId,
        created_count: created.length,
        notes: created,
      });
    } catch (e) {
      return err(e.message);
    }
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
