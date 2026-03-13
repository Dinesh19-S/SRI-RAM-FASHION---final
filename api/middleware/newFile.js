import { JWT_SECRET } from './auth';

if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
}
