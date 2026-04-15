const LAYERS = [
  {
    name: 'far',
    desktopCount: 7,
    mobileCount: 3,
    size: [7, 12],
    fallSpeed: [15, 24],
    opacity: [0.34, 0.52],
    swayAmplitude: [10, 22],
    swayFrequency: [0.2, 0.45]
  },
  {
    name: 'mid',
    desktopCount: 10,
    mobileCount: 4,
    size: [10, 16],
    fallSpeed: [22, 36],
    opacity: [0.46, 0.74],
    swayAmplitude: [16, 32],
    swayFrequency: [0.3, 0.68]
  },
  {
    name: 'near',
    desktopCount: 6,
    mobileCount: 3,
    size: [14, 22],
    fallSpeed: [30, 48],
    opacity: [0.58, 0.9],
    swayAmplitude: [22, 40],
    swayFrequency: [0.45, 0.95]
  }
]

const SPRITE_PATHS = [
  '/assets/petals/petal-1.svg',
  '/assets/petals/petal-2.svg',
  '/assets/petals/petal-3.svg',
  '/assets/petals/petal-4.svg',
  '/assets/petals/petal-5.svg',
  '/assets/petals/petal-6.svg',
  '/assets/petals/petal-7.svg',
  '/assets/petals/petal-8.svg'
]

const LAYER_SPRITE_WEIGHTS = {
  far: [
    { index: 0, weight: 1.45 },
    { index: 1, weight: 1.35 },
    { index: 2, weight: 1.2 },
    { index: 3, weight: 1.1 },
    { index: 4, weight: 1.0 },
    { index: 5, weight: 0.8 },
    { index: 6, weight: 0.9 },
    { index: 7, weight: 0.75 }
  ],
  mid: [
    { index: 0, weight: 1.0 },
    { index: 1, weight: 1.0 },
    { index: 2, weight: 1.05 },
    { index: 3, weight: 0.95 },
    { index: 4, weight: 1.0 },
    { index: 5, weight: 1.1 },
    { index: 6, weight: 1.0 },
    { index: 7, weight: 0.95 }
  ],
  near: [
    { index: 0, weight: 0.75 },
    { index: 1, weight: 0.8 },
    { index: 2, weight: 0.9 },
    { index: 3, weight: 0.85 },
    { index: 4, weight: 1.05 },
    { index: 5, weight: 1.35 },
    { index: 6, weight: 1.25 },
    { index: 7, weight: 1.3 }
  ]
}

const FALLBACK_COLORS = [
  { fill: 'rgba(255, 220, 228, 0.72)', stroke: 'rgba(255, 188, 203, 0.72)' },
  { fill: 'rgba(255, 214, 224, 0.68)', stroke: 'rgba(255, 180, 196, 0.7)' },
  { fill: 'rgba(255, 228, 234, 0.74)', stroke: 'rgba(255, 194, 207, 0.7)' }
]

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function randomFromRange([min, max]) {
  return randomBetween(min, max)
}

function smoothStep(value) {
  return value * value * (3 - 2 * value)
}

function sampleSmoothNoise(value, seedA, seedB) {
  const base = value + seedA * 0.13 + seedB * 0.07
  const gridIndex = Math.floor(base)
  const fraction = base - gridIndex
  const left = Math.sin((gridIndex + 1) * 12.9898 + seedA * 31.4 + seedB * 7.2)
  const right = Math.sin((gridIndex + 2) * 12.9898 + seedA * 31.4 + seedB * 7.2)
  const leftNormalized = left * 0.5 + 0.5
  const rightNormalized = right * 0.5 + 0.5
  return leftNormalized + (rightNormalized - leftNormalized) * smoothStep(fraction)
}

function loadSprite(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = src
  })
}

async function loadPetalSprites() {
  try {
    const sprites = await Promise.all(SPRITE_PATHS.map(loadSprite))
    return sprites.filter(sprite => sprite.width > 0 && sprite.height > 0)
  } catch (error) {
    console.warn('[sakura] Failed to load sprite assets, using vector fallback.', error)
    return []
  }
}

