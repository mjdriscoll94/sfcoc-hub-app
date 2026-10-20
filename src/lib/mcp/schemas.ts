import { z } from 'zod';

export const confidenceSchema = z.enum(['high', 'medium', 'low']);
export const researchStatusSchema = z.enum([
  'pending', 'processing', 'matched', 'possible_new', 'manual_review', 'invalid', 'complete',
]);

export const congregationFieldSchema = z.enum([
  'name', 'address_line1', 'address_line2', 'city', 'state', 'zip_code', 'county',
  'latitude', 'longitude', 'phone', 'email', 'website', 'facebook', 'minister',
  'attendance', 'membership', 'attendance_year', 'acappella', 'instrumental',
  'institutional', 'non_institutional', 'one_cup', 'women_leadership',
  'active_status', 'last_verified', 'notes',
]);

const optionalText = z.string().trim().min(1).max(500).optional();
const optionalUrl = z.string().url().max(2048).optional();

export const getNextResearchUrlsInput = z.object({ count: z.number().int().min(1).max(100) });

export const searchCongregationsInput = z.object({
  name: optionalText,
  city: optionalText,
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()).optional(),
  zip_code: z.string().trim().min(1).max(10).optional(),
  limit: z.number().int().min(1).max(25).default(10),
});

export const getCongregationInput = z.object({
  congregation_id: z.coerce.number().int().positive(),
});

export const addCongregationSourceInput = z.object({
  congregation_id: z.coerce.number().int().positive(),
  url: z.string().url().max(2048),
  source_type: z.string().trim().min(1).max(100),
  is_official: z.boolean(),
  fields_supported: z.array(congregationFieldSchema).min(1).max(30),
  notes: z.string().trim().max(5000).optional(),
});

export const proposeChangeInput = z.object({
  congregation_id: z.coerce.number().int().positive(),
  field_name: congregationFieldSchema,
  proposed_value: z.union([z.string().max(10000), z.number().finite(), z.boolean(), z.null()]),
  source_url: z.string().url().max(2048),
  confidence: confidenceSchema,
  reason: z.string().trim().min(1).max(5000),
});

export const createCandidateCongregationInput = z.object({
  name: z.string().trim().min(1).max(500),
  city: z.string().trim().min(1).max(500),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  address_line1: optionalText,
  address_line2: optionalText,
  zip_code: z.string().trim().min(1).max(10).optional(),
  phone: optionalText,
  email: z.string().email().max(500).optional(),
  website: optionalUrl,
  facebook: optionalUrl,
  source_url: z.string().url().max(2048),
  confidence: confidenceSchema,
  possible_match_id: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const markResearchUrlInput = z.object({
  research_url_id: z.coerce.number().int().positive(),
  status: researchStatusSchema,
  congregation_id: z.coerce.number().int().positive().optional(),
  notes: z.string().trim().max(5000).optional(),
});
