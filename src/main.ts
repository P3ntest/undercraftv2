import * as PIXI from "pixi.js";
import { World } from "./chunks";

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

world.render();

console.log(app.stage.children);
