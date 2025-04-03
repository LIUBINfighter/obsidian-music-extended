import React, { useState, useEffect, useMemo } from 'react';
import { TFile, setIcon } from 'obsidian';
import { MusicMetadata } from '../metadata-utils';
import { formatDuration, getFileTypeIcon } from '../metadata-utils';
import { findMusicFiles, getFilenameWithoutExtension } from '../utils';
import MusicTableComponent from './MusicTable';

interface GalleryViewProps {
    app: any;
    plugin: any;
    activeTab: ViewTab;
    onSwitchTab: (tab: ViewTab) => void;
    onFileOpen: (file: TFile) => Promise<void>;
}

const GalleryViewComponent: React.FC<GalleryViewProps> = ({ app, plugin, activeTab, onSwitchTab, onFileOpen }) => {
    const [musicFiles, setMusicFiles] = useState<TFile[]>([]);
    const [musicMetadata, setMusicMetadata] = useState<MusicMetadata[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // 加载音乐文件
    const loadMusicFiles = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // 获取音乐文件
            const files = await findMusicFiles(app.vault);
            setMusicFiles(files);
            
            // 解析音乐文件元数据
            const metadataPromises = files.map(async (file) => {
                try {
                    const { parseMusicMetadata } = await import('../metadata-utils');
                    return await parseMusicMetadata(file);
                } catch (error) {
                    console.error(`解析文件 ${file.path} 元数据失败:`, error);
                    return {
                        title: getFilenameWithoutExtension(file),
                        filePath: file.path
                    };
                }
            });
            
            const metadata = await Promise.all(metadataPromises);
            setMusicMetadata(metadata);
            
        } catch (err) {
            console.error('加载音乐文件失败:', err);
            setError('加载音乐文件时出错');
        } finally {
            setLoading(false);
        }
    };

    // 首次加载
    useEffect(() => {
        loadMusicFiles();
    }, []);

    // 过滤音乐文件
    const filteredMetadata = useMemo(() => {
        return musicMetadata.filter(metadata => {
            const searchText = [
                metadata.title,
                metadata.artist,
                metadata.album,
                metadata.genre
            ].filter(Boolean).join(' ').toLowerCase();
            
            return searchText.includes(searchTerm.toLowerCase());
        });
    }, [musicMetadata, searchTerm]);

    // 点击音乐卡片时调用
    const handleCardClick = async (file: TFile) => {
        await onFileOpen(file);
    };

    // 设置默认封面图标
    const renderDefaultCover = (file: TFile) => {
        const iconClass = getFileTypeIcon(file.extension);
        return (
            <div className="music-card-cover-icon">
                <span className={`music-cover-icon ${iconClass}`}></span>
            </div>
        );
    };

    return (
        <div className="music-gallery-view">
            <div className="music-view-tabs">
                <div 
                    className={`music-view-tab ${activeTab === 'gallery' ? 'active' : ''}`}
                    onClick={() => onSwitchTab('gallery')}
                >
                    图库视图
                </div>
                <div 
                    className={`music-view-tab ${activeTab === 'musictable' ? 'active' : ''}`}
                    onClick={() => onSwitchTab('musictable')}
                >
                    表格视图
                </div>
            </div>
            
            <div className="music-view-content">
                {activeTab === 'gallery' ? (
                    <div className="gallery-container">
                        <div className="music-gallery-header">
                            <h2>音乐库</h2>
                        </div>
                        
                        <div className="music-gallery-toolbar">
                            <div className="music-gallery-search">
                                <input
                                    type="text"
                                    className="music-search-input"
                                    placeholder="搜索音乐文件..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        
                        <div className="music-gallery-list">
                            {loading && (
                                <div className="music-gallery-loading">正在加载音乐文件...</div>
                            )}
                            
                            {error && (
                                <div className="music-error-message">{error}</div>
                            )}
                            
                            {!loading && !error && filteredMetadata.length === 0 && (
                                <div className="music-empty-message">
                                    {musicMetadata.length === 0 
                                        ? '未找到音乐文件' 
                                        : '没有匹配的音乐文件'}
                                </div>
                            )}
                            
                            {!loading && !error && filteredMetadata.length > 0 && (
                                <div className="music-grid">
                                    {filteredMetadata.map((metadata, index) => {
                                        const file = musicFiles.find(f => f.path === metadata.filePath);
                                        if (!file) return null;
                                        
                                        return (
                                            <div 
                                                key={file.path} 
                                                className="music-card"
                                                onClick={() => handleCardClick(file)}
                                            >
                                                <div className="music-card-cover">
                                                    {metadata.coverData ? (
                                                        <img 
                                                            className="music-cover-image" 
                                                            src={metadata.coverData}
                                                            onError={() => renderDefaultCover(file)} 
                                                        />
                                                    ) : metadata.coverUrl ? (
                                                        <img 
                                                            className="music-cover-image" 
                                                            src={metadata.coverUrl}
                                                            onError={() => renderDefaultCover(file)} 
                                                        />
                                                    ) : (
                                                        renderDefaultCover(file)
                                                    )}
                                                </div>
                                                
                                                <div className="music-card-info">
                                                    <div className="music-card-title">
                                                        {metadata.title || getFilenameWithoutExtension(file)}
                                                    </div>
                                                    
                                                    {metadata.artist && (
                                                        <div className="music-card-artist">{metadata.artist}</div>
                                                    )}
                                                    
                                                    {metadata.album && (
                                                        <div className="music-card-album">{metadata.album}</div>
                                                    )}
                                                    
                                                    <div className="music-card-meta">
                                                        <div>
                                                            <span className="music-duration-icon"></span>
                                                            {formatDuration(metadata.duration)}
                                                        </div>
                                                        
                                                        {metadata.fileSize && (
                                                            <div>{metadata.fileSize} MB</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <MusicTableComponent 
                        app={app}
                        plugin={plugin}
                        onFileOpen={onFileOpen}
                    />
                )}
            </div>
        </div>
    );
};

export default GalleryViewComponent;

// 保留原有的 setupGalleryIcons 函数
export function setupGalleryIcons(containerEl: HTMLElement) {
    // 原有的图标设置逻辑
}
