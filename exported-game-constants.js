export const ATTACK = "attack";
export const ATTACK_POWER = 30;
export const BODYPART_COST = { move: 50, work: 100, attack: 80, carry: 50, heal: 250, ranged_attack: 150, tough: 10 };
export const BODYPART_HITS = 100;
export const BOTTOM = 5;
export const BOTTOM_LEFT = 6;
export const BOTTOM_RIGHT = 4;
export class BodyPart extends RoomObject {
  get type() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].bodyPartType;
  }

  get ticksToDecay() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].decayTime - SystemStore.time;
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      type: this.type
    });
  }
}
export const CARRY = "carry";
export const CARRY_CAPACITY = 50;
export const CREEP_SPAWN_TIME = 3;
export class CostMatrix {
  constructor() {
    this._bits = new Uint8Array(SystemStore.arenaSize * SystemStore.arenaSize);
  }

  set(xx, yy, val) {
    xx = xx | 0;
    yy = yy | 0;
    this._bits[xx * SystemStore.arenaSize + yy] = Math.min(Math.max(0, val), 255);
  }

  get(xx, yy) {
    xx = xx | 0;
    yy = yy | 0;
    return this._bits[xx * SystemStore.arenaSize + yy];
  }

  clone() {
    let newMatrix = new CostMatrix();
    newMatrix._bits = new Uint8Array(this._bits);
    return newMatrix;
  }

  serialize() {
    return Array.prototype.slice.apply(new Uint32Array(this._bits.buffer));
  }

