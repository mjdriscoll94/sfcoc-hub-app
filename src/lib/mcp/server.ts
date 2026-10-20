import { McpServer, type ServerContext } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { DirectoryRepository } from './directoryRepository';
import { getDatabase } from './db';
import {
  addCongregationSourceInput,
  createCandidateCongregationInput,
  getCongregationInput,
  getNextResearchUrlsInput,
  markResearchUrlInput,
  proposeChangeInput,
  searchCongregationsInput,
} from './schemas';

const resultSchema = z.object({ data: z.unknown() });
const readOnly = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const safeWrite = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

function success(data: unknown) {
  const structuredContent = { data };
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(structuredContent) }],
    structuredContent,
  };
}

function failure(error: unknown) {
  console.error('MCP tool failed', error instanceof Error ? error.name : 'Unknown error');
  return {
    isError: true,
    content: [{ type: 'text' as const, text: 'The directory operation failed. No database credentials or internal details were exposed.' }],
  };
}

function requireScope(context: ServerContext, scope: 'directory:read' | 'directory:write') {
  if (context.http?.authInfo?.scopes.includes(scope)) return null;
  return {
    isError: true,
    content: [{ type: 'text' as const, text: `OAuth scope ${scope} is required for this operation.` }],
  };
}

export function createDirectoryMcpServer(repository = new DirectoryRepository(getDatabase())) {
  const server = new McpServer(
    { name: 'church-of-christ-directory', version: '1.0.0' },
    {
      instructions: 'The congregations table is canonical. Never imply that a proposal or candidate changed canonical data. Use null for unknown facts, especially booleans; missing evidence never means false. Research flow: get URLs, mark processing, find a match, record sources and proposals or create a candidate, then mark the URL outcome.',
    },
  );

  server.registerTool('get_next_research_urls', {
    title: 'Get next research URLs',
    description: 'Use this to claim a small batch of pending URLs that still need directory research. It only reads the queue; call mark_research_url with status processing before researching each returned URL. Do not use it to search congregations or to infer that a URL is valid.',
    inputSchema: getNextResearchUrlsInput,
    outputSchema: resultSchema,
    annotations: readOnly,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:read'); if (denied) return denied;
    try { return success(await repository.getNextResearchUrls(input)); } catch (error) { return failure(error); }
  });

  server.registerTool('search_congregations', {
    title: 'Search congregations',
    description: 'Use this to find likely canonical congregation matches by name and/or location before proposing a change or creating a candidate. Matching is case-insensitive for name and city and all filters are combined. Do not treat a fuzzy result as a confirmed match, and do not use this for arbitrary SQL.',
    inputSchema: searchCongregationsInput,
    outputSchema: resultSchema,
    annotations: readOnly,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:read'); if (denied) return denied;
    try { return success(await repository.searchCongregations(input)); } catch (error) { return failure(error); }
  });

  server.registerTool('get_congregation', {
    title: 'Get congregation',
    description: 'Use this after identifying a congregation ID to inspect every current canonical field before recording evidence or proposing a correction. A null result means the ID does not exist. This tool is read-only and must not be used to claim that a proposed value is already canonical.',
    inputSchema: getCongregationInput,
    outputSchema: resultSchema,
    annotations: readOnly,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:read'); if (denied) return denied;
    try { return success(await repository.getCongregation(input)); } catch (error) { return failure(error); }
  });

  server.registerTool('add_congregation_source', {
    title: 'Add congregation source',
    description: 'Use this to record a source that supports specific fields of an existing congregation. Repeating the same congregation and URL updates that source idempotently. is_official must be true only for a source controlled by the congregation or an authoritative organization. This records evidence only; it does not alter canonical congregation fields.',
    inputSchema: addCongregationSourceInput,
    outputSchema: resultSchema,
    annotations: safeWrite,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:write'); if (denied) return denied;
    try { return success(await repository.addCongregationSource(input)); } catch (error) { return failure(error); }
  });

  server.registerTool('propose_change', {
    title: 'Propose congregation change',
    description: 'Use this only when a cited source supports changing one allowlisted field on an existing congregation. The server reads the current canonical value itself and creates a pending review item. It never updates congregations. Preserve uncertainty: for boolean fields, use null when evidence is missing and never propose false merely because a source is silent.',
    inputSchema: proposeChangeInput,
    outputSchema: resultSchema,
    annotations: safeWrite,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:write'); if (denied) return denied;
    try {
      const change = await repository.proposeChange(input);
      return success(change ?? { created: false, reason: 'Congregation not found' });
    } catch (error) { return failure(error); }
  });

  server.registerTool('create_candidate_congregation', {
    title: 'Create candidate congregation',
    description: 'Use this when credible research finds a possible congregation that cannot be confidently matched to canonical data. Include possible_match_id when there is an uncertain near-match. This creates a review candidate only and never inserts into congregations. Do not use it when an existing match is sufficiently confirmed.',
    inputSchema: createCandidateCongregationInput,
    outputSchema: resultSchema,
    annotations: safeWrite,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:write'); if (denied) return denied;
    try { return success(await repository.createCandidateCongregation(input)); } catch (error) { return failure(error); }
  });

  server.registerTool('mark_research_url', {
    title: 'Mark research URL',
    description: 'Use this to update the controlled workflow state of one research URL. Mark processing before work; this increments attempt_count. Then use matched, possible_new, manual_review, invalid, or complete to record the outcome and link a congregation when known. This changes queue metadata only and never changes canonical congregation fields.',
    inputSchema: markResearchUrlInput,
    outputSchema: resultSchema,
    annotations: safeWrite,
  }, async (input, context) => {
    const denied = requireScope(context, 'directory:write'); if (denied) return denied;
    try {
      const item = await repository.markResearchUrl(input);
      return success(item ?? { updated: false, reason: 'Research URL not found' });
    } catch (error) { return failure(error); }
  });

  return server;
}