/**
 * Choose sprite index using layer-aware weighted sampling.
 * This keeps far-layer silhouettes simpler and near-layer petals more varied.
 */
function pickWeightedSpriteIndex(layerName, sprites) {
  if (sprites.length === 0) return -1

  const layerWeights = LAYER_SPRITE_WEIGHTS[layerName] ?? LAYER_SPRITE_WEIGHTS.mid
  const availableWeights = layerWeights.filter(candidate => candidate.index < sprites.length)
  if (availableWeights.length === 0) return Math.floor(Math.random() * sprites.length)

  const totalWeight = availableWeights.reduce((sum, candidate) => sum + candidate.weight, 0)
  let randomValue = Math.random() * totalWeight

  for (const candidate of availableWeights) {
    randomValue -= candidate.weight
    if (randomValue <= 0) return candidate.index
  }

  return availableWeights[availableWeights.length - 1].index
}

function createPetal(layer, width, height, sprites) {
  const size = randomFromRange(layer.size)
  return {
    layer: layer.name,
    x: randomBetween(-width * 0.12, width * 1.12),
    y: randomBetween(-height, 0),
    size,
    fallSpeed: randomFromRange(layer.fallSpeed),
    swayAmplitude: randomFromRange(layer.swayAmplitude),
    swayFrequency: randomFromRange(layer.swayFrequency),
    swayPhase: randomBetween(0, Math.PI * 2),
    turbulencePhase: randomBetween(0, Math.PI * 2),
    turbulenceSpeed: randomBetween(0.6, 1.5),
    rotation: randomBetween(0, Math.PI * 2),
    rotationSpeed: randomBetween(-0.9, 0.9),
    tiltPhase: randomBetween(0, Math.PI * 2),
    tiltSpeed: randomBetween(1.2, 2.6),
    opacity: randomFromRange(layer.opacity),
    depth: randomBetween(0.75, 1.25),
    color: FALLBACK_COLORS[Math.floor(Math.random() * FALLBACK_COLORS.length)],
    spriteIndex: pickWeightedSpriteIndex(layer.name, sprites)
  }
}

function recyclePetal(petal, layer, width, height, sprites) {
  const next = createPetal(layer, width, height, sprites)
  petal.x = randomBetween(-width * 0.2, width * 1.15)
  petal.y = randomBetween(-height * 0.55, -16)
  petal.size = next.size
  petal.fallSpeed = next.fallSpeed
  petal.swayAmplitude = next.swayAmplitude
  petal.swayFrequency = next.swayFrequency
  petal.swayPhase = next.swayPhase
  petal.turbulencePhase = next.turbulencePhase
  petal.turbulenceSpeed = next.turbulenceSpeed
  petal.rotation = next.rotation
  petal.rotationSpeed = next.rotationSpeed
  petal.tiltPhase = next.tiltPhase
  petal.tiltSpeed = next.tiltSpeed
  petal.opacity = next.opacity
  petal.depth = next.depth
  petal.color = next.color
  petal.spriteIndex = next.spriteIndex
}

function drawFallbackPetal(context, petal, time) {
  const tilt = Math.sin(time * petal.tiltSpeed + petal.tiltPhase)
  const widthScale = 0.54 + 0.46 * Math.abs(tilt)
  const drawWidth = petal.size * widthScale
  const drawHeight = petal.size * 1.35

  context.beginPath()
  context.moveTo(0, -drawHeight * 0.48)
  context.quadraticCurveTo(drawWidth * 0.58, -drawHeight * 0.2, drawWidth * 0.48, 0)
  context.quadraticCurveTo(drawWidth * 0.46, drawHeight * 0.44, 0, drawHeight * 0.5)
  context.quadraticCurveTo(-drawWidth * 0.46, drawHeight * 0.44, -drawWidth * 0.48, 0)
  context.quadraticCurveTo(-drawWidth * 0.58, -drawHeight * 0.2, 0, -drawHeight * 0.48)
  context.closePath()

  context.fillStyle = petal.color.fill
  context.strokeStyle = petal.color.stroke
  context.lineWidth = 0.8
  context.fill()
  context.stroke()
}

