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
