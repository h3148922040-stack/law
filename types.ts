
export enum CaseType {
  CIVIL = '民事',
  CRIMINAL = '刑事',
  ADMINISTRATIVE = '行政'
}

export type PartyRole = 'plaintiff' | 'defendant' | 'third_party' | 'prosecutor';

export interface Party {
  role: PartyRole;
  name: string;
  identity: string; // ID, Social Credit Code, etc.
  address: string;
  phone?: string;
  legalRep?: string; // 法定代表人
  agent?: string;    // 委托代理人
}

export interface LegalProvision {
  lawName: string;
  article: string;
  content?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  data?: string; // Base64 for images/text
}

export interface CaseDetails {
  caseNumber: string;
  courtName: string;
  caseType: CaseType;
  prosecutors: Party[]; // For Criminal cases
  plaintiffs: Party[];
  defendants: Party[];
  thirdParties: Party[];
  claims: string;
  facts: string;
  evidence: string;
  legalBasis: LegalProvision[];
  attachments: Attachment[];
}

export interface JudgementDraft {
  title: string;
  partiesSection: string;
  proceedings: string;
  claimsAndDefense: string;
  courtFindings: string;
  courtReasoning: string;
  judgment: string;
  closing: string;
}
