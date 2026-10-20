import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../db';
import { DirectoryRepository } from '../directoryRepository';
import {
  addCongregationSourceInput,
  createCandidateCongregationInput,
  getCongregationInput,
  getNextResearchUrlsInput,
  markResearchUrlInput,
  proposeChangeInput,
  searchCongregationsInput,
} from '../schemas';

function setup(responses: Record<string, unknown>[][] = [[]]) {
  const query = vi.fn();
  for (const response of responses) query.mockResolvedValueOnce(response);
  const db: Database = {
    query: <T extends Record<string, unknown>>(text: string, params?: unknown[]) =>
      query(text, params) as Promise<T[]>,
  };
  return { repository: new DirectoryRepository(db), query };
}

describe('directory MCP tool data operations', () => {
  it('get_next_research_urls returns a bounded pending queue ordered by ID', async () => {
    const rows = [{ research_url_id: '1', url: 'https://example.com', status: 'pending', congregation_id: null, attempt_count: 0 }];
    const { repository, query } = setup([rows]);
    await expect(repository.getNextResearchUrls(getNextResearchUrlsInput.parse({ count: 5 }))).resolves.toEqual(rows);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE status = 'pending'"), [5]);
    expect(() => getNextResearchUrlsInput.parse({ count: 101 })).toThrow();
  });

  it('search_congregations parameterizes filters and caps limit', async () => {
    const { repository, query } = setup();
    const input = searchCongregationsInput.parse({ name: "O'Brien", city: 'Sioux Falls', state: 'sd', limit: 25 });
    await repository.searchCongregations(input);
    expect(query.mock.calls[0][0]).toContain('name ILIKE $1');
    expect(query.mock.calls[0][0]).not.toContain("O'Brien");
    expect(query.mock.calls[0][1]).toEqual(["%O'Brien%", '%Sioux Falls%', 'SD', 25]);
    expect(() => searchCongregationsInput.parse({ limit: 26 })).toThrow();
  });

  it('get_congregation returns all fields or null', async () => {
    const row = { id: '4', name: 'Central' };
    const first = setup([[row]]);
    await expect(first.repository.getCongregation(getCongregationInput.parse({ congregation_id: 4 }))).resolves.toEqual(row);
    const second = setup([[]]);
    await expect(second.repository.getCongregation({ congregation_id: 99 })).resolves.toBeNull();
  });

  it('add_congregation_source uses an idempotent upsert', async () => {
    const row = { id: '8', congregation_id: '4' };
    const { repository, query } = setup([[row]]);
    const input = addCongregationSourceInput.parse({
      congregation_id: 4, url: 'https://church.example', source_type: 'official website',
      is_official: true, fields_supported: ['website', 'phone'],
    });
    await expect(repository.addCongregationSource(input)).resolves.toEqual(row);
    expect(query.mock.calls[0][0]).toContain('ON CONFLICT (congregation_id, url) DO UPDATE');
  });

  it('propose_change reads the canonical current value and never updates congregations', async () => {
    const created = { id: '12', field_name: 'acappella', current_value: null, proposed_value: true };
    const { repository, query } = setup([[{ current_value: null }], [created]]);
    const input = proposeChangeInput.parse({
      congregation_id: 4, field_name: 'acappella', proposed_value: true,
      source_url: 'https://church.example/beliefs', confidence: 'high', reason: 'Explicitly stated',
    });
    await expect(repository.proposeChange(input)).resolves.toEqual(created);
    expect(query.mock.calls[0][0]).toMatch(/^SELECT/);
    expect(query.mock.calls[1][0]).toMatch(/INSERT INTO proposed_changes/);
    expect(query.mock.calls.map((call) => call[0]).join('\n')).not.toMatch(/UPDATE congregations/);
    expect(() => proposeChangeInput.parse({ ...input, field_name: 'created_at' })).toThrow();
  });

  it('create_candidate_congregation inserts only into the candidate table', async () => {
    const row = { id: '3', name: 'Westside', status: 'pending' };
    const { repository, query } = setup([[row]]);
    const input = createCandidateCongregationInput.parse({
      name: 'Westside', city: 'Sioux Falls', state: 'sd', source_url: 'https://example.org/church', confidence: 'medium',
    });
    await expect(repository.createCandidateCongregation(input)).resolves.toEqual(row);
    expect(query.mock.calls[0][0]).toContain('INSERT INTO candidate_congregations');
    expect(query.mock.calls[0][0]).not.toMatch(/INSERT INTO congregations\b/);
  });

  it('mark_research_url increments attempts only through the processing expression', async () => {
    const row = { research_url_id: '2', status: 'processing', attempt_count: 2 };
    const { repository, query } = setup([[row]]);
    const input = markResearchUrlInput.parse({ research_url_id: 2, status: 'processing' });
    await expect(repository.markResearchUrl(input)).resolves.toEqual(row);
    expect(query.mock.calls[0][0]).toContain("CASE WHEN $2 = 'processing' THEN 1 ELSE 0 END");
    expect(query.mock.calls[0][1]).toEqual([2, 'processing', null, null]);
    expect(() => markResearchUrlInput.parse({ research_url_id: 2, status: 'deleted' })).toThrow();
  });
});
