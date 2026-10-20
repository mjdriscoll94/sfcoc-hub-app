import type { z } from 'zod';
import type { Database } from './db';
import {
  addCongregationSourceInput,
  createCandidateCongregationInput,
  getCongregationInput,
  getNextResearchUrlsInput,
  markResearchUrlInput,
  proposeChangeInput,
  searchCongregationsInput,
} from './schemas';

type GetNextInput = z.output<typeof getNextResearchUrlsInput>;
type SearchInput = z.output<typeof searchCongregationsInput>;
type GetInput = z.output<typeof getCongregationInput>;
type SourceInput = z.output<typeof addCongregationSourceInput>;
type ChangeInput = z.output<typeof proposeChangeInput>;
type CandidateInput = z.output<typeof createCandidateCongregationInput>;
type MarkInput = z.output<typeof markResearchUrlInput>;

export class DirectoryRepository {
  constructor(private readonly db: Database) {}

  getNextResearchUrls({ count }: GetNextInput) {
    return this.db.query(
      `SELECT id AS research_url_id, url, status, congregation_id, attempt_count
       FROM research_urls
       WHERE status = 'pending'
       ORDER BY id
       LIMIT $1`,
      [count],
    );
  }

  searchCongregations(input: SearchInput) {
    const conditions: string[] = [];
    const params: unknown[] = [];
    const add = (clause: string, value: unknown) => {
      params.push(value);
      conditions.push(clause.replace('?', `$${params.length}`));
    };

    if (input.name) add('name ILIKE ?', `%${input.name}%`);
    if (input.city) add('city ILIKE ?', `%${input.city}%`);
    if (input.state) add('state = ?', input.state);
    if (input.zip_code) add('zip_code = ?', input.zip_code);
    params.push(input.limit);

    return this.db.query(
      `SELECT id, name, address_line1, address_line2, city, state,
              zip_code AS zip, website
       FROM congregations
       ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
       ORDER BY name, city, state
       LIMIT $${params.length}`,
      params,
    );
  }

  async getCongregation({ congregation_id }: GetInput) {
    const rows = await this.db.query(
      'SELECT * FROM congregations WHERE id = $1 LIMIT 1',
      [congregation_id],
    );
    return rows[0] ?? null;
  }

  async addCongregationSource(input: SourceInput) {
    const rows = await this.db.query(
      `INSERT INTO congregation_sources
         (congregation_id, url, source_type, is_official, fields_supported, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (congregation_id, url) DO UPDATE SET
         source_type = EXCLUDED.source_type,
         is_official = EXCLUDED.is_official,
         fields_supported = EXCLUDED.fields_supported,
         notes = EXCLUDED.notes,
         updated_at = now()
       RETURNING id, congregation_id, url, source_type, is_official,
                 fields_supported, notes, created_at, updated_at`,
      [input.congregation_id, input.url, input.source_type, input.is_official,
        input.fields_supported, input.notes ?? null],
    );
    return rows[0];
  }

  async proposeChange(input: ChangeInput) {
    const currentRows = await this.db.query<{ current_value: unknown }>(
      'SELECT to_jsonb(c) -> $2 AS current_value FROM congregations c WHERE id = $1',
      [input.congregation_id, input.field_name],
    );
    if (!currentRows[0]) return null;

    const rows = await this.db.query(
      `INSERT INTO proposed_changes
         (congregation_id, field_name, current_value, proposed_value, source_url, confidence, reason)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
       RETURNING id, congregation_id, field_name, current_value, proposed_value,
                 source_url, confidence, reason, status, created_at`,
      [
        input.congregation_id,
        input.field_name,
        JSON.stringify(currentRows[0].current_value ?? null),
        JSON.stringify(input.proposed_value),
        input.source_url,
        input.confidence,
        input.reason,
      ],
    );
    return rows[0];
  }

  async createCandidateCongregation(input: CandidateInput) {
    const rows = await this.db.query(
      `INSERT INTO candidate_congregations
         (name, address_line1, address_line2, city, state, zip_code, phone, email,
          website, facebook, source_url, confidence, possible_match_id, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [input.name, input.address_line1 ?? null, input.address_line2 ?? null, input.city,
        input.state, input.zip_code ?? null, input.phone ?? null, input.email ?? null,
        input.website ?? null, input.facebook ?? null, input.source_url, input.confidence,
        input.possible_match_id ?? null, input.notes ?? null],
    );
    return rows[0];
  }

  async markResearchUrl(input: MarkInput) {
    const rows = await this.db.query(
      `UPDATE research_urls SET
         status = $2,
         congregation_id = COALESCE($3, congregation_id),
         notes = COALESCE($4, notes),
         attempt_count = attempt_count + CASE WHEN $2 = 'processing' THEN 1 ELSE 0 END,
         last_checked_at = now()
       WHERE id = $1
       RETURNING id AS research_url_id, url, status, congregation_id, attempt_count,
                 last_checked_at, notes`,
      [input.research_url_id, input.status, input.congregation_id ?? null, input.notes ?? null],
    );
    return rows[0] ?? null;
  }
}
