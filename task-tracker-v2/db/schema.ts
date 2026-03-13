export type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  source?: string | null;
  sourceId?: string | null;
  counterparty?: string | null;
  createdAt?: string;
  updatedAt?: string;
};