function drawSpritePetal(context, petal, time, sprite) {
  const tilt = Math.sin(time * petal.tiltSpeed + petal.tiltPhase)
  const widthScale = 0.5 + 0.5 * Math.abs(tilt)
  const brightness = 0.8 + 0.2 * tilt
  const drawWidth = petal.size * widthScale
  const drawHeight = petal.size * 1.6

  context.globalAlpha = Math.max(0.2, petal.opacity * (0.78 + 0.24 * Math.abs(tilt)))
  context.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)

  if (brightness > 0.9) {
    context.fillStyle = `rgba(255, 255, 255, ${Math.min(0.22, (brightness - 0.9) * 0.8)})`
    context.beginPath()
    context.ellipse(0, -drawHeight * 0.1, drawWidth * 0.34, drawHeight * 0.2, 0, 0, Math.PI * 2)
    context.fill()
  }
}

function drawPetal(context, petal, renderX, renderY, time, sprites) {
  context.save()
  context.translate(renderX, renderY)
  context.rotate(petal.rotation)
  context.scale(1, petal.depth)

  const sprite = sprites[petal.spriteIndex]
  if (sprite) {
    drawSpritePetal(context, petal, time, sprite)
  } else {
    context.globalAlpha = petal.opacity
    drawFallbackPetal(context, petal, time)
  }

  context.restore()
}

