/**
 * Repository Registry & Data Access Factory
 * Provides the active IUnitOfWork instance with explicit durability tracking.
 */

import { IUnitOfWork } from './interfaces.js';
import { SupabaseDomainUnitOfWork } from './supabaseDomainAdapter.js';

class RepositoryManager {
  private activeUnitOfWork: IUnitOfWork;

  constructor() {
    // Never silently accept server-memory persistence. With no Supabase config,
    // repository operations fail clearly instead of losing records on restart.
    this.activeUnitOfWork = new SupabaseDomainUnitOfWork();
  }

  public get uow(): IUnitOfWork {
    return this.activeUnitOfWork;
  }

  public getStorageStatus() {
    return this.activeUnitOfWork.getStorageMode();
  }
}

export const repositoryManager = new RepositoryManager();
export const db = repositoryManager.uow;
