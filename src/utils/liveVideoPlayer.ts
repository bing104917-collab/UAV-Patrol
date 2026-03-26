import { ZLMRTCClient } from './ZLMRTCClient.js';

export { ZLMRTCClient };

export enum DJI_AI_OBJECT_TYPE {
  INVALID = 0,
  UNKNOWN = 1,
  PERSON = 2,
  CAR = 3,
  BOAT = 4
}

export interface AIObject {
  id: number;
  type: DJI_AI_OBJECT_TYPE;
  type_desc: string;
  state: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
  distance: number;
  confidence?: number;
  count?: number;
}

export interface AIGroup {
  type: number;
  count: number;
  objects: AIObject[];
}

export interface AIDetectionResult {
  version: number;
  time_stamp: number;
  frame_type: number;
  track_id: number;
  obj_group_count: number;
  groups: AIGroup[];
  error?: string;
}

export interface AIDetectionData {
  timestamp: number;
  objects: AIObject[];
  width: number;
  height: number;
}

export interface AIDetectionStatus {
  enabled: boolean;
  filterTypes: Record<DJI_AI_OBJECT_TYPE, boolean>;
  objects: AIObject[];
  typeCounts: Record<DJI_AI_OBJECT_TYPE, number>;
  lastUpdate: number;
}

export interface AIDetectionObject {
  id: number;
  type: DJI_AI_OBJECT_TYPE;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  trackId?: number;
}

export interface SEIParser {
  parseDJISEI(data: Uint8Array | ArrayBuffer | string): AIDetectionResult | { error: string };
  parseSEIPayload(buffer: Uint8Array, startOffset: number, dataView: DataView): AIDetectionResult | null;
  parseAIObjectData(dv: DataView, start: number): AIDetectionResult;
  removeH264EmulationBytes(bytes: Uint8Array): Uint8Array;
  getObjTypeName(typeCode: number): string;
  getObjTypeColor(type: DJI_AI_OBJECT_TYPE): string;
  filterObjectsByType(objects: AIObject[], allowedTypes: DJI_AI_OBJECT_TYPE[]): AIObject[];
  calculateObjectCountByType(groups: AIGroup[]): Record<DJI_AI_OBJECT_TYPE, number>;
  normalizeCoordinates(obj: AIObject, width: number, height: number): AIObject & { x: number; y: number; pixelX: number; pixelY: number; pixelWidth: number; pixelHeight: number };
}

