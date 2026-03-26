<template>
  <div class="live-video-player" :class="{ 'is-loading': isLoading }">
    <video
      v-if="liveSn"
      ref="videoRef"
      :src="props.isMock ? props.mockUrl : ''"
      :autoplay="autoplay"
      :muted="muted"
      :playsinline="true"
      webkit-playsinline=""
      x5-playsinline=""
      x5-video-player-type="h5"
      x-webkit-airplay="allow"
      preload="auto"
      loop
      style="width: 100%; height: 100%; object-fit: cover;"
      @canplay="handleCanPlay"
      @error="handleError"
    >
      您的浏览器太旧，不支持HTML5视频。
    </video>

    <!-- 模擬標籤 -->
    <div v-if="props.isMock" class="absolute top-2 right-2 bg-yellow-500/80 px-1 text-[8px] text-black font-bold rounded">
      MOCK VIDEO
    </div>

    
    <!-- AI 識別疊加層 -->
    <canvas 
      ref="aiCanvasRef" 
      class="absolute inset-0 pointer-events-none w-full h-full"
    ></canvas>
    <div v-show="isLoading" class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
    <slot name="controls"></slot>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { SEIParser, ZLMRTCClient } from '@/utils/liveVideoPlayer';

defineOptions({ name: 'LiveVideoPlayer' });

interface Props {
  liveSn?: string;
  liveType?: string;
  autoplay?: boolean;
  muted?: boolean;
  debug?: boolean;
  isMock?: boolean;
  mockUrl?: string;
}

const props = withDefaults(defineProps<Props>(), {
  liveSn: '',
  liveType: '165-0-7',
  autoplay: true,
  muted: true,
  debug: false,
  isMock: false,
  mockUrl: 'https://vjs.zencdn.net/v/oceans.mp4'
});

interface EmitEvents {
  (e: 'ready'): void;
  (e: 'play'): void;
  (e: 'error', error: Error): void;
  (e: 'sei-data', data: any): void;
  (e: 'connection-state-change', state: string): void;
}

const emit = defineEmits<EmitEvents>();

const videoRef = ref<HTMLVideoElement | null>(null);
const player = ref<any>(null);
const isLoading = ref(true);
const isPlaying = ref(false);
const currentRetryCount = ref(0);
const isDestroyed = ref(false);

const MAX_RETRIES = 10;
const RETRY_INTERVAL = 3000;

const closePlayer = () => {
  if (player.value) {
    try {
      player.value.close();
      player.value = null;
    } catch (error) {
      console.warn('关闭播放器失败:', error);
    }
  }
  if (videoRef.value) {
    videoRef.value.srcObject = null;
  }
  currentRetryCount.value = 0;
  isPlaying.value = false;
};

const initPlayer = () => {
  if (!props.liveSn || isDestroyed.value) return;
  
  if (props.isMock) {
    isLoading.value = false;
    isPlaying.value = true;
    return;
  }
  
  const videoDom = videoRef.value;
  if (!videoDom) {
    if (currentRetryCount.value < MAX_RETRIES) {
      currentRetryCount.value++;
      setTimeout(initPlayer, RETRY_INTERVAL);
    }
    return;
  }

  closePlayer();

  const zlmsdpUrl = `${import.meta.env.VITE_RTC_URL}/webrtc?app=live&stream=${props.liveSn}-${props.liveType}&type=play`;
  
  if (props.debug) {
    console.log(`[LiveVideoPlayer-${props.liveSn}] 初始化播放器:`, zlmsdpUrl);
  }

  try {
    player.value = new ZLMRTCClient.Endpoint({
      element: videoDom,
      debug: props.debug,
      zlmsdpUrl: zlmsdpUrl,
      simulecast: false,
      useCamera: false,
      audioEnable: true,
      videoEnable: true,
      recvOnly: true,
      usedatachannel: false
    });

    setupPlayerEventListeners();
    startSEIInterception();
  } catch (error) {
    console.error(`[LiveVideoPlayer-${props.liveSn}] 初始化播放器失败:`, error);
    emit('error', error as Error);
  }
};

const setupPlayerEventListeners = () => {
  if (!player.value) return;

  player.value.on(ZLMRTCClient.Events.WEBRTC_ICE_CANDIDATE_ERROR, () => {
    console.warn(`[LiveVideoPlayer-${props.liveSn}] ICE协商出错`);
  });

  player.value.on(ZLMRTCClient.Events.WEBRTC_OFFER_ANWSER_EXCHANGE_FAILED, (e: any) => {
    console.warn(`[LiveVideoPlayer-${props.liveSn}] Offer/Answer交换失败:`, e);
    handleConnectionFailure();
  });

  player.value.on(ZLMRTCClient.Events.WEBRTC_ON_CONNECTION_STATE_CHANGE, (state: string) => {
    emit('connection-state-change', state);
    if (props.debug) {
      console.log(`[LiveVideoPlayer-${props.liveSn}] 连接状态变化:`, state);
    }
  });

  player.value.on(ZLMRTCClient.Events.WEBRTC_ON_REMOTE_STREAMS, (e: any) => {
    if (props.debug) {
      console.log(`[LiveVideoPlayer-${props.liveSn}] 收到远程流`);
    }
    handleRemoteStream(e);
  });
};

