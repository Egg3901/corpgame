import { Request } from 'express';
import { BannedIpModel } from '../models/BannedIp';

export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded)
    ? forwarded[0]
    : typeof forwarded === 'string'
      ? forwarded.split(',')[0]
      : req.socket.remoteAddress || req.ip || '';
  return BannedIpModel.normalize(ip);
};
