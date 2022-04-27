import { errorHandler, showAuthModal, requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  onLoad() {
    wx.showLoading({ title: "初始化中..."});
    this.downloadAsset = requestFile("https://kivicube-resource.kivisense.com/projects/wechat-kivicube-slam-plugin-api-demo/panorama.jpg");
  },

  async ready({ detail: slam }) {
    try {
      const panoArrayBuffer = await this.downloadAsset;

      /**
       * @param {ArrayBuffer} panoArrayBuffer 全景图的arraybuffer数据
       * @param {Number} sgments 全景图的分段数 数值越高精度越高，全景视频如果看着有扭曲现象（不是畸变）可以适度调高此精度
       * @param {Function} progress 全景图加载进度
       * **/
      const panorama = await slam.createPanorama(panoArrayBuffer, 36, (progress) => {
        console.log(progress);
      });
       /**
        * v1版本必须先将模型放置于平面上后才能围绕查看或者漫游。
        * v2版本将模型放入场景中时，直接支持场景漫游功能。
        * 当slam.start调用后，手机所在位置，就是世界坐标系的原点。
        * 如果不设置模型的position，模型就会默认摆放在原点坐标，即手机所在位置。
        * -z轴就是手机的正前方，+y轴就是正上方，+x轴就是右手方向。可按此方向调整模型默认出现的位置。
      */
      
      // v1 与 v2版本的精度有差距，这里在应用层做个大小的适配
      const initSize = slam.isSlamV1() ? 8 : 4;
      slam.add(panorama, initSize);

      await slam.start();

      // slam v1 需要放置后才能显示
      if (slam.isSlamV1()) {
        const { windowWidth, windowHeight } = wx.getSystemInfoSync();
        slam.standOnThePlane(
          panorama,
          Math.round(windowWidth / 2),
          Math.round(windowHeight / 2),
          true,
        );
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