const handleRemoteStream = (e: any) => {
  const videoDom = videoRef.value;
  const stream = e.streams?.[0];
  
  if (!stream || !videoDom) {
    console.warn(`[LiveVideoPlayer-${props.liveSn}] 无法获取远程流或视频元素`);
    return;
  }

  const pc = player.value?._pc || player.value?.pc || player.value?.peerConnection;
  
  if (pc) {
    setupSEIInterception(pc);
  }

  videoDom.srcObject = stream;
  videoDom.play()
    .then(() => {
      isPlaying.value = true;
      isLoading.value = false;
      emit('play');
      if (props.debug) {
        console.log(`[LiveVideoPlayer-${props.liveSn}] 开始播放`);
      }
    })
    .catch((error: Error) => {
      console.warn(`[LiveVideoPlayer-${props.liveSn}] 播放失败:`, error);
      emit('error', error);
    });
};

const setupSEIInterception = (pc: RTCPeerConnection) => {
  try {
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
            
            if (seiData && !('error' in seiData)) {
              emit('sei-data', {
                ...seiData,
                timestamp: Date.now(),
                streamId: props.liveSn
              });
            }
          } catch (err) {
            // 静默处理SEI解析错误
          }
          
          controller.enqueue(encodedChunk);
        }
      });

      readable
        .pipeThrough(transformer)
        .pipeTo(writable)
        .catch((err: Error) => console.warn(`[LiveVideoPlayer-${props.liveSn}] Pipeline错误:`, err));
    }
  } catch (error) {
    console.warn(`[LiveVideoPlayer-${props.liveSn}] SEI拦截设置失败:`, error);
  }
};

const startSEIInterception = () => {};

const handleConnectionFailure = () => {
  if (currentRetryCount.value < MAX_RETRIES) {
    currentRetryCount.value++;
    if (props.debug) {
      console.log(`[LiveVideoPlayer-${props.liveSn}] 重试连接 (${currentRetryCount.value}/${MAX_RETRIES})`);
    }
    setTimeout(initPlayer, RETRY_INTERVAL);
  } else {
    console.error(`[LiveVideoPlayer-${props.liveSn}] 达到最大重试次数，连接失败`);
    emit('error', new Error('达到最大重试次数，连接失败'));
  }
};

const handleCanPlay = () => {
  isLoading.value = false;
  emit('ready');
};

const handleError = (event: Event) => {
  const video = event.target as HTMLVideoElement;
  console.error(`[LiveVideoPlayer-${props.liveSn}] 视频错误:`, video.error);
  isLoading.value = false;
  const error = video.error ? new Error(video.error.message || '视频播放错误') : new Error('视频播放错误');
  emit('error', error);
};

const play = () => {
  if (videoRef.value) {
    videoRef.value.play().catch((error: Error) => {
      console.warn(`[LiveVideoPlayer-${props.liveSn}] 手动播放失败:`, error);
    });
  }
};

const pause = () => {
  if (videoRef.value) {
    videoRef.value.pause();
  }
};

const refresh = () => {
  isLoading.value = true;
  currentRetryCount.value = 0;
  closePlayer();
  nextTick(() => {
    initPlayer();
  });
};

defineExpose({
  videoRef,
  player,
  play,
  pause,
  refresh,
  close: closePlayer,
  isPlaying
});

watch(() => props.liveSn, (newSn, oldSn) => {
  if (newSn && newSn !== oldSn) {
    isLoading.value = true;
    currentRetryCount.value = 0;
    closePlayer();
    nextTick(() => {
      initPlayer();
    });
  }
});

onMounted(() => {
  isDestroyed.value = false;
  nextTick(() => {
    initPlayer();
  });
});

onBeforeUnmount(() => {
  isDestroyed.value = true;
  closePlayer();
});
</script>

<style scoped lang="scss">
.live-video-player {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: #000;
  overflow: hidden;

  &.is-loading {
    .loading-overlay {
      display: flex;
    }
  }

  .loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: none;
    justify-content: center;
    align-items: center;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 10;

    .loading-spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #409EFF;
      animation: spin 1s linear infinite;
    }
  }

  video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
