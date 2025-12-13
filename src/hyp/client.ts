import type { GameInfo } from './GameInfo.ts';
import type { GamePackage } from './GamePackage.ts';

/**
 * 启动器 ID
 */
export const KnownLauncherId = {
    miHoYoLauncher: 'jGHBHlcOq1',
    HoYoPlay: 'VYTpXlbWo8',
    BilibiliGenshin: 'umfgRO5gh5',
    BilibiliStarRail: '6P5gHMNyK3',
    BilibiliZZZ: 'xV0f4r1GT0'
} as const;
export type KnownLauncherId = (typeof KnownLauncherId)[keyof typeof KnownLauncherId];

/**
 * 游戏 ID
 */
export const KnownGameId = {
    bh3_cn: 'osvnlOc0S8',
    bh3_global: '5TIVvvcwtM',
    hk4e_cn: '1Z8W5NHUQb',
    hk4e_global: 'gopR6Cufr3',
    hk4e_bilibili: 'T2S0Gz4Dr2',
    hkrpg_cn: '64kMb5iAWu',
    hkrpg_global: '4ziysqXOQ8',
    hkrpg_bilibili: 'EdtUqXfCHh',
    nap_cn: 'x6znKlJ0xK',
    nap_global: 'U5hbdsT9W7',
    nap_bilibili: 'HXAFlmYa17'
} as const;
export type KnownGameId = (typeof KnownGameId)[keyof typeof KnownGameId];

/**
 * 获取游戏对应的启动器 ID
 */
export function getLauncherIdByGameId(gameId: string) {
    switch (gameId) {
        case KnownGameId.bh3_cn:
        case KnownGameId.hk4e_cn:
        case KnownGameId.hkrpg_cn:
        case KnownGameId.nap_cn:
            return KnownLauncherId.miHoYoLauncher;
        case KnownGameId.bh3_global:
        case KnownGameId.hk4e_global:
        case KnownGameId.hkrpg_global:
        case KnownGameId.nap_global:
            return KnownLauncherId.HoYoPlay;
        case KnownGameId.hk4e_bilibili:
            return KnownLauncherId.BilibiliGenshin;
        case KnownGameId.hkrpg_bilibili:
            return KnownLauncherId.BilibiliStarRail;
        case KnownGameId.nap_bilibili:
            return KnownLauncherId.BilibiliZZZ;
        default:
            throw new Error(`Unknown GameId: ${gameId}`);
    }
}

/**
 * 获取启动器对应的渠道信息
 */
export function getChannelByLauncherId(launcherId: string) {
    switch (launcherId) {
        case KnownLauncherId.miHoYoLauncher:
        case KnownLauncherId.HoYoPlay:
            return {
                channel: '1',
                sub_channel: '1'
            };
        case KnownLauncherId.BilibiliGenshin:
        case KnownLauncherId.BilibiliStarRail:
        case KnownLauncherId.BilibiliZZZ:
            return {
                channel: '14',
                sub_channel: '0'
            };
        default:
            throw new Error(`Unknown LauncherId: ${launcherId}`);
    }
}

/**
 * 获取启动器对应的 API 基址
 */
export function getAPIBaseByLauncherId(launcherId: string) {
    switch (launcherId) {
        case KnownLauncherId.miHoYoLauncher:
        case KnownLauncherId.BilibiliGenshin:
        case KnownLauncherId.BilibiliStarRail:
        case KnownLauncherId.BilibiliZZZ:
            return 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/';
        case KnownLauncherId.HoYoPlay:
            return 'https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/';
        default:
            throw new Error(`Unknown LauncherId: ${launcherId}`);
    }
}

async function getData<T>(input: Parameters<typeof fetch>[0], node?: string): Promise<T> {
    const response = await fetch(input);
    if (!response.ok) {
        throw new Error(`HYP Request Failed: ${response.status} ${response.statusText}`);
    }
    const responseData = (await response.json()) as {
        retcode: number;
        message: string;
        data: unknown;
    };
    if (responseData.retcode !== 0) {
        throw new Error(`HYP Error: ${responseData.retcode} ${responseData.message}`);
    }
    if (node) {
        const data: any = responseData.data;
        if (data && typeof data === 'object' && node in data) {
            return data[node] as T;
        } else {
            throw new Error(`HYP Data Error: ${node} not found`);
        }
    } else {
        return responseData.data as T;
    }
}

