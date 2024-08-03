import { type GameId } from './GameId.js';

/**
 * 游戏包信息
 */
export type GamePackage = {
    /**
     * 游戏ID
     */
    game: GameId;
    /**
     * 主要分支
     */
    main: GamePackageBranch | null;
    /**
     * 预下载分支
     */
    pre_download: GamePackageBranch | null;
};

/**
 * 游戏包分支
 */
export type GamePackageBranch = {
    /**
     * 完整包
     */
    major: GamePackageGroup | null;
    /**
     * 差分包
     */
    patches: GamePackageGroup[];
};

/**
 * 包组
 */
export type GamePackageGroup = {
    /**
     * 完整包的当前版本 | 差分包的基础版本
     */
    version: string;
    /**
     * 游戏本体
     */
    game_pkgs: GamePackageFile[];
    /**
     * 音频资源
     */
    audio_pkgs: GamePackageFile[];
    /**
     * 已解压资源的基址
     */
    res_list_url: string;
};

/**
 * 包文件信息
 */
export type GamePackageFile = {
    /**
     * 音频资源的语言
     */
    language?: string;
    /**
     * 文件 URL
     */
    url: string;
    /**
     * 文件 MD5 值（大小写不定）
     */
    md5: string;
    /**
     * 文件（压缩包）大小
     */
    size: string;
    /**
     * 压缩包大小 + 解压后大小
     */
    decompressed_size: string;
};
