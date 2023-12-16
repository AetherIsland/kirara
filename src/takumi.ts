import { createHash } from 'node:crypto';
import { type BasicFileInfo, type RemoteFileInfo } from './type.js';

export type LauncherResource = {
    retcode: number;
    message: string;
    data: Data;
};

export type Data = {
    game: Game;
    plugin: unknown;
    web_url: string;
    force_update: unknown;
    pre_download_game: Game | null;
    deprecated_packages: Deprecated[];
    sdk: unknown;
    deprecated_files: Deprecated[];
};

export type Game = {
    latest: GameLatest;
    diffs: GameDiff[];
};

export type GameLatest = {
    name: string;
    version: string;
    path: string;
    size: string;
    md5: string;
    entry: string;
    voice_packs: VoicePack[];
    decompressed_path: string;
    segments: Segment[];
    package_size: string;
};

export type GameDiff = {
    name: string;
    version: string;
    path: string;
    size: string;
    md5: string;
    is_recommended_update: boolean;
    voice_packs: VoicePack[];
    package_size: string;
};

export type VoicePack = {
    language: VoicePackLanguage;
    name: string;
    path: string;
    size: string;
    md5: string;
    package_size: string;
};

export type VoicePackLanguage = 'zh-cn' | 'en-us' | 'ja-jp' | 'ko-kr';

export type Segment = {
    path: string;
    md5: string;
    package_size: string;
};

export type Deprecated = {
    name: string;
    md5: string;
};

function invokeRFI(
    obj: {
        name: string;
        size: string;
        package_size: string;
        md5: string;
        path: string;
    },
    tags: RemoteFileInfo['tags']
): RemoteFileInfo {
    return {
        name: obj.name,
        size: Number(obj.size),
        package_size: Number(obj.package_size),
        md5: obj.md5,
        url: new URL(obj.path),
        tags
    };
}

export class Takumi {
    #apiURL: string;
    #gameFilter: string[];
    #langFilter: string[];
    #responseData?: Data;
    #responseHash?: string;
    #updatedAt?: number;
    #fileList?: RemoteFileInfo[];
    #deprecatedFileList?: BasicFileInfo[];

    constructor(apiURL: string, gameFilter: string[], langFilter: string[]) {
        this.#apiURL = apiURL;
        this.#gameFilter = gameFilter;
        this.#langFilter = langFilter;
    }

    get updatedAt() {
        return this.#updatedAt;
    }

    get fileList() {
        return this.#fileList;
    }

    get deprecatedFileList() {
        return this.#deprecatedFileList;
    }

    async refresh() {
        const isUpdated = await this.#fetch();
        if (isUpdated) {
            this.#updateFileList();
            this.#updatedAt = Date.now();
        }
        return isUpdated;
    }

    async #fetch() {
        const res = await fetch(this.#apiURL);
        if (!res.ok || res.headers.get('Content-Type') !== 'application/json') {
            throw new Error('Takumi 请求失败', { cause: res });
        }
        const { retcode, message, data } =
            (await res.json()) as LauncherResource;
        if (retcode !== 0 || message !== 'OK') {
            throw new Error('Takumi 响应状态异常', {
                cause: { retcode, message }
            });
        }
        const hash = createHash('md5')
            .update(JSON.stringify(data))
            .digest('hex');
        const isUpdated = hash !== this.#responseHash;
        if (isUpdated) {
            this.#responseData = data;
            this.#responseHash = hash;
        }
        return isUpdated;
    }

    #updateFileList() {
        if (!this.#responseData) {
            return;
        }
        const { game, pre_download_game, deprecated_packages } =
            this.#responseData;
        const fileList: RemoteFileInfo[] = [];
        const latestVer: string = game.latest.version;
        if (game.diffs.length && this.#gameFilter.includes('latest-diff')) {
            const item = game.diffs[0];
            fileList.push(invokeRFI(item, ['latest-diff']));
            for (const vp of item.voice_packs) {
                if (this.#langFilter.includes(vp.language)) {
                    fileList.push(invokeRFI(vp, ['latest-diff', vp.language]));
                }
            }
        }
        if (
            pre_download_game &&
            this.#gameFilter.includes('predl-latest-diff')
        ) {
            for (const item of pre_download_game.diffs) {
                if (item.version === latestVer) {
                    fileList.push(invokeRFI(item, ['predl-latest-diff']));
                    for (const vp of item.voice_packs) {
                        if (this.#langFilter.includes(vp.language)) {
                            fileList.push(
                                invokeRFI(vp, [
                                    'predl-latest-diff',
                                    vp.language
                                ])
                            );
                        }
                    }
                }
            }
        }
        this.#fileList = fileList;
        this.#deprecatedFileList = deprecated_packages;
    }
}
