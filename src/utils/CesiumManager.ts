import * as Cesium from 'cesium'
import {
  Viewer,
  Cartesian3,
  PerspectiveFrustum,
  Ion,
  WebMapTileServiceImageryProvider,
  OpenStreetMapImageryProvider,
  ArcGisMapServerImageryProvider,
  UrlTemplateImageryProvider,
  DebugCameraPrimitive,
  Color,
  Cartographic,
  ScreenSpaceEventType,
  Camera,
  SceneMode,
  Math as CesiumMath,
  EllipsoidTerrainProvider,
  ArcGISTiledElevationTerrainProvider
} from 'cesium'
import {
  BASE_PITCH,
  BASE_HEADING,
  BASE_ROLL,
  IDEAL_BASE_PITCH,
  BASE_FAR,
  BASE_NEAR,
  BASE_FOV
} from './constants'

import { calculateFov } from './tool'

export const initConfig: any = {
  skyBox: false,
  skyAtmosphere: false,
  antialias: false,
  animation: false,
  baseLayerPicker: false,
  fullscreenButton: false,
  geocoder: false,
  homeButton: false,
  infoBox: false,
  sceneModePicker: false,
  locale: 'zh-CN',
  selectionIndicator: false,
  navigationInstructionsInitiallyVisible: false,
  timeline: false,
  navigationHelpButton: false,
  zoom: false,
  compass: false,
  distanceLegend: false,
  requestRenderMode: true,
  maximumRenderTimeChange: Infinity,
  maximumScreenSpaceError: 32,
  maximumNumberOfLoadedTiles: 512,
  skipLevelOfDetail: true,
  baseScreenSpaceError: 1024,
  scene3DOnly: true,
  dynamicScreenSpaceError: true,
  shadows: false,
  baseUrl: '/cesium/',
  tileCacheSize: 100,
  contextOptions: {
    webgl: {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance'
    }
  }
}

interface Position {
  longitude: number
  latitude: number
  height: number
}

class CesiumManager {
  viewer: Viewer | null = null
  entities: Cesium.Entity[] = []
  _initPromise: Promise<Viewer | null> | null = null
  _eventHandlers: Record<string, Function[]> = {
    click: [],
    mousemove: []
  }
  currentPrimitivesCamera: Camera | null = null
  currentPrimitive: DebugCameraPrimitive | null = null

  async init(container: HTMLElement, options = {}) {
    if (this._initPromise) return this._initPromise

    const apiKeys = [
      '1ae257dc274381bc5f14e3e8b8957312',
      '6519adb5c95e116ccef862284932b551'
    ]
    const getRandomApiKey = () => apiKeys[Math.floor(Math.random() * apiKeys.length)]

    this._initPromise = new Promise(async (resolve) => {
      try {
        // 1. 使用高德衛星影像 (國內訪問最穩定)
        const imageryProvider = new UrlTemplateImageryProvider({
          url: 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}',
          minimumLevel: 1,
          maximumLevel: 18
        })

        const defaultOptions = {
          imageryProvider: imageryProvider,
          ...initConfig,
          ...options
        }

        this.viewer = new Viewer(container, defaultOptions)
        // @ts-ignore
        this.viewer._cesiumWidget._creditContainer.style.display = 'none'

        // 設置固定分辨率，防止高分屏自動調整導致的佈局抖動
        this.viewer.resolutionScale = 1.0
        this.viewer.useBrowserRecommendedResolution = false

        this.viewer.scene.mode = SceneMode.SCENE3D
        this.viewer.scene.backgroundColor = Color.BLACK
        this.viewer.scene.globe.baseColor = Color.BLACK
        
        // 禁用碰撞檢測和自動縮放相關設置
        this.viewer.scene.screenSpaceCameraController.enableCollisionDetection = false
        this.viewer.scene.screenSpaceCameraController.minimumZoomDistance = 100
        this.viewer.scene.screenSpaceCameraController.maximumZoomDistance = 10000

        // 2. 添加高德路網/注記層
        try {
          const labelImagery = new UrlTemplateImageryProvider({
            url: 'https://wprd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&style=8&x={x}&y={y}&z={z}',
            minimumLevel: 1,
            maximumLevel: 18
          })
          this.viewer.imageryLayers.addImageryProvider(labelImagery)
        } catch (e) {
          console.warn('高德注記圖層加載失敗')
        }

        // 3. 移除地形服務，避免與相機高度衝突導致自動縮放
        this.viewer.terrainProvider = new EllipsoidTerrainProvider()

        this._initEventListeners()

        const removeListener = this.viewer.scene.postRender.addEventListener(() => {
          if (this.viewer && this.viewer.scene.globe.tilesLoaded) {
            removeListener()
            resolve(this.viewer)
          }
        })
      } catch (error) {
        console.error('Cesium initialization failed:', error)
        resolve(null)
      }
    })