export const SEIParser: SEIParser = {
  parseDJISEI(data: Uint8Array | ArrayBuffer | string): AIDetectionResult | { error: string } {
    let rawBytes: Uint8Array;

    if (typeof data === 'string') {
      if (data.startsWith('0x')) data = data.slice(2);
      const match = data.match(/.{1,2}/g);
      if (!match) return { error: '无效的Hex字符串' };
      rawBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
    } else if (data instanceof Uint8Array) {
      rawBytes = data;
    } else if (data instanceof ArrayBuffer) {
      rawBytes = new Uint8Array(data);
    } else {
      return { error: '不支持的数据类型' };
    }

    const buffer = this.removeH264EmulationBytes(rawBytes);
    const dataView = new DataView(buffer.buffer);
    let offset = 0;

    while (offset < buffer.length - 4) {
      if (buffer[offset] === 0x00 && buffer[offset + 1] === 0x00 && buffer[offset + 2] === 0x01) {
        const nalType = buffer[offset + 3] & 0x1F;
        
        if (nalType === 6) {
          const payloadResult = this.parseSEIPayload(buffer, offset + 4, dataView);
          if (payloadResult) return payloadResult;
        }
      }
      offset++;
    }

    return { error: '未找到AI数据' };
  },

  parseSEIPayload(buffer: Uint8Array, startOffset: number, dataView: DataView): AIDetectionResult | null {
    let offset = startOffset;
    
    while (offset < buffer.length) {
      let payloadType = 0;
      while (offset < buffer.length && buffer[offset] === 0xFF) {
        payloadType += 255;
        offset++;
      }
      if (offset >= buffer.length) break;
      payloadType += buffer[offset++];

      let payloadSize = 0;
      while (offset < buffer.length && buffer[offset] === 0xFF) {
        payloadSize += 255;
        offset++;
      }
      if (offset >= buffer.length) break;
      payloadSize += buffer[offset++];

      if (payloadType === 0xF5) {
        const payloadEnd = offset + payloadSize;
        let innerOffset = offset;
        
        while (innerOffset < payloadEnd - 4) {
          const subType = dataView.getUint16(innerOffset, true);
          const subLen = dataView.getUint16(innerOffset + 2, true);
          innerOffset += 4;

          if (subType === 0x0007) {
            return this.parseAIObjectData(dataView, innerOffset);
          }
          
          innerOffset += subLen;
        }
        
        offset += payloadSize;
      } else {
        offset += payloadSize;
      }
    }
    return null;
  },

  parseAIObjectData(dv: DataView, start: number): AIDetectionResult {
    let p = start;
    
    if (p + 22 > dv.byteLength) {
      return {
        version: 0,
        time_stamp: 0,
        frame_type: 0,
        track_id: 0,
        obj_group_count: 0,
        groups: [],
        error: '数据长度不足'
      };
    }

    const result: AIDetectionResult = {
      version: dv.getUint8(p),
      time_stamp: dv.getUint32(p + 1, true),
      frame_type: dv.getUint8(p + 5),
      track_id: dv.getUint16(p + 18, true),
      obj_group_count: dv.getUint8(p + 21),
      groups: []
    };
    
    p += 22;

    for (let i = 0; i < result.obj_group_count; i++) {
      if (p >= dv.byteLength) break;

      const groupType = dv.getUint8(p);
      const groupCount = dv.getUint8(p + 1);
      p += 2;

      const groupData: AIGroup = {
        type: groupType,
        count: groupCount,
        objects: []
      };

      if (groupType === 10) {
        for (let j = 0; j < groupCount; j++) {
          if (p + 16 > dv.byteLength) break;

          const obj: AIObject = {
            id: dv.getUint16(p, true),
            type: dv.getUint8(p + 2),
            type_desc: this.getObjTypeName(dv.getUint8(p + 2)),
            state: dv.getUint8(p + 3),
            cx: dv.getUint16(p + 4, true),
            cy: dv.getUint16(p + 6, true),
            w: dv.getUint16(p + 8, true),
            h: dv.getUint16(p + 10, true),
            distance: dv.getUint32(p + 12, true)
          };
          groupData.objects.push(obj);
          p += 16;
        }
      } else {
        for (let j = 0; j < groupCount; j++) {
          if (p + 3 > dv.byteLength) break;

          const obj: AIObject = {
            id: j,
            type: dv.getUint8(p),
            type_desc: this.getObjTypeName(dv.getUint8(p)),
            state: 0,
            cx: 0,
            cy: 0,
            w: 0,
            h: 0,
            distance: 0,
            count: dv.getUint16(p + 1, true)
          };
          groupData.objects.push(obj);
          p += 3;
        }
      }

      result.groups.push(groupData);
    }

    return result;
  },

  getObjTypeName(typeCode: number): string {
    const types: Record<number, string> = {
      0: '无效 (Invalid)',
      1: '未知 (Unknown)',
      2: '人 (Person)',
      3: '车 (Car)',
      4: '船 (Boat)'
    };
    return types[typeCode] || `未知类型(${typeCode})`;
  },

  getObjTypeColor(type: DJI_AI_OBJECT_TYPE): string {
    const colors: Record<DJI_AI_OBJECT_TYPE, string> = {
      [DJI_AI_OBJECT_TYPE.INVALID]: '#999999',
      [DJI_AI_OBJECT_TYPE.UNKNOWN]: '#FFFFFF',
      [DJI_AI_OBJECT_TYPE.PERSON]: '#FF6B6B',
      [DJI_AI_OBJECT_TYPE.CAR]: '#4ECDC4',
      [DJI_AI_OBJECT_TYPE.BOAT]: '#45B7D1'
    };
    return colors[type] || '#FFFFFF';
  },

  filterObjectsByType(objects: AIObject[], allowedTypes: DJI_AI_OBJECT_TYPE[]): AIObject[] {
    return objects.filter(obj => allowedTypes.includes(obj.type));
  },

  calculateObjectCountByType(groups: AIGroup[]): Record<DJI_AI_OBJECT_TYPE, number> {
    const counts: Record<number, number> = {
      [DJI_AI_OBJECT_TYPE.INVALID]: 0,
      [DJI_AI_OBJECT_TYPE.UNKNOWN]: 0,
      [DJI_AI_OBJECT_TYPE.PERSON]: 0,
      [DJI_AI_OBJECT_TYPE.CAR]: 0,
      [DJI_AI_OBJECT_TYPE.BOAT]: 0
    };

    groups.forEach(group => {
      group.objects.forEach(obj => {
        if (obj.type in counts) {
          counts[obj.type]++;
        }
      });
    });

    return counts as Record<DJI_AI_OBJECT_TYPE, number>;
  },

  normalizeCoordinates(obj: AIObject, width: number, height: number): AIObject & { x: number; y: number; pixelX: number; pixelY: number; pixelWidth: number; pixelHeight: number } {
    return {
      ...obj,
      x: obj.cx / 10000,
      y: obj.cy / 10000,
      width: obj.w / 10000,
      height: obj.h / 10000,
      pixelX: Math.round((obj.cx / 10000) * width),
      pixelY: Math.round((obj.cy / 10000) * height),
      pixelWidth: Math.round((obj.w / 10000) * width),
      pixelHeight: Math.round((obj.h / 10000) * height)
    };
  },

  removeH264EmulationBytes(bytes: Uint8Array): Uint8Array {
    const newBuffer: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
      if (i >= 2 && bytes[i] === 0x03 && bytes[i - 1] === 0x00 && bytes[i - 2] === 0x00) {
        continue;
      }
      newBuffer.push(bytes[i]);
    }
    return new Uint8Array(newBuffer);
  }
};

