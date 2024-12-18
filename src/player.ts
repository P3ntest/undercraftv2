import { BLOCK_SIZE, Entity } from "./chunks";
import * as PIXI from "pixi.js";
import Matter, { Engine, Composite, Bodies, Runner, Render } from "matter-js";

export class Player extends Entity {
  render() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xff990f);
    graphics.drawRect(0, 0, BLOCK_SIZE, BLOCK_SIZE * 2);
    graphics.pivot.x = BLOCK_SIZE / 2;
    graphics.pivot.y = BLOCK_SIZE;
    this.sprite.addChild(graphics);
    return this.sprite;
  }

  renderPhysics() {
    const body = Bodies.rectangle(
      this.transform.x,
      this.transform.y,
      BLOCK_SIZE,
      BLOCK_SIZE * 2,
      {
        isStatic: false,
      }
    );

    this.physicsBody = body;
    Composite.add(this.world.matterEngine.world, [body]);
    console.log("rendering physics for entity");
  }

  keys: { [key: string]: boolean } = {};
  newKeys: { [key: string]: boolean } = {};
  onSpawn(): void {
    // keyboard controls

    window.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;
      this.newKeys[e.key] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;
    });
  }

  onUpdate(): void {
    Matter.Body.setInertia(this.physicsBody, Infinity);
    const moveSpeed = 3;
    let movement = 0;
    if (this.keys["a"]) {
      movement -= moveSpeed;
    }
    if (this.keys["d"]) {
      movement += moveSpeed;
    }

    if (this.keys["w"] && this.physicsBody.velocity.y === 0) {
      Matter.Body.applyForce(this.physicsBody, this.physicsBody.position, {
        x: 0,
        y: -0.05,
      });
    }

    Matter.Body.setVelocity(this.physicsBody, {
      x: movement * moveSpeed,
      y: Matter.Body.getVelocity(this.physicsBody).y,
    });

    this.newKeys = {};
  }
}
