import { type GameInfo } from './GameInfo.js';
import { type GamePackage } from './GamePackage.js';

/**
 * 启动器 ID
 */
export enum KnownLauncherId {
    miHoYoLauncher = 'jGHBHlcOq1',
    HoYoPlay = 'VYTpXlbWo8',
    BilibiliGenshin = 'umfgRO5gh5',
    BilibiliStarRail = '6P5gHMNyK3',
    BilibiliZZZ = 'xV0f4r1GT0'
}

/**
 * 游戏 ID
 */
export enum KnownGameId {
    bh3_cn = 'osvnlOc0S8',
    bh3_global = '5TIVvvcwtM',
    hk4e_cn = '1Z8W5NHUQb',
    hk4e_global = 'gopR6Cufr3',
    hk4e_bilibili = 'T2S0Gz4Dr2',
    hkrpg_cn = '64kMb5iAWu',
    hkrpg_global = '4ziysqXOQ8',
    hkrpg_bilibili = 'EdtUqXfCHh',
    nap_cn = 'x6znKlJ0xK',
    nap_global = 'U5hbdsT9W7',
    nap_bilibili = 'HXAFlmYa17'
}

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

async function getData<T>(
    input: Parameters<typeof fetch>[0],
    node?: string
): Promise<T> {
    const response = await fetch(input);
    if (!response.ok) {
        throw new Error(
            `HYP Request Failed: ${response.status} ${response.statusText}`
        );
    }
    const responseData = (await response.json()) as {
        retcode: number;
        message: string;
        data: unknown;
    };
    if (responseData.retcode !== 0) {
        throw new Error(
            `HYP Error: ${responseData.retcode} ${responseData.message}`
        );
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
    readonly #apiBase: string;

    constructor(
        readonly launcher_id: string,
        readonly addtionalParams?: {
            readonly language?: string;
            readonly channel?: string;
            readonly sub_channel?: string;
        }
    ) {
        this.#apiBase = getAPIBaseByLauncherId(this.launcher_id);
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
        if (options?.withLanguage && this.addtionalParams?.language) {
            url.searchParams.append('language', this.addtionalParams.language);
        }
        if (options?.withChannel && this.addtionalParams?.channel) {
            url.searchParams.append('channel', this.addtionalParams.channel);
        }
        if (options?.withSubChannel && this.addtionalParams?.sub_channel) {
            url.searchParams.append(
                'sub_channel',
                this.addtionalParams.sub_channel
            );
        }
        return url;
    }

    async getGames() {
        const url = this.#getURL('getGames', { withLanguage: true });
        return await getData<GameInfo[]>(url, 'games');
    }

    async getAllGameBasicInfo(game_id?: string) {
        const url = this.#getURL('getAllGameBasicInfo', { withLanguage: true });
        if (game_id) {
            url.searchParams.append('game_id', game_id);
        }
        return await getData(url, 'game_info_list');
    }

    async getGameContent(game_id: string) {
        const url = this.#getURL('getGameContent', { withLanguage: true });
        url.searchParams.append('game_id', game_id);
        return await getData(url, 'content');
    }

    async getGamePackages(game_ids: string[] = []) {
        const url = this.#getURL('getGamePackages');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData<GamePackage[]>(url, 'game_packages');
    }

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

    async getGameConfigs(game_ids: string[] = []) {
        const url = this.#getURL('getGameConfigs');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'launch_configs');
    }

    async getGameBranches(game_ids: string[] = []) {
        const url = this.#getURL('getGameBranches');
        for (const game_id of game_ids) {
            url.searchParams.append('game_ids[]', game_id);
        }
        return await getData(url, 'game_branches');
    }
}