  static deserialize(data) {
    let instance = Object.create(CostMatrix.prototype);
    instance._bits = new Uint8Array(new Uint32Array(data).buffer);
    return instance;
  }
}
export class Creep extends RoomObject {
  get hits() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].hits;
  }

  get hitsMax() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].hitsMax;
  }

  get my() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].user === SystemStore.playerName;
  }

  get fatigue() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].fatigue;
  }

  get body() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].body;
  }

  get store() {
    return new Store(SystemStore.roomObjectsData[this.id]);
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      hits: this.hits,
      hitsMax: this.hitsMax,
      my: this.my,
      fatigue: this.fatigue,
      body: this.body
    });
  }

  move(direction) {
    if (!this.exists) {
      return;
    }
    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }
    Intents.set(this.id, "move", { direction });
    return C.OK;
  }

  moveTo(x, y, opts) {
    if (typeof x === "object") {
      opts = y;
      y = x.y;
      x = x.x;
    }
    const path = this.findPathTo({ x, y }, opts);
    if (path.length > 0) {
      let direction = getDirection(path[0].x - this.x, path[0].y - this.y);
      return this.move(direction);
    }
  }

  rangedAttack(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof RoomObject)) {
      return C.ERR_INVALID_TARGET;
    }

    if (!this.body.some(p => p.type === C.RANGED_ATTACK && p.hits > 0)) {
      return C.ERR_NO_BODYPART;
    }

    if (getDistance(this, target) > 3) {
      return C.ERR_NOT_IN_RANGE;
    }

    Intents.set(this.id, "rangedAttack", { id: target.id });
    return C.OK;
  }

  rangedMassAttack() {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!this.body.some(p => p.type === C.RANGED_ATTACK && p.hits > 0)) {
      return C.ERR_NO_BODYPART;
    }

    Intents.set(this.id, "rangedMassAttack", {});
    return C.OK;
  }

  attack(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof RoomObject)) {
      return C.ERR_INVALID_TARGET;
    }

    if (!this.body.some(p => p.type === C.ATTACK && p.hits > 0)) {
      return C.ERR_NO_BODYPART;
    }

    if (getDistance(this, target) > 1) {
      return C.ERR_NOT_IN_RANGE;
    }

    Intents.set(this.id, "attack", { id: target.id });
    return C.OK;
  }

  heal(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof RoomObject)) {
      return C.ERR_INVALID_TARGET;
    }

    if (!this.body.some(p => p.type === C.HEAL && p.hits > 0)) {
      return C.ERR_NO_BODYPART;
    }

    if (getDistance(this, target) > 1) {
      return C.ERR_NOT_IN_RANGE;
    }

    Intents.set(this.id, "heal", { id: target.id });
    return C.OK;
  }

  rangedHeal(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof RoomObject)) {
      return C.ERR_INVALID_TARGET;
    }

    if (!this.body.some(p => p.type === C.HEAL && p.hits > 0)) {
      return C.ERR_NO_BODYPART;
    }

    if (getDistance(this, target) > 3) {
      return C.ERR_NOT_IN_RANGE;
    }

    Intents.set(this.id, "rangedHeal", { id: target.id });
    return C.OK;
  }

  pull(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof Creep)) {
      return C.ERR_INVALID_TARGET;
    }

    Intents.set(this.id, "pull", { id: target.id });
    return C.OK;
  }

  withdraw(target, resourceType, amount) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }
    if (this.spawning) {
      return C.ERR_BUSY;
    }
    if (amount < 0) {
      return C.ERR_INVALID_ARGS;
    }
    if (!C.RESOURCES_ALL.includes(resourceType)) {
      return C.ERR_INVALID_ARGS;
    }

    if (!target || !target.id || !SystemStore.roomObjectsData[target.id].store || !(target instanceof Structure)) {
      return C.ERR_INVALID_TARGET;
    }

    if (
      !capacityForResource(SystemStore.roomObjectsData[target.id], resourceType) &&
      !SystemStore.roomObjectsData[target.id].store[resourceType]
    ) {
      return C.ERR_INVALID_TARGET;
    }

    if (this.getDistanceTo(target) > 1) {
      return C.ERR_NOT_IN_RANGE;
    }

    const emptySpace =
      SystemStore.roomObjectsData[this.id].storeCapacity - sumObjectValues(SystemStore.roomObjectsData[this.id].store);

    if (emptySpace <= 0) {
      return C.ERR_FULL;
    }

    if (!amount) {
      amount = Math.min(emptySpace, SystemStore.roomObjectsData[target.id].store[resourceType]);
    }

    if (amount > emptySpace) {
      return C.ERR_FULL;
    }

    if (!amount || (SystemStore.roomObjectsData[target.id].store[resourceType] || 0) < amount) {
      return C.ERR_NOT_ENOUGH_RESOURCES;
    }

    Intents.set(this.id, "withdraw", { id: target.id, amount, resourceType });
    return C.OK;
  }

  transfer(target, resourceType, amount) {
    if (!this.exists) {
      return;
    }
    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }
    if (this.spawning) {
      return C.ERR_BUSY;
    }
    if (amount < 0) {
      return C.ERR_INVALID_ARGS;
    }
    if (!C.RESOURCES_ALL.includes(resourceType)) {
      return C.ERR_INVALID_ARGS;
    }
    if (
      !target ||
      !target.id ||
      !SystemStore.roomObjectsData[target.id].store ||
      (target instanceof Creep && target.spawning) ||
      (!(target instanceof Structure) && !(target instanceof Creep))
    ) {
      return C.ERR_INVALID_TARGET;
    }

    if (!capacityForResource(SystemStore.roomObjectsData[target.id], resourceType)) {
      return C.ERR_INVALID_TARGET;
    }

    if (this.getDistanceTo(target) > 1) {
      return C.ERR_NOT_IN_RANGE;
    }
    if (!SystemStore.roomObjectsData[this.id].store || !SystemStore.roomObjectsData[this.id].store[resourceType]) {
      return C.ERR_NOT_ENOUGH_RESOURCES;
    }

    const storedAmount = SystemStore.roomObjectsData[target.id].storeCapacityResource
      ? SystemStore.roomObjectsData[target.id].store[resourceType] || 0
      : sumObjectValues(SystemStore.roomObjectsData[target.id].store);
    const targetCapacity = capacityForResource(SystemStore.roomObjectsData[target.id], resourceType);

    if (!SystemStore.roomObjectsData[target.id].store || storedAmount >= targetCapacity) {
      return C.ERR_FULL;
    }

    if (!amount) {
      amount = Math.min(SystemStore.roomObjectsData[this.id].store[resourceType], targetCapacity - storedAmount);
    }

    if (SystemStore.roomObjectsData[this.id].store[resourceType] < amount) {
      return C.ERR_NOT_ENOUGH_RESOURCES;
    }

    if (amount + storedAmount > targetCapacity) {
      return C.ERR_FULL;
    }

    Intents.set(this.id, "transfer", { id: target.id, amount, resourceType });
    return C.OK;
  }

  harvest(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }
    if (this.spawning) {
      return C.ERR_BUSY;
    }
    if (!this.body.some(p => p.type === C.WORK && p.hits > 0)) {
      return C.ERR_NO_BODYPART;
    }
    if (!target || !target.id || !(target instanceof Source)) {
      return C.ERR_INVALID_TARGET;
    }

    if (!target.energy) {
      return C.ERR_NOT_ENOUGH_RESOURCES;
    }
    if (this.getDistanceTo(target) > 1) {
      return C.ERR_NOT_IN_RANGE;
    }

    Intents.set(this.id, "harvest", { id: target.id });
    return C.OK;
  }

  drop(resourceType, amount) {
    if (!this.exists) {
      return;
    }
    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }
    if (this.spawning) {
      return C.ERR_BUSY;
    }
    if (!C.RESOURCES_ALL.includes(resourceType)) {
      return C.ERR_INVALID_ARGS;
    }
    if (!SystemStore.roomObjectsData[this.id].store || !SystemStore.roomObjectsData[this.id].store[resourceType]) {
      return C.ERR_NOT_ENOUGH_RESOURCES;
    }
    if (!amount) {
      amount = SystemStore.roomObjectsData[this.id].store[resourceType];
    }
    if (SystemStore.roomObjectsData[this.id].store[resourceType] < amount) {
      return C.ERR_NOT_ENOUGH_RESOURCES;
    }

    Intents.set(this.id, "drop", { amount, resourceType });
    return C.OK;
  }

  pickup(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }
    if (this.spawning) {
      return C.ERR_BUSY;
    }
    if (!target || !target.id || !(target instanceof Resource)) {
      return C.ERR_INVALID_TARGET;
    }
    if (
      sumObjectValues(SystemStore.roomObjectsData[this.id].store) >= SystemStore.roomObjectsData[this.id].storeCapacity
    ) {
      return C.ERR_FULL;
    }
    if (this.getDistanceTo(target) > 1) {
      return C.ERR_NOT_IN_RANGE;
    }

    Intents.set(this.id, "pickup", { id: target.id });
    return C.OK;
  }
}
export const DISMANTLE_COST = 0.005;
export const DISMANTLE_POWER = 50;
export const ERR_BUSY = -4;
export const ERR_FULL = -8;
export const ERR_INVALID_ARGS = -10;
export const ERR_INVALID_TARGET = -7;
export const ERR_NAME_EXISTS = -3;
export const ERR_NOT_ENOUGH_ENERGY = -6;
export const ERR_NOT_ENOUGH_EXTENSIONS = -6;
export const ERR_NOT_ENOUGH_RESOURCES = -6;
export const ERR_NOT_FOUND = -5;
export const ERR_NOT_IN_RANGE = -9;
export const ERR_NOT_OWNER = -1;
export const ERR_NO_BODYPART = -12;
export const ERR_NO_PATH = -2;
export const ERR_TIRED = -11;
export class Flag extends RoomObject {
  get my() {
    if (!this.exists) {
      return;
    }
    if (SystemStore.roomObjectsData[this.id].user) {
      return SystemStore.roomObjectsData[this.id].user === SystemStore.playerName;
    }
    return undefined;
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      my: this.my
    });
  }
}
export const HARVEST_POWER = 2;
export const HEAL = "heal";
export const HEAL_POWER = 12;
export const LEFT = 7;
export const MAX_CREEP_SIZE = 50;
export const MOVE = "move";
export const OBSTACLE_OBJECT_TYPES = ["creep", "tower", "constructedWall", "spawn"];
export const OK = 0;
export class OwnedStructure extends Structure {
  get my() {
    if (!this.exists) {
      return;
    }
    if (SystemStore.roomObjectsData[this.id].user) {
      return SystemStore.roomObjectsData[this.id].user === SystemStore.playerName;
    }
    return undefined;
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      my: this.my
    });
  }
}
export const RANGED_ATTACK = "ranged_attack";
export const RANGED_ATTACK_DISTANCE_RATE = { 0: 1, 1: 1, 2: 0.4, 3: 0.1 };
export const RANGED_ATTACK_POWER = 10;
export const RANGED_HEAL_POWER = 4;
export const REPAIR_COST = 0.01;
export const REPAIR_POWER = 100;
export const RESOURCES_ALL = ["energy"];
export const RESOURCE_DECAY = 1000;
export const RESOURCE_ENERGY = "energy";
export const RIGHT = 3;
export const ROAD_WEAROUT = 1;
export class Resource extends RoomObject {
  get amount() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id][SystemStore.roomObjectsData[this.id].resourceType];
  }
  get resourceType() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].resourceType;
  }
  toJSON() {
    return Object.assign(super.toJSON(), {
      amount: this.amount,
      resourceType: this.resourceType
    });
  }
}
export class RoomObject {
  constructor(id) {
    if (id) {
      Object.defineProperty(this, "id", {
        configurable: false,
        enumerable: true,
        value: id
      });
    }
  }