function createSakuraSystem() {
  const reducedMotionMedia = window.matchMedia('(prefers-reduced-motion: reduce)')
  const isMobileMedia = window.matchMedia('(max-width: 768px)')

  let canvas = null
  let context = null
  let petals = []
  let sprites = []
  let width = window.innerWidth
  let height = window.innerHeight
  let frameId = null
  let previousTimestamp = null
  let running = false
  let currentWind = 0
  let gustStrength = 0
  let gustTarget = 0
  let gustTimeRemaining = 0
  const windSeedA = randomBetween(0, 100)
  const windSeedB = randomBetween(0, 100)
  let reducedMotionListenerBound = false

  function getLayerTargetCount(layer) {
    return isMobileMedia.matches ? layer.mobileCount : layer.desktopCount
  }

  function setSize() {
    width = window.innerWidth
    height = window.innerHeight
    if (canvas) {
      canvas.width = width
      canvas.height = height
    }
  }

  function syncPetalCount() {
    for (const layer of LAYERS) {
      const targetCount = getLayerTargetCount(layer)
      const currentInLayer = petals.filter(petal => petal.layer === layer.name)
      const shortCount = targetCount - currentInLayer.length

      if (shortCount > 0) {
        for (let index = 0; index < shortCount; index += 1) {
          petals.push(createPetal(layer, width, height, sprites))
        }
      }

      if (shortCount < 0) {
        let removeCount = Math.abs(shortCount)
        petals = petals.filter(petal => {
          if (petal.layer !== layer.name || removeCount === 0) return true
          removeCount -= 1
          return false
        })
      }
    }
  }

  function updateWind(deltaSeconds, time) {
    const skyBand = sampleSmoothNoise(time * 0.08, windSeedA, windSeedB) * 2 - 1
    const breeze = skyBand * 10

    gustTimeRemaining -= deltaSeconds
    if (gustTimeRemaining <= 0) {
      if (Math.random() < 0.06) {
        gustTarget = randomBetween(-24, 24)
        gustTimeRemaining = randomBetween(1.8, 4.4)
      } else {
        gustTarget = 0
        gustTimeRemaining = randomBetween(0.8, 2.2)
      }
    }

    const gustApproach = Math.min(deltaSeconds * 1.8, 1)
    gustStrength += (gustTarget - gustStrength) * gustApproach

    const targetWind = breeze + gustStrength
    const windApproach = Math.min(deltaSeconds * 1.2, 1)
    currentWind += (targetWind - currentWind) * windApproach
  }

  function render(timestamp) {
    if (!context) return

    if (previousTimestamp === null) {
      previousTimestamp = timestamp
    }

    const deltaSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.05)
    previousTimestamp = timestamp
    const time = timestamp / 1000

    updateWind(deltaSeconds, time)
    context.clearRect(0, 0, width, height)

    for (const petal of petals) {
      const yBand = Math.max(0, Math.min(1, petal.y / Math.max(height, 1)))
      const localNoise = sampleSmoothNoise(time * petal.turbulenceSpeed + yBand * 2.4, petal.swayPhase, petal.turbulencePhase) * 2 - 1
      const localWind = currentWind + localNoise * 8

      petal.y += petal.fallSpeed * petal.depth * deltaSeconds
      petal.x += localWind * deltaSeconds * petal.depth * 0.45
      petal.rotation += petal.rotationSpeed * deltaSeconds

      const swayOffset = Math.sin(time * petal.swayFrequency + petal.swayPhase) * petal.swayAmplitude
      const renderX = petal.x + swayOffset

      drawPetal(context, petal, renderX, petal.y, time, sprites)

      if (petal.y - petal.size > height + 20 || renderX < -90 || renderX > width + 90) {
        const layer = LAYERS.find(entry => entry.name === petal.layer)
        if (layer) {
          recyclePetal(petal, layer, width, height, sprites)
        }
      }
    }

    frameId = window.requestAnimationFrame(render)
  }

  function stop() {
    running = false
    if (frameId !== null) {
      window.cancelAnimationFrame(frameId)
      frameId = null
    }
    previousTimestamp = null
  }

  function start() {
    if (running || !context) return
    running = true
    frameId = window.requestAnimationFrame(render)
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      stop()
      return
    }

    if (!reducedMotionMedia.matches) {
      start()
    }
  }

  function handleResize() {
    setSize()
    syncPetalCount()
  }

  function handleReducedMotionChange(event) {
    if (event.matches) {
      stop()
      if (canvas && context) {
        context.clearRect(0, 0, width, height)
      }
      return
    }

    if (!canvas) {
      void mount()
      return
    }

    start()
  }

  async function mount() {
    if (!reducedMotionListenerBound) {
      reducedMotionMedia.addEventListener('change', handleReducedMotionChange)
      reducedMotionListenerBound = true
    }

    if (reducedMotionMedia.matches || document.getElementById('sakura-fall-canvas')) return

    canvas = document.createElement('canvas')
    canvas.id = 'sakura-fall-canvas'
    canvas.className = 'sakura-fall-layer'
    canvas.setAttribute('aria-hidden', 'true')
    context = canvas.getContext('2d')

    if (!context) return

    document.body.appendChild(canvas)
    setSize()
    sprites = await loadPetalSprites()
    syncPetalCount()

    window.addEventListener('resize', handleResize)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    isMobileMedia.addEventListener('change', syncPetalCount)

    start()
  }

  function destroy() {
    stop()
    window.removeEventListener('resize', handleResize)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    reducedMotionMedia.removeEventListener('change', handleReducedMotionChange)
    reducedMotionListenerBound = false
    isMobileMedia.removeEventListener('change', syncPetalCount)

    if (canvas) {
      canvas.remove()
      canvas = null
    }

    context = null
    petals = []
    sprites = []
  }

  return { mount, destroy }
}

export function initSakuraFall() {
  if (window.__sakuraFallMounted) return window.__sakuraFallMounted

  const sakuraSystem = createSakuraSystem()
  const run = () => {
    sakuraSystem.mount()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true })
  } else {
    run()
  }

  window.__sakuraFallMounted = sakuraSystem
  return sakuraSystem
}
