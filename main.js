import StartSzene from './src/start/StartSzene.js';
import { baueStartUi } from './src/start/startUi.js';

const leinwand = document.getElementById('welt');
baueStartUi(new StartSzene(leinwand), leinwand);

console.info(`DraGo ${__VERSION__} (${__BUILD__})`);
