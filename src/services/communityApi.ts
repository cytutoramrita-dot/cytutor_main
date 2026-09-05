/**
 * communityApi.ts
 *
 * All API calls related to the Community feature.
 * Import this wherever you need to talk to /api/communities.
 *
 * The `api` instance (from services/api.ts) already attaches the JWT
 * automatically via the Axios request interceptor.
 */

import api from './api';
import type { Community, CommunityMember, CommunityJoinRequest } from '../types';

export type { Community, CommunityMember, CommunityJoinRequest as JoinRequest };

// ── API calls ──────────────────────────────────────────────────────────────

/** Fetch all communities (sorted by avg_score desc) */
export const getAllCommunities = async (): Promise<Community[]> => {
  const res = await api.get('/communities');
  return res.data.communities;
};

/** Total pending join requests across every community the caller leads (navbar badge) */
export const getMyPendingRequestCount = async (): Promise<number> => {
  const res = await api.get('/communities/leading/pending-count');
  return res.data.count;
};

/** Get one community with its ranked member list */
export const getCommunityDetail = async (
  id: string
): Promise<{ community: Community; members: CommunityMember[]; my_status: string | null }> => {
  const res = await api.get(`/communities/${id}`);
  return res.data;
};

/** Create a new community; caller becomes the leader */
export const createCommunity = async (data: {
  name: string;
  description?: string;
  is_public?: boolean;
  max_members?: number;
}): Promise<{ community: Community }> => {
  const res = await api.post('/communities', data);
  return res.data;
};

/** Send a join request to a community */
export const joinCommunity = async (communityId: string): Promise<{ message: string }> => {
  const res = await api.post(`/communities/${communityId}/join`);
  return res.data;
};

/** Leader only: get all pending join requests */
export const getPendingRequests = async (communityId: string): Promise<CommunityJoinRequest[]> => {
  const res = await api.get(`/communities/${communityId}/requests`);
  return res.data.requests;
};

/** Leader only: approve or reject a specific join request */
export const respondToRequest = async (
  communityId: string,
  userId: string,
  action: 'approve' | 'reject'
): Promise<{ message: string }> => {
  const res = await api.patch(`/communities/${communityId}/requests/${userId}`, { action });
  return res.data;
};

/** Leader only: transfer leadership to another approved member */
export const transferLeadership = async (
  communityId: string,
  newLeaderId: string
): Promise<{ message: string }> => {
  const res = await api.patch(`/communities/${communityId}/transfer-leadership`, {
    new_leader_id: newLeaderId,
  });
  return res.data;
};

/** Leader only: delete the community */
export const deleteCommunity = async (communityId: string): Promise<{ message: string }> => {
  const res = await api.delete(`/communities/${communityId}`);
  return res.data;
};

/** Leader only: remove a member from the community */
export const removeMember = async (
  communityId: string,
  userId: string
): Promise<{ message: string }> => {
  const res = await api.delete(`/communities/${communityId}/members/${userId}`);
  return res.data;
};

/** Leave a community (leader must transfer first) */
export const leaveCommunity = async (communityId: string): Promise<{ message: string }> => {
  const res = await api.delete(`/communities/${communityId}/leave`);
  return res.data;
};
