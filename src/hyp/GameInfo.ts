import { type GameId, type Image, type Icon } from './common.js';

/**
 * 游戏信息
 */
export type GameInfo = GameId & {
    /**
     * 展示配置
     */
    display: GameInfoDisplay;
    /**
     * 预约链接
     */
    reservation: string | null;
    /**
     * 展示状态
     */
    display_status: string;
};

/**
 * 游戏展示配置
 */
export type GameInfoDisplay = {
    language: string;
    name: string;
    icon: Icon;
    title: string;
    subtitle: string;
    background: Image;
    logo: Image;
    thumbnail: Image;
};
