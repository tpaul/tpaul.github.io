#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';

const RUNS_FILE = process.env.RUNS_FILE || process.argv[2];
if (!RUNS_FILE) {
  console.error('Usage: RUNS_FILE=/path/to/runs.json node server.js');
  process.exit(1);
}

// ── Training plan (mirrors running.html) ──────────────────────────────────
const weekStartDates = {
  w1:  '2025-11-24', w2:  '2025-12-01', w3:  '2025-12-08', w4:  '2025-12-15',
  w5:  '2026-01-05', w6:  '2026-01-12', w7:  '2026-01-19', w8:  '2026-01-26',
  w9:  '2026-02-02', w10: '2026-02-09', w11: '2026-02-16', w12: '2026-02-23',
  w13: '2026-03-02', w14: '2026-03-09', w15: '2026-03-16', w16: '2026-03-23',
  w17: '2026-03-30', w18: '2026-04-06',
};

const weeks = [
  { id: 'w1',  label: 'Week 1',                  dates: 'Nov 24–30',      workouts: [{ id: 'w1-a',  miles: 3  }, { id: 'w1-b',  miles: 3  }, { id: 'w1-c',  miles: 3  }, { id: 'w1-d',  miles: 6  }] },
  { id: 'w2',  label: 'Week 2',                  dates: 'Dec 1–7',        workouts: [{ id: 'w2-a',  miles: 3  }, { id: 'w2-b',  miles: 3  }, { id: 'w2-c',  miles: 3  }, { id: 'w2-d',  miles: 7  }] },
  { id: 'w3',  label: 'Week 3',                  dates: 'Dec 8–14',       workouts: [{ id: 'w3-a',  miles: 3  }, { id: 'w3-b',  miles: 4  }, { id: 'w3-c',  miles: 3  }, { id: 'w3-d',  miles: 5  }] },
  { id: 'w4',  label: 'Week 4',                  dates: 'Dec 15–21',      workouts: [{ id: 'w4-a',  miles: 3  }, { id: 'w4-b',  miles: 4  }, { id: 'w4-c',  miles: 3  }, { id: 'w4-d',  miles: 9  }] },
  { id: 'w5',  label: 'Week 5',                  dates: 'Jan 5–11',       workouts: [{ id: 'w5-a',  miles: 3  }, { id: 'w5-b',  miles: 5  }, { id: 'w5-c',  miles: 3  }, { id: 'w5-d',  miles: 10 }] },
  { id: 'w6',  label: 'Week 6',                  dates: 'Jan 12–18',      workouts: [{ id: 'w6-a',  miles: 3  }, { id: 'w6-b',  miles: 5  }, { id: 'w6-c',  miles: 3  }, { id: 'w6-d',  miles: 7  }] },
  { id: 'w7',  label: 'Week 7',                  dates: 'Jan 19–25',      workouts: [{ id: 'w7-a',  miles: 3  }, { id: 'w7-b',  miles: 6  }, { id: 'w7-c',  miles: 3  }, { id: 'w7-d',  miles: 12 }] },
  { id: 'w8',  label: 'Week 8',                  dates: 'Jan 26 – Feb 1', workouts: [{ id: 'w8-a',  miles: 3  }, { id: 'w8-b',  miles: 6  }, { id: 'w8-c',  miles: 3  }, { id: 'w8-d',  miles: 13 }] },
  { id: 'w9',  label: 'Week 9',                  dates: 'Feb 2–8',        workouts: [{ id: 'w9-a',  miles: 3  }, { id: 'w9-b',  miles: 7  }, { id: 'w9-c',  miles: 4  }, { id: 'w9-d',  miles: 10 }] },
  { id: 'w10', label: 'Week 10',                 dates: 'Feb 9–15',       workouts: [{ id: 'w10-a', miles: 3  }, { id: 'w10-b', miles: 7  }, { id: 'w10-c', miles: 4  }, { id: 'w10-d', miles: 15 }] },
  { id: 'w11', label: 'Week 11',                 dates: 'Feb 16–22',      workouts: [{ id: 'w11-a', miles: 4  }, { id: 'w11-b', miles: 8  }, { id: 'w11-c', miles: 4  }, { id: 'w11-d', miles: 16 }] },
  { id: 'w12', label: 'Week 12',                 dates: 'Feb 23 – Mar 1', workouts: [{ id: 'w12-a', miles: 4  }, { id: 'w12-b', miles: 8  }, { id: 'w12-c', miles: 5  }, { id: 'w12-d', miles: 12 }] },
  { id: 'w13', label: 'Week 13',                 dates: 'Mar 2–8',        workouts: [{ id: 'w13-a', miles: 4  }, { id: 'w13-b', miles: 9  }, { id: 'w13-c', miles: 5  }, { id: 'w13-d', miles: 18 }] },
  { id: 'w14', label: 'Week 14',                 dates: 'Mar 9–15',       workouts: [{ id: 'w14-a', miles: 5  }, { id: 'w14-b', miles: 9  }, { id: 'w14-c', miles: 5  }, { id: 'w14-d', miles: 14 }] },
  { id: 'w15', label: 'Week 15',                 dates: 'Mar 16–22',      workouts: [{ id: 'w15-a', miles: 5  }, { id: 'w15-b', miles: 10 }, { id: 'w15-c', miles: 5  }, { id: 'w15-d', miles: 20 }] },
  { id: 'w16', label: 'Week 16 · Taper begins', dates: 'Mar 23–29',      workouts: [{ id: 'w16-a', miles: 5  }, { id: 'w16-b', miles: 8  }, { id: 'w16-c', miles: 4  }, { id: 'w16-d', miles: 12 }] },
  { id: 'w17', label: 'Week 17',                 dates: 'Mar 30 – Apr 5', workouts: [{ id: 'w17-a', miles: 4  }, { id: 'w17-b', miles: 6  }, { id: 'w17-c', miles: 3  }, { id: 'w17-d', miles: 8  }] },
  { id: 'w18', label: 'Week 18 · Race week',     dates: 'Apr 6–11',       workouts: [{ id: 'w18-a', miles: 3  }, { id: 'w18-b', miles: 4  }, { id: 'w18-c', miles: 2  }] },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function loadRuns() {
  try {
    return JSON.parse(readFileSync(RUNS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function getCurrentWeekId() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let current = null;
  for (const [id, start] of Object.entries(weekStartDates)) {
    if (today >= new Date(start)) current = id;
  }
  return current;
}

function weekSummary(week, runs) {
  const workouts = week.workouts.map(w => ({
    id: w.id,
    miles: w.miles,
    done: !!(runs[w.id]?.done),
    note: runs[w.id]?.note || null,
  }));
  const planned = workouts.reduce((s, w) => s + w.miles, 0);
  const completed = workouts.filter(w => w.done).reduce((s, w) => s + w.miles, 0);
  return { id: week.id, label: week.label, dates: week.dates, planned, completed, workouts };
}

// ── MCP Server ────────────────────────────────────────────────────────────
const server = new Server(
  { name: 'running-tracker', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'get_current_week',
      description: 'Get the current training week — which runs are planned and which are done.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_total_miles',
      description: 'Get total miles completed vs total planned across the whole training plan.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'get_week_summary',
      description: 'Get a summary for a specific week (e.g. "w13" or "Week 13").',
      inputSchema: {
        type: 'object',
        properties: {
          week: { type: 'string', description: 'Week ID like "w13" or a label like "Week 13"' },
        },
        required: ['week'],
      },
    },
    {
      name: 'get_all_stats',
      description: 'Get a full overview of all weeks — miles planned, completed, and percent done.',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const runs = loadRuns();
  const { name, arguments: args } = req.params;

  if (name === 'get_current_week') {
    const id = getCurrentWeekId();
    if (!id) return { content: [{ type: 'text', text: 'Training plan not yet started or already finished.' }] };
    const week = weeks.find(w => w.id === id);
    const summary = weekSummary(week, runs);
    const lines = [
      `**${summary.label}** (${summary.dates})`,
      `Planned: ${summary.planned} miles | Completed: ${summary.completed} miles`,
      '',
      ...summary.workouts.map(w =>
        `${w.done ? '✓' : '○'} ${w.miles} mi${w.note ? ` — "${w.note}"` : ''}`
      ),
    ];
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  if (name === 'get_total_miles') {
    const all = weeks.flatMap(w => w.workouts);
    const totalPlanned   = all.reduce((s, w) => s + w.miles, 0);
    const totalCompleted = all.filter(w => runs[w.id]?.done).reduce((s, w) => s + w.miles, 0);
    const pct = Math.round((totalCompleted / totalPlanned) * 100);
    const text = `Total miles completed: ${totalCompleted} of ${totalPlanned} (${pct}%)`;
    return { content: [{ type: 'text', text }] };
  }

  if (name === 'get_week_summary') {
    const input = args.week.toLowerCase().replace(/\s+/g, '');
    const week = weeks.find(w =>
      w.id === input ||
      w.id === input.replace('week', 'w') ||
      w.label.toLowerCase().replace(/\s+/g, '') === input
    );
    if (!week) return { content: [{ type: 'text', text: `Week not found: ${args.week}` }] };
    const summary = weekSummary(week, runs);
    const lines = [
      `**${summary.label}** (${summary.dates})`,
      `Planned: ${summary.planned} miles | Completed: ${summary.completed} miles`,
      '',
      ...summary.workouts.map(w =>
        `${w.done ? '✓' : '○'} ${w.miles} mi${w.note ? ` — "${w.note}"` : ''}`
      ),
    ];
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  if (name === 'get_all_stats') {
    const currentId = getCurrentWeekId();
    const lines = weeks.map(w => {
      const s = weekSummary(w, runs);
      const marker = w.id === currentId ? ' ← current' : '';
      return `${s.label} (${s.dates}): ${s.completed}/${s.planned} mi${marker}`;
    });
    const allPlanned   = weeks.flatMap(w => w.workouts).reduce((s, w) => s + w.miles, 0);
    const allCompleted = weeks.flatMap(w => w.workouts).filter(w => runs[w.id]?.done).reduce((s, w) => s + w.miles, 0);
    lines.push('', `Total: ${allCompleted}/${allPlanned} miles (${Math.round(allCompleted / allPlanned * 100)}%)`);
    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }

  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
