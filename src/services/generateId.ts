
import { customAlphabet } from 'nanoid';

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';

export const generateId = customAlphabet(ALPHABET, 12);

