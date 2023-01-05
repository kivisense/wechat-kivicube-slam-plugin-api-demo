import {
  errorHandler,
  showAuthModal,
  requestFile,
  downloadFile,
} from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中...", mask: true });

    this.downloadAsset = Promise.all([
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/rabbit.glb"
      ),
      downloadFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/slam.mp4"
      ),
      downloadFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/glow.mp4"
      ),
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/music-effect.png"
      ),
      requestFile(
        "https://kivicube-resource.kivisense.com/wechat-kivicube-slam-plugin-api-demo/kivisense-logo.png"
      ),
    ]);
  },

  async ready({ detail: slam }) {
    try {
      const [
        modelArrayBuffer,
        videoPath,
        alphaVideoPath,
        imageSpriteArrayBuffer,
        imageArrayBuffer,
      ] = await this.downloadAsset;
      const spriteName = "music";
      const [model3d, video, alphaVideo, image, imageSprite] = await Promise.all([
        slam.createGltfModel(modelArrayBuffer),
        slam.createVideo(videoPath),
        slam.createAlphaVideo(alphaVideoPath),
        slam.createImage(imageArrayBuffer, "png"),
        slam.createImageSprite({
          images: imageSpriteArrayBuffer,
          type: "png",
          sprite: spriteName,
          col: 16,
          row: 16,
          lastRowEmptyCol: 2,
          width: 1,
          height: 1,
          fps: 30,
        }),
      ]);

      /**
       * 创建一个组合对象。
       * @returns {Group3D}
       */
      const group = slam.createGroup();

      group.add(model3d);
      group.add(video);
      group.add(image);

      model3d.scale.setScalar(30);
      video.position.set(-1, 1, 0);
      image.position.set(1, 1, 1);
      image.scale.setScalar(0.3);

      // 普通3d对象，也可以作为组合对象存在。
      video.add(alphaVideo);
      alphaVideo.position.z = -1;
      alphaVideo.position.y = 1;

      image.add(imageSprite);
      imageSprite.position.set(0, 0, -1);
      imageSprite.scale.setScalar(10);

      // 此处指定的大小，为所有内容融合后的整体大小。
      // 一般来说，组合内部的内容大小，还需要自行调整。
      slam.add(group, 1);

      // 开启slam平面追踪
      await slam.start();

      const { windowWidth, windowHeight } = wx.getSystemInfoSync();
      // 将整个组合，放置在平面上。
      const success = slam.standOnThePlane(
        group,
        Math.round(windowWidth / 2),
        Math.round(windowHeight / 2),
        true
      );
      console.log("standOnThePlane success", success);

      // 使所有内容一起收到手势操作。
      slam.setGesture(group);

      imageSprite.playSprite(spriteName, true);
      video.videoContext.play();
      alphaVideo.loop = true;
      alphaVideo.videoContext.play();
      model3d.playAnimation({ loop: true });

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
});
