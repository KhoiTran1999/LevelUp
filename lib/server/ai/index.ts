/**
 * LevelUp AI Modular Engine
 * Re-exports all core AI components, schemas, tools, and request handlers.
 */

export * from './types';
export * from './client';
export * from './appraisal';
export * from './tools';
export * from './assistant';
export * from './suggestions';
export * from './service';
export { uploadProofImage } from '../storage';

import { handleAiRequest } from './service';
export default handleAiRequest;
