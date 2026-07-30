// Lets node scripts import the app's .jsx data modules (shapes.jsx).
// Usage: node --import ./scripts/register-jsx.mjs <script>
import { register } from 'node:module';

register('./jsx-loader.mjs', import.meta.url);
