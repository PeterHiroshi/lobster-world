import type { SocialProfile, DataPartition } from '@lobster-world/protocol';

export class ProfileManager {
  private profile: SocialProfile | null = null;

  setProfile(profile: SocialProfile): void {
    this.profile = { ...profile };
  }

  getProfile(): SocialProfile {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }
    return { ...this.profile };
  }

  updateProfile(updates: Partial<SocialProfile>): void {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }
    Object.assign(this.profile, updates);
  }

  setPartition(partition: DataPartition): void {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }
    this.profile.partition = partition;
  }

  getPublicView(): SocialProfile {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }
    return this.filterByPartition(this.profile.partition, false);
  }

  getViewFor(requesterId: string, allowedIds: string[]): SocialProfile {
    if (!this.profile) {
      throw new Error('Profile not initialized');
    }
    const hasAccess = allowedIds.includes(requesterId);
    return this.filterByPartition(this.profile.partition, hasAccess);
  }

  private filterByPartition(partition: DataPartition, hasAccess: boolean): SocialProfile {
    const base: SocialProfile = {
      lobsterId: this.profile!.lobsterId,
      displayName: this.profile!.displayName,
      avatar: this.profile!.avatar,
      bio: '',
      skillTags: [],
      personalitySnippet: '',
      status: this.profile!.status,
      partition,
    };

    if (partition === 'public') {
      return { ...this.profile!, partition };
    }

    if (partition === 'protected' && hasAccess) {
      return { ...this.profile!, partition };
    }

    // protected without access, or private: return minimal
    return base;
  }
}
