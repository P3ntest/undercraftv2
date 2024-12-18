import * as PIXI from "pixi.js";
import Matter, { Engine, Composite, Bodies, Runner, Render } from "matter-js";
import { Ticker } from "./Ticker";
import { Player } from "./player";

export const CHUNK_SIZE = 10;
export const BLOCK_SIZE = 20;

export class World {
  private chunks: Chunk[][] = [];
  private worldContainer = new PIXI.Container();
  private entities: Entity[] = [];
  private player: Player | null = null;

  matterEngine = Engine.create();

  ticker = new Ticker((delta) => {
    this.tick(delta);
  });

  tick(delta: number) {
    for (const entity of this.entities) {
      entity.onUpdate();
    }

    for (const entity of this.entities) {
      entity._syncTransformToPhysics();
    }

    Engine.update(this.matterEngine, delta);
    for (const entity of this.entities) {
      entity._syncPhysicsToTransform();
    }

    if (this.player) {
      // move world to center on player
      this.worldContainer.x = -this.player.transform.x + window.innerWidth / 4;
      this.worldContainer.y = -this.player.transform.y + window.innerHeight / 4;
    }
  }

  constructor() {
    const sky = new PIXI.Graphics();
    sky.beginFill(0x00ffff);
    const skySize = 1000000;
    sky.drawRect(-skySize, -skySize, 2 * skySize, 2 * skySize);
    this.worldContainer.addChild(sky);

    this.worldContainer.interactive = true;
    this.worldContainer.eventMode = "static";

    this.worldContainer.on("pointerdown", (event) => {
      const pos = event.getLocalPosition(this.worldContainer);
      if (event.altKey) {
        this.spawnEntityAt(pos.x, pos.y);
        return;
      }

      const x = Math.floor((pos.x + BLOCK_SIZE / 2) / BLOCK_SIZE);
      const y = Math.floor((pos.y + BLOCK_SIZE / 2) / BLOCK_SIZE);

      if (this.getBlockAt(x, y)) {
        this.setBlockAt(x, y, null);
      } else this.setBlockAt(x, y, "dirt");
      this.render();
    });

    // Runner.run(this.matterRunner, this.matterEngine);

    this.ticker.start();

    const renderer = Render.create({
      element: document.body,
      engine: this.matterEngine,
    });

    Render.run(renderer);
  }

  spawnEntity(entity: Entity) {
    entity.renderPhysics();
    const sprite = entity.render();
    this.worldContainer.addChild(sprite);
    this.entities.push(entity);
    entity.onSpawn();
  }

  setPlayer(player: Player) {
    this.player = player;
    this.spawnEntity(player);
  }

  spawnEntityAt(x: number, y: number) {
    const entity = new Entity(this);
    entity.transform.x = x;
    entity.transform.y = y;
    this.spawnEntity(entity);
  }

  render() {
    for (const chunkRow of this.chunks) {
      if (!chunkRow) {
        continue;
      }
      for (const chunk of chunkRow) {
        if (!chunk) {
          continue;
        }
        chunk.render();
      }
    }
    return this.worldContainer;
  }

  setBlockAt(x: number, y: number, type: BlockType | null) {
    const chunk = this.getChunkAt(x, y);
    const blockX = x % CHUNK_SIZE;
    const blockY = y % CHUNK_SIZE;
    chunk.setBlockAt(blockX, blockY, type);
  }

  getChunkAt(x: number, y: number) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    return this.getChunk(chunkX, chunkY);
  }

  getChunk(x: number, y: number) {
    if (!this.chunks[x]) {
      this.chunks[x] = [];
    }
    if (!this.chunks[x][y]) {
      this.createChunk(x, y);
    }
    return this.chunks[x][y];
  }

  private createChunk(x: number, y: number) {
    const chunk = new Chunk(this, x, y);
    this.chunks[x][y] = chunk;
    this.worldContainer.addChild(chunk.render());
  }

  getBlockAt(x: number, y: number) {
    const chunkX = Math.floor(x / CHUNK_SIZE);
    const chunkY = Math.floor(y / CHUNK_SIZE);
    const chunk = this.getChunk(chunkX, chunkY);
    const blockX = x % CHUNK_SIZE;
    const blockY = y % CHUNK_SIZE;
    return chunk.getBlockAt(blockX, blockY);
  }
}

