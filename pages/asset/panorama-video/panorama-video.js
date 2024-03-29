import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中..."});
  },

  async ready({ detail: slam }) {
    try {
      const panoramaVideoUrl = "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/video/panorama-video.mp4";
      /**
       * @param {String} urlOrPath - 全景视频url地址或者小程序本地文件路径
       * @param {String} [defaultThumbnailUrl] - 全景视频的缩略图，用于不支持3d渲染视频的时候显示，为空则降级缩略图功能无效
       * @param {Number} [sgments=56] - 全景视频的分段数，数值越高精度越高，全景视频如果看着有扭曲现象（不是畸变）可以适度调高此精度
       * @param {Function} [onProgress] - 全景视频加载进度回调函数
       * **/
      const panoramaVideo = await slam.createPanoramaVideo(panoramaVideoUrl);
       /**
        * v1版本必须先将模型放置于平面上后才能围绕查看或者漫游。
        * v2版本将模型放入场景中时，直接支持场景漫游功能。
        * 当slam.start调用后，手机所在位置，就是世界坐标系的原点。
        * 如果不设置模型的position，模型就会默认摆放在原点坐标，即手机所在位置。
        * -z轴就是手机的正前方，+y轴就是正上方，+x轴就是右手方向。可按此方向调整模型默认出现的位置。
      */
      
      // v1 与 v2版本的精度有差距，这里在应用层做个大小的适配
      const initSize = slam.isSlamV1() ? 10 : 4;
      slam.add(panoramaVideo, initSize);

      panoramaVideo.videoContext.play();
      panoramaVideo.loop = true;

      await slam.start();

      // slam v1 需要放置后才能显示
      if (slam.isSlamV1()) {
        const { windowWidth, windowHeight } = wx.getSystemInfoSync();
        
        const success = slam.standOnThePlane(
          panoramaVideo,
          Math.round(windowWidth / 2),
          Math.round(windowHeight / 2),
          true,
        );

        wx.hideLoading();
        if (!success) {
          errorHandler("放置模型至平面上失败，请对准平面再次打开重试");
        }

      }

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
