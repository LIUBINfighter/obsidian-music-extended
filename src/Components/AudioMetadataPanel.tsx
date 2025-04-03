import React, { useState, useEffect, useRef } from 'react';
import { TFile, setIcon } from 'obsidian';
import { MusicMetadata, formatDuration, formatBitrate } from '../metadata-utils';

interface AudioMetadataPanelProps {
    file: TFile;
    metadata: MusicMetadata;
    app: any;
    plugin: any;
    audioEl: HTMLAudioElement | null;
    onToggleNativeControls?: (visible: boolean) => void;
}

const AudioMetadataPanel: React.FC<AudioMetadataPanelProps> = ({ 
    file, 
    metadata, 
    app, 
    plugin, 
    audioEl,
    onToggleNativeControls 
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(0.7);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [nativeControlsVisible, setNativeControlsVisible] = useState(true);
    
    const progressBarRef = useRef<HTMLDivElement>(null);
    const playPauseIconRef = useRef<HTMLDivElement>(null);
    const volumeIconRef = useRef<HTMLDivElement>(null);
    const rateIconRef = useRef<HTMLDivElement>(null);
    const toggleNativeIconRef = useRef<HTMLDivElement>(null);
    
    // 初始化组件
    useEffect(() => {
        if (!audioEl) return;
        
        // 设置初始状态
        setIsPlaying(!audioEl.paused);
        setCurrentTime(audioEl.currentTime);
        setDuration(audioEl.duration || 0);
        setVolume(audioEl.volume);
        setPlaybackRate(audioEl.playbackRate);
        
        // 设置播放速度为默认值
        audioEl.playbackRate = 1.0;
        
        // 事件监听
        const onTimeUpdate = () => setCurrentTime(audioEl.currentTime);
        const onDurationChange = () => setDuration(audioEl.duration || 0);
        const onPlay = () => setIsPlaying(true);
        const onPause = () => setIsPlaying(false);
        const onVolumeChange = () => setVolume(audioEl.volume);
        const onRateChange = () => setPlaybackRate(audioEl.playbackRate);
        
        audioEl.addEventListener('timeupdate', onTimeUpdate);
        audioEl.addEventListener('durationchange', onDurationChange);
        audioEl.addEventListener('play', onPlay);
        audioEl.addEventListener('pause', onPause);
        audioEl.addEventListener('volumechange', onVolumeChange);
        audioEl.addEventListener('ratechange', onRateChange);
        
        // 清理函数
        return () => {
            audioEl.removeEventListener('timeupdate', onTimeUpdate);
            audioEl.removeEventListener('durationchange', onDurationChange);
            audioEl.removeEventListener('play', onPlay);
            audioEl.removeEventListener('pause', onPause);
            audioEl.removeEventListener('volumechange', onVolumeChange);
            audioEl.removeEventListener('ratechange', onRateChange);
            
            // 重置播放速度到默认值
            audioEl.playbackRate = 1.0;
        };
    }, [audioEl, file.path]);
    
    // 设置图标
    useEffect(() => {
        // 设置播放/暂停图标
        if (playPauseIconRef.current) {
            setIcon(playPauseIconRef.current, isPlaying ? 'pause' : 'play');
        }
        
        // 设置音量图标
        if (volumeIconRef.current) {
            if (volume === 0) {
                setIcon(volumeIconRef.current, 'volume-x');
            } else if (volume < 0.5) {
                setIcon(volumeIconRef.current, 'volume-1');
            } else {
                setIcon(volumeIconRef.current, 'volume-2');
            }
        }
        
        // 设置速率图标
        if (rateIconRef.current) {
            setIcon(rateIconRef.current, 'gauge');
        }
        
        // 设置原生控件显示/隐藏图标
        if (toggleNativeIconRef.current) {
            setIcon(toggleNativeIconRef.current, nativeControlsVisible ? 'eye' : 'eye-off');
        }
    }, [isPlaying, volume, nativeControlsVisible]);
    
    // 格式化时间
    const formatTime = (seconds: number): string => {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    // 播放/暂停
    const handlePlayPause = () => {
        if (!audioEl) return;
        
        if (isPlaying) {
            audioEl.pause();
        } else {
            audioEl.play();
        }
    };
    
    // 调整音量
    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!audioEl) return;
        const newVolume = parseFloat(e.target.value);
        audioEl.volume = newVolume;
    };
    
    // 调整播放速率
    const handleRateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!audioEl) return;
        const newRate = parseFloat(e.target.value);
        audioEl.playbackRate = newRate;
    };
    
    // 进度条点击
    const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioEl || !progressBarRef.current) return;
        
        const rect = progressBarRef.current.getBoundingClientRect();
        const clickPosition = (e.clientX - rect.left) / rect.width;
        
        if (audioEl.duration) {
            audioEl.currentTime = clickPosition * audioEl.duration;
        }
    };
    
    // 切换原生控件显示
    const handleToggleNativeControls = () => {
        const newState = !nativeControlsVisible;
        setNativeControlsVisible(newState);
        
        // 调用父组件传入的回调函数，实际隐藏原生控件
        if (onToggleNativeControls) {
            onToggleNativeControls(newState);
        }
    };
    
    // 计算进度百分比
    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    // 查找歌词
    const lyrics = metadata && Array.isArray(metadata.genre) 
        ? metadata.genre.find(item => item && item.toLowerCase().includes('[lrc]'))
        : null;
    
    // 处理歌词内容
    const lyricsContent = lyrics ? lyrics.replace('[lrc]', '').trim() : '';
    const lyricsLines = lyricsContent ? lyricsContent.split('\n') : [];

    return (
        <div className="music-extended-audio-enhancer">
            {/* 元数据面板 */}
            <div className="audio-metadata-panel">
                <div className="audio-metadata-layout">
                    {/* 封面区 */}
                    <div className="audio-cover-container">
                        {metadata.coverData ? (
                            <img className="audio-cover-image" src={metadata.coverData} />
                        ) : (
                            <div className="audio-cover-placeholder">
                                <span className="audio-placeholder-icon file-music"></span>
                            </div>
                        )}
                    </div>
                    
                    {/* 信息区 */}
                    <div className="audio-info-container">
                        <h3 className="audio-title">{metadata.title || file.basename}</h3>
                        
                        {metadata.artist && (
                            <div className="audio-artist">艺术家: {metadata.artist}</div>
                        )}
                        
                        {metadata.album && (
                            <div className="audio-album">专辑: {metadata.album}</div>
                        )}
                    </div>
                </div>
                
                {/* 技术信息区域 */}
                <div className="audio-tech-info">
                    {metadata.duration && (
                        <div className="audio-tech-item audio-duration">
                            时长: {formatDuration(metadata.duration)}
                        </div>
                    )}
                    
                    {metadata.bitrate && (
                        <div className="audio-tech-item audio-bitrate">
                            比特率: {formatBitrate(metadata.bitrate)}
                        </div>
                    )}
                    
                    {metadata.sampleRate && (
                        <div className="audio-tech-item audio-samplerate">
                            采样率: {Math.round(metadata.sampleRate / 1000)} kHz
                        </div>
                    )}
                    
                    {file.extension && (
                        <div className="audio-tech-item audio-format">
                            格式: {file.extension.toUpperCase()}
                        </div>
                    )}
                </div>
            </div>
            
            {/* 控制面板 */}
            <div className="audio-controls-panel">
                <div className="audio-playback-controls">
                    {/* 播放/暂停按钮 */}
                    <div 
                        className="audio-control-button audio-play-pause"
                        onClick={handlePlayPause}
                        aria-label="播放/暂停"
                    >
                        <div ref={playPauseIconRef}></div>
                    </div>
                    
                    {/* 音量控制 */}
                    <div className="audio-volume-controls">
                        <div className="audio-volume-icon" ref={volumeIconRef}></div>
                        <input
                            type="range"
                            className="audio-volume-slider"
                            min="0"
                            max="1"
                            step="0.01"
                            value={volume}
                            onChange={handleVolumeChange}
                        />
                    </div>
                    
                    {/* 播放速率控制 */}
                    <div className="audio-rate-controls">
                        <div className="audio-rate-icon" ref={rateIconRef}></div>
                        <select 
                            className="audio-rate-select"
                            value={playbackRate}
                            onChange={handleRateChange}
                        >
                            <option value="0.5">0.5x</option>
                            <option value="0.75">0.75x</option>
                            <option value="1">1.0x</option>
                            <option value="1.25">1.25x</option>
                            <option value="1.5">1.5x</option>
                            <option value="2">2.0x</option>
                        </select>
                    </div>
                    
                    {/* 显示/隐藏原生控件按钮 */}
                    <div 
                        className="audio-control-button toggle-native"
                        onClick={handleToggleNativeControls}
                        aria-label="显示/隐藏原生控件"
                    >
                        <div ref={toggleNativeIconRef}></div>
                    </div>
                </div>
                
                {/* 进度条 */}
                <div className="audio-progress-container">
                    <div className="audio-time-display current-time">
                        {formatTime(currentTime)}
                    </div>
                    
                    <div 
                        className="audio-progress-bar" 
                        onClick={handleProgressBarClick}
                        ref={progressBarRef}
                    >
                        <div className="audio-progress-bg">
                            <div 
                                className="audio-progress-fill" 
                                style={{ width: `${progressPercentage}%` }}
                            ></div>
                            <div 
                                className="audio-progress-handle" 
                                style={{ left: `${progressPercentage}%` }}
                            ></div>
                        </div>
                    </div>
                    
                    <div className="audio-time-display duration">
                        {formatTime(duration)}
                    </div>
                </div>
            </div>
            
            {/* 歌词面板 */}
            {lyricsLines.length > 0 && (
                <div className="audio-lyrics-panel">
                    <div className="audio-lyrics-title">歌词</div>
                    <div className="audio-lyrics-content">
                        {lyricsLines.map((line, index) => (
                            <div key={index} className="audio-lyrics-line">{line}</div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AudioMetadataPanel;