  get exists() {
    return !!this.id && !!SystemStore.roomObjectsData[this.id];
  }

  get x() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].x;
  }

  get y() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].y;
  }

  findPathTo(pos, opts) {
    return utils.findPath(this, pos, opts);
  }

  findInRange(positions, range) {
    return utils.findInRange(this, positions, range);
  }

  findClosestByRange(positions) {
    return utils.findClosestByRange(this, positions);
  }

  findClosestByPath(positions, opts) {
    return utils.findClosestByPath(this, positions, opts);
  }

  getRangeTo(pos) {
    return utils.getRange(this, pos);
  }

  toJSON() {
    return {
      id: this.id,
      x: this.x,
      y: this.y
    };
  }
}
export const SOURCE_ENERGY_REGEN = 10;
export class Source extends RoomObject {
  get energy() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].energy;
  }
  get energyCapacity() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].energyCapacity;
  }
  toJSON() {
    return Object.assign(super.toJSON(), {
      energy: this.energy,
      energyCapacity: this.energyCapacity
    });
  }
}
export class Structure extends RoomObject {
  get hits() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].hits;
  }

  get hitsMax() {
    if (!this.exists) {
      return;
    }
    return SystemStore.roomObjectsData[this.id].hitsMax;
  }

  toJSON() {
    return Object.assign(super.toJSON(), {
      hits: this.hits,
      hitsMax: this.hitsMax
    });
  }
}
export class StructureContainer extends OwnedStructure {
  get store() {
    return new Store(SystemStore.roomObjectsData[this.id]);
  }
}
export class StructureRampart extends OwnedStructure {}
export class StructureSpawn extends OwnedStructure {
  get store() {
    return new Store(SystemStore.roomObjectsData[this.id]);
  }