export function getBoxColor(type: DJI_AI_OBJECT_TYPE): string {
  switch (type) {
    case DJI_AI_OBJECT_TYPE.PERSON: return '#FF6B6B';
    case DJI_AI_OBJECT_TYPE.CAR: return '#4ECDC4';
    case DJI_AI_OBJECT_TYPE.BOAT: return '#45B7D1';
    default: return '#FFFFFF';
  }
}

export function getTypeName(type: DJI_AI_OBJECT_TYPE): string {
  switch (type) {
    case DJI_AI_OBJECT_TYPE.PERSON: return '人';
    case DJI_AI_OBJECT_TYPE.CAR: return '车';
    case DJI_AI_OBJECT_TYPE.BOAT: return '船';
    default: return '未知';
  }
}

export function createDefaultAIDetectionStatus(): AIDetectionStatus {
  return {
    enabled: false,
    filterTypes: {
      [DJI_AI_OBJECT_TYPE.INVALID]: true,
      [DJI_AI_OBJECT_TYPE.UNKNOWN]: true,
      [DJI_AI_OBJECT_TYPE.PERSON]: true,
      [DJI_AI_OBJECT_TYPE.CAR]: true,
      [DJI_AI_OBJECT_TYPE.BOAT]: true,
    },
    objects: [],
    typeCounts: {
      [DJI_AI_OBJECT_TYPE.INVALID]: 0,
      [DJI_AI_OBJECT_TYPE.UNKNOWN]: 0,
      [DJI_AI_OBJECT_TYPE.PERSON]: 0,
      [DJI_AI_OBJECT_TYPE.CAR]: 0,
      [DJI_AI_OBJECT_TYPE.BOAT]: 0,
    },
    lastUpdate: 0
  };
}

export interface PlayerOptions {
  element: HTMLVideoElement;
  liveSn: string;
  liveType?: string;
  debug?: boolean;
  onSEIData?: (data: any) => void;
  onError?: (error: Error) => void;
  onPlay?: () => void;
  onConnectionStateChange?: (state: string) => void;
}

export interface PlayerInstance {
  player: any;
  videoElement: HTMLVideoElement;
  streamId: string;
  retryCount: number;
  isPlaying: boolean;
  isDestroyed: boolean;
}

class LiveVideoPlayerManager {
  private static instance: LiveVideoPlayerManager;
  private players: Map<string, PlayerInstance> = new Map();
  private readonly MAX_RETRIES = 10;
  private readonly RETRY_INTERVAL = 3000;

  static getInstance(): LiveVideoPlayerManager {
    if (!LiveVideoPlayerManager.instance) {
      LiveVideoPlayerManager.instance = new LiveVideoPlayerManager();
    }
    return LiveVideoPlayerManager.instance;
  }

  createPlayer(options: PlayerOptions): PlayerInstance {
    const { element, liveSn, liveType = '165-0-7', debug = false, onSEIData, onError, onPlay, onConnectionStateChange } = options;
    const streamId = `${liveSn}-${liveType}`;

    if (this.players.has(streamId)) {
      this.closePlayer(streamId);
    }

    const playerInstance: PlayerInstance = {
      player: null,
      videoElement: element,
      streamId,
      retryCount: 0,
      isPlaying: false,
      isDestroyed: false
    };

    this.players.set(streamId, playerInstance);
    this.initializePlayer(playerInstance, { liveSn, liveType, debug, onSEIData, onError, onPlay, onConnectionStateChange });

    return playerInstance;
  }

