import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
export const newLinkCode = () => randomBytes(16).toString('hex'); // 32 hex
export const hashCode = (code: string) => createHash('sha256').update(code).digest('hex');