  spawnCreep(body) {
    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (SystemStore.roomObjectsData[this.id].spawning) {
      return C.ERR_BUSY;
    }

    if (!body || !Array.isArray(body) || body.length === 0 || body.length > C.MAX_CREEP_SIZE) {
      return C.ERR_INVALID_ARGS;
    }

    for (let i = 0; i < body.length; i++) {
      if (!C.BODYPART_COST[body[i]]) {
        return C.ERR_INVALID_ARGS;
      }
    }

    if (SystemStore.roomObjectsData[this.id].store.energy < body.reduce((sum, i) => sum + C.BODYPART_COST[i], 0)) {
      return C.ERR_NOT_ENOUGH_ENERGY;
    }

    let creep = new Creep();
    Intents.set(this.id, "spawnCreep", { body, createRequest: getCreateRequest(creep) });
    return creep;
  }
}
export class StructureTower extends OwnedStructure {
  get store() {
    return new Store(SystemStore.roomObjectsData[this.id]);
  }

  attack(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof RoomObject)) {
      return C.ERR_INVALID_TARGET;
    }

    if (SystemStore.roomObjectsData[this.id].store.energy < C.TOWER_ENERGY_COST) {
      return C.ERR_NOT_ENOUGH_ENERGY;
    }

    Intents.set(this.id, "attack", { id: target.id });
    return C.OK;
  }

  heal(target) {
    if (!this.exists) {
      return;
    }

    if (!this.my) {
      return C.ERR_NOT_OWNER;
    }

    if (!target || !target.exists || !(target instanceof RoomObject)) {
      return C.ERR_INVALID_TARGET;
    }

    if (SystemStore.roomObjectsData[this.id].store.energy < C.TOWER_ENERGY_COST) {
      return C.ERR_NOT_ENOUGH_ENERGY;
    }

    Intents.set(this.id, "heal", { id: target.id });
    return C.OK;
  }
}
export class StructureWall extends Structure {}
export const TERRAIN_SWAMP = 2;
export const TERRAIN_WALL = 1;
export const TOP = 1;
export const TOP_LEFT = 8;
export const TOP_RIGHT = 2;
export const TOUGH = "tough";
export const TOWER_CAPACITY = 1000;
export const TOWER_ENERGY_COST = 10;
export const TOWER_FALLOFF = 0.75;
export const TOWER_FALLOFF_RANGE = 20;
export const TOWER_HITS = 3000;
export const TOWER_OPTIMAL_RANGE = 5;
export const TOWER_POWER_ATTACK = 600;
export const TOWER_POWER_HEAL = 400;
export const TOWER_POWER_REPAIR = 800;
export const TOWER_RANGE = 50;
export const WORK = "work";
export const arenaInfo = { name: "Capture the Flag", level: 1, season: "alpha" };
export const constants = {
  ATTACK: "attack",
  ATTACK_POWER: 30,
  BODYPART_COST: { move: 50, work: 100, attack: 80, carry: 50, heal: 250, ranged_attack: 150, tough: 10 },
  BODYPART_HITS: 100,
  BOTTOM: 5,
  BOTTOM_LEFT: 6,
  BOTTOM_RIGHT: 4,
  CARRY: "carry",
  CARRY_CAPACITY: 50,
  CREEP_SPAWN_TIME: 3,
  DISMANTLE_COST: 0.005,
  DISMANTLE_POWER: 50,
  ERR_BUSY: -4,
  ERR_FULL: -8,
  ERR_INVALID_ARGS: -10,
  ERR_INVALID_TARGET: -7,
  ERR_NAME_EXISTS: -3,
  ERR_NOT_ENOUGH_ENERGY: -6,
  ERR_NOT_ENOUGH_EXTENSIONS: -6,
  ERR_NOT_ENOUGH_RESOURCES: -6,
  ERR_NOT_FOUND: -5,
  ERR_NOT_IN_RANGE: -9,
  ERR_NOT_OWNER: -1,
  ERR_NO_BODYPART: -12,
  ERR_NO_PATH: -2,
  ERR_TIRED: -11,
  HARVEST_POWER: 2,
  HEAL: "heal",
  HEAL_POWER: 12,
  LEFT: 7,
  MAX_CREEP_SIZE: 50,
  MOVE: "move",
  OBSTACLE_OBJECT_TYPES: ["creep", "tower", "constructedWall", "spawn"],
  OK: 0,
  RANGED_ATTACK: "ranged_attack",
  RANGED_ATTACK_DISTANCE_RATE: { 0: 1, 1: 1, 2: 0.4, 3: 0.1 },
  RANGED_ATTACK_POWER: 10,
  RANGED_HEAL_POWER: 4,
  REPAIR_COST: 0.01,
  REPAIR_POWER: 100,
  RESOURCES_ALL: ["energy"],
  RESOURCE_DECAY: 1000,
  RESOURCE_ENERGY: "energy",
  RIGHT: 3,
  ROAD_WEAROUT: 1,
  SOURCE_ENERGY_REGEN: 10,
  TERRAIN_SWAMP: 2,
  TERRAIN_WALL: 1,
  TOP: 1,
  TOP_LEFT: 8,
  TOP_RIGHT: 2,
  TOUGH: "tough",
  TOWER_CAPACITY: 1000,
  TOWER_ENERGY_COST: 10,
  TOWER_FALLOFF: 0.75,
  TOWER_FALLOFF_RANGE: 20,
  TOWER_HITS: 3000,
  TOWER_OPTIMAL_RANGE: 5,
  TOWER_POWER_ATTACK: 600,
  TOWER_POWER_HEAL: 400,
  TOWER_POWER_REPAIR: 800,
  TOWER_RANGE: 50,
  WORK: "work"
};
export function findClosestByPath(fromPos, positions, opts = {}) {
  if (!positions || !positions.length) {
    return null;
  }

  const objectOnSquare = positions.find(pos => fromPos.x === pos.x && fromPos.y === pos.y);
  if (objectOnSquare) {
    return objectOnSquare;
  }

  const goals = positions.map(i => ({ range: 1, pos: i }));

  if (!opts.costMatrix) {
    opts.costMatrix = createCostMatrix(opts);
  }

  const ret = searchPath(fromPos, goals, opts);

  let result = null;
  let lastPos = fromPos;

  if (ret.path.length) {
    lastPos = ret.path[ret.path.length - 1];
  }

  positions.forEach(obj => {
    if (getRange(lastPos, obj) <= 1) {
      result = obj;
    }
  });

  return result;
}
export function findClosestByRange(fromPos, positions) {
  let closest = null;
  let minRange = Infinity;

  positions.forEach(i => {
    if (i.x === undefined || i.y === undefined) {
      return;
    }
    const range = getDistance(fromPos, i);
    if (range < minRange) {
      minRange = range;
      closest = i;
    }
  });

  return closest;
}
export function findInRange(fromPos, positions, range) {
  return positions.filter(i => getRange(fromPos, i) <= range);
}
export function findPath(fromPos, toPos, opts = {}) {
  if (!opts.costMatrix) {
    opts.costMatrix = createCostMatrix(opts);
  }
  const result = searchPath(fromPos, { range: Math.max(1, opts.range || 0), pos: toPos }, opts);
  if (
    !opts.range &&
    ((result.path.length && getDistance(result.path[result.path.length - 1], toPos) === 1) ||
      (!result.path.length && getDistance(fromPos, toPos) <= 1))
  ) {
    result.path.push({ x: toPos.x, y: toPos.y });
  }
  return result.path;
}
export function getDirection(dx, dy) {
  let adx = Math.abs(dx);
  let ady = Math.abs(dy);

  if (adx > ady * 2) {
    if (dx > 0) {
      return C.RIGHT;
    } else {
      return C.LEFT;
    }
  } else if (ady > adx * 2) {
    if (dy > 0) {
      return C.BOTTOM;
    } else {
      return C.TOP;
    }
  } else {
    if (dx > 0 && dy > 0) {
      return C.BOTTOM_RIGHT;
    }
    if (dx > 0 && dy < 0) {
      return C.TOP_RIGHT;
    }
    if (dx < 0 && dy > 0) {
      return C.BOTTOM_LEFT;
    }
    if (dx < 0 && dy < 0) {
      return C.TOP_LEFT;
    }
  }
}
export function getDistance(a, b) {
  return getRange(a, b);
}
export function getHeapStatistics() {
  return SystemStore.isolate.getHeapStatisticsSync();
}
export function getObjectById(id) {
  return SystemStore.roomObjectsById[id];
}
export function getObjects() {
  return Array.from(SystemStore.roomObjects);
}
export function getObjectsByPrototype(prototype) {
  return Array.from(SystemStore.roomObjectsByPrototype.get(prototype) || []);
}
export function getRange(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}
export function getTerrainAt({ x, y }) {
  const value = SystemStore.terrain[y * SystemStore.arenaSize + x];
  return value & C.TERRAIN_WALL || value & C.TERRAIN_SWAMP || 0;
}
export function getTime() {
  return SystemStore.time;
}
export const pathFinder = {};
export const prototypes = {};
export function searchPath(origin, goal, options) {
  // Options
  options = options || {};
  let plainCost = Math.min(254, Math.max(1, options.plainCost | 0 || 1));
  let swampCost = Math.min(254, Math.max(1, options.swampCost | 0 || 5));
  let heuristicWeight = Math.min(9, Math.max(1, options.heuristicWeight || 1.2));
  let maxOps = Math.max(1, options.maxOps | 0 || 10000);
  let maxCost = Math.max(1, options.maxCost | 0 || 0xffffffff);
  let flee = !!options.flee;

  // Convert one-or-many goal into standard format for native extension
  let goals = (Array.isArray(goal) ? goal : [goal]).map(function (goal) {
    if (goal.x !== undefined && goal.y !== undefined) {
      return {
        range: 0,
        pos: toWorldPosition(goal)
      };
    } else {
      let range = Math.max(0, goal.range | 0);
      return {
        range,
        pos: toWorldPosition(goal.pos)
      };
    }
  });

  // Setup room callback
  let cb;
  if (options.costMatrix && options.costMatrix instanceof CostMatrix) {
    cb = function () {
      return options.costMatrix._bits;
    };
  }

  // Invoke native code
  let ret = SystemStore.nativeMod.search(
    toWorldPosition(origin),
    goals,
    cb,
    plainCost,
    swampCost,
    1,
    maxOps,
    maxCost,
    flee,
    heuristicWeight
  );
  if (ret === undefined) {
    return { path: [], ops: 0, cost: 0, incomplete: false };
  } else if (ret === -1) {
    return { path: [], ops: 0, cost: 0, incomplete: true };
  }
  ret.path = ret.path.map(fromWorldPosition).reverse();
  return ret;
}
export const utils = {};
