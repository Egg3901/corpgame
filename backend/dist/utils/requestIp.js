"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientIp = void 0;
const BannedIp_1 = require("../models/BannedIp");
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = Array.isArray(forwarded)
        ? forwarded[0]
        : typeof forwarded === 'string'
            ? forwarded.split(',')[0]
            : req.socket.remoteAddress || req.ip || '';
    return BannedIp_1.BannedIpModel.normalize(ip);
};
exports.getClientIp = getClientIp;
