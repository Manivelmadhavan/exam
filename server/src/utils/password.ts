import bcrypt from 'bcryptjs';
export const hashPassword = (plain: string) => bcrypt.hash(plain, 10);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);
// Used to keep login timing similar when the account does not exist.
export const DUMMY_HASH = bcrypt.hashSync('dummy-password', 10);
