import { getDb } from '../db/mongo';
import { CorporationModel } from './Corporation';
import { ShareholderModel } from './Shareholder';
import { UserModel } from './User';

export interface BoardAppointment {
  corporation_id: number;
  user_id: number;
  appointed_at: Date;
  appointed_by_proposal_id?: number;
}

export interface BoardMember {
  user_id: number;
  shares: number;
  username: string;
  player_name?: string;
  profile_id: number;
  profile_slug?: string;
  profile_image_url?: string | null;
  is_ceo: boolean;
  is_acting_ceo: boolean;
  is_appointed?: boolean;
}

export interface VoterDetails {
  aye: BoardMember[];
  nay: BoardMember[];
  abstained: BoardMember[];
}

export class BoardModel {
  static async getBoardMembers(corporationId: number): Promise<BoardMember[]> {
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) return [];

    const boardSize = corp.board_size || 5;
    const members: Map<number, BoardMember> = new Map();

    // 1. CEO is always a board member
    if (corp.ceo_id) {
      const ceoUser = await UserModel.findById(corp.ceo_id);
      if (ceoUser) {
        // Get CEO shares
        const shareholder = await ShareholderModel.getShareholder(corporationId, corp.ceo_id);
        members.set(corp.ceo_id, {
          user_id: corp.ceo_id,
          shares: shareholder?.shares || 0,
          username: ceoUser.username,
          player_name: ceoUser.player_name,
          profile_id: ceoUser.profile_id,
          profile_slug: ceoUser.profile_slug,
          profile_image_url: ceoUser.profile_image_url,
          is_ceo: true,
          is_acting_ceo: corp.elected_ceo_id !== corp.ceo_id
        });
      }
    }

    // 2. Appointed members
    const appointments = await getDb().collection('board_appointments')
      .find({ corporation_id: corporationId })
      .toArray();
    
    for (const appt of appointments) {
      if (!members.has(appt.user_id)) {
        const user = await UserModel.findById(appt.user_id);
        if (user) {
          const shareholder = await ShareholderModel.getShareholder(corporationId, appt.user_id);
          members.set(appt.user_id, {
            user_id: appt.user_id,
            shares: shareholder?.shares || 0,
            username: user.username,
            player_name: user.player_name,
            profile_id: user.profile_id,
            profile_slug: user.profile_slug,
            profile_image_url: user.profile_image_url,
            is_ceo: false,
            is_acting_ceo: false,
            is_appointed: true
          });
        }
      }
    }

    // 3. Top shareholders fill remaining spots
    const remainingSpots = Math.max(0, boardSize - members.size);
    if (remainingSpots > 0) {
      const shareholders = await ShareholderModel.findByCorporationId(corporationId);
      // Filter out existing members
      const candidates = shareholders.filter(s => !members.has(s.user_id));
      // Sort by shares desc
      candidates.sort((a, b) => b.shares - a.shares);
      
      const topShareholders = candidates.slice(0, remainingSpots);
      
      for (const sh of topShareholders) {
        const user = await UserModel.findById(sh.user_id);
        if (user) {
          members.set(sh.user_id, {
            user_id: sh.user_id,
            shares: sh.shares,
            username: user.username,
            player_name: user.player_name,
            profile_id: user.profile_id,
            profile_slug: user.profile_slug,
            profile_image_url: user.profile_image_url,
            is_ceo: false,
            is_acting_ceo: false
          });
        }
      }
    }

    return Array.from(members.values()).sort((a, b) => {
        if (a.is_ceo) return -1;
        if (b.is_ceo) return 1;
        return b.shares - a.shares;
    });
  }

  static async isOnBoard(corporationId: number, userId: number): Promise<boolean> {
    const members = await this.getBoardMembers(corporationId);
    return members.some(m => m.user_id === userId);
  }
}