  private initializePlayer(instance: PlayerInstance, options: Omit<PlayerOptions, 'element'>): void {
    const { liveSn, liveType, debug, onSEIData, onError, onPlay, onConnectionStateChange } = options;
    const videoDom = instance.videoElement;

    if (!videoDom) {
      if (instance.retryCount < this.MAX_RETRIES) {
        instance.retryCount++;
        setTimeout(() => {
          if (!instance.isDestroyed) {
            this.initializePlayer(instance, options);
          }
        }, this.RETRY_INTERVAL);
      }
      return;
    }

    this.closePlayer(instance.streamId);

    const zlmsdpUrl = `${import.meta.env.VITE_RTC_URL}/webrtc?app=live&stream=${liveSn}-${liveType}&type=play`;

    if (debug) {
      console.log(`[LiveVideoPlayer-${instance.streamId}] 初始化播放器:`, zlmsdpUrl);
    }

    try {
      instance.player = new ZLMRTCClient.Endpoint({
        element: videoDom,
        debug,
        zlmsdpUrl,
        simulecast: false,
        useCamera: false,
        audioEnable: true,
        videoEnable: true,
        recvOnly: true,
        usedatachannel: false
      });

      this.setupEventListeners(instance, { onSEIData, onError, onPlay, onConnectionStateChange, debug });
      this.setupSEIInterception(instance, onSEIData, debug);
    } catch (error) {
      console.error(`[LiveVideoPlayer-${instance.streamId}] 初始化播放器失败:`, error);
      onError?.(error as Error);
    }
  }

  private setupEventListeners(instance: PlayerInstance, callbacks: { onSEIData?: (data: any) => void; onError?: (error: Error) => void; onPlay?: () => void; onConnectionStateChange?: (state: string) => void; debug?: boolean }): void {
    const { onSEIData, onError, onPlay, onConnectionStateChange, debug } = callbacks;

    instance.player.on(ZLMRTCClient.Events.WEBRTC_ICE_CANDIDATE_ERROR, () => {
      if (debug) console.warn(`[LiveVideoPlayer-${instance.streamId}] ICE协商出错`);
    });

    instance.player.on(ZLMRTCClient.Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, (e: any) => {
      if (debug) console.warn(`[LiveVideoPlayer-${instance.streamId}] Offer/Answer交换失败:`, e);
      this.handleConnectionFailure(instance, callbacks);
    });

    instance.player.on(ZLMRTCClient.Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, (state: string) => {
      onConnectionStateChange?.(state);
      if (debug) console.log(`[LiveVideoPlayer-${instance.streamId}] 连接状态变化:`, state);
    });

    instance.player.on(ZLMRTCClient.Events.WEBRTC_ON_REMOTE_STREAMS, (e: any) => {
      if (debug) console.log(`[LiveVideoPlayer-${instance.streamId}] 收到远程流`);
      this.handleRemoteStream(instance, e, { onSEIData, onError, onPlay, debug });
    });
  }

  private handleRemoteStream(instance: PlayerInstance, e: any, callbacks: { onSEIData?: (data: any) => void; onError?: (error: Error) => void; onPlay?: () => void; debug?: boolean }): void {
    const { onSEIData, onError, onPlay, debug } = callbacks;
    const videoDom = instance.videoElement;
    const stream = e.streams?.[0];

    if (!stream || !videoDom) {
      console.warn(`[LiveVideoPlayer-${instance.streamId}] 无法获取远程流或视频元素`);
      return;
    }

    const pc = instance.player?._pc || instance.player?.pc || instance.player?.peerConnection;

    if (pc) {
      this.setupSEIInterception(instance, onSEIData, debug);
    }

    videoDom.srcObject = stream;
    videoDom.play()
      .then(() => {
        instance.isPlaying = true;
        onPlay?.();
        if (debug) console.log(`[LiveVideoPlayer-${instance.streamId}] 开始播放`);
      })
      .catch((error: Error) => {
        console.warn(`[LiveVideoPlayer-${instance.streamId}] 播放失败:`, error);
        onError?.(error);
      });
  }

  private setupSEIInterception(instance: PlayerInstance, onSEIData?: (data: any) => void, debug?: boolean): void {
    try {
      const pc = instance.player?._pc || instance.player?.pc || instance.player?.peerConnection;

      if (!pc) {
        console.warn(`[LiveVideoPlayer-${instance.streamId}] 无法获取RTCPeerConnection`);
        return;
      }

      const receivers = pc.getReceivers();
      const videoReceiver = receivers.find((r: RTCRtpReceiver) => r.track?.kind === 'video');

      if (videoReceiver && (videoReceiver as any).createEncodedStreams) {
        const encodedStreams = (videoReceiver as any).createEncodedStreams();
        const { readable, writable } = encodedStreams;

        const transformer = new TransformStream({
          transform(encodedChunk: any, controller: any) {
            try {
              const buffer = new Uint8Array(encodedChunk.data);
              const seiData = SEIParser.parseDJISEI(buffer);

              if ('error' in seiData === false && onSEIData) {
                onSEIData({
                  ...seiData,
                  timestamp: Date.now(),
                  streamId: instance.streamId
                });
              }
            } catch (err) {
            }

            controller.enqueue(encodedChunk);
          }
        });

        readable
          .pipeThrough(transformer)
          .pipeTo(writable)
          .catch((err: Error) => console.warn(`[LiveVideoPlayer-${instance.streamId}] Pipeline错误:`, err));
      }
    } catch (error) {
      console.warn(`[LiveVideoPlayer-${instance.streamId}] SEI拦截设置失败:`, error);
    }
  }

