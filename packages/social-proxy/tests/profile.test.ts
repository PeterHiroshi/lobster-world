import { describe, it, expect } from 'vitest';
import { ProfileManager } from '../src/profile.js';
import type { SocialProfile, DataPartition } from '@lobster-world/protocol';

const BASE_PROFILE: SocialProfile = {
  lobsterId: 'lobster-1',
  displayName: 'Cody',
  avatar: 'cody.png',
  bio: 'A coding lobster',
  skillTags: ['typescript', 'rust'],
  personalitySnippet: 'Friendly and curious',
  status: 'online',
  partition: 'public',
};

describe('ProfileManager', () => {
  it('stores and retrieves a profile', () => {
    const pm = new ProfileManager();
    pm.setProfile(BASE_PROFILE);
    expect(pm.getProfile()).toEqual(BASE_PROFILE);
  });

  it('returns public view with all fields for public partition', () => {
    const pm = new ProfileManager();
    pm.setProfile({ ...BASE_PROFILE, partition: 'public' });
    const view = pm.getPublicView();
    expect(view.displayName).toBe('Cody');
    expect(view.bio).toBe('A coding lobster');
    expect(view.skillTags).toEqual(['typescript', 'rust']);
    expect(view.personalitySnippet).toBe('Friendly and curious');
  });

  it('returns limited view for protected partition without access', () => {
    const pm = new ProfileManager();
    pm.setProfile({ ...BASE_PROFILE, partition: 'protected' });
    const view = pm.getPublicView();
    expect(view.displayName).toBe('Cody');
    expect(view.bio).toBe('');
    expect(view.skillTags).toEqual([]);
    expect(view.personalitySnippet).toBe('');
  });

  it('returns full view for protected partition with access granted', () => {
    const pm = new ProfileManager();
    pm.setProfile({ ...BASE_PROFILE, partition: 'protected' });
    const view = pm.getViewFor('requester-1', ['requester-1']);
    expect(view.displayName).toBe('Cody');
    expect(view.bio).toBe('A coding lobster');
    expect(view.skillTags).toEqual(['typescript', 'rust']);
  });

  it('returns minimal view for private partition', () => {
    const pm = new ProfileManager();
    pm.setProfile({ ...BASE_PROFILE, partition: 'private' });
    const view = pm.getPublicView();
    expect(view.displayName).toBe('Cody');
    expect(view.bio).toBe('');
    expect(view.skillTags).toEqual([]);
    expect(view.personalitySnippet).toBe('');
    expect(view.status).toBe('online');
  });

  it('returns minimal view for private even with access list', () => {
    const pm = new ProfileManager();
    pm.setProfile({ ...BASE_PROFILE, partition: 'private' });
    const view = pm.getViewFor('requester-1', ['requester-1']);
    // Private means only displayName + status are shared, even with access
    expect(view.bio).toBe('');
    expect(view.skillTags).toEqual([]);
  });

  it('updates profile fields', () => {
    const pm = new ProfileManager();
    pm.setProfile(BASE_PROFILE);
    pm.updateProfile({ displayName: 'Cody v2', status: 'busy' });
    const profile = pm.getProfile();
    expect(profile.displayName).toBe('Cody v2');
    expect(profile.status).toBe('busy');
    expect(profile.bio).toBe('A coding lobster'); // unchanged
  });

  it('changes partition', () => {
    const pm = new ProfileManager();
    pm.setProfile(BASE_PROFILE);
    pm.setPartition('protected');
    expect(pm.getProfile().partition).toBe('protected');
  });

  it('throws when getting profile before setting', () => {
    const pm = new ProfileManager();
    expect(() => pm.getProfile()).toThrow('Profile not initialized');
  });
});
