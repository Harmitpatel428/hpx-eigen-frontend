import { api } from './api';
import { isValidCaseId } from '../domain/caseId';

export interface GenerateCaseIdResult {
  caseId: string;
  generatedAt: string;
}

export interface CaseIdSearchResult {
  caseId: string;
  leadId: string;
  clientName: string;
  company: string | null;
  status: string;
  docCaseId?: string;
}

export interface ICaseIdService {
  generate(leadId: string, idempotencyKey: string): Promise<GenerateCaseIdResult>;
  search(query: string): Promise<CaseIdSearchResult[]>;
}

class MockCaseIdService implements ICaseIdService {
  private generated = new Map<string, GenerateCaseIdResult>();

  async generate(leadId: string, idempotencyKey: string): Promise<GenerateCaseIdResult> {
    await delay(500);
    if (this.generated.has(idempotencyKey)) {
      return this.generated.get(idempotencyKey)!;
    }
    // Generate deterministic-looking mock ID
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const caseId = `HPX-${seg(4)}-${seg(4)}`;
    const result: GenerateCaseIdResult = { caseId, generatedAt: new Date().toISOString() };
    this.generated.set(idempotencyKey, result);
    return result;
  }

  async search(query: string): Promise<CaseIdSearchResult[]> {
    await delay(300);
    if (!query || query.length < 4) return [];
    // Mock: return a result only if the query looks like a valid Case ID prefix
    if (query.toUpperCase().startsWith('HPX')) {
      return [{
        caseId: 'HPX-7K3M-92QD',
        leadId: 'mock-lead-1',
        clientName: 'Arun Sharma',
        company: 'Sharma Enterprises',
        status: 'ACTIVE',
        docCaseId: 'mock-doc-case-1',
      }];
    }
    return [];
  }
}

class ApiCaseIdService implements ICaseIdService {
  async generate(leadId: string, idempotencyKey: string): Promise<GenerateCaseIdResult> {
    const res = await api.post(`/api/v1/leads/${leadId}/case-id`, {}, {
      headers: { 'Idempotency-Key': idempotencyKey },
    });
    return (res.data as any).data;
  }

  async search(query: string): Promise<CaseIdSearchResult[]> {
    if (!query || query.length < 4) return [];
    const res = await api.get('/api/v1/case-ids/search', { params: { q: query } });
    return (res.data as any).data ?? [];
  }
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

export const caseIdService: ICaseIdService =
  import.meta.env.VITE_USE_MOCK_PORTAL === 'true' || import.meta.env.DEV
    ? new MockCaseIdService()
    : new ApiCaseIdService();
