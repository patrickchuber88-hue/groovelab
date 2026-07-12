const roomStations = [
  {
    "id": "33333333-3333-3333-3333-333333333334",
    "name": "iPad 4",
    "pos_x": 40,
    "pos_y": 10
  },
  {
    "id": "33333333-3333-3333-3333-333333333335",
    "name": "iPad 5",
    "pos_x": 65,
    "pos_y": 10
  },
  {
    "id": "33333333-3333-3333-3333-333333333336",
    "name": "iPad 6",
    "pos_x": 90,
    "pos_y": 10
  },
  {
    "id": "33333333-3333-3333-3333-333333333337",
    "name": "iPad 7",
    "pos_x": 90,
    "pos_y": 30
  },
  {
    "id": "33333333-3333-3333-3333-333333333332",
    "name": "iPad 2",
    "pos_x": 10,
    "pos_y": 30
  },
  {
    "id": "33333333-3333-3333-3333-333333333333",
    "name": "iPad 3",
    "pos_x": 10,
    "pos_y": 10
  },
  {
    "id": "33333333-3333-3333-3333-333333333331",
    "name": "iPad 1",
    "pos_x": 10,
    "pos_y": 50
  },
  {
    "id": "33333333-3333-3333-3333-333333333338",
    "name": "iPad 8",
    "pos_x": 90,
    "pos_y": 50
  },
  {
    "id": "33333333-3333-3333-3333-333333333339",
    "name": "Lehrer iPad",
    "pos_x": 50,
    "pos_y": 50
  }
];

const activeRoom = {
  room_width: 10,
  room_height: 8
};

const placedStations = roomStations.filter(s => s.pos_x !== null && s.pos_y !== null);
const minX = Math.min(...placedStations.map(s => s.pos_x));
const maxX = Math.max(...placedStations.map(s => s.pos_x));
const minY = Math.min(...placedStations.map(s => s.pos_y));
const maxY = Math.max(...placedStations.map(s => s.pos_y));

const padX = 8;
const padY = 10;

const viewportMinX = Math.max(0, minX - padX);
const viewportMaxX = Math.min(100, maxX + padX);
const viewportMinY = Math.max(0, minY - padY);
const viewportMaxY = Math.min(100, maxY + padY);

const viewportWidth = viewportMaxX - viewportMinX;
const viewportHeight = viewportMaxY - viewportMinY;

const safeViewportWidth = Math.max(15, viewportWidth);
const safeViewportHeight = Math.max(15, viewportHeight);

const croppedAspectRatio = (activeRoom.room_width * safeViewportWidth) / (activeRoom.room_height * safeViewportHeight);

const canvasWidth = 1000;
const canvasHeight = 1000 / croppedAspectRatio;

console.log({
  minX, maxX, minY, maxY,
  viewportMinX, viewportMaxX, viewportMinY, viewportMaxY,
  safeViewportWidth, safeViewportHeight,
  croppedAspectRatio,
  canvasWidth, canvasHeight
});

const rawItems = roomStations.map(station => {
  const sName = station.name || '';
  const isTeacher = sName.toLowerCase().includes('lehrer') || sName.toLowerCase().includes('teacher');
  const posLeftOriginal = station.pos_x !== null ? station.pos_x : 50;
  const posTopOriginal = station.pos_y !== null ? station.pos_y : 50;

  const posLeftPct = safeViewportWidth > 0 ? ((posLeftOriginal - viewportMinX) / safeViewportWidth) * 100 : 50;
  const posTopPct = safeViewportHeight > 0 ? ((posTopOriginal - viewportMinY) / safeViewportHeight) * 100 : 50;

  const x = (posLeftPct / 100) * canvasWidth;
  const y = (posTopPct / 100) * canvasHeight;

  const w = isTeacher ? 150 : 160;
  const h = isTeacher ? 150 : 160;

  return {
    id: station.id,
    name: station.name,
    isTeacher,
    x,
    y,
    w,
    h
  };
});

// Simulate relaxation
const resolvedItems = JSON.parse(JSON.stringify(rawItems));
for (let iter = 0; iter < 15; iter++) {
  let moved = false;
  for (let i = 0; i < resolvedItems.length; i++) {
    for (let j = i + 1; j < resolvedItems.length; j++) {
      const a = resolvedItems[i];
      const b = resolvedItems[j];

      const hWidth = (a.w + b.w) / 2 + 16;
      const hHeight = (a.h + b.h) / 2 + 16;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < hWidth && absDy < hHeight) {
        moved = true;
        const overlapX = hWidth - absDx;
        const overlapY = hHeight - absDy;

        if (overlapX < overlapY) {
          const pushX = overlapX / 2;
          const sign = dx >= 0 ? 1 : -1;
          b.x += pushX * sign;
          a.x -= pushX * sign;
        } else {
          const pushY = overlapY / 2;
          const sign = dy >= 0 ? 1 : -1;
          b.y += pushY * sign;
          a.y -= pushY * sign;
        }
      }
    }
  }
  if (!moved) break;
}

const finalPositions = [];
resolvedItems.forEach(item => {
  const marginX = item.w / 2 + 10;
  const marginY = item.h / 2 + 10;
  const clampedX = Math.max(marginX, Math.min(canvasWidth - marginX, item.x));
  const clampedY = Math.max(marginY, Math.min(canvasHeight - marginY, item.y));
  finalPositions.push({
    name: item.name,
    originalX: rawItems.find(r => r.id === item.id).x,
    originalY: rawItems.find(r => r.id === item.id).y,
    relaxedX: item.x,
    relaxedY: item.y,
    clampedX,
    clampedY
  });
});

console.log('--- FINAL COORDINATES ---');
console.table(finalPositions);