  private handleConnectionFailure(instance: PlayerInstance, callbacks: { onSEIData?: (data: any) => void; onError?: (error: Error) => void; onPlay?: () => void; onConnectionStateChange?: (state: string) => void; debug?: boolean }): void {
    if (instance.retryCount < this.MAX_RETRIES) {
      instance.retryCount++;
      const { debug } = callbacks;
      if (debug) console.log(`[LiveVideoPlayer-${instance.streamId}] 重试连接 (${instance.retryCount}/${this.MAX_RETRIES})`);
      setTimeout(() => {
        if (!instance.isDestroyed) {
          this.initializePlayer(instance, {
            liveSn: instance.streamId.split('-')[0],
            liveType: instance.streamId.split('-')[1],
            debug,
            onSEIData: callbacks.onSEIData,
            onError: callbacks.onError,
            onPlay: callbacks.onPlay,
            onConnectionStateChange: callbacks.onConnectionStateChange
          });
        }
      }, this.RETRY_INTERVAL);
    } else {
      console.error(`[LiveVideoPlayer-${instance.streamId}] 达到最大重试次数，连接失败`);
      callbacks.onError?.(new Error('达到最大重试次数，连接失败'));
    }
  }

  refreshPlayer(streamId: string): void {
    const instance = this.players.get(streamId);
    if (instance) {
      instance.retryCount = 0;
      instance.isPlaying = false;
      this.closePlayer(streamId);
      
      setTimeout(() => {
        if (!instance.isDestroyed) {
          const liveSn = streamId.split('-')[0];
          const liveType = streamId.split('-')[1] || '165-0-7';
          this.initializePlayer(instance, { liveSn, liveType });
        }
      }, 100);
    }
  }

  closePlayer(streamId: string): void {
    const instance = this.players.get(streamId);
    if (instance) {
      try {
        if (instance.player) {
          instance.player.close();
        }
      } catch (error) {
        console.warn(`[LiveVideoPlayer-${streamId}] 关闭播放器失败:`, error);
      }
      
      if (instance.videoElement) {
        instance.videoElement.srcObject = null;
      }
      
      instance.player = null;
      instance.isPlaying = false;
      instance.retryCount = 0;
    }
  }

  closeAllPlayers(): void {
    this.players.forEach((_, streamId) => {
      this.closePlayer(streamId);
    });
    this.players.clear();
  }

  getPlayer(streamId: string): PlayerInstance | undefined {
    return this.players.get(streamId);
  }

  getAllPlayers(): Map<string, PlayerInstance> {
    return new Map(this.players);
  }

  hasPlayer(streamId: string): boolean {
    return this.players.has(streamId);
  }

  getPlayingCount(): number {
    let count = 0;
    this.players.forEach(instance => {
      if (instance.isPlaying) count++;
    });
    return count;
  }
}

export const liveVideoPlayerManager = LiveVideoPlayerManager.getInstance();

export function createLivePlayer(options: PlayerOptions): PlayerInstance {
  return liveVideoPlayerManager.createPlayer(options);
}

export function refreshLivePlayer(streamId: string): void {
  liveVideoPlayerManager.refreshPlayer(streamId);
}

export function closeLivePlayer(streamId: string): void {
  liveVideoPlayerManager.closePlayer(streamId);
}

export function closeAllLivePlayers(): void {
  liveVideoPlayerManager.closeAllPlayers();
}

export function getLivePlayer(streamId: string): PlayerInstance | undefined {
  return liveVideoPlayerManager.getPlayer(streamId);
}

export { SEIParser as SeiParser };
export default {
  SEIParser,
  DJI_AI_OBJECT_TYPE,
  liveVideoPlayerManager,
  createLivePlayer,
  refreshLivePlayer,
  closeLivePlayer,
  closeAllLivePlayers,
  getLivePlayer,
  getBoxColor,
  getTypeName,
  createDefaultAIDetectionStatus
};
