import Phaser from 'phaser';
import Start from './src/Start.js';

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#1a0f2a',
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    scene: [Start]
});

console.info(`DraGo ${__VERSION__} (${__BUILD__})`);
