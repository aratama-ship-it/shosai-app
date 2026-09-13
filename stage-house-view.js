/* 舞台スケッチ — 正面図の「引いた絵」に重ねる会場の器
 *
 * S3では本体へ接続しない。呼び出し側は舞台より前に drawBehind()、
 * 舞台と駒より後に drawFront() を呼ぶ。DOMとアプリ状態には触れない。
 */
(function () {
  "use strict";

  const TOKENS = Object.freeze({
    lowerTier: "#171412",
    upperTier: "#131110",
    farTier: "#0f0d0c",
    tierBoundary: "rgba(239,231,214,0.10)",
    crowdNear: "rgba(239,231,214,0.16)",
    crowdFar: "rgba(239,231,214,0.12)",
    emptySeat: "rgba(239,231,214,0.06)",
    foregroundHead: "#0a0908",
    foregroundHeadOutline: "rgba(0,0,0,0.5)",
    skyTop: "#1c2630",
    skyHorizon: "#2a3038",
    roofTruss: "rgba(156,130,63,0.28)",
    roofTrussAux: "rgba(156,130,63,0.16)",
    aisle: "rgba(0,0,0,0.45)",
    expressionReach: "rgba(211,172,89,0.55)",
    movementReach: "rgba(168,65,45,0.50)",
    label: "rgba(239,231,214,0.5)",
    headDiameterM: 0.2,
    standingEyeM: 1.55,
    standingHeadM: 1.65,
    standingRowPitchM: 0.8,
    crowdMinViewerDistanceM: 5.0,
    crowdMaxDiameterViewportRatio: 1 / 32,
    maxParticles: 12000,
    sideClearanceM: 4,
    aisleWidthM: 1.2,
    arenaBlocksAcross: 5,
    arenaBlocksDeep: 3,
    domeArcCount: 7,
    domeRadialCount: 16,
    trussBeamCount: 8,
    tiltUpMaxDeg: 34,
    tiltDownMaxDeg: 16,
  });
  /* stage-sketch.js の STAGE_COOL_SURFACES と同じ warm→cool の表。
   * 同表に無い新しい器色は、推測で別色を作らず warm 値のまま使う。 */
  const COOL_SURFACES = Object.freeze({
    "#40362d": "#2b2e33",
    "#0d0c0b": "#0d0e10",
    "#12100e": "#111316",
    "#0c0a09": "#0b0c0e",
    "#211b17": "#1c1f23",
    "#0f0d0c": "#101114",
    "#3a322a": "#303338",
    "#28211b": "#24272b",
    "#1b1512": "#17191c",
    "#0c0908": "#0b0c0e",
    "#070606": "#060708",
    "#11100f": "#101113",
    "#141110": "#121417",
    "#241d18": "#202327",
    "#141210": "#131518",
    "#120f0d": "#111316",
    "#14110e": "#131518",
    "#201b16": "#1b1e22",
    "#181411": "#16181b",
    "#3e342a": "#303338",
    "#1a1612": "#191c20",
    "#0a0908": "#090a0c",
    "#0b0a09": "#0a0b0d",
    "#100e0c": "#0f1113",
    "#1f1a16": "#1b1e22",
    "#c4ac84": "#a2a8b1",
  });

  const finite = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const canvasSize = (ctx) => ({
    width: finite(ctx && ctx.canvas && ctx.canvas.width, 1280),
    height: finite(ctx && ctx.canvas && ctx.canvas.height, 720),
  });
  const isCool = (houseMode) => houseMode === "blue-black" ||
    (houseMode && houseMode.skin === "blue-black");
  const isEmpty = (houseMode) => houseMode === "empty" ||
    (houseMode && houseMode.occupancy === "empty");
  const surface = (color, houseMode) => isCool(houseMode) ? (COOL_SURFACES[color] || color) : color;

  function seatNoise(row, seat, salt) {
    // stage-first-person.js の seatNoise と同じ式。毎フレーム同じ値になる。
    const value = Math.sin((row + 1) * 12.9898 + (seat + 1) * 78.233 + salt * 37.719) * 43758.5453;
    return value - Math.floor(value);
  }

  function tierRows(bowl, size) {
    const lines = window.SHOSAI_VENUE_LINES;
    if (lines && typeof lines.bowlTiers === "function") {
      return lines.bowlTiers(bowl, {
        stageWidthM: finite(size && size.width, 0),
        stageDepthM: finite(size && size.depth, 0),
      });
    }
    return [];
  }

  function drawSky(ctx, L, bowl, houseMode, width, height) {
    if (bowl.kind === "field" || (bowl.roof && bowl.roof.kind === "open")) {
      const gradient = ctx.createLinearGradient(0, 0, 0, finite(L.floorY, height / 2));
      gradient.addColorStop(0, TOKENS.skyTop);
      gradient.addColorStop(1, TOKENS.skyHorizon);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, finite(L.floorY, height / 2));
      ctx.fillStyle = surface(TOKENS.farTier, houseMode);
      ctx.fillRect(0, finite(L.floorY, height / 2), width, height - finite(L.floorY, height / 2));
      return;
    }
    ctx.fillStyle = surface(TOKENS.farTier, houseMode);
    ctx.fillRect(0, 0, width, height);
  }

  function quadraticPoint(start, control, end, amount) {
    const back = 1 - amount;
    return {
      x: (back * back * start.x) + (2 * back * amount * control.x) + (amount * amount * end.x),
      y: (back * back * start.y) + (2 * back * amount * control.y) + (amount * amount * end.y),
    };
  }

  function drawRoof(ctx, L, bowl, width) {
    const roof = bowl.roof || {};
    if (roof.kind === "open") {
      ctx.strokeStyle = TOKENS.skyHorizon;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, L.floorY);
      ctx.lineTo(width, L.floorY);
      ctx.stroke();
      return;
    }
    const pxPerM = Math.max(0, finite(L.pxPerM, 0));
    const eaveY = finite(L.floorY, 360) - (finite(roof.eaveM, 0) * pxPerM);
    const apexY = finite(L.floorY, 360) - (finite(roof.apexM, 0) * pxPerM);
    if (roof.kind === "dome") {
      const center = { x: width / 2, y: apexY };
      for (let index = 1; index <= TOKENS.domeArcCount; index += 1) {
        const scale = index / TOKENS.domeArcCount;
        ctx.strokeStyle = TOKENS.roofTruss;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(center.x - ((width / 2) * scale), eaveY);
        ctx.quadraticCurveTo(center.x, eaveY + ((apexY - eaveY) * scale),
          center.x + ((width / 2) * scale), eaveY);
        ctx.stroke();
      }
      const outerStart = { x: 0, y: eaveY };
      const outerEnd = { x: width, y: eaveY };
      for (let index = 0; index < TOKENS.domeRadialCount; index += 1) {
        const edge = quadraticPoint(outerStart, center, outerEnd,
          (index + 0.5) / TOKENS.domeRadialCount);
        ctx.strokeStyle = TOKENS.roofTrussAux;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(edge.x, edge.y);
        ctx.stroke();
      }
      return;
    }
    for (let index = 1; index <= TOKENS.trussBeamCount; index += 1) {
      const amount = index / (TOKENS.trussBeamCount + 1);
      const halfWidth = (width / 2) * amount;
      const y = apexY + ((eaveY - apexY) * amount);
      ctx.strokeStyle = index % 2 ? TOKENS.roofTruss : TOKENS.roofTrussAux;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo((width / 2) - halfWidth, y);
      ctx.lineTo((width / 2) + halfWidth, y);
      ctx.stroke();
    }
  }

  function wrapMode(venue, bowl) {
    if (["front", "three", "round"].includes(bowl && bowl.wrap)) return bowl.wrap;
    if (venue && (venue.id === "arena-concert" || venue.id === "dome-concert")) return "three";
    return "front";
  }

  function viewBasis(L, seat) {
    const distanceM = Math.max(TOKENS.standingRowPitchM, finite(seat && seat.eye, 0));
    const eyeM = finite(seat && seat.plan && seat.plan.eyeM, 0);
    const rawDeclinationDeg = Math.atan2(eyeM, distanceM) * 180 / Math.PI;
    const declinationDeg = Math.max(-TOKENS.tiltUpMaxDeg,
      Math.min(TOKENS.tiltDownMaxDeg, rawDeclinationDeg));
    const focal = Math.max(0, finite(L.pxPerM, 0) * distanceM);
    return {
      distanceM,
      eyeM,
      focal,
      declinationDeg,
      horizonY: finite(L.floorY, 360) - (focal * Math.tan(declinationDeg * Math.PI / 180)),
    };
  }

  function projectPoint(point, L, basis) {
    const viewerDistanceM = basis.distanceM - finite(point && point.z, 0);
    if (!(viewerDistanceM > 0)) return null;
    const projection = basis.focal / viewerDistanceM;
    const centerX = finite(L.centerX, 640) +
      (finite(L.shift, 0) * (viewerDistanceM / basis.distanceM));
    return {
      x: centerX + (finite(point && point.x, 0) * projection),
      y: basis.horizonY - ((finite(point && point.height, 0) - basis.eyeM) * projection),
      projection,
      viewerDistanceM,
      diameterPx: TOKENS.headDiameterM * projection,
    };
  }

  function viewerRowProjection(row, L, seat, mode, halfWidthM, basis = viewBasis(L, seat), zSign = 1) {
    const seatDistanceM = basis.distanceM;
    const rowDistanceM = Math.max(0, finite(row && row.distanceM, 0));
    // distanceM は舞台前端基準。観客は見る席より舞台側にある列だけを描く。
    if (zSign > 0 && !(rowDistanceM < seatDistanceM)) return null;
    const z = rowDistanceM * zSign;
    const floorM = finite(row && row.floorM, 0);
    const headCenterM = mode === "standing" ? TOKENS.standingEyeM : 1.2;
    const left = projectPoint({ x: -halfWidthM, z, height: floorM }, L, basis);
    const right = projectPoint({ x: halfWidthM, z, height: floorM }, L, basis);
    const head = projectPoint({ x: 0, z, height: floorM + headCenterM }, L, basis);
    if (!left || !right || !head) return null;
    return {
      viewerDistanceM: head.viewerDistanceM,
      projection: head.projection,
      horizonY: basis.horizonY,
      floorY: left.y,
      headY: head.y,
      diameterPx: head.diameterPx,
      leftX: left.x,
      rightX: right.x,
      widthPx: right.x - left.x,
    };
  }

  function projectedTiers(tiers, L, seat, size, viewportWidth, behindStage = false) {
    const stageHalfWidthM = Math.max(0, finite(size && size.width, 0) / 2);
    const halfWidthM = behindStage ? stageHalfWidthM + TOKENS.sideClearanceM : stageHalfWidthM;
    const basis = viewBasis(L, seat);
    return tiers.map((tier, tierIndex) => ({
      ...tier,
      tierIndex,
      rows: tier.rows.map((row, rowIndex) => ({
        row,
        rowIndex,
        view: viewerRowProjection(row, L, seat, tier.mode,
          behindStage ? halfWidthM + Math.max(0, row.distanceM - tier.fromM) : halfWidthM,
          basis, behindStage ? -1 : 1),
      })).filter((item) => item.view)
        .map((item) => ({ ...item, view: { ...item.view, viewportWidth } }))
        .sort((a, b) => b.view.viewerDistanceM - a.view.viewerDistanceM),
    }));
  }

  function seatsInRow(item, tier) {
    const spacingPx = item.view.projection * (tier.mode === "standing" ? 0.8 : 0.85);
    const physicalCount = Math.max(1,
      Math.floor(item.view.widthPx / Math.max(0.000001, spacingPx)));
    const visibleCount = Math.max(1,
      Math.ceil(item.view.viewportWidth / Math.max(0.000001, spacingPx)));
    return {
      spacingPx,
      count: Math.min(physicalCount, visibleCount),
    };
  }

  function crowdRows(tiers) {
    return tiers.flatMap((tier) => tier.rows.map((item) => ({ ...item, tier })))
      .filter(({ view }) => view.viewerDistanceM >= TOKENS.crowdMinViewerDistanceM &&
        view.diameterPx <= view.viewportWidth * TOKENS.crowdMaxDiameterViewportRatio)
      .sort((a, b) => b.view.viewerDistanceM - a.view.viewerDistanceM);
  }

  function frontCrowdParticles(tiers, sectionSalt = 0) {
    const particles = [];
    crowdRows(tiers).forEach((item) => {
      const { tier, rowIndex, view } = item;
      const color = tier.tierIndex === 0 ? TOKENS.crowdNear : TOKENS.crowdFar;
      const { spacingPx, count: seats } = seatsInRow(item, tier);
      for (let seatIndex = 0; seatIndex < seats; seatIndex += 1) {
        const x = ((view.leftX + view.rightX) / 2) +
          ((seatIndex - ((seats - 1) / 2)) * spacingPx) +
          ((seatNoise(rowIndex, seatIndex, tier.tierIndex + sectionSalt + 1) - 0.5) *
            view.diameterPx);
        if (x < view.leftX - view.diameterPx || x > view.rightX + view.diameterPx) continue;
        particles.push({ x, y: view.headY, diameterPx: view.diameterPx, color, section: sectionSalt });
      }
    });
    return particles;
  }

  function projectedSideTiers(tiers, L, seat, size, viewportWidth) {
    const basis = viewBasis(L, seat);
    const innerEdgeM = Math.max(0, finite(size && size.width, 0) / 2) + TOKENS.sideClearanceM;
    return tiers.map((tier, tierIndex) => {
      const nearZ = Math.min(tier.toM, basis.distanceM - 0.000001);
      return {
        ...tier,
        tierIndex,
        nearZ,
        sides: [-1, 1].map((side) => ({
          side,
          rows: tier.rows.map((row, rowIndex) => {
            const x = side * (innerEdgeM + Math.max(0, row.distanceM - tier.fromM));
            return {
              row,
              rowIndex,
              x,
              far: projectPoint({ x, z: 0, height: row.floorM }, L, basis),
              near: projectPoint({ x, z: nearZ, height: row.floorM }, L, basis),
            };
          }).filter((row) => row.far && row.near),
        })),
        basis,
        L,
        viewportWidth,
      };
    });
  }

  function sideCrowdParticles(sideTiers) {
    const particles = [];
    sideTiers.forEach((tier) => tier.sides.forEach(({ side, rows }) => rows.forEach((item) => {
      const pitchM = tier.rows.length > 1
        ? Math.max(0.000001, tier.rows[1].distanceM - tier.rows[0].distanceM)
        : (tier.mode === "standing" ? TOKENS.standingRowPitchM : 0.85);
      const headM = item.row.floorM + (tier.mode === "standing" ? TOKENS.standingEyeM : 1.2);
      const samples = Math.max(1, Math.floor(tier.nearZ / pitchM) + 1);
      for (let seatIndex = 0; seatIndex < samples; seatIndex += 1) {
        const z = Math.min(tier.nearZ, seatIndex * pitchM);
        const point = projectPoint({ x: item.x, z, height: headM }, tier.L, tier.basis);
        if (!point || point.viewerDistanceM < TOKENS.crowdMinViewerDistanceM ||
          point.diameterPx > tier.viewportWidth * TOKENS.crowdMaxDiameterViewportRatio) continue;
        const visible = point;
        if (visible.x < -visible.diameterPx || visible.x > tier.viewportWidth + visible.diameterPx) continue;
        particles.push({
          x: visible.x,
          y: visible.y,
          diameterPx: visible.diameterPx,
          color: tier.tierIndex === 0 ? TOKENS.crowdNear : TOKENS.crowdFar,
          section: side < 0 ? 10 : 20,
        });
      }
    })));
    return particles;
  }

  function drawCrowd(ctx, particleList, houseMode) {
    const empty = isEmpty(houseMode);
    const desired = particleList.length;
    const stride = Math.max(1, Math.ceil(desired / TOKENS.maxParticles));
    let particles = 0;
    particleList.forEach((particle, ordinal) => {
      if (ordinal % stride !== 0 || particles >= TOKENS.maxParticles) return;
      ctx.fillStyle = empty ? TOKENS.emptySeat : particle.color;
      if (empty) ctx.fillRect(particle.x - particle.diameterPx / 2,
        particle.y - particle.diameterPx / 2, particle.diameterPx, particle.diameterPx);
      else {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.diameterPx / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      particles += 1;
    });
    return { particles, desiredParticles: desired };
  }

  function drawQuad(ctx, far, near) {
    ctx.beginPath();
    ctx.moveTo(far.leftX, far.y);
    ctx.lineTo(far.rightX, far.y);
    ctx.lineTo(near.rightX, near.y);
    ctx.lineTo(near.leftX, near.y);
    ctx.fill();
  }

  function tierColors(tierIndex, tierCount, houseMode) {
    const tread = tierIndex === 0 ? TOKENS.lowerTier :
      (tierIndex === tierCount - 1 ? TOKENS.farTier : TOKENS.upperTier);
    const riser = tierIndex === 0 ? TOKENS.upperTier : TOKENS.farTier;
    return { tread: surface(tread, houseMode), riser: surface(riser, houseMode) };
  }

  function drawTiers(ctx, tiers, houseMode) {
    tiers.forEach((tier, tierIndex) => {
      const colors = tierColors(tierIndex, tiers.length, houseMode);
      for (let index = 0; index < tier.rows.length - 1; index += 1) {
        const far = tier.rows[index].view;
        const near = tier.rows[index + 1].view;
        const split = {
          leftX: far.leftX + ((near.leftX - far.leftX) * 0.7),
          rightX: far.rightX + ((near.rightX - far.rightX) * 0.7),
          y: far.floorY + ((near.floorY - far.floorY) * 0.7),
        };
        ctx.fillStyle = colors.tread;
        drawQuad(ctx,
          { leftX: far.leftX, rightX: far.rightX, y: far.floorY }, split);
        ctx.fillStyle = colors.riser;
        drawQuad(ctx, split,
          { leftX: near.leftX, rightX: near.rightX, y: near.floorY });
      }
      ctx.strokeStyle = TOKENS.tierBoundary;
      ctx.lineWidth = 1;
      tier.rows.forEach(({ view }) => {
        ctx.beginPath();
        ctx.moveTo(view.leftX, view.floorY);
        ctx.lineTo(view.rightX, view.floorY);
        ctx.stroke();
      });
    });
  }

  function drawSideTiers(ctx, sideTiers, houseMode) {
    sideTiers.forEach((tier, tierIndex) => {
      const colors = tierColors(tierIndex, sideTiers.length, houseMode);
      tier.sides.forEach(({ rows }) => {
        for (let index = 0; index < rows.length - 1; index += 1) {
          const inner = rows[index];
          const outer = rows[index + 1];
          ctx.fillStyle = colors.tread;
          ctx.beginPath();
          ctx.moveTo(inner.far.x, inner.far.y);
          ctx.lineTo(inner.near.x, inner.near.y);
          ctx.lineTo(outer.near.x, outer.near.y);
          ctx.lineTo(outer.far.x, outer.far.y);
          ctx.fill();
        }
        ctx.strokeStyle = TOKENS.tierBoundary;
        ctx.lineWidth = 1;
        rows.forEach((row) => {
          ctx.beginPath();
          ctx.moveTo(row.far.x, row.far.y);
          ctx.lineTo(row.near.x, row.near.y);
          ctx.stroke();
        });
      });
    });
  }

  function drawAisleQuad(ctx, points) {
    if (!points.every(Boolean)) return;
    ctx.fillStyle = TOKENS.aisle;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index].x, points[index].y);
    ctx.fill();
  }

  function drawAisles(ctx, tiers, L, seat, size) {
    const basis = viewBasis(L, seat);
    const halfWidthM = Math.max(0, finite(size && size.width, 0) / 2);
    const halfAisleM = TOKENS.aisleWidthM / 2;
    tiers.forEach((tier) => {
      for (let block = 1; block < TOKENS.arenaBlocksAcross; block += 1) {
        const aisleX = -halfWidthM + ((2 * halfWidthM * block) / TOKENS.arenaBlocksAcross);
        for (let index = 0; index < tier.rows.length - 1; index += 1) {
          const far = tier.rows[index].row;
          const near = tier.rows[index + 1].row;
          drawAisleQuad(ctx, [
            projectPoint({ x: aisleX - halfAisleM, z: far.distanceM, height: far.floorM }, L, basis),
            projectPoint({ x: aisleX + halfAisleM, z: far.distanceM, height: far.floorM }, L, basis),
            projectPoint({ x: aisleX + halfAisleM, z: near.distanceM, height: near.floorM }, L, basis),
            projectPoint({ x: aisleX - halfAisleM, z: near.distanceM, height: near.floorM }, L, basis),
          ]);
        }
      }
      for (let block = 1; block < TOKENS.arenaBlocksDeep; block += 1) {
        const amount = block / TOKENS.arenaBlocksDeep;
        const rowIndex = Math.min(tier.rows.length - 1,
          Math.max(0, Math.round((tier.rows.length - 1) * amount)));
        const row = tier.rows[rowIndex] && tier.rows[rowIndex].row;
        if (!row) continue;
        drawAisleQuad(ctx, [
          projectPoint({ x: -halfWidthM, z: row.distanceM - halfAisleM, height: row.floorM }, L, basis),
          projectPoint({ x: halfWidthM, z: row.distanceM - halfAisleM, height: row.floorM }, L, basis),
          projectPoint({ x: halfWidthM, z: row.distanceM + halfAisleM, height: row.floorM }, L, basis),
          projectPoint({ x: -halfWidthM, z: row.distanceM + halfAisleM, height: row.floorM }, L, basis),
        ]);
      }
    });
  }

  function drawBehind(ctx, input) {
    const L = input && input.L;
    const venue = input && input.venue;
    const bowl = venue && venue.bowl;
    if (!ctx || !L || !bowl) return { drawn: false, particles: 0, desiredParticles: 0 };
    const { width, height } = canvasSize(ctx);
    const seat = input.seat || L.seat;
    const sourceTiers = tierRows(bowl, input.size);
    const tiers = projectedTiers(sourceTiers, L, seat, input.size, width);
    const wrap = wrapMode(venue, bowl);
    const sideTiers = wrap === "front" ? [] :
      projectedSideTiers(sourceTiers, L, seat, input.size, width);
    const oppositeTiers = wrap === "round" ?
      projectedTiers(sourceTiers, L, seat, input.size, width, true) : [];
    ctx.save();
    drawSky(ctx, L, bowl, input.houseMode, width, height);
    drawRoof(ctx, L, bowl, width);
    if (oppositeTiers.length) drawTiers(ctx, oppositeTiers, input.houseMode);
    if (sideTiers.length) drawSideTiers(ctx, sideTiers, input.houseMode);
    drawTiers(ctx, tiers, input.houseMode);
    const particleList = []
      .concat(frontCrowdParticles(oppositeTiers, 30))
      .concat(sideCrowdParticles(sideTiers))
      .concat(frontCrowdParticles(tiers, 0));
    const crowd = drawCrowd(ctx, particleList, input.houseMode);
    if (bowl.kind !== "field") drawAisles(ctx, tiers, L, seat, input.size);
    ctx.restore();
    const basis = viewBasis(L, seat);
    return { drawn: true, wrap, horizonY: basis.horizonY,
      declinationDeg: basis.declinationDeg, ...crowd };
  }

  function drawFront(ctx, input) {
    const L = input && input.L;
    const venue = input && input.venue;
    const seat = input && input.seat;
    const bowl = venue && venue.bowl;
    const plan = seat && seat.plan;
    const tier = bowl && Array.isArray(bowl.tiers)
      ? bowl.tiers.find((candidate) => candidate && candidate.id === plan?.tier) : null;
    const flatStanding = plan && plan.mode === "standing" && tier &&
      tier.mode === "standing" && !Number(tier.riseM);
    if (!ctx || !L || !bowl || !seat || !flatStanding || isEmpty(input.houseMode)) {
      return { drawn: false, heads: 0 };
    }
    const { width, height } = canvasSize(ctx);
    const distanceM = Math.max(0, finite(seat.eye, 0));
    const eyeM = finite(seat.plan && seat.plan.eyeM, TOKENS.standingEyeM);
    const rows = tierRows(bowl, input.size).flatMap((candidate) => candidate.rows);
    const hasRowAhead = rows.some((row) => finite(row && row.distanceM, Infinity) < distanceM);
    const focal = distanceM * Math.max(0, finite(L.pxPerM, 0));
    const diameterPx = TOKENS.headDiameterM * focal / TOKENS.standingRowPitchM;
    if (!hasRowAhead) return { drawn: false, heads: 0, headDiameterPx: diameterPx };
    const lines = window.SHOSAI_VENUE_LINES;
    const occlusion = lines && typeof lines.occlusionFloorM === "function"
      ? lines.occlusionFloorM({
          eyeM,
          aheadM: TOKENS.standingHeadM,
          rowPitchM: TOKENS.standingRowPitchM,
          distanceM,
          stageHeightM: finite(bowl.stageHeightM, 1.6),
        })
      : { floorM: eyeM + ((TOKENS.standingHeadM - eyeM) *
          (distanceM / TOKENS.standingRowPitchM)) - finite(bowl.stageHeightM, 1.6) };
    if (!(occlusion.floorM > 0)) return { drawn: false, heads: 0, occlusionFloorM: occlusion.floorM };
    const topY = Math.max(0, Math.min(height, finite(L.floorY, height / 2) -
      (occlusion.floorM * finite(L.pxPerM, 0))));
    const centerY = topY + diameterPx / 2;
    const heads = Math.ceil(width / Math.max(0.000001, diameterPx)) + 2;
    ctx.save();
    ctx.fillStyle = surface(TOKENS.foregroundHead, input.houseMode);
    ctx.strokeStyle = TOKENS.foregroundHeadOutline;
    ctx.lineWidth = 1;
    for (let index = -1; index < heads - 1; index += 1) {
      const centerX = (index + 0.5) * diameterPx;
      ctx.beginPath();
      ctx.arc(centerX, centerY, diameterPx / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
    return { drawn: true, heads, occlusionFloorM: occlusion.floorM, headDiameterPx: diameterPx };
  }

  window.SHOSAI_STAGE_HOUSE_VIEW = Object.freeze({
    tokens: TOKENS,
    coolSurfaces: COOL_SURFACES,
    seatNoise,
    drawBehind,
    drawFront,
  });
})();
