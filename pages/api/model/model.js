import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    nameList: [],
    name: 0,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = requestFile(
      "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/robot.glb"
    );
  },

  async ready({ detail: slam }) {
    try {
      const modelArrayBuffer = await this.downloadAsset;
      const model3d = await slam.createGltfModel(modelArrayBuffer);

      // 获取该模型拥有的所有动画名称列表
      const animationNames = model3d.getAnimationNames();
      this.setData({
        nameList: animationNames.map((name) => ({ name, value: name })),
        name: 0
      });

      const onPlay = (e) => {
        // e.options需要插件>=1.0.2。
        // e.options是调用playAnimation方法时，传入的配置参数对象。
        console.log(`动画(${e.options.animationName})播放`);
      };
      const onPause = (e) => {
        // e.animationName需要插件>=1.0.2。
        console.log(`动画(${e.animationName})暂停`);
      };
      const onStop = (e) => {
        // e.animationName需要插件>=1.0.2。
        console.log(`动画(${e.animationName})停止播放`);
      };
      const onPlayback = (e) => {
        // e.options需要插件>=1.0.2。
        // e.options是调用playbackAnimation方法时，传入的配置参数对象。
        console.log(`动画(${e.options.animationName})从头播放`);
      };
      const onEnded = (e) => {
        console.log(`动画(${e.animationName})自然播放完毕`);
      };
      const onLoop = (e) => {
        console.log(`动画(${e.animationName})循环播放完毕${e.loopDelta}次`);
      }

      model3d.addEventListener("play", onPlay);
      model3d.addEventListener("pause", onPause);
      model3d.addEventListener("stop", onStop);
      model3d.addEventListener("playback", onPlayback);
      model3d.addEventListener("animationEnded", onEnded);
      model3d.addEventListener("animationLoop", onLoop);

      // 判定某个动画是否在正在播放。
      console.log(model3d.animationIsRunning(animationNames[0]));
      // 获取当前正在播放的动画名称列表
      console.log(model3d.getAnimationIsRunningNames());
      // 判定某个动画是否是循环播放。需要插件>=1.0.2。
      console.log(model3d.isAnimationLoop(animationNames[0]));

      slam.add(model3d, 0.5);

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      const success = slam.standOnThePlane(
        model3d,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      this.slam = slam;
      this.model3d = model3d;

      wx.hideLoading();
    } catch (e) {
      wx.hideLoading();
      errorHandler(e);
    }
  },

  nameChange({ detail }) {
    this.setData({ name: +detail.value });
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

  getAnimationName() {
    return this.data.nameList[this.data.name].value;
  },

  play() {
    this.model3d.playAnimation({
      animationName: this.getAnimationName(),
      loop: false, // 是否循环播放
      clampWhenFinished: true // 是否播放完毕后，停留在最后一帧。
    });
  },

  pause() {
    this.model3d.pauseAnimation(this.getAnimationName());
  },

  stop() {
    this.model3d.stopAnimation(this.getAnimationName());
  },

  playback() {
    this.model3d.playbackAnimation({
      animationName: this.getAnimationName(),
      loop: false, // 是否循环播放
      clampWhenFinished: true // 是否播放完毕后，停留在最后一帧。
    });
  }
});
