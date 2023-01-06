import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

const spriteName = "music";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/image/music-effect.png"
    );
  },

  async ready({ detail: slam }) {
    try {
      const imageSpriteArrayBuffer = await this.downloadAsset;
      /**
       * 创建精灵图时的配置对象参数值，既支持直接配置一张精灵图。
       * 也可以每个属性使用数组，配置多张精灵图。例如：
       * {
       *     images: [imageSpriteArrayBuffer1, imageSpriteArrayBuffer2],
       *     type: ["png", "png"],
       *     sprite: ["sprite1", "sprite2"],
       *     col: [16, 12],
       *     row: [16, 10],
       *     lastRowEmptyCol: [2, 0],
       *     width: [1, 0.5],
       *     height: [1, 1],
       *     fps: [30, 15]
       * }
       */
      const imageSprite3d = await slam.createImageSprite({
        images: imageSpriteArrayBuffer,
        type: "png",
        sprite: spriteName,
        col: 16,
        row: 16,
        lastRowEmptyCol: 2,
        width: 1,
        height: 1,
        fps: 30
      });

      // 循环播放时，某次播放完毕触发。
      imageSprite3d.addEventListener("spriteLoop", (e) => {
        console.log("循环播放的精灵名称", e.sprites);
        console.log("循环播放的次数", e.loopDelta);
      });
      // 非循环播放时，自然播放完毕触发。
      imageSprite3d.addEventListener("spriteEnded", (e) => {
        console.log("播放完毕的精灵名称", e.sprites);
      });

      slam.add(imageSprite3d, 0.5);

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        imageSprite3d,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      slam.setGesture(imageSprite3d);

      this.imageSprite3d = imageSprite3d;

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

  play() {
    const name = spriteName; // 欲播放的精灵图名称。
    const loop = true; // 是否循环播放
    this.imageSprite3d.playSprite(name, loop);
  },
  pause() {
    this.imageSprite3d.pauseSprite();
  }
});
