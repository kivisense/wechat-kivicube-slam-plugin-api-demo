import {
  errorHandler,
  showAuthModal,
  downloadFile,
} from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      downloadFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/slam.mp4"
      ),
      downloadFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/glow.mp4"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [videoPath, alphaVideoPath] = await this.downloadAsset;
      // 当视频因为特殊原因不能显示时，会使用此处指定的缩略图展示。为空则降级缩略图功能无效。
      const defaultThumbnailUrl = "";
      const [video3d, alphaVideo3d] = await Promise.all([
        slam.createVideo(videoPath, defaultThumbnailUrl),
        slam.createAlphaVideo(alphaVideoPath, defaultThumbnailUrl),
      ]);

      video3d.name = "video3d";
      alphaVideo3d.name = "alphaVideo3d";

      const onPlay = function () {
        console.log(`视频(${this.name})播放`);
      };
      const onPause = function () {
        console.log(`视频(${this.name})暂停，${this.currentTime}s`);
      };
      const onEnded = function () {
        console.log(`视频(${this.name})自然播放完毕`);
      };
      const onFullScreenChange = function (e) {
        console.log(`视频(${this.name})全屏状态变更`);
        // 参考：https://developers.weixin.qq.com/miniprogram/dev/component/video.html
        // 之中bindfullscreenchange事件说明。
        console.log(`视频(${this.name}) fullScreen: ${e.fullScreen}`);
        console.log(`视频(${this.name}) direction: ${e.direction}`);
      };

      video3d.addEventListener("play", onPlay);
      video3d.addEventListener("pause", onPause);
      video3d.addEventListener("ended", onEnded);
      video3d.addEventListener("fullScreenChange", onFullScreenChange);

      alphaVideo3d.addEventListener("play", onPlay);
      alphaVideo3d.addEventListener("pause", onPause);
      alphaVideo3d.addEventListener("ended", onEnded);
      alphaVideo3d.addEventListener("fullScreenChange", onFullScreenChange);

      console.log(video3d.paused); // 只读属性，获取当前播放/暂停状态
      console.log(video3d.currentTime); // 只读属性，获取当前播放时间。因小程序限制，每隔250ms才会有一次变更。

      video3d.loop = true; // 设置为循环播放
      console.log(video3d.loop);
      alphaVideo3d.loop = true; // 设置为循环播放
      console.log(alphaVideo3d.loop);

      video3d.visible = false;
      alphaVideo3d.visible = false;

      slam.add(video3d, 0.5);
      slam.add(alphaVideo3d, 1);

      // 开启slam平面追踪
      await slam.start();

      this.slam = slam;

      this.video3d = video3d;
      this.alphaVideo3d = alphaVideo3d;

      this.showVideo();

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  error({ detail }) {
    wx.hideLoading();
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },

  showVideo() {
    this.alphaVideo3d.visible = false;
    // 属性videoContext参考：https://developers.weixin.qq.com/miniprogram/dev/api/media/video/VideoContext.html
    this.alphaVideo3d.videoContext.stop();

    this.video3d.visible = true;
    this.video3d.videoContext.play();

    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    const success = this.slam.standOnThePlane(
      this.video3d,
      Math.round(windowWidth / 2),
      Math.round(windowHeight / 2),
      true
    );
    console.log("standOnThePlane success", success);
  },

  showAlphaVideo() {
    this.video3d.visible = false;
    this.video3d.videoContext.stop();

    this.alphaVideo3d.visible = true;
    this.alphaVideo3d.videoContext.play();

    const { windowWidth, windowHeight } = wx.getSystemInfoSync();
    const success = this.slam.standOnThePlane(
      this.alphaVideo3d,
      Math.round(windowWidth / 2),
      Math.round(windowHeight / 2),
      true
    );
    console.log("standOnThePlane success", success);
  },

  play() {
    if (this.alphaVideo3d.visible) {
      this.alphaVideo3d.videoContext.play();
    }
    if (this.video3d.visible) {
      this.video3d.videoContext.play();
    }
  },

  pause() {
    if (this.alphaVideo3d.visible) {
      this.alphaVideo3d.videoContext.pause();
    }
    if (this.video3d.visible) {
      this.video3d.videoContext.pause();
    }
  },
});
