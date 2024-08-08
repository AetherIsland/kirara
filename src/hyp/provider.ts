import * as path from 'node:path';

import { isEqual, difference } from 'es-toolkit';

import {
    type BasicFileInfo,
    type RemoteFileInfo
} from '../type.js';
import {
    type GamePackageGroup,
    type GamePackageBranch,
    type GamePackage,
    type GamePackageFile
} from './GamePackage.js';

type HYPFileInfo = {
    name: string;
    url: string;
    size: number;
    required_free_space: number;
    md5: string;
    meta: {
        branch?: 'main' | 'pre_download';
        packageType?: 'major' | 'patch';
        isLatestPatch?: boolean;
        version?: string;
        resourceType?: 'game' | 'audio';
        audioLanguage?: string;
    };
};

type BranchOption = {
    major?: boolean;
    patches?: boolean | 'latest-only';
};

export type HYPFileProviderOption = {
    audioLanguages?: string[];
    branchMain?: BranchOption;
    branchPreDownload?: BranchOption;
};

function constructRemoteFileInfo(hypFileInfo: HYPFileInfo): RemoteFileInfo {
    const tags: string[] = [];
    if (hypFileInfo.meta.branch) {
        tags.push(`branch:${hypFileInfo.meta.branch}`);
    }
    if (hypFileInfo.meta.packageType) {
        tags.push(`pkg:${hypFileInfo.meta.packageType}`);
    }
    if (hypFileInfo.meta.version) {
        tags.push(`ver:${hypFileInfo.meta.version}`);
    }
    if (hypFileInfo.meta.resourceType) {
        tags.push(`res:${hypFileInfo.meta.resourceType}`);
    }
    if (hypFileInfo.meta.audioLanguage) {
        tags.push(`lang:${hypFileInfo.meta.audioLanguage}`);
    }
    return {
        name: hypFileInfo.name,
        size: hypFileInfo.size,
        required_free_space: hypFileInfo.required_free_space,
        md5: hypFileInfo.md5,
        url: hypFileInfo.url,
        tags
    };
}

function constructHYPFileInfo(
    hypGamePackage: GamePackageFile,
    meta: HYPFileInfo['meta'] = {}
): HYPFileInfo {
    const url = new URL(hypGamePackage.url);
    return {
        name: path.basename(url.pathname) || hypGamePackage.md5,
        size: Number(hypGamePackage.size),
        required_free_space: Number(hypGamePackage.decompressed_size),
        md5: hypGamePackage.md5,
        url: hypGamePackage.url,
        meta
    };
}

function parseHYPGamePackage(hypGamePackage: GamePackage) {
    const result: HYPFileInfo[][] = [];
    if (hypGamePackage.main) {
        result.push(parseBranch(hypGamePackage.main, 'main'));
    }
    if (hypGamePackage.pre_download) {
        result.push(parseBranch(hypGamePackage.pre_download, 'pre_download'));
    }
    return result.flat();
}

function parseBranch(
    branch: GamePackageBranch,
    branchName?: HYPFileInfo['meta']['branch']
) {
    const result: HYPFileInfo[][] = [];
    if (branch.major) {
        result.push(parsePackageGroup(branch.major, branchName, 'major'));
    }
    if (branch.patches.length) {
        const latestPatchVersion = branch.patches[0].version;
        for (const patch of branch.patches) {
            result.push(
                parsePackageGroup(
                    patch,
                    branchName,
                    'patch',
                    patch.version === latestPatchVersion
                )
            );
        }
    }
    return result.flat();
}

function parsePackageGroup(
    group: GamePackageGroup,
    branchName?: HYPFileInfo['meta']['branch'],
    packageType?: HYPFileInfo['meta']['packageType'],
    isLatestPatch?: HYPFileInfo['meta']['isLatestPatch']
) {
    const result: HYPFileInfo[] = [];
    for (const file of group.game_pkgs) {
        result.push(
            constructHYPFileInfo(file, {
                branch: branchName,
                packageType,
                isLatestPatch,
                version: group.version,
                resourceType: 'game'
            })
        );
    }
    for (const file of group.audio_pkgs) {
        result.push(
            constructHYPFileInfo(file, {
                branch: branchName,
                packageType,
                isLatestPatch,
                resourceType: 'audio',
                version: group.version,
                audioLanguage: file.language
            })
        );
    }
    return result;
}

export class HYPFileProvider {
    #updatedAt?: number;
    #fileList: RemoteFileInfo[] = [];
    #deprecatedFileList: BasicFileInfo[] = [];

    constructor(readonly option: HYPFileProviderOption) {}

    get updatedAt() {
        return this.#updatedAt;
    }

    get fileList() {
        return this.#fileList;
    }

    get deprecatedFileList() {
        return this.#deprecatedFileList;
    }

    update(hypGamePackage: GamePackage) {
        const fileList = this.#getFileList(hypGamePackage);
        if (isEqual(fileList, this.#fileList)) {
            return false;
        }
        this.#deprecatedFileList = difference(this.#fileList, fileList);
        this.#fileList = fileList;
        this.#updatedAt = Date.now();
        return true;
    }

    #getFileList(hypGamePackage: GamePackage) {
        const hypFiles = parseHYPGamePackage(hypGamePackage);
        const result: RemoteFileInfo[] = [];
        for (const hypFile of hypFiles) {
            let branchOption: HYPFileProviderOption[
                | 'branchMain'
                | 'branchPreDownload'];
            let typeOption: BranchOption['major' | 'patches'];
            if (hypFile.meta.branch === 'main') {
                branchOption = this.option.branchMain;
            } else if (hypFile.meta.branch === 'pre_download') {
                branchOption = this.option.branchPreDownload;
            }
            if (!branchOption) {
                continue;
            }
            if (hypFile.meta.packageType === 'major') {
                typeOption = branchOption.major;
            } else if (hypFile.meta.packageType === 'patch') {
                typeOption = branchOption.patches;
            }
            if (
                !(typeOption === true) &&
                !(typeOption === 'latest-only' && hypFile.meta.isLatestPatch)
            ) {
                continue;
            }
            if (
                hypFile.meta.audioLanguage &&
                !this.option.audioLanguages?.includes(
                    hypFile.meta.audioLanguage
                )
            ) {
                continue;
            }
            result.push(constructRemoteFileInfo(hypFile));
        }
        return result;
    }
}
