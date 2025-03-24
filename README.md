# 绮良良 kirara

> [!IMPORTANT]
> 该项目处于停滞状态。构建该项目的初衷是希望能够在校园网内网中，全速（物理链路速率）分发游戏的更新包，缩短用户下载耗时。但官方启动器引入的全新的基于区块的下载机制 [`sophon`](https://github.com/Scighost/Starward/issues/725) 在效率上已远超基于 [HDiffPatch](https://github.com/sisong/HDiffPatch) 的传统更新包，因此这样做带来的收益有所减少。如果你有能够将 `sophon` 与该项目良好集成的想法，欢迎参与贡献，推动本项目发展。

一个自动下载和管理米哈游游戏 PC 端更新包的工具。

![screenshot](https://github.com/user-attachments/assets/d76f7bc3-ccae-4d99-8ec2-89a537eb78b7)

> [!NOTE]
> 以上屏幕截图仅供参考，不属于该项目的一部分。目前暂时需要自行准备用户界面供最终用户使用。

## 原理

1. 从上游 API 获取数据，形成带有元数据的扁平文件列表。
2. 根据配置文件中配置的规则，对文件列表进行过滤。
3. 查询每个文件在文件存储（本地）中是否存在，若不存在则启动下载任务。同时，尝试删除不需要的文件。
4. 生成状态信息用于展示或其他用途。
5. 定时重复执行上面的任务。

## 使用

### 方式一：预构建版本

1. 在 GitHub [Releases](https://github.com/AetherIsland/kirara/releases) 中下载预先构建好的 JS Bundle。
2. 编写配置文件 `app.config.json`。
3. 使用最新 LTS 版 Node.js 运行。

### 方式二：从源码运行

1. 克隆或打包下载本仓库。
2. 安装依赖：`npm install`。
3. 构建：`npm run build:rollup` 或 `npm run build:tsc`。
3. 编写配置文件 `app.config.json`。
4. 运行：`npm start`。

## 配置

目前，应用会在启动时读取工作目录下的 `app.config.json` 文件，并进行基本验证。以下是一个示例配置文件。

> [!NOTE]
> JSON 文件不支持注释。

```jsonc
{
    // （可选）状态信息文件
    "statusFile": "/srv/kirara/status.json",
    // 存储配置
    "storage": {
        // 存储类型，目前有 dummy（调试用）、local（Node.js 本地下载）、aria2（Aria2 本地下载）
        "type": "aria2",
        // 下载文件存储路径
        "root": "/srv/kirara/files",
        // （可选）状态信息中本地文件路径的基础 URL
        "url": "https://kirara.example.com/files/"
    },
    // 任务配置
    "tasks": [
        {
            // 启动器配置
            "launcher": {
                // 启动器类型
                "type": "miHoYoLauncher",
                // API 语言
                "language": "zh-cn"
            },
            // 过滤器配置
            "filters": [
                {
                    // 此过滤器匹配 biz 为 bh3_cn 的游戏
                    "matchGameBiz": "bh3_cn",
                    // （可选）只选取语言为 zh-cn 的音频资源
                    "audioLanguages": [
                        "zh-cn"
                    ],
                    // （可选）主分支（线上版本）配置
                    "branchMain": {
                        // （可选）选取完整包
                        "major": true,
                        // （可选）选取所有差分包
                        "patches": true
                    },
                    // （可选）预下载分支配置
                    "branchPreDownload": {
                        "major": true,
                        "patches": true
                    }
                },
                {
                    // 此过滤器匹配剩余的所有游戏
                    "matchGameBiz": "*",
                    "audioLanguages": [
                        "zh-cn"
                    ],
                    "branchMain": {
                        "major": false,
                        // 只选取最新的差分包
                        "patches": "latest-only"
                    },
                    "branchPreDownload": {
                        "major": false,
                        "patches": "latest-only"
                    }
                }
            ]
        }
    ]
}
```

### 已知的启动器和游戏信息

[米哈游启动器](https://launcher.mihoyo.com/)，ID 为 `jGHBHlcOq1`。配置 `launcher.type` 为 `miHoYoLauncher`。

| 游戏 | `biz` | `id` |
| ---- | ----- | ---- |
| 崩坏3 | `bh3_cn` | `osvnlOc0S8` |
| 原神 | `hk4e_cn` | `1Z8W5NHUQb` |
| 崩坏：星穹铁道 | `hkrpg_cn` | `64kMb5iAWu` |
| 绝区零 | `nap_cn` | `x6znKlJ0xK` |

[HoYoPlay](https://hoyoplay.hoyoverse.com/)，ID 为 `VYTpXlbWo8`。配置 `launcher.type` 为 `HoYoPlay`。

| 游戏 | `biz` | `id` |
| ---- | ----- | ---- |
| 崩坏3 | `bh3_global` | `5TIVvvcwtM` |
| 原神 | `hk4e_global` | `gopR6Cufr3` |
| 崩坏：星穹铁道 | `hkrpg_global` | `4ziysqXOQ8` |
| 绝区零 | `nap_global` | `U5hbdsT9W7` |

哔哩哔哩渠道服每个游戏使用独立的启动器，具体见下表。

| 游戏 | `biz` | `id` | `launcher.type` | 启动器 ID |
| ---- | ----- | ---- | --------------- | --------- |
| 原神 | `hk4e_cn` | `T2S0Gz4Dr2` | `BilibiliGenshin` | `umfgRO5gh5` |
| 崩坏：星穹铁道 | `hkrpg_cn` | `EdtUqXfCHh` | `BilibiliStarRail` | `6P5gHMNyK3` |
| 绝区零 | `nap_cn` | `HXAFlmYa17` | `BilibiliZZZ` | `xV0f4r1GT0` |

## 许可

此项目使用 [MIT 许可](LICENSE)。阅读[《逐行解读 MIT 许可证》](https://linux.cn/article-13180-1.html)了解更多。

设计 HYP 模块时参考了 [YuehaiTeam/cocogoat](https://github.com/YuehaiTeam/cocogoat) 和 [Scighost/Starward](https://github.com/Scighost/Starward) 两个项目的代码，在此感谢这些项目的作者和贡献者。