export class HYPClient {
    readonly #apiBase;
    readonly launcher_id;
    readonly additionalParams?;

    constructor(
        launcher_id: string,
        additionalParams?: {
            language?: string;
            channel?: string;
            sub_channel?: string;
        }
    ) {
        this.#apiBase = getAPIBaseByLauncherId(launcher_id);
        this.launcher_id = launcher_id;
        this.additionalParams = additionalParams;
    }

    #getURL(
        apiName: string,
        options?: {
            withLanguage?: boolean;
            withChannel?: boolean;
            withSubChannel?: boolean;
        }
    ) {
        const url = new URL(apiName, this.#apiBase);
        url.searchParams.append('launcher_id', this.launcher_id);
        if (options?.withLanguage && this.additionalParams?.language) {
            url.searchParams.append('language', this.additionalParams.language);
        }
        if (options?.withChannel && this.additionalParams?.channel) {
            url.searchParams.append('channel', this.additionalParams.channel);
        }
        if (options?.withSubChannel && this.additionalParams?.sub_channel) {
            url.searchParams.append('sub_channel', this.additionalParams.sub_channel);
        }
        return url;
    }

    /**
     * 获取所有游戏及其基本信息
     *
     * 返回内容与 `language` 选项有关
     */
    async getGames() {
        const url = this.#getURL('getGames', { withLanguage: true });
        return await getData<GameInfo[]>(url, 'games');
    }

    /**
     * 获取（指定）游戏的启动器背景图
     *
     * 返回内容与 `language` 选项有关
     */
    async getAllGameBasicInfo(game_id?: string) {
        const url = this.#getURL('getAllGameBasicInfo', { withLanguage: true });
        if (game_id) {
            url.searchParams.append('game_id', game_id);
        }
        return await getData(url, 'game_info_list');
    }

    /**
     * 获取指定游戏的运营信息
     *
     * 返回内容与 `language` 选项有关
     */
    async getGameContent(game_id: string) {
        const url = this.#getURL('getGameContent', { withLanguage: true });
        url.searchParams.append('game_id', game_id);
        return await getData(url, 'content');
    }

    /**
     * 获取（指定）游戏的包体信息
     */
    async getGamePackages(game_ids: string[] = []) {
        const url = this.#getURL('getGamePackages');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData<GamePackage[]>(url, 'game_packages');
    }

    /**
     * 获取（指定）游戏的插件信息
     *
     * 一般是 DirectX 运行时
     */
    async getGamePlugins(game_ids: string[] = []) {
        const url = this.#getURL('getGamePlugins');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'plugin_releases');
    }

    /**
     * 获取（指定）游戏的渠道 SDK 信息
     *
     * 返回内容与 `channel` 和 `sub_channel` 选项有关
     */
    async getGameChannelSDKs(game_ids: string[] = []) {
        const url = this.#getURL('getGameChannelSDKs', {
            withChannel: true,
            withSubChannel: true
        });
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'game_channel_sdks');
    }

    /**
     * 获取（指定）游戏的弃用文件配置信息
     *
     * 返回内容与 `channel` 和 `sub_channel` 选项有关
     */
    async getGameDeprecatedFileConfigs(game_ids: string[] = []) {
        const url = this.#getURL('getGameDeprecatedFileConfigs', {
            withChannel: true,
            withSubChannel: true
        });
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'deprecated_file_configs');
    }

    /**
     * 获取（指定）游戏的资产、日志、截图等文件系统路径
     */
    async getGameConfigs(game_ids: string[] = []) {
        const url = this.#getURL('getGameConfigs');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'launch_configs');
    }

    /**
     * chunk 模式下载通道信息
     */
    async getGameBranches(game_ids: string[] = []) {
        const url = this.#getURL('getGameBranches');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'game_branches');
    }
}
