import { requestFile } from "../../../utils/utils";

function isHuaWei() {
  const systemInfo = wx.getSystemInfoSync();
  const brand = systemInfo.brand.toLocaleLowerCase();
  if (brand.includes("honor") || brand.includes("huawei")) {
    return true;
  }
  return false;
}

/**
 * AR内容录制功能开通请参考：
 * https://www.yuque.com/kivicube/slam/slam-develop#pUA07
 * 
 * 录制服务的用户文档：
 * https://www.yuque.com/kivicube/manual/kivicube-features#AhcpJ
 */

Page({
  data: {
    license: getApp().globalData.license,
    startDisable: false,
    stopDisable: false,
    recorderStatus: "初始状态",
    leftTime: 0
  },

  onLoad() {
    wx.showLoading({
      title: "初始化中...",
      mask: true
    });

    this.downloadAsset = requestFile(
      "https://meta.kivisense.com/kivicube-slam-mp-plugin/demo-assets/model/rabbit.glb"
    );
  },

  async ready({ detail: slam }) {
    this.slam = slam;
    try {
      const modelArrayBuffer = await this.downloadAsset;
      const model3d = await slam.createGltfModel(modelArrayBuffer);
      model3d.visible = false;

      this.model3d = model3d;

      slam.add(model3d, 1);


      // 开启slam平面追踪
      await slam.start();
      slam.setGesture(model3d, {
        clickResult: (res) => {
          if (!res) {
            wx.showToast({
              title: "放置失败，请重试",
              icon: "none"
            });
          } else {
            this.model3d.visible = true;
          }
        }
      });

      model3d.playAnimation({
        loop: true,
      });

      wx.hideLoading();

      wx.showToast({
        title: "点击屏幕，放置模型",
        icon: "none"
      });
    } catch (e) {
      wx.hideLoading();
    }
  },

  error({ detail }) {
    wx.hideLoading();
    console.error(detail);
  },

  async startRecord() {
    if (isHuaWei()) {
      wx.showToast({
        title: "注意：华为手机录制可能存在黑屏等未知问题",
        icon: "none",
        duration: 3500,
      });
    }

    this.setData({ startDisable: true });

    if (!this.recorder) {
      this.initRecorder();
    }
    
    this.enableOnBeforeRender();
    console.log("--- start ---");
    // 录制完成后，拿到视频的本地路径
    const localPath = await this.recorder.start();
    console.log("--- end ---");

    this.setData({ startDisable: false, stopDisable: false });

    // 保存视频到系统相册
    wx.saveVideoToPhotosAlbum({
      filePath: localPath,
    });
  },

  /**
   * 初始化AR录制器
   * 
   * 注意：华为手机的录制存在黑屏等未知问题，我们正在处理中，开发者需要自行处理兼容问题
   * **/
  initRecorder() {
    try {
      // 实例化视频录制对象
      this.recorder = this.slam.createRecorder({
        options: {
          // 录制时长毫秒，如果调用了stop方法，录制会提前结束
          duration: 10 * 1000,
        },
      });
    } catch (err) {
      console.log(err);
      wx.showToast({
        title: err.message,
        icon: "none"
      });

      this.setData({ startDisable: false });
    }

    this.recorder.on("start", () => {
      console.log("recorder log:  start 开始录制");
    });

    this.recorder.on("pause", () => {
      console.log("recorder log:  pause 暂停录制");
    });

    this.recorder.on("resume", () => {
      console.log("recorder log:  resume 恢复录制");
    });

    this.recorder.on("stop", () => {
      console.log("recorder log:  stop 停止录制");
    });

    this.recorder.on("end", (path) => {
      console.log("recorder log:  end 录制结束；本地路径：", path);
    });

    this.recorder.on("error", (error) => {
      console.log("recorder log: error", error);
    });
  },

  enableOnBeforeRender() {
    const { model3d, recorder } = this;
    const RecorderStatusEnum = recorder.RecorderStatusEnum;

    // 使用渲染钩子函数，实现更新录制状态。
    // 注意：当屏幕上看不见模型时，则不会调用此方法。
    model3d.onBeforeRender = () => {
      if (recorder) {
        const statusMap = {
          [RecorderStatusEnum.INIT]: "初始状态",
          [RecorderStatusEnum.RECORDING]: "录制中",
          [RecorderStatusEnum.PAUSE]: "暂停中",
          [RecorderStatusEnum.END]: "已结束",
          [RecorderStatusEnum.PROCESSING]: "处理中",
          [RecorderStatusEnum.DOWNLOADING]: "下载中"
        };

        this.setData({
          recorderStatus: statusMap[recorder.status] || "",
          leftTime: (recorder.leftTime / 1000).toFixed(2)
        });
      }
    };
  },

  disableOnBeforeRender() {
    const { model3d } = this;
    delete model3d.onBeforeRender;
  },

  stopRecord() {
    this.recorder.stop();
    this.setData({ stopDisable: true });
  },

  onUnload() {
    this.recorder.destroy();
    this.disableOnBeforeRender();
  },
});
