import * as PIXI from "pixi.js";
import { World } from "./chunks";
import { Player } from "./player";

PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;

const app = new PIXI.Application({
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: 0,
  resolution: window.devicePixelRatio || 1,
});

document.body.appendChild(app.view as HTMLCanvasElement);

const world = new World();

app.stage.addChild(world.render());

for (let i = 0; i < 100; i++) {
  world.setBlockAt(i, 10, "penis block");
}
world.render();
const player = new Player(world);
world.setPlayer(player);

console.log(app.stage.children);
