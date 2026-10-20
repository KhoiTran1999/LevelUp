import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(new URL('./resolver-hooks.mjs', import.meta.url), pathToFileURL('./'));
