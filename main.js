import Phaser from 'phaser';
import Hoehle from './src/Hoehle.js';

new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'app',
    backgroundColor: '#1a0f2a',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
    scene: [Hoehle]
});

console.info(`DraGo ${__VERSION__} (${__BUILD__})`);
