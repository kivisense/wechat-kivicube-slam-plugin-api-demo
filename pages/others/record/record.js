import { requestFile } from "../../../utils/utils";

Page({
  data: {
    license: getApp().globalData.license,
    startDisable: false,
    stopDisable: false,
    autoDownload: true,
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

    this.shadowPlanes = {};
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
    this.setData({ startDisable: true });

    if (!this.recorder) {
      this.initRecorder();
    }
    
    console.log("--- start ---");
    const localPath = await this.recorder.start();
    console.log("--- end ---");

    this.setData({ startDisable: false, stopDisable: false });

    wx.saveVideoToPhotosAlbum({
      filePath: localPath,
    });
  },

  initRecorder() {
    try {
      const autoDownload = this.data.autoDownload;
      // 实例化视频录制对象
      this.recorder = this.slam.createRecorder({
        canvasConfig: {
          // 分辨率倍数
          recordDpr: 2,
          // 最大宽度分辨率, 默认和上限值都是1080
          // maxWidth: 300
        },
        recorderConfig: {
          // 视频比特率（kbps），最小值 600，最大值 3000
          videoBitsPerSecond: 3000,
          // 视频 fps, 默认10 【？】，仅视频录制时生效，视频录制处理完后都是30帧
          // fps:10,
          // 视频关键帧间隔, 默认12 【？】
          // gop:12
        },
        options: {
          // pid: "kivicube-mp-plugin", 【未暴露的参数，项目id】
          // secret: "b1a72f06a24d5c8d7267ae6a1cfbe311", 【未暴露的参数, 授权码】
          // autoProcess: true, 【未暴露的参数，是否使用服务端处理视频，默认启用】

          // 是否自动将录制好的视频下载为本地文件路径 默认为true
          autoDownload,
          // 录制时长, 如果调用了stop方法，录制会提前结束
          duration: 15 * 1000,
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

    this.enableOnBeforeRender();

    this.recorder.on("start", () => {
      console.log("recorder log:  start 开始录制");
    });

    this.recorder.on("stop", () => {
      console.log("recorder log:  stop 停止录制");
    });

    // 视频录制完成后的链接地址
    this.recorder.on("process-end", (remoteUrl) => {
      console.log("recorder log:  process-end 视频处理完成", remoteUrl);
    });

    // 将视频下载结束，localPath为本地文件的文件路径
    this.recorder.on("download-end", (localPath) => {
      console.log("recorder log:  download-end 视频下载完成", localPath);
    });

    this.recorder.on("end", (path) => {
      console.log("recorder log:  end", path);
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
    this.recorder.stop();
    this.recorder.destroy();
    this.disableOnBeforeRender();
  },
});