type BatchMask = boolean[][];

class Batch {
  //   mask: BatchMask;
  renderInstance?: PIXI.Container;
  //   color: number;

  constructor(
    public chunk: Chunk,
    public mask: BatchMask,
    public color: number
  ) {
    // this.mask = mask;
    // this.color = color;
  }

  matterBodies: Matter.Body[] = [];

  onUmount() {
    Composite.remove(this.chunk.world.matterEngine.world, this.matterBodies);
  }

  renderPhysics() {
    Composite.remove(this.chunk.world.matterEngine.world, this.matterBodies);

    this.matterBodies = [];

    const chunkOffset = {
      x: this.chunk.x * CHUNK_SIZE * BLOCK_SIZE,
      y: this.chunk.y * CHUNK_SIZE * BLOCK_SIZE,
    };

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        if (!this.mask[x][y]) {
          continue;
        }
        const body = Bodies.rectangle(
          chunkOffset.x + x * BLOCK_SIZE,
          chunkOffset.y + y * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE,
          {
            isStatic: true,
          }
        );
        this.matterBodies.push(body);
      }
    }

    // const body = Bodies.fromVertices(chunkOffset.x, chunkOffset.y, [points], {
    //   isStatic: true,
    // });

    // this.matterBodies.push(body);

    Composite.add(this.chunk.world.matterEngine.world, this.matterBodies);
    console.log("rendering physics");
  }
}
class Chunk {
  constructor(public world: World, public x: number, public y: number) {
    this.blocks = new Array(CHUNK_SIZE)
      .fill(null)
      .map(() => new Array(CHUNK_SIZE).fill(null));

    this.renderInstance = new PIXI.Container();
    this.renderInstance.x = x * CHUNK_SIZE * BLOCK_SIZE;
    this.renderInstance.y = y * CHUNK_SIZE * BLOCK_SIZE;
    // const chunkBorders = new PIXI.Graphics();
    // chunkBorders.lineStyle(1, 0x000000);
    // // chunkBorders.beginFill(0x000000);

    // chunkBorders.drawRect(
    //   0 - BLOCK_SIZE / 2,
    //   0 - BLOCK_SIZE / 2,
    //   CHUNK_SIZE * BLOCK_SIZE,
    //   CHUNK_SIZE * BLOCK_SIZE
    // );
    // this.renderInstance.addChild(chunkBorders);
  }

  private blocks: (Block | null)[][];

  private batches: Batch[] = [];
  private recalculateBatches = false;

  private renderInstance: PIXI.Container;
  private batchContainer: PIXI.Container | null = null;

  render() {
    console.log(this.blocks);
    this.calculateBatches();
    if (this.batchContainer) {
      this.renderInstance.removeChild(this.batchContainer);
      this.batchContainer.destroy();
    }
    this.batchContainer = new PIXI.Container();
    for (const batch of this.batches) {
      const batchContainer = new PIXI.Container();
      batch.renderInstance = batchContainer;
      for (let x = 0; x < CHUNK_SIZE; x++) {
        for (let y = 0; y < CHUNK_SIZE; y++) {
          if (batch.mask[x][y]) {
            const sprite = new PIXI.Graphics();
            sprite.beginFill(batch.color);
            sprite.drawRect(
              -BLOCK_SIZE / 2,
              -BLOCK_SIZE / 2,
              BLOCK_SIZE,
              BLOCK_SIZE
            );
            sprite.x = x * BLOCK_SIZE;
            sprite.y = y * BLOCK_SIZE;
            // sprite.pivot.x = BLOCK_SIZE / 2;
            // sprite.pivot.y = BLOCK_SIZE / 2;
            batchContainer.addChild(sprite);
          }
        }
      }
      this.batchContainer.addChild(batchContainer);
    }

    this.renderInstance.addChild(this.batchContainer);

    return this.renderInstance;
  }

  setBlockAt(x: number, y: number, type: BlockType | null) {
    const block = type !== null ? new Block(this, type) : null;
    this.blocks[x][y] = block;
    console.log("setting block", x, y, type);
    console.log(this.blocks);
    this.recalculateBatches = true;
  }

