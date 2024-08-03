import {
    type FileProvider,
    type BasicFileInfo,
    type RemoteFileInfo
} from '../type.js';
import { type HYPClient } from './client.js';
import {
    type GamePackageGroup,
    type GamePackageBranch
} from './GamePackage.js';

type BranchOption = {
    major?: boolean;
    patches?: boolean | 'latest-only';
};

export type HYPFileProviderOption = {
    gameBizs?: string[];
    audioLanguages?: string[];
    branchMain?: BranchOption;
    branchPreDownload?: BranchOption;
};

function parsePackageGroup(
    group: GamePackageGroup,
    audioLanguages: string[],
    addtionalTags: string[]
) {
    const result: RemoteFileInfo[] = [];
    for (const file of group.game_pkgs) {
        const url = new URL(file.url);
        result.push({
            name: url.pathname.split('/').pop() ?? file.md5,
            size: Number(file.size),
            required_free_space: Number(file.decompressed_size),
            md5: file.md5,
            url,
            tags: [...addtionalTags, group.version, 'game']
        });
    }
    for (const file of group.audio_pkgs) {
        const tags = [...addtionalTags, group.version, 'audio'];
        if (file.language) {
            if (!audioLanguages.includes(file.language)) {
                continue;
            }
            tags.push(file.language);
        }
        const url = new URL(file.url);
        result.push({
            name: url.pathname.split('/').pop() ?? file.md5,
            size: Number(file.size),
            required_free_space: Number(file.decompressed_size),
            md5: file.md5,
            url,
            tags
        });
    }
    return result;
}

function parseBranch(
    branch: GamePackageBranch,
    option: BranchOption,
    audioLanguages: string[]
): RemoteFileInfo[] {
    const result: RemoteFileInfo[] = [];
    if (option.major && branch.major) {
        result.push(
            ...parsePackageGroup(branch.major, audioLanguages, ['major'])
        );
    }
    if (option.patches) {
        let patches: GamePackageGroup[];
        if (option.patches === true) {
            patches = branch.patches;
        } else if (option.patches === 'latest-only' && branch.patches.length) {
            patches = [branch.patches[0]];
        } else {
            patches = [];
        }
        result.push(
            ...patches.flatMap((group) =>
                parsePackageGroup(group, audioLanguages, ['patch'])
            )
        );
    }
    return result;
}

export class HYPFilerProvider implements FileProvider {
    #updatedAt?: number;
    #fileList?: RemoteFileInfo[];
    #deprecatedFileList?: BasicFileInfo[];

    constructor(
        readonly client: HYPClient,
        readonly option: HYPFileProviderOption
    ) {}

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
        this.#fileList = await this.#getFileList();
        this.#updatedAt = Date.now();
        return true;
    }

    async #getFileList() {
        const result: RemoteFileInfo[] = [];
        let game_packages = await this.client.getGamePackages();
        game_packages = game_packages.filter((game_package) =>
            this.option.gameBizs?.includes(game_package.game.biz)
        );
        for (const game_package of game_packages) {
            if (this.option.branchMain && game_package.main) {
                result.push(
                    ...parseBranch(
                        game_package.main,
                        this.option.branchMain,
                        this.option.audioLanguages ?? []
                    )
                );
            }
            if (this.option.branchPreDownload && game_package.pre_download) {
                result.push(
                    ...parseBranch(
                        game_package.pre_download,
                        this.option.branchPreDownload,
                        this.option.audioLanguages ?? []
                    )
                );
            }
        }
        return result;
    }
}
