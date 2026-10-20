import { createMcpHandler } from '@modelcontextprotocol/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { DirectoryRepository } from '../directoryRepository';
import { createDirectoryMcpServer } from '../server';

describe('directory MCP server', () => {
  it('advertises exactly the seven scoped directory tools over Streamable HTTP', async () => {
    const repository = {
      getNextResearchUrls: vi.fn(),
      searchCongregations: vi.fn(),
      getCongregation: vi.fn(),
      addCongregationSource: vi.fn(),
      proposeChange: vi.fn(),
      createCandidateCongregation: vi.fn(),
      markResearchUrl: vi.fn(),
    } as unknown as DirectoryRepository;
    const handler = createMcpHandler(() => createDirectoryMcpServer(repository));
    const response = await handler.fetch(new Request('https://directory.example/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    }));
    const body = await response.text();
    const payload = JSON.parse(body.split('data: ')[1].trim());
    expect(response.status).toBe(200);
    expect(payload.result.tools.map((tool: { name: string }) => tool.name)).toEqual([
      'get_next_research_urls',
      'search_congregations',
      'get_congregation',
      'add_congregation_source',
      'propose_change',
      'create_candidate_congregation',
      'mark_research_url',
    ]);
    expect(body).not.toContain('DATABASE_URL');
    await handler.close();
  });
});