    return this._initPromise
  }

  conversion(cartesian: Cartesian3): Position {
    const cartographic = Cartographic.fromCartesian(cartesian)
    return {
      longitude: CesiumMath.toDegrees(cartographic.longitude),
      latitude: CesiumMath.toDegrees(cartographic.latitude),
      height: cartographic.height
    }
  }

  _initEventListeners() {
    if (!this.viewer) return

    this.viewer.screenSpaceEventHandler.setInputAction((movement: any) => {
      const pickedObject = this.viewer?.scene.pick(movement.position)
      let ray = this.viewer?.camera.getPickRay(movement.position)
      if (ray && this.viewer) {
        let cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene)
        if (cartesian) {
          const position = this.conversion(cartesian)
          this._eventHandlers.click.forEach((handler) => handler(position, pickedObject))
        }
      }
    }, ScreenSpaceEventType.LEFT_CLICK)
  }

  on(eventType: string, callback: Function) {
    if (!this._eventHandlers[eventType]) {
      this._eventHandlers[eventType] = []
    }
    this._eventHandlers[eventType].push(callback)
    return () => this.off(eventType, callback)
  }

  off(eventType: string, callback: Function) {
    if (this._eventHandlers[eventType]) {
      const index = this._eventHandlers[eventType].indexOf(callback)
      if (index !== -1) {
        this._eventHandlers[eventType].splice(index, 1)
      }
    }
  }

  addEntity(options: Cesium.Entity.ConstructorOptions) {
    if (!this.viewer) return null
    const entity = this.viewer.entities.add(options)
    this.entities.push(entity)
    return entity
  }

  updateDroneMarker(position: Position, heading: number) {
    if (!this.viewer) return
    
    // 禁用選中和跟隨功能，徹底杜絕自動縮放
    this.viewer.trackedEntity = undefined
    this.viewer.selectedEntity = undefined

    const id = 'drone-marker'
    let entity = this.viewer.entities.getById(id)
    // 固定標記高度在 50m，防止模擬數據中高度波動導致相機跟隨抖動/縮放
    const cartesian = Cartesian3.fromDegrees(position.longitude, position.latitude, 50)

    if (!entity) {
      entity = this.viewer.entities.add({
        id,
        position: cartesian,
        billboard: {
          image: '/uav.png', // 使用更專業的無人機圖示
          width: 48,
          height: 48,
          rotation: CesiumMath.toRadians(-heading),
          verticalOrigin: Cesium.VerticalOrigin.CENTER
        },
        label: {
          text: '巡邏無人機',
          font: '12px sans-serif',
          fillColor: Color.WHITE,
          outlineColor: Color.BLACK,
          outlineWidth: 2,
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          pixelOffset: new Cesium.Cartesian2(0, -40)
        }
      })
    } else {
      entity.position = cartesian as any
      if (entity.billboard) {
        entity.billboard.rotation = CesiumMath.toRadians(-heading) as any
      }
    }
  }

  flyTo(position: Position, orientation?: { heading?: number; pitch?: number }, options: any = {}) {
    if (!this.viewer) return
    
    // 禁用實體跟隨
    this.viewer.trackedEntity = undefined
    
    // 如果 duration 為 0，直接跳轉以防止動畫干擾
    if (options.duration === 0) {
      this.viewer.camera.setView({
        destination: Cartesian3.fromDegrees(position.longitude, position.latitude, position.height || 1000),
        orientation: {
          heading: CesiumMath.toRadians(orientation?.heading || 0),
          pitch: CesiumMath.toRadians(orientation?.pitch || IDEAL_BASE_PITCH),
          roll: 0
        }
      })
      return
    }

    this.viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(position.longitude, position.latitude, position.height || 1000),
      orientation: {
        heading: CesiumMath.toRadians(orientation?.heading || 0),
        pitch: CesiumMath.toRadians(orientation?.pitch || IDEAL_BASE_PITCH),
        roll: 0
      },
      duration: 1,
      ...options
    })
  }

  destroy() {
    if (this.viewer && !this.viewer.isDestroyed()) {
      this.viewer.entities.removeAll()
      this.viewer.destroy()
      this.viewer = null
      this._initPromise = null
    }
  }
}

const cesiumManager = new CesiumManager()
export default cesiumManager
