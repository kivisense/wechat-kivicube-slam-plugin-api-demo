import { errorHandler, showAuthModal } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
  },

  async ready({ detail: slam }) {
    try {
      this.slam = slam;

      await slam.start();
    } catch (e) {
      errorHandler(e);
    }
  },

  error({ detail }) {
    // 判定是否camera权限问题，是则向用户申请权限。
    if (detail?.isCameraAuthDenied) {
      showAuthModal(this);
    } else {
      errorHandler(detail);
    }
  },

  async takePhoto() {
    wx.showLoading({ title: "拍照中...", mask: true });
    try {
      /**
       * 拍照接口
       * @param {Number} [figureWidth=renderWidth] - 指定照片的宽度。高度会依照渲染区域宽高比自动计算出来。默认为渲染宽度。
       * @param {String} [fileType=jpg] - 文件格式，只支持jpg/png。默认为jpg
       * @param {Number} [quality=0.9] - 照片质量，jpg时有效。默认为0.9
       * @returns {Promise<photoPath>} - 照片文件临时地址
       */
      const imagePath = await this.slam.takePhoto();

      wx.saveImageToPhotosAlbum({
        filePath: imagePath,
        success() {
          wx.hideLoading();
          wx.showToast({ title: "保存照片成功", icon: "success" });
        },
        fail(e) {
          wx.hideLoading();
          console.error(e);
          wx.showToast({ title: "保存照片失败", icon: "error" });
        }
      })
    } catch (e) {
      wx.hideLoading();
      console.error(e);
      errorHandler(`拍照失败 - ${e.message}`);
    }
  }
});