  calculateBatches() {
    if (!this.recalculateBatches) {
      return;
    }
    this.recalculateBatches = false;
    // batches all blocks that are connected to each other
    // for (const batch of this.batches) {
    //   batch.onUmount();
    // }
    // this.batches = [];

    let masks: BatchMask[] = [];

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_SIZE; y++) {
        const block = this.getBlockAt(x, y);
        if (!block) {
          continue;
        }
        const neighboringPositions = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ].filter(([x, y]) => {
          return x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE;
        });
        const connectedMasks = masks.filter((mask) => {
          return neighboringPositions.some(([x, y]) => mask[x][y]);
        });
        if (connectedMasks.length === 0) {
          const mask = createEmptyBatchMask();
          mask[x][y] = true;
          masks.push(mask);
        } else if (connectedMasks.length === 1) {
          connectedMasks[0][x][y] = true;
        } else {
          const mergedBatch = mergeMasks(connectedMasks);
          mergedBatch[x][y] = true;
          masks = masks.filter((mask) => {
            return !connectedMasks.includes(mask);
          });
          masks.push(mergedBatch);
        }
      }
    }

    this.batches = this.batches.filter((batch) => {
      if (masks.some((mask) => compareMasks(mask, batch.mask))) {
        return true;
      } else {
        batch.onUmount();
        return false;
      }
    });

    const changedBatches: Batch[] = [];

    for (const mask of masks) {
      if (this.batches.some((batch) => compareMasks(mask, batch.mask))) {
        continue;
      }
      const color = Math.floor(Math.random() * 0xffffff);
      const batch = new Batch(this, mask, color);
      changedBatches.push(batch);
      this.batches.push(batch);
    }

    changedBatches.forEach((batch) => {
      batch.renderPhysics();
    });
  }

  getBlockAt(x: number, y: number): Block | null {
    return this.blocks[x][y];
  }
}

type BlockType = string;

class Block {
  constructor(private chunk: Chunk, private type: BlockType) {}
}
function createEmptyBatchMask(): BatchMask {
  return new Array(CHUNK_SIZE)
    .fill(false)
    .map(() => new Array(CHUNK_SIZE).fill(false));
}

function mergeMasks(masks: BatchMask[]): BatchMask {
  const result = createEmptyBatchMask();
  masks.forEach((mask) => {
    mask.forEach((row, x) => {
      row.forEach((value, y) => {
        result[x][y] = result[x][y] || value;
      });
    });
  });
  return result;
}

function compareMasks(a: BatchMask, b: BatchMask): boolean {
  return a.every((row, x) => {
    return row.every((value, y) => {
      return value === b[x][y];
    });
  });
}

class Transform {
  x = 0;
  y = 0;
  rotation = 0;
}

export class Entity {
  sprite = new PIXI.Container();

  transform = new Transform();

  constructor(public world: World) {}

  onSpawn() {}
  onUpdate() {}

  render() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xff0000);
    graphics.drawRect(0, 0, BLOCK_SIZE * 2, BLOCK_SIZE * 2);
    graphics.pivot.x = BLOCK_SIZE;
    graphics.pivot.y = BLOCK_SIZE;
    this.sprite.addChild(graphics);
    return this.sprite;
  }

  _syncTransformToPhysics() {
    // this.physicsBody!.position.x = this.transform.x;
    // this.physicsBody!.position.y = this.transform.y;
    // this.physicsBody!.angle = this.transform.rotation;

    Matter.Body.setPosition(this.physicsBody!, {
      x: this.transform.x,
      y: this.transform.y,
    });
    console.log(this.transform.x);
    Matter.Body.setAngle(this.physicsBody!, this.transform.rotation);
  }

  _syncPhysicsToTransform() {
    this.transform.x = this.physicsBody!.position.x;
    this.transform.y = this.physicsBody!.position.y;
    this.transform.rotation = this.physicsBody!.angle;

    this.sprite.x = this.transform.x;
    this.sprite.y = this.transform.y;
    this.sprite.rotation = this.transform.rotation;
  }

  physicsBody!: Matter.Body;
  renderPhysics() {
    const body = Bodies.rectangle(
      this.transform.x,
      this.transform.y,
      BLOCK_SIZE * 2,
      BLOCK_SIZE * 2,
      {
        isStatic: false,
      }
    );

    this.physicsBody = body;
    Composite.add(this.world.matterEngine.world, [body]);
    console.log("rendering physics for entity");
  }
}
